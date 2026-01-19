"""
Deposit Service
Handles deposit intent creation and credit pipeline
Ensures idempotency and proper balance crediting
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from decimal import Decimal
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
import logging

from app.models.deposit import DepositIntent, CryptoTransaction, UserCryptoBalance
from app.models.wallet_transaction import WalletTransaction, ReferenceType
from app.services.wallet_service import wallet_service
from app.services.address_generator import AddressGenerator

logger = logging.getLogger(__name__)


class DepositService:
    """Service for handling deposit operations"""
    
    @staticmethod
    async def create_deposit_intent(
        user_id: int,
        asset: str,
        network: str,
        amount_usd: Decimal,
        db: AsyncSession
    ) -> DepositIntent:
        """
        Create a new deposit intent
        Returns existing address if one exists, otherwise generates new one
        """
        # Check for existing pending deposit intent with same asset/network
        stmt = select(DepositIntent).where(
            and_(
                DepositIntent.user_id == user_id,
                DepositIntent.asset == asset,
                DepositIntent.network == network,
                DepositIntent.status == "pending",
                DepositIntent.expires_at > datetime.now(timezone.utc)
            )
        ).order_by(DepositIntent.created_at.desc())
        
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            logger.info(f"Reusing existing deposit intent {existing.id} for user {user_id}")
            return existing
        
        # Generate deposit address
        address_generator = AddressGenerator()
        deposit_address, memo = await address_generator.generate_address(
            asset=asset,
            network=network,
            user_id=user_id
        )
        
        # Calculate expiration (24 hours from now)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        # Get required confirmations based on network
        required_confirmations = DepositService._get_required_confirmations(network)
        
        # Create new deposit intent
        deposit_intent = DepositIntent(
            user_id=user_id,
            asset=asset,
            network=network,
            amount_quote_fiat=amount_usd,
            generated_address=deposit_address,
            memo=memo,  # Add memo if generated
            expires_at=expires_at,
            status="pending",
            required_confirmations=required_confirmations
        )
        
        db.add(deposit_intent)
        await db.flush()
        
        logger.info(f"Created deposit intent {deposit_intent.id} for user {user_id}, asset {asset}, network {network}")
        
        return deposit_intent
    
    @staticmethod
    def _get_required_confirmations(network: str) -> int:
        """Get required confirmations for network"""
        confirmations_map = {
            "TRON": 1,
            "TRC20": 1,
            "Ethereum": 12,
            "ERC20": 12,
            "BSC": 1,
            "BEP20": 1,
            "Polygon": 12,
            "Bitcoin": 6,
        }
        return confirmations_map.get(network, 12)
    
    @staticmethod
    async def confirm_deposit(
        deposit_intent_id: int,
        tx_hash: str,
        amount_crypto: Decimal,
        amount_usd: Decimal,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Confirm a deposit and credit user balance
        Idempotent: same tx_hash will not credit twice
        """
        # Get deposit intent
        stmt = select(DepositIntent).where(DepositIntent.id == deposit_intent_id)
        result = await db.execute(stmt)
        deposit_intent = result.scalar_one_or_none()
        
        if not deposit_intent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deposit intent not found"
            )
        
        # Check if already settled (idempotency check)
        if deposit_intent.status == "settled":
            # Check if this tx_hash was already processed
            tx_stmt = select(CryptoTransaction).where(
                and_(
                    CryptoTransaction.deposit_intent_id == deposit_intent_id,
                    CryptoTransaction.tx_hash == tx_hash
                )
            )
            tx_result = await db.execute(tx_stmt)
            existing_tx = tx_result.scalar_one_or_none()
            
            if existing_tx:
                logger.info(f"Deposit {deposit_intent_id} with tx_hash {tx_hash} already processed (idempotent)")
                return {
                    "deposit_intent_id": deposit_intent_id,
                    "status": "already_settled",
                    "message": "Deposit already confirmed and credited"
                }
        
        # Check if deposit is expired
        # Handle both timezone-aware and timezone-naive expires_at
        expires_at_aware = deposit_intent.expires_at
        if expires_at_aware.tzinfo is None:
            expires_at_aware = expires_at_aware.replace(tzinfo=timezone.utc)
        if expires_at_aware < datetime.now(timezone.utc):
            deposit_intent.status = "expired"
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Deposit intent has expired"
            )
        
        # Check if tx_hash already exists (idempotency)
        tx_check_stmt = select(CryptoTransaction).where(
            CryptoTransaction.tx_hash == tx_hash
        )
        tx_check_result = await db.execute(tx_check_stmt)
        existing_tx_hash = tx_check_result.scalar_one_or_none()
        
        if existing_tx_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transaction {tx_hash} already processed"
            )
        
        # Create crypto transaction record
        crypto_tx = CryptoTransaction(
            deposit_intent_id=deposit_intent_id,
            tx_hash=tx_hash,
            to_address=deposit_intent.generated_address,
            amount=amount_crypto,
            asset=deposit_intent.asset,
            network=deposit_intent.network,
            status="confirmed",
            confirmations=deposit_intent.required_confirmations
        )
        db.add(crypto_tx)
        await db.flush()
        
        # Update deposit intent status
        deposit_intent.status = "confirmed"
        deposit_intent.tx_hash = tx_hash
        deposit_intent.confirmations = deposit_intent.required_confirmations
        await db.flush()
        
        # Credit user balance (idempotent - will check if already credited)
        try:
            ledger_entry = await wallet_service.credit_balance(
                user_id=deposit_intent.user_id,
                asset=deposit_intent.asset,
                amount=amount_crypto,
                db=db,
                reference_type=ReferenceType.DEPOSIT,
                reference_id=deposit_intent_id,
                description=f"Deposit {amount_crypto} {deposit_intent.asset} via {deposit_intent.network}"
            )
            
            # Mark deposit as settled
            deposit_intent.status = "settled"
            deposit_intent.settled_at = datetime.now(timezone.utc)
            
            await db.commit()
            
            logger.info(f"Deposit {deposit_intent_id} confirmed and credited {amount_crypto} {deposit_intent.asset} to user {deposit_intent.user_id}")
            
            return {
                "deposit_intent_id": deposit_intent_id,
                "status": "settled",
                "amount_credited": str(amount_crypto),
                "asset": deposit_intent.asset,
                "ledger_entry_id": ledger_entry.id
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error crediting deposit {deposit_intent_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to credit deposit: {str(e)}"
            )


# Singleton instance
deposit_service = DepositService()

