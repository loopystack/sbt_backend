"""
Withdrawal Monitor Worker
Monitors on-chain withdrawal transactions for confirmations
Handles failed transactions and refunds
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import select, and_
from sqlalchemy.orm import sessionmaker
from decimal import Decimal

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.deposit import WithdrawalIntent
from app.integrations.tron_client import tron_client
from app.services.wallet_service import WalletService
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType

logger = logging.getLogger(__name__)


class WithdrawalMonitorWorker:
    """Worker that monitors withdrawal transactions for confirmations"""
    
    def __init__(self):
        self.network = "TRC20"
        self.confirmations_required = settings.TRON_WITHDRAW_CONFIRMATIONS_REQUIRED
        self.confirm_timeout_minutes = settings.WITHDRAWAL_CONFIRM_TIMEOUT_MINUTES
        self.scan_interval = settings.WITHDRAW_EXECUTION_INTERVAL_SECONDS
    
    async def run_once(self, db: AsyncSession) -> dict:
        """
        Run one scan cycle for withdrawal confirmations
        
        Returns:
            Dictionary with statistics
        """
        stats = {
            "scanned": 0,
            "confirmed": 0,
            "failed": 0,
            "refunded": 0,
            "errors": 0
        }
        
        try:
            # Fetch all processing withdrawals (with tx_hash)
            stmt = (
                select(WithdrawalIntent)
                .where(
                    and_(
                        WithdrawalIntent.network == self.network,
                        WithdrawalIntent.status == "processing",
                        WithdrawalIntent.tx_hash.isnot(None)
                    )
                )
                .order_by(WithdrawalIntent.processed_at.asc())
            )
            
            result = await db.execute(stmt)
            withdrawals = result.scalars().all()
            
            stats["scanned"] = len(withdrawals)
            logger.info(f"Scanning {len(withdrawals)} processing withdrawals")
            
            for withdrawal in withdrawals:
                try:
                    await self._process_processing_withdrawal(withdrawal, db, stats)
                except Exception as e:
                    stats["errors"] += 1
                    logger.error(
                        f"Error processing withdrawal {withdrawal.id}: {e}",
                        exc_info=True
                    )
            
            await db.commit()
            
        except Exception as e:
            logger.error(f"Error in withdrawal monitor run: {e}", exc_info=True)
            await db.rollback()
            stats["errors"] += 1
        
        return stats
    
    async def _process_processing_withdrawal(
        self,
        withdrawal: WithdrawalIntent,
        db: AsyncSession,
        stats: dict
    ) -> None:
        """
        Process a processing withdrawal: check confirmations and status
        """
        # Lock the withdrawal row FOR UPDATE SKIP LOCKED to prevent concurrent processing
        stmt = (
            select(WithdrawalIntent)
            .where(WithdrawalIntent.id == withdrawal.id)
            .with_for_update(skip_locked=True)  # Skip if locked by another worker
        )
        result = await db.execute(stmt)
        locked_withdrawal = result.scalar_one_or_none()
        
        if not locked_withdrawal:
            # Another worker is processing this, skip
            logger.debug(f"Withdrawal {withdrawal.id} is locked by another worker, skipping")
            return
        
        withdrawal = locked_withdrawal
        
        if not withdrawal.tx_hash:
            logger.warning(f"Withdrawal {withdrawal.id} has status=processing but no tx_hash, marking as failed")
            await self._mark_withdrawal_failed(
                withdrawal,
                "No transaction hash found",
                db
            )
            stats["failed"] += 1
            return
        
        # Check for timeout
        if withdrawal.processed_at:
            # Ensure processed_at is timezone-aware
            processed_at_aware = withdrawal.processed_at
            if processed_at_aware.tzinfo is None:
                processed_at_aware = processed_at_aware.replace(tzinfo=timezone.utc)
            timeout_threshold = processed_at_aware + timedelta(minutes=self.confirm_timeout_minutes)
            if datetime.now(timezone.utc) > timeout_threshold:
                logger.warning(
                    f"Withdrawal {withdrawal.id} tx {withdrawal.tx_hash} has timed out "
                    f"(processed {withdrawal.processed_at}, timeout {self.confirm_timeout_minutes} minutes)"
                )
                await self._mark_withdrawal_failed(
                    withdrawal,
                    f"Transaction timeout after {self.confirm_timeout_minutes} minutes",
                    db
                )
                # Refund only if debit happened (idempotent check inside _refund_withdrawal)
                refunded = await self._refund_withdrawal(withdrawal, db)
                stats["failed"] += 1
                if refunded:
                    stats["refunded"] += 1
                return
        
        try:
            # Get transaction info from TRON
            tx_info = await tron_client.get_tx_info(withdrawal.tx_hash)
            
            confirmations = tx_info.get("confirmations", 0)
            success = tx_info.get("success", False)
            
            # Update confirmations
            withdrawal.confirmations = confirmations
            
            if not success:
                # Transaction failed on-chain
                logger.warning(
                    f"Withdrawal {withdrawal.id} tx {withdrawal.tx_hash} failed on-chain"
                )
                await self._mark_withdrawal_failed(
                    withdrawal,
                    "Transaction failed on-chain",
                    db
                )
                # Refund only if debit happened (idempotent check inside _refund_withdrawal)
                refunded = await self._refund_withdrawal(withdrawal, db)
                stats["failed"] += 1
                if refunded:
                    stats["refunded"] += 1
                return
            
            # Check if confirmations are sufficient
            if confirmations >= self.confirmations_required:
                # Withdrawal completed!
                withdrawal.status = "completed"
                withdrawal.completed_at = datetime.now(timezone.utc)
                await db.flush()
                
                stats["confirmed"] += 1
                logger.info(
                    f"Withdrawal {withdrawal.id} completed: "
                    f"tx_hash={withdrawal.tx_hash}, confirmations={confirmations}"
                )
            else:
                # Still waiting for confirmations
                logger.debug(
                    f"Withdrawal {withdrawal.id} has {confirmations}/{self.confirmations_required} confirmations"
                )
        
        except Exception as e:
            # Transaction not found or other error
            logger.warning(
                f"Failed to get tx info for withdrawal {withdrawal.id} "
                f"tx {withdrawal.tx_hash}: {e}"
            )
            
            # Check if it's been too long since processed_at
            if withdrawal.processed_at:
                time_since_processed = datetime.now(timezone.utc) - withdrawal.processed_at
                if time_since_processed > timedelta(minutes=self.confirm_timeout_minutes):
                    logger.warning(
                        f"Withdrawal {withdrawal.id} tx not found after timeout, marking as failed"
                    )
                    await self._mark_withdrawal_failed(
                        withdrawal,
                        f"Transaction not found after {self.confirm_timeout_minutes} minutes: {str(e)}",
                        db
                    )
                    # Refund only if debit happened (idempotent check inside _refund_withdrawal)
                    refunded = await self._refund_withdrawal(withdrawal, db)
                    stats["failed"] += 1
                    if refunded:
                        stats["refunded"] += 1
    
    async def _mark_withdrawal_failed(
        self,
        withdrawal: WithdrawalIntent,
        reason: str,
        db: AsyncSession
    ) -> None:
        """Mark withdrawal as failed"""
        withdrawal.status = "failed"
        withdrawal.failed_at = datetime.now(timezone.utc)
        withdrawal.failure_reason = reason
        await db.flush()
    
    async def _refund_withdrawal(
        self,
        withdrawal: WithdrawalIntent,
        db: AsyncSession
    ) -> bool:
        """
        Refund withdrawal amount back to user's available balance (idempotent).
        Only refunds if funds were actually debited (WITHDRAWAL_DEBIT exists).
        Prevents double-refunding by checking if WITHDRAWAL_REFUND already exists.
        Creates WITHDRAWAL_REFUND ledger entry.
        
        CRITICAL: This method must only refund if debit actually happened.
        Failure cases where funds were unlocked (not debited) should NOT be refunded here.
        
        Returns:
            bool: True if refund was issued, False if skipped (no debit or already refunded)
        """
        # Check if refund already exists (idempotency check)
        refund_check = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_REFUND
        )
        refund_result = await db.execute(refund_check)
        existing_refund = refund_result.scalar_one_or_none()
        
        if existing_refund:
            logger.info(
                f"Withdrawal {withdrawal.id} already has WITHDRAWAL_REFUND ledger entry. "
                f"Skipping refund (idempotent)."
            )
            return False  # Already refunded
        
        # CRITICAL: Only refund if funds were actually debited
        # Check if WITHDRAWAL_DEBIT ledger entry exists for this withdrawal
        debit_check = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_DEBIT
        )
        debit_result = await db.execute(debit_check)
        debit_entry = debit_result.scalar_one_or_none()
        
        if not debit_entry:
            # Funds were never debited (e.g., broadcast failed before debit, or debit failed)
            # In these cases, funds were already unlocked back to available
            # Do NOT credit refund - that would over-credit the user
            logger.warning(
                f"Withdrawal {withdrawal.id} (tx_hash={withdrawal.tx_hash}) has no WITHDRAWAL_DEBIT entry. "
                f"Funds were likely never debited (unlocked instead). Skipping refund to prevent over-credit."
            )
            return False  # No debit, so no refund needed
        
        # Funds were debited, so we need to credit them back
        # Create WITHDRAWAL_REFUND ledger entry via credit_balance
        # Note: credit_balance creates a DEPOSIT_CREDIT entry, so we'll create the refund entry manually
        # Actually, let's use credit_balance but then update the type to WITHDRAWAL_REFUND
        # Or better: create the ledger entry manually with correct type
        
        balance = await WalletService.get_or_create_balance(
            withdrawal.user_id,
            withdrawal.asset,
            db
        )
        
        balance_before = balance.balance or Decimal("0")
        reserved_before = balance.locked_balance or Decimal("0")
        
        # Credit to available balance
        balance.balance = balance_before + withdrawal.amount_crypto
        balance_after = balance.balance
        reserved_after = reserved_before  # Reserved unchanged
        
        await db.flush()
        
        # Create WITHDRAWAL_REFUND ledger entry
        refund_entry = WalletTransaction(
            user_id=withdrawal.user_id,
            asset=withdrawal.asset,
            type=WalletTransactionType.WITHDRAWAL_REFUND,
            amount=withdrawal.amount_crypto,
            balance_before=balance_before,
            balance_after=balance_after,
            reserved_before=reserved_before,
            reserved_after=reserved_after,
            reference_type=ReferenceType.WITHDRAWAL,
            reference_id=withdrawal.id,
            description=f"Withdrawal refund: {withdrawal.amount_crypto} {withdrawal.asset} (tx: {withdrawal.tx_hash} failed)"
        )
        db.add(refund_entry)
        await db.flush()
        
        logger.info(
            f"Refunded {withdrawal.amount_crypto} {withdrawal.asset} to user {withdrawal.user_id} "
            f"for failed withdrawal {withdrawal.id} (tx_hash={withdrawal.tx_hash}). "
            f"Balance: {balance_before} -> {balance_after}"
        )
        
        return True  # Refund was issued
    
    async def run_forever(self):
        """Run the monitor worker continuously"""
        logger.info("Starting withdrawal monitor worker...")
        logger.info(f"Network: {self.network}")
        logger.info(f"Confirmations required: {self.confirmations_required}")
        logger.info(f"Scan interval: {self.scan_interval} seconds")
        logger.info(f"Confirm timeout: {self.confirm_timeout_minutes} minutes")
        
        while True:
            async with AsyncSessionLocal() as db:
                try:
                    stats = await self.run_once(db)
                    
                    if stats["scanned"] > 0:
                        logger.info(
                            f"Withdrawal monitor cycle: "
                            f"scanned={stats['scanned']}, "
                            f"confirmed={stats['confirmed']}, "
                            f"failed={stats['failed']}, "
                            f"refunded={stats['refunded']}, "
                            f"errors={stats['errors']}"
                        )
                    
                except Exception as e:
                    logger.error(f"Error in withdrawal monitor loop: {e}", exc_info=True)
                    await db.rollback()
            
            await asyncio.sleep(self.scan_interval)


# Singleton instance
withdrawal_monitor_worker = WithdrawalMonitorWorker()

