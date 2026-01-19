"""
Deposit Monitor Worker
Polls TRON blockchain for USDT TRC20 deposits and updates DepositIntent status
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select, and_, update
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.deposit import DepositIntent
from app.integrations.tron_client import tron_client
from app.services.deposit_settlement_service import deposit_settlement_service

logger = logging.getLogger(__name__)


class DepositMonitorWorker:
    """Worker that monitors TRON blockchain for USDT TRC20 deposits"""
    
    def __init__(self):
        self.scan_interval = settings.DEPOSIT_SCAN_INTERVAL_SECONDS
        self.confirmations_required = settings.TRON_CONFIRMATIONS_REQUIRED
        self.network = "TRC20"
        self.asset = "USDT"
    
    async def run_once(self, db: AsyncSession) -> dict:
        """
        Run one scan cycle
        Returns statistics about the scan
        """
        stats = {
            "scanned": 0,
            "detected": 0,
            "confirmed": 0,
            "settled": 0,
            "errors": 0
        }
        
        try:
            # Fetch all pending/detected intents for TRC20 that haven't expired
            now = datetime.now(timezone.utc)
            stmt = select(DepositIntent).where(
                and_(
                    DepositIntent.network == self.network,
                    DepositIntent.status.in_(["pending", "detected"]),
                    DepositIntent.expires_at > now
                )
            ).order_by(DepositIntent.created_at.asc())
            
            result = await db.execute(stmt)
            intents = result.scalars().all()
            
            stats["scanned"] = len(intents)
            logger.info(f"Scanning {len(intents)} deposit intents (status: pending/detected)")
            
            for intent in intents:
                try:
                    # Lock the row for update to prevent concurrent processing
                    # Use SELECT ... FOR UPDATE SKIP LOCKED to handle concurrent workers
                    locked_stmt = select(DepositIntent).where(
                        DepositIntent.id == intent.id
                    ).with_for_update(skip_locked=True)
                    
                    locked_result = await db.execute(locked_stmt)
                    locked_intent = locked_result.scalar_one_or_none()
                    
                    if not locked_intent:
                        # Row is locked by another worker, skip
                        logger.debug(f"Intent {intent.id} is locked by another worker, skipping")
                        continue
                    
                    # Refresh to get latest status
                    await db.refresh(locked_intent)
                    
                    if locked_intent.status == "pending":
                        await self._process_pending_intent(locked_intent, db, stats)
                    elif locked_intent.status == "detected":
                        await self._process_detected_intent(locked_intent, db, stats)
                    
                    await db.commit()
                    
                except Exception as e:
                    await db.rollback()
                    stats["errors"] += 1
                    logger.error(f"Error processing intent {intent.id}: {str(e)}", exc_info=True)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error in deposit monitor scan: {str(e)}", exc_info=True)
            stats["errors"] += 1
            return stats
    
    async def _process_pending_intent(
        self,
        intent: DepositIntent,
        db: AsyncSession,
        stats: dict
    ) -> None:
        """
        Process a pending intent: check for USDT transfers to the address
        """
        try:
            logger.info(f"Processing pending intent {intent.id} for address {intent.generated_address}")
            
            # Calculate since_ts (only check transfers since intent creation)
            since_ts = int(intent.created_at.timestamp() * 1000)  # Convert to milliseconds
            
            # Fetch USDT transfers to this address
            transfers = await tron_client.get_usdt_transfers_to_address(
                to_address=intent.generated_address,
                since_ts=since_ts,
                limit=50
            )
            
            # Find matching transfer
            # For now, we'll match any transfer to this address
            # In production, you might want to match by amount or other criteria
            matching_transfer = None
            for transfer in transfers:
                if transfer["to"].lower() == intent.generated_address.lower():
                    # Check if amount meets minimum (optional - you can add min_deposit check)
                    matching_transfer = transfer
                    break
            
            if matching_transfer:
                # Transaction detected!
                tx_hash = matching_transfer["tx_hash"]
                amount_crypto = matching_transfer["amount"]
                
                # Check if this tx_hash already exists (idempotency check)
                # The unique constraint will prevent duplicates, but we check here for better error handling
                existing_stmt = select(DepositIntent).where(
                    and_(
                        DepositIntent.network == self.network,
                        DepositIntent.tx_hash == tx_hash,
                        DepositIntent.id != intent.id
                    )
                )
                existing_result = await db.execute(existing_stmt)
                existing = existing_result.scalar_one_or_none()
                
                if existing:
                    logger.warning(
                        f"Transaction {tx_hash} already processed in intent {existing.id}, "
                        f"skipping intent {intent.id}"
                    )
                    # Mark this intent as failed (duplicate)
                    intent.status = "failed"
                    await db.flush()
                    return
                
                # Fetch block_number only for the matched transfer (optimization: only call get_tx_info once)
                block_number = 0
                confirmations = 0
                try:
                    tx_info = await tron_client.get_tx_info(tx_hash)
                    block_number = tx_info.get("block_number", 0)
                    confirmations = tx_info.get("confirmations", 0)
                except Exception as e:
                    logger.warning(f"Failed to fetch tx info for {tx_hash}: {e}, will retry on next scan")
                    # Continue anyway - we'll fetch it in _process_detected_intent if needed
                
                # Update intent with transaction details
                intent.tx_hash = tx_hash
                intent.amount_crypto = amount_crypto
                intent.status = "detected"
                intent.detected_at = datetime.now(timezone.utc)
                intent.confirmations = confirmations  # Set initial confirmations if available
                
                await db.flush()
                
                stats["detected"] += 1
                logger.info(
                    f"Detected deposit for intent {intent.id}: "
                    f"tx_hash={tx_hash}, amount={amount_crypto} USDT, confirmations={confirmations}"
                )
            else:
                logger.debug(f"No matching transfer found for intent {intent.id}")
                
        except Exception as e:
            logger.error(f"Error processing pending intent {intent.id}: {str(e)}", exc_info=True)
            raise
    
    async def _process_detected_intent(
        self,
        intent: DepositIntent,
        db: AsyncSession,
        stats: dict
    ) -> None:
        """
        Process a detected intent: check confirmations and transition to confirmed
        """
        try:
            if not intent.tx_hash:
                logger.warning(f"Intent {intent.id} is in 'detected' status but has no tx_hash")
                return
            
            logger.info(f"Processing detected intent {intent.id} with tx_hash {intent.tx_hash}")
            
            # Get transaction info to get block number and current confirmations
            tx_info = await tron_client.get_tx_info(intent.tx_hash)
            
            block_number = tx_info.get("block_number", 0)
            current_confirmations = tx_info.get("confirmations", 0)
            
            # Update confirmations
            intent.confirmations = current_confirmations
            
            # Check if we've reached required confirmations
            if current_confirmations >= self.confirmations_required:
                # Transition to confirmed
                intent.status = "confirmed"
                intent.confirmed_at = datetime.now(timezone.utc)
                
                await db.flush()
                
                stats["confirmed"] += 1
                logger.info(
                    f"Intent {intent.id} confirmed: "
                    f"{current_confirmations}/{self.confirmations_required} confirmations"
                )
                
                # Trigger settlement (Day 4)
                try:
                    await deposit_settlement_service.settle_deposit_intent(
                        deposit_intent_id=intent.id,
                        db=db
                    )
                    stats["settled"] += 1
                    logger.info(f"Intent {intent.id} settled successfully")
                except Exception as e:
                    logger.error(f"Error settling intent {intent.id}: {str(e)}", exc_info=True)
                    # Don't raise - settlement will be retried on next scan
            else:
                logger.debug(
                    f"Intent {intent.id} waiting for confirmations: "
                    f"{current_confirmations}/{self.confirmations_required}"
                )
                
        except Exception as e:
            logger.error(f"Error processing detected intent {intent.id}: {str(e)}", exc_info=True)
            raise
    
    async def run_forever(self):
        """
        Run the worker in an infinite loop
        Uses AsyncSessionLocal directly for database sessions
        """
        from app.core.database import AsyncSessionLocal
        
        logger.info(
            f"Starting deposit monitor worker "
            f"(scan_interval={self.scan_interval}s, "
            f"confirmations_required={self.confirmations_required})"
        )
        
        while True:
            try:
                async with AsyncSessionLocal() as db:
                    stats = await self.run_once(db)
                    
                    logger.info(
                        f"Scan complete: scanned={stats['scanned']}, "
                        f"detected={stats['detected']}, confirmed={stats['confirmed']}, "
                        f"settled={stats['settled']}, errors={stats['errors']}"
                    )
                
                # Wait before next scan
                await asyncio.sleep(self.scan_interval)
                
            except KeyboardInterrupt:
                logger.info("Deposit monitor worker stopped by user")
                break
            except Exception as e:
                logger.error(f"Unexpected error in deposit monitor worker: {str(e)}", exc_info=True)
                await asyncio.sleep(self.scan_interval)  # Wait before retrying


# Singleton instance
deposit_monitor_worker = DepositMonitorWorker()

