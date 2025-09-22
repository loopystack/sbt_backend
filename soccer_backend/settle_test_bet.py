#!/usr/bin/env python3
"""
Script to settle the test bet directly without API authentication.
This will process the Manchester City bet and update balances.
"""

import asyncio
from datetime import datetime
from app.models.odds import Odds
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User
from app.core.database import AsyncSessionLocal
from sqlalchemy import select, and_

async def settle_test_bet():
    """Settle the Manchester City test bet directly"""
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔄 Settling Manchester City test bet...")
            
            # Find the finished match
            match_result = await session.execute(
                select(Odds).where(
                    Odds.home_team == "Burnley",
                    Odds.away_team == "Manchester City",
                    Odds.result == "1-5"
                )
            )
            match = match_result.first()
            if not match:
                print("❌ Finished match not found!")
                return
            
            odds = match[0]
            print(f"✅ Found finished match: {odds.home_team} vs {odds.away_team} - {odds.result}")
            
            # Find unsettled bets for this match
            bets_result = await session.execute(
                select(BettingRecord).where(
                    and_(
                        BettingRecord.is_settled == False,
                        BettingRecord.match_teams.contains("Manchester City"),
                        BettingRecord.match_teams.contains("Burnley")
                    )
                )
            )
            unsettled_bets = bets_result.scalars().all()
            
            if not unsettled_bets:
                print("❌ No unsettled bets found for this match!")
                return
            
            print(f"📊 Found {len(unsettled_bets)} unsettled bet(s)")
            
            # Parse match result: "1-5" means Burnley 1, Manchester City 5
            home_score, away_score = map(int, odds.result.split("-"))
            if away_score > home_score:
                actual_outcome = "away"
                winner = "Manchester City"
            elif home_score > away_score:
                actual_outcome = "home"  
                winner = "Burnley"
            else:
                actual_outcome = "draw"
                winner = "Draw"
            
            print(f"🏆 Match Winner: {winner} ({actual_outcome})")
            
            total_winnings = 0.0
            settled_count = 0
            
            for bet in unsettled_bets:
                print(f"\n🎯 Processing bet #{bet.id}:")
                print(f"   User ID: {bet.user_id}")
                print(f"   Bet: ${bet.bet_amount} on {bet.selected_outcome}")
                print(f"   Odds: {bet.odds_decimal}")
                
                # Check if bet won
                user_bet_outcome = bet.selected_outcome.lower()
                bet_won = (user_bet_outcome == actual_outcome)
                
                if bet_won:
                    # Calculate winnings
                    winnings = bet.bet_amount * bet.odds_decimal
                    profit = winnings - bet.bet_amount
                    bet_status = "won"
                    
                    print(f"   ✅ BET WON! Profit: ${profit:.2f}, Total Return: ${winnings:.2f}")
                    
                    # Update user balance
                    user = await session.get(User, bet.user_id)
                    if user:
                        old_balance = float(user.funds_usd)
                        new_balance = old_balance + winnings
                        user.funds_usd = new_balance
                        
                        print(f"   💰 Balance: ${old_balance:.2f} → ${new_balance:.2f}")
                        
                        # Create winning transaction
                        transaction = Transaction(
                            user_id=user.id,
                            transaction_type="bet_won",
                            amount=winnings,
                            balance_before=old_balance,
                            balance_after=new_balance,
                            description=f"Bet won: {bet.match_teams} - {bet.selected_outcome} (${profit:.2f} profit)",
                            reference_id=str(bet.id),
                            reference_type="betting_record",
                            status="completed"
                        )
                        session.add(transaction)
                        total_winnings += winnings
                else:
                    # Bet lost
                    profit = -bet.bet_amount
                    bet_status = "lost"
                    winnings = 0.0
                    
                    print(f"   ❌ BET LOST. Loss: ${bet.bet_amount:.2f}")
                    
                    # Create losing transaction for history
                    user = await session.get(User, bet.user_id)
                    if user:
                        balance = float(user.funds_usd)
                        transaction = Transaction(
                            user_id=user.id,
                            transaction_type="bet_lost",
                            amount=0.0,  # No money added (already deducted when bet placed)
                            balance_before=balance,
                            balance_after=balance,
                            description=f"Bet lost: {bet.match_teams} - {bet.selected_outcome}",
                            reference_id=str(bet.id),
                            reference_type="betting_record",
                            status="completed"
                        )
                        session.add(transaction)
                
                # Update betting record
                bet.bet_status = bet_status
                bet.actual_profit = profit
                bet.is_settled = True
                bet.settlement_date = datetime.utcnow()
                bet.match_status = "finished"
                
                settled_count += 1
            
            # Commit all changes
            await session.commit()
            
            print(f"\n🎉 SETTLEMENT COMPLETE!")
            print(f"   Settled bets: {settled_count}")
            print(f"   Total winnings paid: ${total_winnings:.2f}")
            print(f"   Match: {odds.home_team} {odds.result} {odds.away_team}")
            print(f"\n✨ Check your betting history in the dashboard to see the updated status!")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error settling bet: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting bet settlement...")
    asyncio.run(settle_test_bet())
    print("✨ Bet settlement completed!")
