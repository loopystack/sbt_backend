from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, and_, select, func
from datetime import datetime, timezone

from ..core.deps import get_db, get_current_user
from ..models.user import User
from ..models.transaction import Transaction
from ..models.betting_record import BettingRecord
from ..models.odds import Odds
from ..schemas.transaction import (
    TransactionCreate, 
    TransactionResponse, 
    Transaction as TransactionSchema,
    TransactionSummary
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

async def auto_settle_user_bets(db: AsyncSession, user_id: int):
    """
    AUTOMATIC SETTLEMENT: Automatically settle all unsettled bets for a user
    This runs every time the user fetches their transaction records
    """
    try:
        # Find all unsettled bets for this user
        unsettled_query = select(BettingRecord).where(
            and_(
                BettingRecord.user_id == user_id,
                BettingRecord.is_settled == False
            )
        )
        
        result = await db.execute(unsettled_query)
        unsettled_bets = result.scalars().all()
        
        if not unsettled_bets:
            return  # No unsettled bets
        
        print(f"🤖 AUTO-SETTLEMENT: Found {len(unsettled_bets)} unsettled bets for user {user_id}")
        
        settled_count = 0
        
        # Process each unsettled bet
        for bet in unsettled_bets:
            # Find the match for this bet
            match = None
            
            # Try to find by match_id first
            if bet.match_id:
                match = await db.get(Odds, bet.match_id)
            
            # If not found, try to find by team names
            if not match:
                try:
                    teams = bet.match_teams.split(" vs ")
                    if len(teams) == 2:
                        match_query = select(Odds).where(
                            and_(
                                Odds.home_team == teams[0].strip(),
                                Odds.away_team == teams[1].strip()
                            )
                        )
                        match_result = await db.execute(match_query)
                        match = match_result.scalar_one_or_none()
                except:
                    pass
            
            if not match or not match.result:
                continue  # Skip if no match found or no result
            
            print(f"   🏟️  Settling: {bet.match_teams} ({match.result})")
            
            # Parse result and determine winner
            try:
                home_score, away_score = map(int, match.result.split("-"))
            except (ValueError, AttributeError):
                continue
            
            if home_score > away_score:
                actual_outcome = "home"
            elif away_score > home_score:
                actual_outcome = "away"
            else:
                actual_outcome = "draw"
            
            # Check if bet won
            user_bet = bet.selected_outcome.lower()
            bet_won = (user_bet == actual_outcome)
            
            # Calculate winnings and update
            if bet_won:
                winnings = bet.bet_amount * bet.odds_decimal
                profit = winnings - bet.bet_amount
                
                # Update user balance
                user = await db.get(User, user_id)
                if user:
                    old_balance = float(user.funds_usd)
                    new_balance = old_balance + winnings
                    user.funds_usd = new_balance
                    
                    # Create winning transaction
                    transaction = Transaction(
                        user_id=user_id,
                        transaction_type="bet_won",
                        amount=winnings,
                        balance_before=old_balance,
                        balance_after=new_balance,
                        description=f"🏆 Bet Won: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome} (Profit: +${profit:.2f})",
                        reference_id=str(bet.id),
                        reference_type="betting_record",
                        status="completed",
                        payment_method="auto_settlement"
                    )
                    db.add(transaction)
                    
                    print(f"      ✅ WON! Profit: ${profit:.2f}")
            else:
                profit = -bet.bet_amount
                
                # Create losing transaction
                user = await db.get(User, user_id)
                if user:
                    balance = float(user.funds_usd)
                    transaction = Transaction(
                        user_id=user_id,
                        transaction_type="bet_lost",
                        amount=0.0,
                        balance_before=balance,
                        balance_after=balance,
                        description=f"❌ Bet Lost: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome} (Loss: -${bet.bet_amount:.2f})",
                        reference_id=str(bet.id),
                        reference_type="betting_record",
                        status="completed",
                        payment_method="auto_settlement"
                    )
                    db.add(transaction)
                    
                    print(f"      ❌ LOST: ${bet.bet_amount:.2f}")
            
            # Update betting record
            bet.bet_status = "won" if bet_won else "lost"
            bet.actual_profit = profit
            bet.is_settled = True
            bet.settlement_date = datetime.now(timezone.utc).replace(tzinfo=None)
            bet.match_status = "finished"
            
            settled_count += 1
        
        if settled_count > 0:
            await db.commit()
            print(f"   🎉 Auto-settled {settled_count} bet(s) for user {user_id}")
        
    except Exception as e:
        print(f"❌ Auto-settlement error for user {user_id}: {str(e)}")
        # Don't raise exception - we don't want to break the API call

@router.post("/", response_model=TransactionSchema)
async def create_transaction(
    transaction: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new transaction record"""
    try:
        db_transaction = Transaction(
            user_id=current_user.id,
            **transaction.model_dump()
        )
        db.add(db_transaction)
        await db.commit()
        await db.refresh(db_transaction)
        return db_transaction
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create transaction: {str(e)}")

@router.get("/", response_model=TransactionResponse)
async def get_transactions(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Transactions per page"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's transaction history with pagination"""
    try:
        print(f"🔍 Fetching transactions for user {current_user.id} (page={page}, per_page={per_page})")
        
        # 🤖 AUTOMATIC SETTLEMENT: Run settlement before fetching transactions
        await auto_settle_user_bets(db, current_user.id)
        
        # Base query
        query = select(Transaction).where(Transaction.user_id == current_user.id)
        
        # Apply filters
        if transaction_type:
            query = query.where(Transaction.transaction_type == transaction_type)
        if status:
            query = query.where(Transaction.status == status)
        
        # Get total count
        count_query = select(func.count()).select_from(Transaction).where(Transaction.user_id == current_user.id)
        if transaction_type:
            count_query = count_query.where(Transaction.transaction_type == transaction_type)
        if status:
            count_query = count_query.where(Transaction.status == status)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination and ordering (newest first)
        query = query.order_by(desc(Transaction.created_at)).offset((page - 1) * per_page).limit(per_page)
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Calculate total pages
        total_pages = (total + per_page - 1) // per_page
        
        print(f"✅ Found {len(transactions)} transactions out of {total} total for user {current_user.id}")
        
        return TransactionResponse(
            transactions=transactions,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        print(f"❌ Error fetching transactions: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch transactions: {str(e)}")

@router.get("/summary", response_model=TransactionSummary)
async def get_transaction_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's transaction summary statistics"""
    try:
        # Get all transactions for the user
        query = select(Transaction).where(Transaction.user_id == current_user.id)
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Calculate summary statistics
        total_deposits = sum(t.amount for t in transactions if t.transaction_type == 'deposit' and t.status == 'completed')
        total_withdrawals = sum(abs(t.amount) for t in transactions if t.transaction_type == 'withdrawal' and t.status == 'completed')
        total_bets = sum(abs(t.amount) for t in transactions if t.transaction_type == 'bet_placed' and t.status == 'completed')
        total_winnings = sum(t.amount for t in transactions if t.transaction_type == 'bet_won' and t.status == 'completed')
        
        net_balance = total_deposits + total_winnings - total_withdrawals - total_bets
        transaction_count = len([t for t in transactions if t.status == 'completed'])
        
        return TransactionSummary(
            total_deposits=total_deposits,
            total_withdrawals=total_withdrawals,
            total_bets=total_bets,
            total_winnings=total_winnings,
            net_balance=net_balance,
            transaction_count=transaction_count
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch transaction summary: {str(e)}")

@router.get("/{transaction_id}", response_model=TransactionSchema)
async def get_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific transaction by ID"""
    try:
        query = select(Transaction).where(
            and_(
                Transaction.id == transaction_id,
                Transaction.user_id == current_user.id
            )
        )
        result = await db.execute(query)
        transaction = result.scalar_one_or_none()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return transaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch transaction: {str(e)}")
