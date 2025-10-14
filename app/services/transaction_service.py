from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from ..models.transaction import Transaction
from ..models.user import User
from ..schemas.transaction import TransactionCreate

class TransactionService:
    """Service for creating and managing transactions"""
    
    @staticmethod
    async def create_transaction(
        db: AsyncSession,
        user_id: int,
        transaction_type: str,
        amount: float,
        description: str,
        reference_id: Optional[str] = None,
        reference_type: Optional[str] = None,
        payment_method: Optional[str] = None,
        external_reference: Optional[str] = None,
        extra_data: Optional[dict] = None
    ) -> Transaction:
        """
        Create a new transaction record
        
        Args:
            db: Database session
            user_id: User ID
            transaction_type: Type of transaction ('deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_lost')
            amount: Transaction amount (positive for credits, negative for debits)
            description: Human-readable description
            reference_id: Reference to related record (betting_record ID, payment ID, etc.)
            reference_type: Type of reference ('betting_record', 'payment', 'manual')
            payment_method: Payment method used ('card', 'crypto', 'bank_transfer', etc.)
            external_reference: External system reference
            extra_data: Additional data as dictionary
        
        Returns:
            Created Transaction object
        """
        # Get user's current balance
        user_query = select(User).where(User.id == user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalar_one()
        
        balance_before = float(user.funds_usd)
        balance_after = balance_before + amount
        
        # Convert extra_data dict to JSON string if provided
        extra_data_json = json.dumps(extra_data) if extra_data else None
        
        # Create transaction record
        transaction = Transaction(
            user_id=user_id,
            transaction_type=transaction_type,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type,
            status="completed",
            payment_method=payment_method,
            external_reference=external_reference,
            extra_data=extra_data_json
        )
        
        db.add(transaction)
        await db.flush()  # Flush to get the ID but don't commit yet
        
        return transaction
    
    @staticmethod
    async def create_deposit_transaction(
        db: AsyncSession,
        user_id: int,
        amount: float,
        payment_method: str,
        external_reference: Optional[str] = None,
        extra_data: Optional[dict] = None
    ) -> Transaction:
        """Create a deposit transaction"""
        return await TransactionService.create_transaction(
            db=db,
            user_id=user_id,
            transaction_type="deposit",
            amount=abs(amount),  # Ensure positive
            description=f"Deposit ${abs(amount):.2f} via {payment_method}",
            payment_method=payment_method,
            external_reference=external_reference,
            extra_data=extra_data
        )
    
    @staticmethod
    async def create_withdrawal_transaction(
        db: AsyncSession,
        user_id: int,
        amount: float,
        payment_method: str,
        external_reference: Optional[str] = None,
        extra_data: Optional[dict] = None
    ) -> Transaction:
        """Create a withdrawal transaction"""
        return await TransactionService.create_transaction(
            db=db,
            user_id=user_id,
            transaction_type="withdrawal",
            amount=-abs(amount),  # Ensure negative
            description=f"Withdrawal ${abs(amount):.2f} via {payment_method}",
            payment_method=payment_method,
            external_reference=external_reference,
            extra_data=extra_data
        )
    
    @staticmethod
    async def create_bet_placed_transaction(
        db: AsyncSession,
        user_id: int,
        amount: float,
        betting_record_id: str,
        match_teams: str,
        selected_outcome: str,
        odds_value: str,
        extra_data: Optional[dict] = None
    ) -> Transaction:
        """Create a bet placed transaction (this represents the deduction for placing the bet)"""
        return await TransactionService.create_transaction(
            db=db,
            user_id=user_id,
            transaction_type="bet_placed",
            amount=-abs(amount),  # Negative amount (deduction from balance)
            description=f"Bet placed: ${abs(amount):.2f} on {match_teams} ({selected_outcome}) @ {odds_value}",
            reference_id=str(betting_record_id),
            reference_type="betting_record",
            extra_data=extra_data
        )
    
    @staticmethod
    async def create_bet_won_transaction(
        db: AsyncSession,
        user_id: int,
        amount: float,
        betting_record_id: str,
        match_teams: str,
        selected_outcome: str,
        odds_value: str,
        extra_data: Optional[dict] = None
    ) -> Transaction:
        """Create a bet won transaction"""
        return await TransactionService.create_transaction(
            db=db,
            user_id=user_id,
            transaction_type="bet_won",
            amount=abs(amount),  # Ensure positive (credit)
            description=f"Bet won: +${abs(amount):.2f} from {match_teams} ({selected_outcome}) @ {odds_value}",
            reference_id=str(betting_record_id),
            reference_type="betting_record",
            extra_data=extra_data
        )
    
    @staticmethod
    async def create_bet_lost_transaction(
        db: AsyncSession,
        user_id: int,
        betting_record_id: str,
        match_teams: str,
        selected_outcome: str,
        odds_value: str,
        extra_data: Optional[dict] = None
    ) -> Transaction:
        """Create a bet lost transaction (no amount change, just for record keeping)"""
        return await TransactionService.create_transaction(
            db=db,
            user_id=user_id,
            transaction_type="bet_lost",
            amount=0.0,  # No balance change for lost bets (already deducted when placed)
            description=f"Bet lost: {match_teams} ({selected_outcome}) @ {odds_value}",
            reference_id=str(betting_record_id),
            reference_type="betting_record",
            extra_data=extra_data
        )
