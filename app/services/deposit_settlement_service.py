"""
Deposit Settlement Service
Idempotently settles confirmed deposits by crediting user wallet
"""
import logging
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException, status

from app.models.deposit import DepositIntent
from app.services.deposit_service import deposit_service

logger = logging.getLogger(__name__)


class DepositSettlementService:
    """Service for settling confirmed deposits"""
    
    @staticmethod
    async def settle_deposit_intent(
        deposit_intent_id: int,
        db: AsyncSession
    ) -> dict:
        """
        Idempotently settle a confirmed deposit intent
        
        This function:
        1. Locks the DepositIntent row FOR UPDATE
        2. Checks if already settled (idempotency)
        3. Ensures status is 'confirmed'
        4. Calls deposit_service.confirm_deposit() to credit wallet
        5. Marks intent as 'settled'
        
        Must never credit twice - protected by:
        - Unique constraint on (network, tx_hash)
        - Status check (if already settled, return early)
        - Transaction lock (SELECT ... FOR UPDATE)
        """
        try:
            # Lock the row for update to prevent concurrent settlement
            stmt = select(DepositIntent).where(
                DepositIntent.id == deposit_intent_id
            ).with_for_update()
            
            result = await db.execute(stmt)
            intent = result.scalar_one_or_none()
            
            if not intent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Deposit intent {deposit_intent_id} not found"
                )
            
            # Idempotency check: if already settled, return early
            if intent.status == "settled":
                logger.info(
                    f"Deposit intent {deposit_intent_id} already settled "
                    f"(settled_at={intent.settled_at})"
                )
                return {
                    "deposit_intent_id": deposit_intent_id,
                    "status": "already_settled",
                    "message": "Deposit already settled"
                }
            
            # Ensure status is 'confirmed' before settling
            if intent.status != "confirmed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Deposit intent {deposit_intent_id} is not confirmed (status: {intent.status})"
                )
            
            # Ensure tx_hash exists
            if not intent.tx_hash:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Deposit intent {deposit_intent_id} has no tx_hash"
                )
            
            # Ensure amount_crypto exists
            if not intent.amount_crypto:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Deposit intent {deposit_intent_id} has no amount_crypto"
                )
            
            logger.info(
                f"Settling deposit intent {deposit_intent_id}: "
                f"tx_hash={intent.tx_hash}, amount={intent.amount_crypto} {intent.asset}"
            )
            
            # Call existing deposit service to credit wallet
            # This handles:
            # - Creating CryptoTransaction record
            # - Crediting user balance via wallet_service
            # - Creating wallet ledger entry
            # - Idempotency checks (checks for existing tx_hash)
            # Note: confirm_deposit() commits the transaction, so row lock is released
            result = await deposit_service.confirm_deposit(
                deposit_intent_id=deposit_intent_id,
                tx_hash=intent.tx_hash,
                amount_crypto=intent.amount_crypto,
                amount_usd=intent.amount_quote_fiat,
                db=db
            )
            
            # deposit_service.confirm_deposit() already commits and marks as 'settled'
            # Re-query to get the latest state after commit (row lock is released)
            stmt_refresh = select(DepositIntent).where(DepositIntent.id == deposit_intent_id)
            result_refresh = await db.execute(stmt_refresh)
            intent = result_refresh.scalar_one_or_none()
            
            logger.info(
                f"Successfully settled deposit intent {deposit_intent_id}: "
                f"status={intent.status}, settled_at={intent.settled_at}"
            )
            
            return {
                "deposit_intent_id": deposit_intent_id,
                "status": "settled",
                "amount_credited": str(intent.amount_crypto),
                "asset": intent.asset,
                "settled_at": intent.settled_at.isoformat() if intent.settled_at else None
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                f"Error settling deposit intent {deposit_intent_id}: {str(e)}",
                exc_info=True
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to settle deposit: {str(e)}"
            )


# Singleton instance
deposit_settlement_service = DepositSettlementService()



