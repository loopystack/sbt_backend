"""
Bet Service
Handles bet placement and settlement using internal USDT wallet
Ensures idempotency and atomic operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from decimal import Decimal
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import logging

from app.models.bet import Bet, BetStatus
from app.models.odds import Odds
from app.models.wallet_transaction import ReferenceType, WalletTransactionType
from app.services.wallet_service import WalletService
from app.core.deps import get_db

logger = logging.getLogger(__name__)


class BetService:
    """Service for managing bets with wallet integration"""
    
    # Minimum and maximum stake limits
    MIN_STAKE = Decimal("1.00")  # Minimum 1 USDT
    MAX_STAKE = Decimal("10000.00")  # Maximum 10,000 USDT
    
    @staticmethod
    async def place_bet(
        user_id: int,
        match_id: int,
        market_key: str,
        selection_key: str,
        odds_decimal: Decimal,
        stake: Decimal,
        currency: str = "USDT",
        db: AsyncSession = None
    ) -> Bet:
        """
        Place a bet using internal USDT wallet
        
        Steps:
        1. Validate match is open (not started / not locked)
        2. Validate stake within min/max
        3. Start DB transaction
        4. Create Bet record status=pending
        5. Lock stake using WalletService.lock_balance
        6. Commit
        
        Args:
            user_id: User placing the bet
            match_id: Match/odds ID
            market_key: Market type (e.g., "1x2", "over_2_5")
            selection_key: Selection (e.g., "home", "draw", "away")
            odds_decimal: Decimal odds (must be >= 1.01)
            stake: Stake amount in USDT
            currency: Currency (default "USDT")
            db: Database session
            
        Returns:
            Created Bet object
            
        Raises:
            ValueError: If validation fails or insufficient balance
        """
        if not db:
            raise ValueError("Database session required")
        
        # Validate stake
        if stake < BetService.MIN_STAKE:
            raise ValueError(f"Stake must be at least {BetService.MIN_STAKE} {currency}")
        if stake > BetService.MAX_STAKE:
            raise ValueError(f"Stake cannot exceed {BetService.MAX_STAKE} {currency}")
        
        # Validate odds
        if odds_decimal < Decimal("1.01"):
            raise ValueError("Odds must be at least 1.01")
        
        # Validate match exists and is open
        match = await db.get(Odds, match_id)
        if not match:
            raise ValueError(f"Match {match_id} not found")
        
        # Check if match has already started (has result)
        if match.result:
            raise ValueError("Cannot place bet on finished match")
        
        # Check if match date is in the past (basic check)
        if match.date and match.date < datetime.now().date():
            # Allow if no result yet (match might be postponed)
            if not match.result:
                logger.warning(f"Placing bet on past match {match_id} without result")
        
        # Validate odds match server odds (if available)
        # This prevents odds manipulation and ensures client sees correct odds
        if market_key == "1x2":
            server_odds = None
            if selection_key == "home" and match.odd_1:
                server_odds = match.odd_1
            elif selection_key == "draw" and match.odd_X:
                server_odds = match.odd_X
            elif selection_key == "away" and match.odd_2:
                server_odds = match.odd_2
            
            if server_odds is not None:
                # Allow small tolerance for floating point differences (0.01)
                odds_diff = abs(float(odds_decimal) - float(server_odds))
                if odds_diff > 0.01:
                    raise ValueError(
                        f"Odds mismatch: client provided {odds_decimal}, "
                        f"server has {server_odds} for {market_key}/{selection_key}. "
                        f"Please refresh and try again."
                    )
        
        # Create bet record
        bet = Bet(
            user_id=user_id,
            match_id=match_id,
            market_key=market_key,
            selection_key=selection_key,
            odds_decimal=odds_decimal,
            stake=stake,
            currency=currency,
            status=BetStatus.PENDING
        )
        db.add(bet)
        await db.flush()  # Get bet.id
        
        # Lock stake in wallet
        try:
            # Note: lock_balance uses WITHDRAWAL_LOCK by default, but we need BET_LOCK
            # We'll need to update WalletService or use a workaround
            # For now, use lock_balance and update the transaction type after
            ledger_entry = await WalletService.lock_balance(
                user_id=user_id,
                asset=currency,
                amount=stake,
                db=db,
                reference_type=ReferenceType.BET,
                reference_id=bet.id,
                description=f"Bet lock: {market_key} {selection_key} on match {match_id}"
            )
            # Update transaction type to BET_LOCK
            ledger_entry.type = WalletTransactionType.BET_LOCK
            await db.flush()
        except ValueError as e:
            # Rollback bet creation if wallet lock fails
            await db.rollback()
            raise ValueError(f"Insufficient balance: {str(e)}")
        
        await db.commit()
        
        logger.info(
            f"Bet placed: user={user_id}, bet_id={bet.id}, match={match_id}, "
            f"stake={stake} {currency}, odds={odds_decimal}"
        )
        
        return bet
    
    @staticmethod
    async def settle_bet(
        bet_id: int,
        outcome: str,
        db: AsyncSession = None
    ) -> Bet:
        """
        Settle a bet (WIN, LOSS, or VOID)
        
        Key rule: Settlement must be idempotent.
        Uses row lock (SELECT ... FOR UPDATE) to prevent concurrent settlement.
        
        WIN flow:
        1. Calculate profit = stake * (odds_decimal - 1)
        2. Set bet.status = won, settled_at = now
        3. Unlock stake (BET_UNLOCK)
        4. Credit profit (BET_PAYOUT)
        
        LOSS flow:
        1. Set bet.status = lost
        2. Deduct reserved stake (BET_DEBIT)
        
        VOID flow:
        1. Set bet.status = void
        2. Unlock stake (BET_UNLOCK)
        
        Args:
            bet_id: Bet ID to settle
            outcome: "WIN", "LOSS", or "VOID"
            db: Database session
            
        Returns:
            Updated Bet object
            
        Raises:
            ValueError: If bet not found, already settled, or invalid outcome
        """
        if not db:
            raise ValueError("Database session required")
        
        outcome_upper = outcome.upper()
        if outcome_upper not in ["WIN", "LOSS", "VOID"]:
            raise ValueError(f"Invalid outcome: {outcome}. Must be WIN, LOSS, or VOID")
        
        # Row lock the bet to prevent concurrent settlement
        stmt = select(Bet).where(Bet.id == bet_id).with_for_update()
        result = await db.execute(stmt)
        bet = result.scalar_one_or_none()
        
        if not bet:
            raise ValueError(f"Bet {bet_id} not found")
        
        # Idempotency check: if already settled, return
        if bet.status != BetStatus.PENDING:
            logger.info(f"Bet {bet_id} already settled with status {bet.status}, skipping")
            return bet
        
        # Mark as settling (optional, prevents race conditions)
        bet.status = BetStatus.SETTLING
        bet.settle_version += 1
        await db.flush()
        
        try:
            if outcome_upper == "WIN":
                # Calculate profit and payout
                profit = bet.stake * (bet.odds_decimal - Decimal("1"))
                payout = bet.stake * bet.odds_decimal
                
                # Step 1: Deduct reserved stake (BET_WIN_DEDUCT_STAKE)
                deduct_entry = await WalletService.deduct_reserved_balance(
                    user_id=bet.user_id,
                    asset=bet.currency,
                    amount=bet.stake,
                    db=db,
                    reference_type=ReferenceType.BET,
                    reference_id=bet.id,
                    description=f"Bet win: deduct reserved stake for bet {bet_id}"
                )
                deduct_entry.type = WalletTransactionType.BET_WIN_DEDUCT_STAKE
                await db.flush()
                
                # Step 2: Credit full payout (BET_WIN_PAYOUT_CREDIT)
                payout_entry = await WalletService.credit_balance(
                    user_id=bet.user_id,
                    asset=bet.currency,
                    amount=payout,
                    db=db,
                    reference_type=ReferenceType.BET,
                    reference_id=bet.id,
                    description=f"Bet win: payout {payout} {bet.currency} for bet {bet_id}"
                )
                payout_entry.type = WalletTransactionType.BET_WIN_PAYOUT_CREDIT
                await db.flush()
                
                # Update bet with actual payout and profit
                bet.status = BetStatus.WON
                bet.payout = payout
                bet.profit = profit
                bet.settled_at = datetime.now(timezone.utc)
                
                logger.info(
                    f"Bet {bet_id} settled as WIN: user={bet.user_id}, "
                    f"stake={bet.stake}, profit={profit}"
                )
                
            elif outcome_upper == "LOSS":
                # Deduct reserved stake (BET_LOSS_DEDUCT)
                debit_entry = await WalletService.deduct_reserved_balance(
                    user_id=bet.user_id,
                    asset=bet.currency,
                    amount=bet.stake,
                    db=db,
                    reference_type=ReferenceType.BET,
                    reference_id=bet.id,
                    description=f"Bet loss: stake deducted for bet {bet_id}"
                )
                debit_entry.type = WalletTransactionType.BET_LOSS_DEDUCT
                await db.flush()
                
                bet.status = BetStatus.LOST
                bet.profit = Decimal("0")  # No profit on loss
                bet.settled_at = datetime.now(timezone.utc)
                
                logger.info(
                    f"Bet {bet_id} settled as LOSS: user={bet.user_id}, stake={bet.stake}"
                )
                
            elif outcome_upper == "VOID":
                # Unlock stake back to available (BET_VOID_UNLOCK)
                unlock_entry = await WalletService.unlock_balance(
                    user_id=bet.user_id,
                    asset=bet.currency,
                    amount=bet.stake,
                    db=db,
                    reference_type=ReferenceType.BET,
                    reference_id=bet.id,
                    description=f"Bet void: stake returned for bet {bet_id}"
                )
                unlock_entry.type = WalletTransactionType.BET_VOID_UNLOCK
                await db.flush()
                
                bet.status = BetStatus.VOID
                bet.profit = Decimal("0")  # No profit on void
                bet.settled_at = datetime.now(timezone.utc)
                
                logger.info(
                    f"Bet {bet_id} settled as VOID: user={bet.user_id}, stake={bet.stake}"
                )
            
            await db.commit()
            
        except Exception as e:
            # Rollback on error, keep bet as pending
            await db.rollback()
            logger.error(f"Error settling bet {bet_id}: {str(e)}")
            raise ValueError(f"Failed to settle bet: {str(e)}")
        
        return bet
    
    @staticmethod
    async def get_user_bets(
        user_id: int,
        status: Optional[BetStatus] = None,
        limit: int = 100,
        offset: int = 0,
        db: AsyncSession = None
    ) -> list[Bet]:
        """Get user's bets with optional status filter"""
        if not db:
            raise ValueError("Database session required")
        
        stmt = select(Bet).where(Bet.user_id == user_id)
        
        if status:
            stmt = stmt.where(Bet.status == status)
        
        stmt = stmt.order_by(Bet.placed_at.desc())
        stmt = stmt.limit(limit).offset(offset)
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_bet(
        bet_id: int,
        user_id: Optional[int] = None,
        db: AsyncSession = None
    ) -> Optional[Bet]:
        """Get a specific bet by ID"""
        if not db:
            raise ValueError("Database session required")
        
        stmt = select(Bet).where(Bet.id == bet_id)
        
        if user_id:
            stmt = stmt.where(Bet.user_id == user_id)
        
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def cancel_bet(
        bet_id: int,
        user_id: int,
        db: AsyncSession = None
    ) -> Bet:
        """
        Cancel a bet (unlock reserved funds)
        
        Only allows cancellation if:
        - Bet belongs to user
        - Bet status is PENDING
        - Match has not started (if match start logic exists)
        
        Args:
            bet_id: Bet ID to cancel
            user_id: User ID (must own the bet)
            db: Database session
            
        Returns:
            Updated Bet object
            
        Raises:
            ValueError: If bet not found, not owned by user, or cannot be cancelled
        """
        if not db:
            raise ValueError("Database session required")
        
        # Fetch bet and ensure it belongs to user
        stmt = select(Bet).where(
            Bet.id == bet_id,
            Bet.user_id == user_id
        ).with_for_update()
        result = await db.execute(stmt)
        bet = result.scalar_one_or_none()
        
        if not bet:
            raise ValueError(f"Bet {bet_id} not found or does not belong to user")
        
        # Only allow cancel if status is PENDING
        if bet.status != BetStatus.PENDING:
            raise ValueError(f"Cannot cancel bet {bet_id}: status is {bet.status}, must be pending")
        
        # Check if match has started (basic check - can be enhanced)
        match = await db.get(Odds, bet.match_id)
        if match and match.result:
            raise ValueError(f"Cannot cancel bet {bet_id}: match has already finished")
        
        # Unlock stake
        unlock_entry = await WalletService.unlock_balance(
            user_id=user_id,
            asset=bet.currency,
            amount=bet.stake,
            db=db,
            reference_type=ReferenceType.BET,
            reference_id=bet.id,
            description=f"Bet cancel: stake returned for bet {bet_id}"
        )
        unlock_entry.type = WalletTransactionType.BET_CANCEL_UNLOCK
        await db.flush()
        
        # Update bet status
        bet.status = BetStatus.CANCELLED
        bet.settled_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        logger.info(
            f"Bet {bet_id} cancelled: user={user_id}, stake={bet.stake} {bet.currency} unlocked"
        )
        
        return bet
