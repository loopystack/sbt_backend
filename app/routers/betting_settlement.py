from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
from typing import List
from datetime import datetime, timezone
import logging

from app.core.database import get_db
from app.models.odds import Odds
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/settle-finished-matches")
async def settle_finished_matches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Settle all bets for matches that have finished (have results).
    This should be called periodically or triggered when match results are updated.
    """
    try:
        # Find all unsettled bets for matches that now have results
        # Use match_id when available, fallback to team name matching for older bets
        query = select(BettingRecord, Odds).join(
            Odds, 
            and_(
                # Primary: Use match_id if available
                (BettingRecord.match_id == Odds.id) |
                # Fallback: Team name matching for older bets without match_id
                (
                    and_(
                        BettingRecord.match_id.is_(None),
                        BettingRecord.match_teams.contains(Odds.home_team),
                        BettingRecord.match_teams.contains(Odds.away_team)
                    )
                )
            )
        ).where(
            and_(
                BettingRecord.is_settled == False,
                Odds.result.isnot(None),  # Match has a result
                Odds.result != ""  # Result is not empty
            )
        )
        
        result = await db.execute(query)
        unsettled_bets = result.all()
        
        settled_count = 0
        total_winnings = 0.0
        
        for betting_record, odds in unsettled_bets:
            # Parse the match result (e.g., "1-5" means home:1, away:5)
            try:
                home_score, away_score = map(int, odds.result.split("-"))
            except (ValueError, AttributeError):
                logger.warning(f"Invalid result format for match {odds.id}: {odds.result}")
                continue
            
            # Determine actual match outcome
            if home_score > away_score:
                actual_outcome = "home"
            elif away_score > home_score:
                actual_outcome = "away"
            else:
                actual_outcome = "draw"
            
            # Check if user's bet was correct
            user_bet_outcome = betting_record.selected_outcome.lower()
            bet_won = (user_bet_outcome == actual_outcome)
            
            # Calculate winnings
            if bet_won:
                # User wins: get back bet amount + profit
                winnings = betting_record.bet_amount * betting_record.odds_decimal
                profit = winnings - betting_record.bet_amount
                bet_status = "won"
            else:
                # User loses: lose the bet amount
                winnings = 0.0
                profit = -betting_record.bet_amount
                bet_status = "lost"
            
            # Update betting record
            betting_record.bet_status = bet_status
            betting_record.actual_profit = profit
            betting_record.is_settled = True
            betting_record.settlement_date = datetime.now(timezone.utc).replace(tzinfo=None)
            betting_record.match_status = "finished"
            
            # Always create transaction records for both wins and losses
            user = await db.get(User, betting_record.user_id)
            if user:
                old_balance = float(user.funds_usd)
                
                if bet_won and winnings > 0:
                    # Update balance for wins
                    new_balance = old_balance + winnings
                    user.funds_usd = new_balance
                    
                    # Create winning transaction
                    transaction = Transaction(
                        user_id=user.id,
                        transaction_type="bet_won",
                        amount=winnings,
                        balance_before=old_balance,
                        balance_after=new_balance,
                        description=f"🏆 Bet Won: {betting_record.match_teams} - {betting_record.selected_outcome} (Profit: +${profit:.2f})",
                        reference_id=str(betting_record.id),
                        reference_type="betting_record",
                        status="completed",
                        payment_method="betting_settlement"
                    )
                    db.add(transaction)
                    total_winnings += winnings
                else:
                    # Balance stays same for losses (money already deducted when bet placed)
                    new_balance = old_balance
                    
                    # Create losing transaction for history tracking
                    transaction = Transaction(
                        user_id=user.id,
                        transaction_type="bet_lost",
                        amount=0.0,  # No money added/removed (already deducted when bet was placed)
                        balance_before=old_balance,
                        balance_after=new_balance,
                        description=f"❌ Bet Lost: {betting_record.match_teams} - {betting_record.selected_outcome} (Loss: -${betting_record.bet_amount:.2f})",
                        reference_id=str(betting_record.id),
                        reference_type="betting_record",
                        status="completed",
                        payment_method="betting_settlement"
                    )
                    db.add(transaction)
            
            settled_count += 1
            logger.info(f"Settled bet {betting_record.id}: {bet_status}, profit: {profit}")
        
        # Commit all changes
        await db.commit()
        
        return {
            "message": f"Successfully settled {settled_count} bets",
            "settled_bets": settled_count,
            "total_winnings_paid": total_winnings
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error settling bets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error settling bets: {str(e)}")


@router.post("/settle-specific-match/{match_id}")
async def settle_specific_match(
    match_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Settle all bets for a specific match by match ID.
    Useful for testing or manual settlement.
    """
    try:
        # Get the match
        odds = await db.get(Odds, match_id)
        if not odds:
            raise HTTPException(status_code=404, detail="Match not found")
        
        if not odds.result:
            raise HTTPException(status_code=400, detail="Match has no result yet")
        
        # Find all unsettled bets for this match
        # Use match_id when available, fallback to team name matching
        query = select(BettingRecord).where(
            and_(
                BettingRecord.is_settled == False,
                # Primary: Use match_id if available
                (BettingRecord.match_id == match_id) |
                # Fallback: Team name matching for older bets without match_id
                (
                    and_(
                        BettingRecord.match_id.is_(None),
                        BettingRecord.match_teams.contains(odds.home_team),
                        BettingRecord.match_teams.contains(odds.away_team)
                    )
                )
            )
        )
        
        result = await db.execute(query)
        unsettled_bets = result.scalars().all()
        
        if not unsettled_bets:
            return {"message": "No unsettled bets found for this match"}
        
        # Parse match result
        try:
            home_score, away_score = map(int, odds.result.split("-"))
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail=f"Invalid result format: {odds.result}")
        
        # Determine actual outcome
        if home_score > away_score:
            actual_outcome = "home"
        elif away_score > home_score:
            actual_outcome = "away"
        else:
            actual_outcome = "draw"
        
        settled_count = 0
        total_winnings = 0.0
        
        for betting_record in unsettled_bets:
            # Check if bet won
            user_bet_outcome = betting_record.selected_outcome.lower()
            bet_won = (user_bet_outcome == actual_outcome)
            
            # Calculate results
            if bet_won:
                winnings = betting_record.bet_amount * betting_record.odds_decimal
                profit = winnings - betting_record.bet_amount
                bet_status = "won"
            else:
                winnings = 0.0
                profit = -betting_record.bet_amount
                bet_status = "lost"
            
            # Update betting record
            betting_record.bet_status = bet_status
            betting_record.actual_profit = profit
            betting_record.is_settled = True
            betting_record.settlement_date = datetime.now(timezone.utc).replace(tzinfo=None)
            betting_record.match_status = "finished"
            
            # Update user balance and create transaction
            user = await db.get(User, betting_record.user_id)
            if user:
                old_balance = float(user.funds_usd)
                
                if bet_won and winnings > 0:
                    new_balance = old_balance + winnings
                    user.funds_usd = new_balance
                    
                    transaction = Transaction(
                        user_id=user.id,
                        transaction_type="bet_won",
                        amount=winnings,
                        balance_before=old_balance,
                        balance_after=new_balance,
                        description=f"Bet won: {odds.home_team} vs {odds.away_team} ({odds.result}) - {betting_record.selected_outcome}",
                        reference_id=str(betting_record.id),
                        reference_type="betting_record",
                        status="completed"
                    )
                    total_winnings += winnings
                else:
                    new_balance = old_balance
                    transaction = Transaction(
                        user_id=user.id,
                        transaction_type="bet_lost",
                        amount=0.0,
                        balance_before=old_balance,
                        balance_after=new_balance,
                        description=f"Bet lost: {odds.home_team} vs {odds.away_team} ({odds.result}) - {betting_record.selected_outcome}",
                        reference_id=str(betting_record.id),
                        reference_type="betting_record",
                        status="completed"
                    )
                
                db.add(transaction)
            
            settled_count += 1
        
        await db.commit()
        
        return {
            "message": f"Successfully settled {settled_count} bets for match: {odds.home_team} vs {odds.away_team}",
            "match_result": odds.result,
            "actual_outcome": actual_outcome,
            "settled_bets": settled_count,
            "total_winnings_paid": total_winnings
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error settling match {match_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error settling match: {str(e)}")


@router.get("/unsettled-bets")
async def get_unsettled_bets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all unsettled bets with their corresponding match information.
    """
    try:
        query = select(BettingRecord, Odds).join(
            Odds,
            and_(
                BettingRecord.match_teams.contains(Odds.home_team),
                BettingRecord.match_teams.contains(Odds.away_team)
            )
        ).where(BettingRecord.is_settled == False)
        
        result = await db.execute(query)
        unsettled_bets = result.all()
        
        bets_info = []
        for betting_record, odds in unsettled_bets:
            bets_info.append({
                "bet_id": betting_record.id,
                "user_id": betting_record.user_id,
                "match_teams": betting_record.match_teams,
                "selected_outcome": betting_record.selected_outcome,
                "bet_amount": betting_record.bet_amount,
                "potential_win": betting_record.potential_win,
                "odds_decimal": betting_record.odds_decimal,
                "match_result": odds.result,
                "match_date": odds.date,
                "can_settle": odds.result is not None and odds.result != ""
            })
        
        return {
            "unsettled_bets": bets_info,
            "total_count": len(bets_info)
        }
        
    except Exception as e:
        logger.error(f"Error getting unsettled bets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting unsettled bets: {str(e)}")
