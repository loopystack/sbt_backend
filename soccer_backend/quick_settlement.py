#!/usr/bin/env python3
"""
QUICK SETTLEMENT: Run this script after updating match results in the database
This will automatically settle all bets for matches with results
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import AsyncSessionLocal
from app.models.odds import Odds
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User
from datetime import datetime

async def quick_settlement():
    """Quick settlement for all matches with results"""
    
    print("⚡ QUICK SETTLEMENT - SETTLING ALL BETS")
    print("=" * 40)
    
    async with AsyncSessionLocal() as db:
        try:
            # Find all unsettled bets
            print("🔍 Finding all unsettled bets...")
            
            unsettled_query = select(BettingRecord).where(
                BettingRecord.is_settled == False
            )
            
            result = await db.execute(unsettled_query)
            unsettled_bets = result.scalars().all()
            
            if not unsettled_bets:
                print("✅ No unsettled bets found!")
                return
            
            print(f"📝 Found {len(unsettled_bets)} unsettled bet(s)")
            
            total_settled = 0
            total_winnings = 0.0
            
            # Process each unsettled bet
            for bet in unsettled_bets:
                print(f"\n📝 Processing bet #{bet.id}:")
                print(f"   Match: {bet.match_teams}")
                print(f"   Amount: ${bet.bet_amount}")
                print(f"   Outcome: {bet.selected_outcome}")
                print(f"   User ID: {bet.user_id}")
                
                # Find the match for this bet
                match = None
                
                # Try to find by match_id first
                if bet.match_id:
                    match = await db.get(Odds, bet.match_id)
                
                # If not found, try to find by team names
                if not match:
                    match_query = select(Odds).where(
                        Odds.home_team == bet.match_teams.split(" vs ")[0],
                        Odds.away_team == bet.match_teams.split(" vs ")[1]
                    )
                    match_result = await db.execute(match_query)
                    match = match_result.scalar_one_or_none()
                
                if not match:
                    print(f"   ❌ Match not found for: {bet.match_teams}")
                    continue
                
                if not match.result:
                    print(f"   ⏳ Match has no result yet: {match.result}")
                    continue
                
                print(f"   🏟️  Match found: {match.home_team} vs {match.away_team}")
                print(f"   🏆 Result: {match.result}")
                
                # Parse result and determine winner
                try:
                    home_score, away_score = map(int, match.result.split("-"))
                except (ValueError, AttributeError):
                    print(f"   ⚠️ Invalid result format: {match.result}")
                    continue
                
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
                
                # Check if bet won
                user_bet = bet.selected_outcome.lower()
                bet_won = (user_bet == actual_outcome)
                
                print(f"   🎯 User bet on: {user_bet}")
                print(f"   {'✅ WON!' if bet_won else '❌ LOST!'}")
                
                # Calculate winnings and update
                if bet_won:
                    winnings = bet.bet_amount * bet.odds_decimal
                    profit = winnings - bet.bet_amount
                    
                    print(f"   💰 Winnings: ${winnings:.2f}")
                    print(f"   💰 Profit: ${profit:.2f}")
                    
                    # Update user balance
                    user = await db.get(User, bet.user_id)
                    if user:
                        old_balance = float(user.funds_usd)
                        new_balance = old_balance + winnings
                        user.funds_usd = new_balance
                        
                        print(f"   💰 Balance: ${old_balance:.2f} → ${new_balance:.2f}")
                        
                        # Create transaction
                        transaction = Transaction(
                            user_id=user.id,
                            transaction_type="bet_won",
                            amount=winnings,
                            balance_before=old_balance,
                            balance_after=new_balance,
                            description=f"🏆 Bet Won: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome} (Profit: +${profit:.2f})",
                            reference_id=str(bet.id),
                            reference_type="betting_record",
                            status="completed",
                            payment_method="quick_settlement"
                        )
                        db.add(transaction)
                        total_winnings += winnings
                else:
                    profit = -bet.bet_amount
                    print(f"   💸 Loss: ${bet.bet_amount:.2f}")
                    
                    # Create losing transaction
                    user = await db.get(User, bet.user_id)
                    if user:
                        balance = float(user.funds_usd)
                        transaction = Transaction(
                            user_id=user.id,
                            transaction_type="bet_lost",
                            amount=0.0,
                            balance_before=balance,
                            balance_after=balance,
                            description=f"❌ Bet Lost: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome} (Loss: -${bet.bet_amount:.2f})",
                            reference_id=str(bet.id),
                            reference_type="betting_record",
                            status="completed",
                            payment_method="quick_settlement"
                        )
                        db.add(transaction)
                
                # Update betting record
                bet.bet_status = "won" if bet_won else "lost"
                bet.actual_profit = profit
                bet.is_settled = True
                bet.settlement_date = datetime.utcnow()
                bet.match_status = "finished"
                
                total_settled += 1
                print(f"   ✅ Betting record updated")
            
            # Commit all changes
            await db.commit()
            
            print(f"\n🎉 QUICK SETTLEMENT COMPLETE!")
            print(f"✅ Total bets settled: {total_settled}")
            print(f"✅ Total winnings paid: ${total_winnings:.2f}")
            print(f"✅ All changes saved to database")
            print(f"\n🚀 Refresh your Dashboard to see the changes!")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Settlement failed: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(quick_settlement())
