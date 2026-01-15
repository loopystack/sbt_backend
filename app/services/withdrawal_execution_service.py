"""
Withdrawal Execution Service
Handles idempotent execution of approved withdrawals
Ensures withdrawals are sent on-chain only once
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from decimal import Decimal
from datetime import datetime, timezone
import logging

from app.models.deposit import WithdrawalIntent
from app.services.tron_send_service import tron_send_service
from app.services.wallet_service import WalletService
from app.services.limits_service import limits_service
from app.models.wallet_transaction import WalletTransactionType, ReferenceType
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
        
        Args:
            withdrawal_id: ID of the withdrawal intent to execute
            db: Database session
            
        Returns:
            Transaction hash of the on-chain transfer
            
        Raises:
            ValueError: If withdrawal is not in approved status or already has tx_hash
            Exception: If on-chain transfer fails
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
        
        # Idempotency check: if already processing or completed, return existing tx_hash
        if withdrawal.tx_hash:
            logger.info(
                f"Withdrawal {withdrawal_id} already has tx_hash={withdrawal.tx_hash}, "
                f"status={withdrawal.status}. Skipping execution (idempotent)."
            )
            return withdrawal.tx_hash
        
        # Status check: only execute if approved
        if withdrawal.status != "approved":
            raise ValueError(
                f"Cannot execute withdrawal {withdrawal_id}: "
                f"status is '{withdrawal.status}', expected 'approved'"
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
        # 1. Check hot wallet USDT balance
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
        # TRON transactions require TRX for energy (frozen) or bandwidth (consumed)
        # This is a basic check - in production, you should verify:
        # - Enough TRX for transaction fees (bandwidth)
        # - Or enough frozen TRX (energy) if using energy model
        try:
            trx_balance = tron_send_service.check_hot_wallet_trx_balance()
            if trx_balance is not None:
                # Warn if TRX balance is very low (e.g., less than 100 TRX)
                # Actual transaction cost is typically much less, but this is a safety check
                min_trx_threshold = Decimal("100.0")
                if trx_balance < min_trx_threshold:
                    logger.warning(
                        f"Hot wallet TRX balance is low: {trx_balance} TRX "
                        f"(below {min_trx_threshold} TRX threshold). "
                        f"Transaction may fail due to insufficient bandwidth/energy."
                    )
        except Exception as e:
            logger.warning(f"Failed to check hot wallet TRX balance: {e}. Continuing anyway.")
        
        # 2. Check min/max withdrawal limits
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
        
        # 3. Check daily limits (already enforced at initiate, but double-check here)
        try:
            await limits_service.check_withdrawal_limits(
                user_id=withdrawal.user_id,
                amount_usd=withdrawal.amount_usd,
                db=db
            )
        except Exception as e:
            logger.warning(f"Daily limit check failed for withdrawal {withdrawal_id}: {e}")
            # Don't block execution if limits were already checked at initiate
            # But log it for monitoring
        
        # Step 1: Broadcast transaction (external operation - can fail)
        # This happens BEFORE any database changes to ensure atomicity
        try:
            send_result = await tron_send_service.send_usdt_trc20(
                to_address=withdrawal.to_address,
                amount_usdt=withdrawal.amount_crypto
            )
            tx_hash = send_result["tx_hash"]
        except Exception as e:
            # Broadcast failed - no blockchain transaction, but funds are still locked from initiation
            # CRITICAL: MUST unlock reserved funds to return them to available balance
            logger.error(
                f"Failed to broadcast withdrawal {withdrawal_id}: {e}. Unlocking reserved funds.",
                exc_info=True
            )
            
            try:
                # Unlock reserved funds (reserved -> available)
                # Funds were locked at withdrawal initiation, so we need to return them
                await WalletService.unlock_balance(
                    user_id=withdrawal.user_id,
                    asset=withdrawal.asset,
                    amount=withdrawal.amount_crypto,
                    db=db,
                    reference_type=ReferenceType.WITHDRAWAL,
                    reference_id=withdrawal.id,
                    description=f"Unlock reserved funds after failed broadcast: {withdrawal.amount_crypto} {withdrawal.asset}"
                )
                
                # Mark withdrawal as failed
                withdrawal.status = "failed"
                withdrawal.failed_at = datetime.now(timezone.utc)
                withdrawal.failure_reason = f"Failed to broadcast transaction: {str(e)}"
                
                await db.commit()
                
                logger.info(
                    f"Unlocked {withdrawal.amount_crypto} {withdrawal.asset} reserved funds "
                    f"for failed withdrawal {withdrawal_id}"
                )
                
            except Exception as unlock_error:
                # Critical: Failed to unlock funds - log and mark as failed anyway
                # Manual intervention will be required
                logger.critical(
                    f"CRITICAL: Failed to unlock reserved funds for withdrawal {withdrawal_id} "
                    f"after broadcast failure. Error: {unlock_error}. Manual intervention required.",
                    exc_info=True
                )
                
                # Still mark withdrawal as failed
                withdrawal.status = "failed"
                withdrawal.failed_at = datetime.now(timezone.utc)
                withdrawal.failure_reason = (
                    f"Failed to broadcast transaction: {str(e)}. "
                    f"ALSO failed to unlock funds: {str(unlock_error)}"
                )
                await db.commit()
            
            raise Exception(f"Failed to broadcast withdrawal transaction: {str(e)}")
        
        # Step 2: Update withdrawal and deduct funds atomically (all in one transaction)
        # Order: 1) Update withdrawal status, 2) Deduct funds, 3) Commit all together
        # This ensures tx_hash is only persisted if funds are debited
        try:
            # Update withdrawal with tx_hash and status
            withdrawal.tx_hash = tx_hash
            withdrawal.status = "processing"
            withdrawal.processed_at = datetime.now(timezone.utc)
            withdrawal.confirmations = 0  # Will be updated by monitor worker
            
            # Deduct reserved funds directly (cleaner accounting flow)
            # At initiate: available -> reserved (WITHDRAWAL_LOCK)
            # At execute: reserved -> deducted directly (WITHDRAWAL_DEBIT)
            # This avoids the intermediate step of moving through available balance
            # Recommended approach: simpler, safer, clearer ledger semantics
            await WalletService.deduct_reserved_balance(
                user_id=withdrawal.user_id,
                asset=withdrawal.asset,
                amount=withdrawal.amount_crypto,
                db=db,
                reference_type=ReferenceType.WITHDRAWAL,
                reference_id=withdrawal.id,
                description=f"Withdrawal settlement: {withdrawal.amount_crypto} {withdrawal.asset} to {withdrawal.to_address} (tx: {tx_hash})"
            )
            
            # All operations succeeded - commit atomically
            await db.commit()
            
            logger.info(
                f"Successfully executed withdrawal {withdrawal_id}: "
                f"tx_hash={tx_hash}, status=processing"
            )
            
            return tx_hash
            
        except Exception as e:
            # Debit failed after broadcast succeeded
            # This is a critical error: transaction was broadcast but funds not debited
            # Funds are still in reserved (from initiation), so we should unlock them
            # However, the transaction was broadcast, so we need to track it
            await db.rollback()
            
            logger.error(
                f"Debit failed for withdrawal {withdrawal_id} after broadcast succeeded (tx_hash={tx_hash}): {e}. "
                f"Attempting to unlock reserved funds.",
                exc_info=True
            )
            
            try:
                # Unlock reserved funds since debit didn't happen
                # Transaction was broadcast, but we couldn't debit, so refund the locked funds
                await WalletService.unlock_balance(
                    user_id=withdrawal.user_id,
                    asset=withdrawal.asset,
                    amount=withdrawal.amount_crypto,
                    db=db,
                    reference_type=ReferenceType.WITHDRAWAL,
                    reference_id=withdrawal.id,
                    description=f"Unlock reserved funds after debit failure (tx_hash={tx_hash}): {withdrawal.amount_crypto} {withdrawal.asset}"
                )
                
                # Mark withdrawal as failed but keep tx_hash for reference
                # The transaction was broadcast, so we need to track it (monitor worker will check it)
                withdrawal.status = "failed"
                withdrawal.failed_at = datetime.now(timezone.utc)
                withdrawal.failure_reason = f"Broadcast succeeded (tx_hash={tx_hash}) but debit failed: {str(e)}. Funds unlocked."
                withdrawal.tx_hash = tx_hash  # Keep tx_hash for reference - transaction was broadcast
                
                await db.commit()
                
                logger.warning(
                    f"Unlocked {withdrawal.amount_crypto} {withdrawal.asset} reserved funds "
                    f"for withdrawal {withdrawal_id} after debit failure. "
                    f"Transaction was broadcast (tx_hash={tx_hash}) but may need manual verification."
                )
                
            except Exception as unlock_error:
                # Critical: Failed to unlock funds - log and mark as failed anyway
                # Manual intervention will be required
                logger.critical(
                    f"CRITICAL: Withdrawal {withdrawal_id} broadcast succeeded (tx_hash={tx_hash}) "
                    f"but debit failed AND unlock also failed. Error: {unlock_error}. "
                    f"Funds may be stuck in reserved. Manual intervention required.",
                    exc_info=True
                )
                
                # Still mark withdrawal as failed, keep tx_hash
                withdrawal.status = "failed"
                withdrawal.failed_at = datetime.now(timezone.utc)
                withdrawal.failure_reason = (
                    f"Broadcast succeeded (tx_hash={tx_hash}) but debit failed: {str(e)}. "
                    f"ALSO failed to unlock funds: {str(unlock_error)}"
                )
                withdrawal.tx_hash = tx_hash  # Keep tx_hash for reference
                await db.commit()
            
            raise Exception(f"Failed to execute withdrawal: debit failed after broadcast succeeded. tx_hash={tx_hash}")

