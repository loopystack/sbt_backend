"""
Withdrawal Execution Service
Handles idempotent execution of approved withdrawals
Ensures withdrawals are sent on-chain only once
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal
from datetime import datetime, timezone
import logging

from app.models.deposit import WithdrawalIntent
from app.services.tron_send_service import tron_send_service
from app.services.wallet_service import WalletService
from app.services.limits_service import limits_service
from app.models.wallet_transaction import ReferenceType
from app.core.config import settings

logger = logging.getLogger(__name__)


class WithdrawalExecutionService:
    """Service for executing withdrawals on-chain"""

    @staticmethod
    async def execute_withdrawal(
        withdrawal_id: int,
        db: AsyncSession
    ) -> str:
        """
        Execute an approved withdrawal by sending USDT on-chain.
        This method is idempotent - calling it multiple times will not send twice.

        Raises:
            ValueError: For invalid state transitions / invalid payload.
            Exception: For broadcast/debit failures (after best-effort internal cleanup).
        """
        # Lock the withdrawal row FOR UPDATE to prevent concurrent execution
        stmt = (
            select(WithdrawalIntent)
            .where(WithdrawalIntent.id == withdrawal_id)
            .with_for_update(skip_locked=False)  # Wait for lock, don't skip
        )
        result = await db.execute(stmt)
        withdrawal = result.scalar_one_or_none()

        if not withdrawal:
            raise ValueError(f"Withdrawal {withdrawal_id} not found")

        # Idempotency: if already in-flight or done, return existing tx_hash.
        if withdrawal.status in ("processing", "completed"):
            if withdrawal.tx_hash:
                logger.info(
                    f"Withdrawal {withdrawal_id} already has tx_hash={withdrawal.tx_hash}, "
                    f"status={withdrawal.status}. Skipping execution (idempotent)."
                )
                return withdrawal.tx_hash
            raise ValueError(
                f"Withdrawal {withdrawal_id} is '{withdrawal.status}' but has no tx_hash"
            )

        # Strict state machine: only execute if approved.
        if withdrawal.status != "approved":
            raise ValueError(
                f"Cannot execute withdrawal {withdrawal_id}: "
                f"status is '{withdrawal.status}', expected 'approved'"
            )

        # If tx_hash exists on an approved withdrawal, treat as inconsistent and block.
        if withdrawal.tx_hash:
            raise ValueError(
                f"Cannot execute withdrawal {withdrawal_id}: tx_hash already exists while status='approved'. "
                f"Use retry workflow if needed."
            )

        # Network check: only TRC20 supported
        if withdrawal.network != "TRC20":
            raise ValueError(
                f"Network {withdrawal.network} not supported. Only TRC20 is supported."
            )

        # Asset check: only USDT supported
        if withdrawal.asset != "USDT":
            raise ValueError(
                f"Asset {withdrawal.asset} not supported. Only USDT is supported."
            )

        logger.info(
            f"Executing withdrawal {withdrawal_id}: "
            f"{withdrawal.amount_crypto} {withdrawal.asset} to {withdrawal.to_address}"
        )

        # Safety controls (Day 6)
        # 1. Check hot wallet USDT balance (hard block)
        try:
            hot_wallet_balance = tron_send_service.get_hot_wallet_balance()
            if hot_wallet_balance < withdrawal.amount_crypto:
                raise ValueError(
                    f"Insufficient hot wallet balance. "
                    f"Available: {hot_wallet_balance} {withdrawal.asset}, "
                    f"Required: {withdrawal.amount_crypto} {withdrawal.asset}"
                )
        except Exception as e:
            logger.error(f"Failed to check hot wallet balance: {e}")
            raise ValueError(f"Cannot verify hot wallet balance: {str(e)}")

        # 2. Check TRX balance for energy/bandwidth (warning only for now)
        try:
            trx_balance = tron_send_service.check_hot_wallet_trx_balance()
            if trx_balance is not None:
                min_trx_threshold = Decimal("100.0")
                if trx_balance < min_trx_threshold:
                    logger.warning(
                        f"Hot wallet TRX balance is low: {trx_balance} TRX "
                        f"(below {min_trx_threshold} TRX threshold). "
                        f"Transaction may fail due to insufficient bandwidth/energy."
                    )
        except Exception as e:
            logger.warning(f"Failed to check hot wallet TRX balance: {e}. Continuing anyway.")

        # 3. Check min/max withdrawal limits
        if settings.TRON_WITHDRAW_MIN_AMOUNT and withdrawal.amount_crypto < settings.TRON_WITHDRAW_MIN_AMOUNT:
            raise ValueError(
                f"Withdrawal amount {withdrawal.amount_crypto} is below minimum "
                f"{settings.TRON_WITHDRAW_MIN_AMOUNT} {withdrawal.asset}"
            )

        if settings.TRON_WITHDRAW_MAX_AMOUNT and withdrawal.amount_crypto > settings.TRON_WITHDRAW_MAX_AMOUNT:
            raise ValueError(
                f"Withdrawal amount {withdrawal.amount_crypto} exceeds maximum "
                f"{settings.TRON_WITHDRAW_MAX_AMOUNT} {withdrawal.asset}"
            )

        # 4. Check daily limits (already enforced at initiate, but double-check here)
        try:
            await limits_service.check_withdrawal_limits(
                user_id=withdrawal.user_id,
                amount_usd=withdrawal.amount_usd,
                db=db
            )
        except Exception as e:
            logger.warning(f"Daily limit check failed for withdrawal {withdrawal_id}: {e}")

        # Step 1: Broadcast transaction (external operation - can fail)
        try:
            send_result = await tron_send_service.send_usdt_trc20(
                to_address=withdrawal.to_address,
                amount_usdt=withdrawal.amount_crypto
            )
            tx_hash = send_result["tx_hash"]
        except Exception as e:
            # Broadcast failed: unlock reserved funds + mark failed.
            logger.error(
                f"Failed to broadcast withdrawal {withdrawal_id}: {e}. Unlocking reserved funds.",
                exc_info=True
            )

            try:
                await WalletService.unlock_balance(
                    user_id=withdrawal.user_id,
                    asset=withdrawal.asset,
                    amount=withdrawal.amount_crypto,
                    db=db,
                    reference_type=ReferenceType.WITHDRAWAL,
                    reference_id=withdrawal.id,
                    description=f"Unlock reserved funds after failed broadcast: {withdrawal.amount_crypto} {withdrawal.asset}"
                )

                withdrawal.status = "failed"
                withdrawal.failed_at = datetime.now(timezone.utc)
                withdrawal.failure_reason = f"Failed to broadcast transaction: {str(e)}"
                await db.commit()

            except Exception as unlock_error:
                logger.critical(
                    f"CRITICAL: Failed to unlock reserved funds for withdrawal {withdrawal_id} "
                    f"after broadcast failure. Error: {unlock_error}. Manual intervention required.",
                    exc_info=True
                )
                withdrawal.status = "failed"
                withdrawal.failed_at = datetime.now(timezone.utc)
                withdrawal.failure_reason = (
                    f"Failed to broadcast transaction: {str(e)}. "
                    f"ALSO failed to unlock funds: {str(unlock_error)}"
                )
                await db.commit()

            raise Exception(f"Failed to broadcast withdrawal transaction: {str(e)}")

        # Step 2: Update withdrawal + debit reserved atomically (DB transaction)
        try:
            withdrawal.tx_hash = tx_hash
            withdrawal.status = "processing"
            withdrawal.processed_at = datetime.now(timezone.utc)
            withdrawal.confirmations = 0

            await WalletService.deduct_reserved_balance(
                user_id=withdrawal.user_id,
                asset=withdrawal.asset,
                amount=withdrawal.amount_crypto,
                db=db,
                reference_type=ReferenceType.WITHDRAWAL,
                reference_id=withdrawal.id,
                description=(
                    f"Withdrawal settlement: {withdrawal.amount_crypto} {withdrawal.asset} "
                    f"to {withdrawal.to_address} (tx: {tx_hash})"
                )
            )

            await db.commit()

            logger.info(
                f"Successfully executed withdrawal {withdrawal_id}: "
                f"tx_hash={tx_hash}, status=processing"
            )
            return tx_hash

        except Exception as e:
            # Debit failed after broadcast succeeded: unlock reserved + mark failed, keep tx_hash for audit.
            await db.rollback()

            logger.error(
                f"Debit failed for withdrawal {withdrawal_id} after broadcast succeeded (tx_hash={tx_hash}): {e}. "
                f"Attempting to unlock reserved funds.",
                exc_info=True
            )

            try:
                await WalletService.unlock_balance(
                    user_id=withdrawal.user_id,
                    asset=withdrawal.asset,
                    amount=withdrawal.amount_crypto,
                    db=db,
                    reference_type=ReferenceType.WITHDRAWAL,
                    reference_id=withdrawal.id,
                    description=(
                        f"Unlock reserved funds after debit failure (tx_hash={tx_hash}): "
                        f"{withdrawal.amount_crypto} {withdrawal.asset}"
                    )
                )

                withdrawal.status = "failed"
                withdrawal.failed_at = datetime.now(timezone.utc)
                withdrawal.failure_reason = (
                    f"Broadcast succeeded (tx_hash={tx_hash}) but debit failed: {str(e)}. Funds unlocked."
                )
                withdrawal.tx_hash = tx_hash
                await db.commit()

                logger.warning(
                    f"Unlocked {withdrawal.amount_crypto} {withdrawal.asset} reserved funds "
                    f"for withdrawal {withdrawal_id} after debit failure. "
                    f"Transaction was broadcast (tx_hash={tx_hash}) and requires manual verification."
                )

            except Exception as unlock_error:
                logger.critical(
                    f"CRITICAL: Withdrawal {withdrawal_id} broadcast succeeded (tx_hash={tx_hash}) "
                    f"but debit failed AND unlock also failed. Error: {unlock_error}. Manual intervention required.",
                    exc_info=True
                )
                withdrawal.status = "failed"
                withdrawal.failed_at = datetime.now(timezone.utc)
                withdrawal.failure_reason = (
                    f"Broadcast succeeded (tx_hash={tx_hash}) but debit failed: {str(e)}. "
                    f"ALSO failed to unlock funds: {str(unlock_error)}"
                )
                withdrawal.tx_hash = tx_hash
                await db.commit()

            raise Exception(
                f"Failed to execute withdrawal: debit failed after broadcast succeeded. tx_hash={tx_hash}"
            )

    @staticmethod
    async def retry_failed_withdrawal(withdrawal_id: int, db: AsyncSession) -> str:
        """
        Retry a failed withdrawal safely:
        - Only allowed if status == failed
        - Re-lock funds if needed (available -> reserved)
        - Reset tx fields
        - Then execute (broadcast + debit) using execute_withdrawal (idempotent)
        """
        stmt = (
            select(WithdrawalIntent)
            .where(WithdrawalIntent.id == withdrawal_id)
            .with_for_update(skip_locked=False)
        )
        result = await db.execute(stmt)
        withdrawal = result.scalar_one_or_none()
        if not withdrawal:
            raise ValueError(f"Withdrawal {withdrawal_id} not found")

        if withdrawal.status != "failed":
            raise ValueError(
                f"Cannot retry withdrawal {withdrawal_id}: status is '{withdrawal.status}', expected 'failed'"
            )

        # Ensure funds are locked again (if they were unlocked/refunded previously)
        bal = await WalletService.get_balance(withdrawal.user_id, withdrawal.asset, db)
        reserved = bal["reserved"]
        if reserved < withdrawal.amount_crypto:
            await WalletService.lock_balance(
                user_id=withdrawal.user_id,
                asset=withdrawal.asset,
                amount=withdrawal.amount_crypto,
                db=db,
                reference_type=ReferenceType.WITHDRAWAL,
                reference_id=withdrawal.id,
                description=f"Retry withdrawal lock: {withdrawal.amount_crypto} {withdrawal.asset}",
            )

        # Reset status + tx fields
        withdrawal.status = "approved"
        withdrawal.tx_hash = None
        withdrawal.confirmations = 0
        withdrawal.processed_at = None
        withdrawal.completed_at = None
        withdrawal.failed_at = None
        withdrawal.failure_reason = None
        await db.commit()

        return await WithdrawalExecutionService.execute_withdrawal(withdrawal_id=withdrawal_id, db=db)

