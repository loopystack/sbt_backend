from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from typing import List
from datetime import datetime
import logging

from app.core.database import get_db
from app.models.odds import Odds
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/settle-all-finished")
async def settle_all_finished_matches(
    db: AsyncSession = Depends(get_db)
):
    """
    BULLETPROOF settlement system that handles all finished matches.
    Uses match_id when available, falls back to smart team matching.
    """
    try:
        print("🎯 Starting bulletproof settlement system...")
        
        # First, ensure match_id column exists
        try:
            await db.execute(text("SELECT match_id FROM betting_records LIMIT 1"))
            print("✅ match_id column exists")
        except:
            print("🔧 Adding match_id column...")
            await db.execute(text("ALTER TABLE betting_records ADD COLUMN match_id INTEGER"))
            await db.commit()
            print("✅ match_id column added")
        
        # Find all finished matches (have results)
        finished_matches_query = select(Odds).where(
            and_(
                Odds.result.isnot(None),
                Odds.result != "",
                Odds.result != "null"
            )
        )
        
        finished_matches_result = await db.execute(finished_matches_query)
        finished_matches = finished_matches_result.scalars().all()
        
        print(f"📊 Found {len(finished_matches)} finished matches")
        
        total_settled = 0
        total_winnings = 0.0
        
        for match in finished_matches:
            print(f"\n🏟️  Processing match: {match.home_team} vs {match.away_team} ({match.result})")
            
            # Find unsettled bets for this match using BULLETPROOF matching
            unsettled_bets_query = select(BettingRecord).where(
                and_(
                    BettingRecord.is_settled == False,
                    # BULLETPROOF: Use match_id if available, otherwise team matching
                    (BettingRecord.match_id == match.id) |
                    (
                        and_(
                            # Only use team matching if match_id is null AND teams match exactly
                            BettingRecord.match_id.is_(None),
                            BettingRecord.match_teams == f"{match.home_team} vs {match.away_team}"
                        )
                    )
                )
            )
            
            unsettled_result = await db.execute(unsettled_bets_query)
            unsettled_bets = unsettled_result.scalars().all()
            
            if not unsettled_bets:
                continue
                
            print(f"   🎯 Found {len(unsettled_bets)} unsettled bet(s)")
            
            # Parse match result
            try:
                home_score, away_score = map(int, match.result.split("-"))
            except (ValueError, AttributeError):
                print(f"   ⚠️ Invalid result format: {match.result}")
                continue
            
            # Determine winner
            if home_score > away_score:
                actual_outcome = "home"
                winner = match.home_team
            elif away_score > home_score:
                actual_outcome = "away"
                winner = match.away_team
            else:
                actual_outcome = "draw"
                winner = "Draw"
            
            print(f"   🏆 Winner: {winner} ({actual_outcome})")
            
            # Process each bet
            for bet in unsettled_bets:
                user_bet = bet.selected_outcome.lower()
                bet_won = (user_bet == actual_outcome)
                
                print(f"   📝 Bet #{bet.id}: ${bet.bet_amount} on {bet.selected_outcome}")
                
                if bet_won:
                    # Calculate winnings
                    winnings = bet.bet_amount * bet.odds_decimal
                    profit = winnings - bet.bet_amount
                    
                    print(f"      ✅ WON! Profit: ${profit:.2f}")
                    
                    # Update user balance
                    user = await db.get(User, bet.user_id)
                    if user:
                        old_balance = float(user.funds_usd)
                        new_balance = old_balance + winnings
                        user.funds_usd = new_balance
                        
                        # Create winning transaction
                        transaction = Transaction(
                            user_id=user.id,
                            transaction_type="bet_won",
                            amount=winnings,
                            balance_before=old_balance,
                            balance_after=new_balance,
                            description=f"Bet won: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome}",
                            reference_id=str(bet.id),
                            reference_type="betting_record",
                            status="completed"
                        )
                        db.add(transaction)
                        total_winnings += winnings
                        
                        print(f"      💰 Balance: ${old_balance:.2f} → ${new_balance:.2f}")
                else:
                    profit = -bet.bet_amount
                    print(f"      ❌ LOST: ${bet.bet_amount:.2f}")
                    
                    # Create losing transaction for history
                    user = await db.get(User, bet.user_id)
                    if user:
                        balance = float(user.funds_usd)
                        transaction = Transaction(
                            user_id=user.id,
                            transaction_type="bet_lost",
                            amount=0.0,
                            balance_before=balance,
                            balance_after=balance,
                            description=f"Bet lost: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome}",
                            reference_id=str(bet.id),
                            reference_type="betting_record",
                            status="completed"
                        )
                        db.add(transaction)
                
                # Update betting record
                bet.bet_status = "won" if bet_won else "lost"
                bet.actual_profit = profit
                bet.is_settled = True
                bet.settlement_date = datetime.utcnow()
                bet.match_status = "finished"
                
                total_settled += 1
        
        await db.commit()
        
        print(f"\n🎉 BULLETPROOF SETTLEMENT COMPLETE!")
        print(f"   Matches processed: {len(finished_matches)}")
        print(f"   Bets settled: {total_settled}")
        print(f"   Total winnings paid: ${total_winnings:.2f}")
        
        return {
            "message": f"Successfully settled {total_settled} bets across {len(finished_matches)} matches",
            "matches_processed": len(finished_matches),
            "bets_settled": total_settled,
            "total_winnings_paid": total_winnings
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Settlement error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Settlement failed: {str(e)}")


@router.get("/check-settlement-status")
async def check_settlement_status(db: AsyncSession = Depends(get_db)):
    """
    Check the current settlement status - useful for debugging
    """
    try:
        # Count finished matches
        finished_count_result = await db.execute(
            select(Odds).where(
                and_(
                    Odds.result.isnot(None),
                    Odds.result != "",
                    Odds.result != "null"
                )
            )
        )
        finished_matches = finished_count_result.scalars().all()
        
        # Count unsettled bets
        unsettled_count_result = await db.execute(
            select(BettingRecord).where(BettingRecord.is_settled == False)
        )
        unsettled_bets = unsettled_count_result.scalars().all()
        
        # Count bets with match_id vs without
        bets_with_id = len([b for b in unsettled_bets if hasattr(b, 'match_id') and b.match_id])
        bets_without_id = len(unsettled_bets) - bets_with_id
        
        return {
            "finished_matches": len(finished_matches),
            "unsettled_bets": len(unsettled_bets),
            "bets_with_match_id": bets_with_id,
            "bets_without_match_id": bets_without_id,
            "settlement_ready": len(finished_matches) > 0 and len(unsettled_bets) > 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")
