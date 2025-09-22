#!/usr/bin/env python3
"""
Fix Juventus vs Inter Milan bet settlement
Check for bets on this match and settle them properly
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.odds import Odds
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User
from datetime import datetime

async def fix_juventus_inter_settlement():
    """Fix the Juventus vs Inter Milan bet settlement"""
    
    print("🔧 FIXING JUVENTUS vs INTER MILAN SETTLEMENT")
    print("=" * 50)
    print("Match: Juventus vs Inter Milan")
    print("Result: 3-2 (Juventus wins)")
    print("Display ID: 19474")
    print("Real Database ID: 20666")
    print()
    
    async with AsyncSessionLocal() as db:
        try:
            # Step 1: Verify the match exists with both IDs
            print("🔍 Step 1: Verifying match exists...")
            
            # Check real database ID 20666
            match_20666 = await db.get(Odds, 20666)
            if match_20666:
                print(f"✅ Match found with ID 20666:")
                print(f"   Teams: {match_20666.home_team} vs {match_20666.away_team}")
                print(f"   Result: {match_20666.result}")
                print(f"   Date: {match_20666.date}")
                print(f"   League: {match_20666.league}")
            else:
                print("❌ Match not found with ID 20666")
                return
            
            # Check display ID 19474
            match_19474 = await db.get(Odds, 19474)
            if match_19474:
                print(f"✅ Match also found with ID 19474:")
                print(f"   Teams: {match_19474.home_team} vs {match_19474.away_team}")
                print(f"   Result: {match_19474.result}")
            else:
                print("❌ Match not found with ID 19474")
            
            print()
            
            # Step 2: Search for betting records
            print("🔍 Step 2: Searching for betting records...")
            
            # Search by team names
            betting_query = select(BettingRecord).where(
                BettingRecord.match_teams.like("%Juventus%Inter Milan%")
            )
            
            result = await db.execute(betting_query)
            betting_records = result.scalars().all()
            
            if not betting_records:
                print("❌ No betting records found for Juventus vs Inter Milan")
                print("   Let me check for any unsettled bets...")
                
                # Check for any unsettled bets
                unsettled_query = select(BettingRecord).where(
                    BettingRecord.is_settled == False
                )
                unsettled_result = await db.execute(unsettled_query)
                unsettled_bets = unsettled_result.scalars().all()
                
                print(f"   Found {len(unsettled_bets)} total unsettled bets:")
                for bet in unsettled_bets:
                    print(f"      - {bet.match_teams} (${bet.bet_amount} on {bet.selected_outcome})")
                
                return
            
            print(f"✅ Found {len(betting_records)} betting record(s)")
            
            # Step 3: Process each betting record
            for bet in betting_records:
                print(f"\n📝 Processing bet:")
                print(f"   Match: {bet.match_teams}")
                print(f"   Amount: ${bet.bet_amount}")
                print(f"   Outcome: {bet.selected_outcome}")
                print(f"   Odds: {bet.odds_decimal}")
                print(f"   User ID: {bet.user_id}")
                print(f"   Match ID: {bet.match_id}")
                print(f"   Current Status: {bet.bet_status}")
                print(f"   Settled: {bet.is_settled}")
                
                # Step 4: Determine if the bet won or lost
                # Result: 3-2 (Juventus wins at home)
                # If user bet on "home" (Juventus), they win
                # If user bet on "away" (Inter Milan) or "draw", they lose
                
                actual_result = "3-2"  # Juventus wins
                user_bet = bet.selected_outcome.lower()
                
                if user_bet == "home":
                    bet_won = True
                    winner = "Juventus (home)"
                elif user_bet == "away":
                    bet_won = False
                    winner = "Juventus (home)"
                else:  # draw
                    bet_won = False
                    winner = "Juventus (home)"
                
                print(f"   🏆 Actual Result: {actual_result} - {winner}")
                print(f"   🎯 User bet on: {user_bet}")
                print(f"   {'✅ WON!' if bet_won else '❌ LOST!'}")
                
                # Step 5: Calculate winnings and update user balance
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
                        
                        # Create winning transaction
                        transaction = Transaction(
                            user_id=user.id,
                            transaction_type="bet_won",
                            amount=winnings,
                            balance_before=old_balance,
                            balance_after=new_balance,
                            description=f"🏆 Bet Won: {bet.match_teams} (3-2) - {bet.selected_outcome} (Profit: +${profit:.2f})",
                            reference_id=str(bet.id),
                            reference_type="betting_record",
                            status="completed",
                            payment_method="manual_settlement_fix"
                        )
                        db.add(transaction)
                        print(f"   📝 Transaction created: bet_won, amount: ${winnings:.2f}")
                else:
                    profit = -bet.bet_amount
                    print(f"   💸 Loss: ${bet.bet_amount:.2f}")
                    
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
                            description=f"❌ Bet Lost: {bet.match_teams} (3-2) - {bet.selected_outcome} (Loss: -${bet.bet_amount:.2f})",
                            reference_id=str(bet.id),
                            reference_type="betting_record",
                            status="completed",
                            payment_method="manual_settlement_fix"
                        )
                        db.add(transaction)
                        print(f"   📝 Transaction created: bet_lost, loss: ${bet.bet_amount:.2f}")
                
                # Step 6: Update betting record
                bet.bet_status = "won" if bet_won else "lost"
                bet.actual_profit = profit
                bet.is_settled = True
                bet.settlement_date = datetime.utcnow()
                bet.match_status = "finished"
                
                print(f"   ✅ Betting record updated: {bet.bet_status}")
            
            # Step 7: Commit all changes
            await db.commit()
            
            print(f"\n🎉 JUVENTUS vs INTER MILAN SETTLEMENT COMPLETE!")
            print(f"✅ All betting records processed")
            print(f"✅ User balances updated")
            print(f"✅ Transaction records created")
            print(f"✅ Betting records marked as settled")
            print()
            print("🚀 Your Dashboard should now show the correct results!")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Settlement failed: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_juventus_inter_settlement())
