"""
Platform Wallet Service
Manages platform-owned crypto wallets (hot/cold storage)
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from decimal import Decimal
from typing import Optional, Dict, List
from fastapi import HTTPException, status
import logging

from app.models.platform_wallet import PlatformWallet

logger = logging.getLogger(__name__)


class PlatformWalletService:
    """Service for managing platform wallets"""
    
    @staticmethod
    async def get_hot_wallet(
        asset: str,
        network: str,
        db: AsyncSession
    ) -> Optional[PlatformWallet]:
        """
        Get an active hot wallet for the specified asset and network
        Returns the first active hot wallet found
        """
        stmt = select(PlatformWallet).where(
            and_(
                PlatformWallet.asset == asset,
                PlatformWallet.network == network,
                PlatformWallet.is_hot_wallet == True,
                PlatformWallet.is_active == True
            )
        ).limit(1)
        
        result = await db.execute(stmt)
        wallet = result.scalar_one_or_none()
        
        if not wallet:
            logger.warning(f"No active hot wallet found for {asset} on {network}")
        
        return wallet
    
    @staticmethod
    async def get_cold_wallets(
        asset: str,
        network: str,
        db: AsyncSession
    ) -> List[PlatformWallet]:
        """Get all active cold wallets for asset/network"""
        stmt = select(PlatformWallet).where(
            and_(
                PlatformWallet.asset == asset,
                PlatformWallet.network == network,
                PlatformWallet.is_hot_wallet == False,
                PlatformWallet.is_active == True
            )
        )
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    @staticmethod
    async def check_wallet_thresholds(
        wallet_id: int,
        db: AsyncSession
    ) -> Dict[str, any]:
        """
        Check if wallet balance is below min or above max threshold
        Returns alerts if thresholds are crossed
        """
        stmt = select(PlatformWallet).where(PlatformWallet.id == wallet_id)
        result = await db.execute(stmt)
        wallet = result.scalar_one_or_none()
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        
        alerts = []
        balance = wallet.balance or Decimal("0")
        
        # Check min threshold
        if wallet.min_balance_threshold and balance < wallet.min_balance_threshold:
            alerts.append({
                "type": "low_balance",
                "message": f"Wallet {wallet.address} balance {balance} is below minimum threshold {wallet.min_balance_threshold}",
                "wallet_id": wallet_id,
                "current_balance": str(balance),
                "threshold": str(wallet.min_balance_threshold)
            })
        
        # Check max threshold
        if wallet.max_balance_threshold and balance > wallet.max_balance_threshold:
            alerts.append({
                "type": "high_balance",
                "message": f"Wallet {wallet.address} balance {balance} exceeds maximum threshold {wallet.max_balance_threshold}",
                "wallet_id": wallet_id,
                "current_balance": str(balance),
                "threshold": str(wallet.max_balance_threshold),
                "action_required": "Consider transferring to cold storage"
            })
        
        return {
            "wallet_id": wallet_id,
            "asset": wallet.asset,
            "network": wallet.network,
            "address": wallet.address,
            "balance": str(balance),
            "is_hot_wallet": wallet.is_hot_wallet,
            "alerts": alerts,
            "needs_attention": len(alerts) > 0
        }
    
    @staticmethod
    async def get_wallet_balance_summary(
        asset: str,
        network: str,
        db: AsyncSession
    ) -> Dict[str, any]:
        """
        Get balance summary for all platform wallets of an asset/network
        Returns total, hot, and cold wallet balances
        """
        stmt = select(PlatformWallet).where(
            and_(
                PlatformWallet.asset == asset,
                PlatformWallet.network == network,
                PlatformWallet.is_active == True
            )
        )
        
        result = await db.execute(stmt)
        wallets = list(result.scalars().all())
        
        total_balance = Decimal("0")
        hot_balance = Decimal("0")
        cold_balance = Decimal("0")
        hot_count = 0
        cold_count = 0
        
        for wallet in wallets:
            balance = wallet.balance or Decimal("0")
            total_balance += balance
            
            if wallet.is_hot_wallet:
                hot_balance += balance
                hot_count += 1
            else:
                cold_balance += balance
                cold_count += 1
        
        return {
            "asset": asset,
            "network": network,
            "total_balance": str(total_balance),
            "hot_wallet_balance": str(hot_balance),
            "cold_wallet_balance": str(cold_balance),
            "hot_wallets_count": hot_count,
            "cold_wallets_count": cold_count,
            "wallets": [
                {
                    "id": w.id,
                    "address": w.address,
                    "balance": str(w.balance or Decimal("0")),
                    "is_hot_wallet": w.is_hot_wallet,
                    "wallet_name": w.wallet_name
                }
                for w in wallets
            ]
        }


# Singleton instance
platform_wallet_service = PlatformWalletService()

