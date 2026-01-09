"""
Wallet Service
Handles all internal wallet balance operations with ledger tracking
Ensures balance consistency and complete audit trail
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from decimal import Decimal
from typing import Optional, Dict, Any
# Note: Service methods raise ValueError instead of HTTPException
# Routers should convert ValueError to HTTPException where appropriate
# This allows services to be called by workers without HTTP context
import logging

from app.models.deposit import UserCryptoBalance
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType

logger = logging.getLogger(__name__)


class WalletService:
    """Service for managing user crypto wallet balances"""
    
    @staticmethod
    async def get_or_create_balance(
        user_id: int,
        asset: str,
        db: AsyncSession
    ) -> UserCryptoBalance:
        """Get or create user balance for an asset"""
        stmt = select(UserCryptoBalance).where(
            UserCryptoBalance.user_id == user_id,
            UserCryptoBalance.asset == asset
        )
        result = await db.execute(stmt)
        balance = result.scalar_one_or_none()
        
        if not balance:
            balance = UserCryptoBalance(
                user_id=user_id,
                asset=asset,
                balance=Decimal("0"),
                locked_balance=Decimal("0")
            )
            db.add(balance)
            await db.flush()
        
        return balance
    
    @staticmethod
    async def get_balance(
        user_id: int,
        asset: str,
        db: AsyncSession
    ) -> Dict[str, Decimal]:
        """
        Get user balance for an asset
        Returns: {
            'available': Decimal,
            'reserved': Decimal,
            'total': Decimal
        }
        Note: balance = available, locked_balance = reserved
        """
        balance = await WalletService.get_or_create_balance(user_id, asset, db)
        
        available = balance.balance or Decimal("0")
        reserved = balance.locked_balance or Decimal("0")
        
        return {
            "available": available,
            "reserved": reserved,
            "total": available + reserved
        }
    
    @staticmethod
    async def credit_balance(
        user_id: int,
        asset: str,
        amount: Decimal,
        db: AsyncSession,
        reference_type: Optional[ReferenceType] = None,
        reference_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> WalletTransaction:
        """
        Credit (add) balance to user wallet
        Creates ledger entry automatically
        """
        if amount <= 0:
            raise ValueError("Credit amount must be positive")
        
        balance = await WalletService.get_or_create_balance(user_id, asset, db)
        
        balance_before = balance.balance or Decimal("0")
        reserved_before = balance.locked_balance or Decimal("0")
        
        # Credit to available balance
        balance.balance = balance_before + amount
        balance_after = balance.balance
        reserved_after = reserved_before
        
        await db.flush()
        
        # Create ledger entry
        ledger_entry = WalletTransaction(
            user_id=user_id,
            asset=asset,
            type=WalletTransactionType.DEPOSIT_CREDIT,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            reserved_before=reserved_before,
            reserved_after=reserved_after,
            reference_type=reference_type,
            reference_id=reference_id,
            description=description or f"Credit {amount} {asset}"
        )
        db.add(ledger_entry)
        await db.flush()
        
        logger.info(f"Credited {amount} {asset} to user {user_id}. Balance: {balance_before} -> {balance_after}")
        
        return ledger_entry
    
    @staticmethod
    async def debit_balance(
        user_id: int,
        asset: str,
        amount: Decimal,
        db: AsyncSession,
        reference_type: Optional[ReferenceType] = None,
        reference_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> WalletTransaction:
        """
        Debit (subtract) from available balance
        Cannot debit more than available balance
        Creates ledger entry automatically
        """
        if amount <= 0:
            raise ValueError("Debit amount must be positive")
        
        balance = await WalletService.get_or_create_balance(user_id, asset, db)
        
        balance_before = balance.balance or Decimal("0")
        reserved_before = balance.locked_balance or Decimal("0")
        
        # Check sufficient balance
        if balance_before < amount:
            raise ValueError(
                f"Insufficient balance. Available: {balance_before} {asset}, Required: {amount} {asset}"
            )
        
        # Debit from available balance
        balance.balance = balance_before - amount
        balance_after = balance.balance
        reserved_after = reserved_before
        
        await db.flush()
        
        # Create ledger entry
        ledger_entry = WalletTransaction(
            user_id=user_id,
            asset=asset,
            type=WalletTransactionType.WITHDRAWAL_DEBIT,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            reserved_before=reserved_before,
            reserved_after=reserved_after,
            reference_type=reference_type,
            reference_id=reference_id,
            description=description or f"Debit {amount} {asset}"
        )
        db.add(ledger_entry)
        await db.flush()
        
        logger.info(f"Debited {amount} {asset} from user {user_id}. Balance: {balance_before} -> {balance_after}")
        
        return ledger_entry
    
    @staticmethod
    async def lock_balance(
        user_id: int,
        asset: str,
        amount: Decimal,
        db: AsyncSession,
        reference_type: Optional[ReferenceType] = None,
        reference_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> WalletTransaction:
        """
        Lock (reserve) balance from available to reserved
        Cannot lock more than available balance
        Creates ledger entry automatically
        """
        if amount <= 0:
            raise ValueError("Lock amount must be positive")
        
        balance = await WalletService.get_or_create_balance(user_id, asset, db)
        
        balance_before = balance.balance or Decimal("0")
        reserved_before = balance.locked_balance or Decimal("0")
        
        # Check sufficient available balance
        if balance_before < amount:
            raise ValueError(
                f"Insufficient available balance. Available: {balance_before} {asset}, Required: {amount} {asset}"
            )
        
        # Move from available to reserved
        balance.balance = balance_before - amount
        balance.locked_balance = reserved_before + amount
        balance_after = balance.balance
        reserved_after = balance.locked_balance
        
        await db.flush()
        
        # Create ledger entry
        ledger_entry = WalletTransaction(
            user_id=user_id,
            asset=asset,
            type=WalletTransactionType.WITHDRAWAL_LOCK,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            reserved_before=reserved_before,
            reserved_after=reserved_after,
            reference_type=reference_type,
            reference_id=reference_id,
            description=description or f"Lock {amount} {asset}"
        )
        db.add(ledger_entry)
        await db.flush()
        
        logger.info(f"Locked {amount} {asset} for user {user_id}. Available: {balance_before} -> {balance_after}, Reserved: {reserved_before} -> {reserved_after}")
        
        return ledger_entry
    
    @staticmethod
    async def unlock_balance(
        user_id: int,
        asset: str,
        amount: Decimal,
        db: AsyncSession,
        reference_type: Optional[ReferenceType] = None,
        reference_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> WalletTransaction:
        """
        Unlock (unreserve) balance from reserved back to available
        Cannot unlock more than reserved balance
        Creates ledger entry automatically
        """
        if amount <= 0:
            raise ValueError("Unlock amount must be positive")
        
        balance = await WalletService.get_or_create_balance(user_id, asset, db)
        
        balance_before = balance.balance or Decimal("0")
        reserved_before = balance.locked_balance or Decimal("0")
        
        # Check sufficient reserved balance
        if reserved_before < amount:
            raise ValueError(
                f"Insufficient reserved balance. Reserved: {reserved_before} {asset}, Required: {amount} {asset}"
            )
        
        # Move from reserved back to available
        balance.balance = balance_before + amount
        balance.locked_balance = reserved_before - amount
        balance_after = balance.balance
        reserved_after = balance.locked_balance
        
        await db.flush()
        
        # Create ledger entry
        ledger_entry = WalletTransaction(
            user_id=user_id,
            asset=asset,
            type=WalletTransactionType.WITHDRAWAL_UNLOCK,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            reserved_before=reserved_before,
            reserved_after=reserved_after,
            reference_type=reference_type,
            reference_id=reference_id,
            description=description or f"Unlock {amount} {asset}"
        )
        db.add(ledger_entry)
        await db.flush()
        
        logger.info(f"Unlocked {amount} {asset} for user {user_id}. Available: {balance_before} -> {balance_after}, Reserved: {reserved_before} -> {reserved_after}")
        
        return ledger_entry
    
    @staticmethod
    async def deduct_reserved_balance(
        user_id: int,
        asset: str,
        amount: Decimal,
        db: AsyncSession,
        reference_type: Optional[ReferenceType] = None,
        reference_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> WalletTransaction:
        """
        Deduct from reserved balance directly (locked_balance decreases).
        This is used when a reserved amount is finalized (withdrawal executed on-chain).
        Creates ledger entry automatically.
        
        Effect:
        - locked_balance -= amount
        - balance (available) stays the same
        - ledger entry WITHDRAWAL_DEBIT with correct before/after snapshots
        
        This represents what actually happens: the reserved amount is consumed for the withdrawal.
        """
        if amount <= 0:
            raise ValueError("Deduct amount must be positive")
        
        balance = await WalletService.get_or_create_balance(user_id, asset, db)
        
        balance_before = balance.balance or Decimal("0")
        reserved_before = balance.locked_balance or Decimal("0")
        
        # Check sufficient reserved balance
        if reserved_before < amount:
            raise ValueError(
                f"Insufficient reserved balance. Reserved: {reserved_before} {asset}, Required: {amount} {asset}"
            )
        
        # Directly deduct from reserved (decreases both reserved and total)
        # locked_balance decreases, balance (available) stays the same
        balance.locked_balance = reserved_before - amount
        balance_after = balance_before  # Available balance unchanged
        reserved_after = balance.locked_balance
        
        await db.flush()
        
        # Create ledger entry with WITHDRAWAL_DEBIT type
        # This represents the settlement from reserved
        ledger_entry = WalletTransaction(
            user_id=user_id,
            asset=asset,
            type=WalletTransactionType.WITHDRAWAL_DEBIT,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            reserved_before=reserved_before,
            reserved_after=reserved_after,
            reference_type=reference_type,
            reference_id=reference_id,
            description=description or f"Withdrawal settlement (deduct from reserved): {amount} {asset}"
        )
        db.add(ledger_entry)
        await db.flush()
        
        logger.info(
            f"Deducted {amount} {asset} from reserved for user {user_id}. "
            f"Reserved: {reserved_before} -> {reserved_after}, "
            f"Total: {balance_before + reserved_before} -> {balance_after + reserved_after}"
        )
        
        return ledger_entry
    
    @staticmethod
    async def get_transactions(
        user_id: int,
        asset: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        db: AsyncSession = None
    ) -> list[WalletTransaction]:
        """Get wallet transaction history for user"""
        stmt = select(WalletTransaction).where(
            WalletTransaction.user_id == user_id
        )
        
        if asset:
            stmt = stmt.where(WalletTransaction.asset == asset)
        
        stmt = stmt.order_by(WalletTransaction.created_at.desc())
        stmt = stmt.limit(limit).offset(offset)
        
        result = await db.execute(stmt)
        return list(result.scalars().all())


# Singleton instance
wallet_service = WalletService()

