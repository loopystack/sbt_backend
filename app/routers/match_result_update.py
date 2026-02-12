from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone, time as dt_time
import asyncio

from app.core.database import get_db
from app.models.odds import Odds
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User
from app.services.email_service import email_service

router = APIRouter()


def _is_valid_football_result(result: str) -> bool:
    """Only treat as a real match score. Rejects scraper garbage like 18-17 or 19-523."""
    if not result or not result.strip():
        return False
    parts = result.strip().split("-")
    if len(parts) != 2:
        return False
    try:
        a, b = int(parts[0]), int(parts[1])
        return 0 <= a <= 15 and 0 <= b <= 15
    except ValueError:
        return False


def _match_has_been_played(match) -> bool:
    """True only if match date+time is in the past. Never settle future matches."""
    match_date = getattr(match, "date", None)
    if not match_date:
        return False
    match_time = getattr(match, "time", None) or dt_time.min
    try:
        match_dt = datetime.combine(match_date, match_time).replace(tzinfo=timezone.utc)
        return match_dt < datetime.now(timezone.utc)
    except (TypeError, ValueError):
        return False


@router.put("/update-result/{match_id}")
async def update_match_result_and_settle(
    match_id: int,
    result: str,
    db: AsyncSession = Depends(get_db)
):
    """
    AUTOMATIC SETTLEMENT SYSTEM: Update match result and automatically settle all bets.
    
    This endpoint:
    1. Updates the match result in the database
    2. Automatically finds all unsettled bets for this match
    3. Determines winners/losers based on the result
    4. Updates user balances and creates transaction records
    5. Marks bets as settled
    
    Args:
        match_id: ID of the match to update
        result: Match result in format "home_score-away_score" (e.g., "2-1", "0-0")
    
    Returns:
        Settlement summary with number of bets processed and winnings paid
    """
    try:
        print(f"🎯 AUTOMATIC SETTLEMENT: Updating match {match_id} result to '{result}'")
        
        # Get the match
        match_result = await db.execute(select(Odds).where(Odds.id == match_id))
        match = match_result.scalar_one_or_none()
        
        if not match:
            raise HTTPException(status_code=404, detail=f"Match {match_id} not found")
        
        if not _is_valid_football_result(result):
            raise HTTPException(
                status_code=400,
                detail="Invalid result format or impossible score (use e.g. 2-1; each side must be 0-15)"
            )
        
        print(f"🏟️  Match: {match.home_team} vs {match.away_team}")
        
        # Update the match result
        match.result = result
        print(f"✅ Updated result: {result}")
        
        # Only settle bets if the match has actually been played (date+time in the past)
        if not _match_has_been_played(match):
            await db.commit()
            return {
                "message": "Result saved. Match has not been played yet; no bets were settled.",
                "match": f"{match.home_team} vs {match.away_team}",
                "result": result,
                "bets_settled": 0,
                "total_winnings": 0.0,
                "settlement_details": []
            }
        
        # AUTOMATIC SETTLEMENT: Process all bets for this match
        settlement_result = await settle_match_bets_automatically(match, db)
        
        await db.commit()
        
        print(f"🎉 AUTOMATIC SETTLEMENT COMPLETE!")
        print(f"   Match: {match.home_team} vs {match.away_team} = {result}")
        print(f"   Bets settled: {settlement_result['bets_settled']}")
        print(f"   Total winnings: ${settlement_result['total_winnings']:.2f}")
        
        return {
            "message": f"Match result updated and {settlement_result['bets_settled']} bets automatically settled",
            "match": f"{match.home_team} vs {match.away_team}",
            "result": result,
            "bets_settled": settlement_result['bets_settled'],
            "total_winnings": settlement_result['total_winnings'],
            "settlement_details": settlement_result['details']
        }
        
    except Exception as e:
        await db.rollback()
        print(f"❌ Automatic settlement error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Automatic settlement failed: {str(e)}")


async def settle_match_bets_automatically(match: Odds, db: AsyncSession):
    """
    AUTOMATIC SETTLEMENT: Settle all bets for a specific match.
    This is the core automatic settlement logic.
    """
    try:
        print(f"\n🏟️  AUTOMATIC SETTLEMENT: Processing {match.home_team} vs {match.away_team} ({match.result})")
        
        # Find unsettled bets: by match_id OR by same teams (catches duplicate odds rows)
        teams_str = f"{match.home_team} vs {match.away_team}"
        unsettled_bets_query = select(BettingRecord).where(
            and_(
                BettingRecord.is_settled == False,
                (BettingRecord.match_id == match.id) | (BettingRecord.match_teams == teams_str)
            )
        )
        
        unsettled_result = await db.execute(unsettled_bets_query)
        unsettled_bets = unsettled_result.scalars().all()
        
        if not unsettled_bets:
            print(f"   ℹ️  No unsettled bets found for this match")
            return {"bets_settled": 0, "total_winnings": 0.0, "details": []}
            
        print(f"   🎯 Found {len(unsettled_bets)} unsettled bet(s)")
        
        # Parse match result
        try:
            home_score, away_score = map(int, match.result.split("-"))
        except (ValueError, AttributeError):
            print(f"   ⚠️ Invalid result format: {match.result}")
            return {"bets_settled": 0, "total_winnings": 0.0, "details": []}
        
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
        
        total_settled = 0
        total_winnings = 0.0
        settlement_details = []
        
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
                        amount=winnings,  # Total return amount
                        balance_before=old_balance,
                        balance_after=new_balance,
                        description=f"🏆 Bet Won: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome} (Profit: +${profit:.2f})",
                        reference_id=str(bet.id),
                        reference_type="betting_record",
                        status="completed",
                        payment_method="betting_settlement"
                    )
                    db.add(transaction)
                    total_winnings += winnings
                    
                    print(f"      💰 Balance: ${old_balance:.2f} → ${new_balance:.2f}")
                    print(f"      📝 Transaction created: bet_won, amount: ${winnings:.2f}")
                    
                    # Send email notification to user
                    try:
                        asyncio.create_task(
                            email_service.send_bet_settlement_email(
                                email=user.email,
                                username=user.username,
                                match_teams=f"{match.home_team} vs {match.away_team}",
                                match_result=match.result,
                                bet_outcome=bet.selected_outcome,
                                bet_won=True,
                                bet_amount=bet.bet_amount,
                                winnings=winnings,
                                profit=profit
                            )
                        )
                        print(f"      📧 Email notification sent to {user.email}")
                    except Exception as email_error:
                        print(f"      ⚠️ Failed to send email: {str(email_error)}")
                    
                    settlement_details.append({
                        "bet_id": bet.id,
                        "user_id": user.id,
                        "outcome": "won",
                        "profit": profit,
                        "winnings": winnings
                    })
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
                        amount=0.0,  # No money added (loss already deducted when bet placed)
                        balance_before=balance,
                        balance_after=balance,
                        description=f"❌ Bet Lost: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome} (Loss: -${bet.bet_amount:.2f})",
                        reference_id=str(bet.id),
                        reference_type="betting_record",
                        status="completed",
                        payment_method="betting_settlement"
                    )
                    db.add(transaction)
                    print(f"      📝 Transaction created: bet_lost, loss: ${bet.bet_amount:.2f}")
                    
                    # Send email notification to user
                    try:
                        asyncio.create_task(
                            email_service.send_bet_settlement_email(
                                email=user.email,
                                username=user.username,
                                match_teams=f"{match.home_team} vs {match.away_team}",
                                match_result=match.result,
                                bet_outcome=bet.selected_outcome,
                                bet_won=False,
                                bet_amount=bet.bet_amount,
                                winnings=0.0,
                                profit=profit
                            )
                        )
                        print(f"      📧 Email notification sent to {user.email}")
                    except Exception as email_error:
                        print(f"      ⚠️ Failed to send email: {str(email_error)}")
                    
                    settlement_details.append({
                        "bet_id": bet.id,
                        "user_id": user.id,
                        "outcome": "lost",
                        "profit": profit,
                        "winnings": 0
                    })
            
            # Update betting record
            bet.bet_status = "won" if bet_won else "lost"
            bet.actual_profit = profit
            bet.is_settled = True
            bet.settlement_date = datetime.now(timezone.utc).replace(tzinfo=None)
            bet.match_status = "finished"
            
            total_settled += 1
        
        return {
            "bets_settled": total_settled,
            "total_winnings": total_winnings,
            "details": settlement_details
        }
        
    except Exception as e:
        print(f"❌ Settlement error for match {match.id}: {str(e)}")
        raise e


@router.get("/settlement-status/{match_id}")
async def check_match_settlement_status(match_id: int, db: AsyncSession = Depends(get_db)):
    """
    Check settlement status for a specific match
    """
    try:
        # Get the match
        match_result = await db.execute(select(Odds).where(Odds.id == match_id))
        match = match_result.scalar_one_or_none()
        
        if not match:
            raise HTTPException(status_code=404, detail=f"Match {match_id} not found")
        
        # Count unsettled bets for this match
        unsettled_count_result = await db.execute(
            select(BettingRecord).where(
                and_(
                    BettingRecord.is_settled == False,
                    (BettingRecord.match_id == match.id) |
                    (
                        and_(
                            BettingRecord.match_id.is_(None),
                            BettingRecord.match_teams == f"{match.home_team} vs {match.away_team}"
                        )
                    )
                )
            )
        )
        unsettled_bets = unsettled_count_result.scalars().all()
        
        return {
            "match": f"{match.home_team} vs {match.away_team}",
            "result": match.result,
            "unsettled_bets": len(unsettled_bets),
            "ready_for_settlement": match.result is not None and len(unsettled_bets) > 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")
