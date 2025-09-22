#!/usr/bin/env python3
"""
MANUAL SETTLEMENT FIX: Settle the Burnley vs Manchester City bet manually
This script will directly update the database to settle the user's bet
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User
from datetime import datetime

async def manual_settlement_fix():
    """Manually settle the Burnley vs Manchester City bet"""
    
    print("🔧 MANUAL SETTLEMENT FIX")
    print("=" * 40)
    print("Fixing the Burnley vs Manchester City bet settlement...")
    print()
    
    async with AsyncSessionLocal() as db:
        try:
            # Step 1: Find the user's betting record for Burnley vs Manchester City
            print("🔍 Step 1: Finding betting record for Burnley vs Manchester City...")
            
            # Search for betting records that match "Burnley vs Manchester City"
            betting_query = select(BettingRecord).where(
                BettingRecord.match_teams.like("%Burnley%Manchester City%")
            )
            
            result = await db.execute(betting_query)
            betting_records = result.scalars().all()
            
            if not betting_records:
                print("❌ No betting record found for Burnley vs Manchester City")
                print("   Let me search for any unsettled bets...")
                
                # Search for any unsettled bets
                unsettled_query = select(BettingRecord).where(
                    BettingRecord.is_settled == False
                )
                unsettled_result = await db.execute(unsettled_query)
                unsettled_bets = unsettled_result.scalars().all()
                
                print(f"   Found {len(unsettled_bets)} unsettled bets:")
                for bet in unsettled_bets:
                    print(f"      - {bet.match_teams} (${bet.bet_amount} on {bet.selected_outcome})")
                
                return
            
            print(f"✅ Found {len(betting_records)} betting record(s)")
            
            # Step 2: Process each betting record
            for bet in betting_records:
                print(f"\n📝 Processing bet:")
                print(f"   Match: {bet.match_teams}")
                print(f"   Amount: ${bet.bet_amount}")
                print(f"   Outcome: {bet.selected_outcome}")
                print(f"   Odds: {bet.odds_decimal}")
                print(f"   User ID: {bet.user_id}")
                print(f"   Current Status: {bet.bet_status}")
                print(f"   Settled: {bet.is_settled}")
                
                # Step 3: Determine if the bet won or lost
                # Result: 5-1 (Manchester City wins)
                # If user bet on "away" (Manchester City), they win
                # If user bet on "home" (Burnley) or "draw", they lose
                
                actual_result = "5-1"  # Manchester City wins
                user_bet = bet.selected_outcome.lower()
                
                if user_bet == "away":
                    bet_won = True
                    winner = "Manchester City (away)"
                elif user_bet == "home":
                    bet_won = False
                    winner = "Manchester City (away)"
                else:  # draw
                    bet_won = False
                    winner = "Manchester City (away)"
                
                print(f"   🏆 Actual Result: {actual_result} - {winner}")
                print(f"   🎯 User bet on: {user_bet}")
                print(f"   {'✅ WON!' if bet_won else '❌ LOST!'}")
                
                # Step 4: Calculate winnings and update user balance
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
                            description=f"🏆 Bet Won: {bet.match_teams} (5-1) - {bet.selected_outcome} (Profit: +${profit:.2f})",
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
                            description=f"❌ Bet Lost: {bet.match_teams} (5-1) - {bet.selected_outcome} (Loss: -${bet.bet_amount:.2f})",
                            reference_id=str(bet.id),
                            reference_type="betting_record",
                            status="completed",
                            payment_method="manual_settlement_fix"
                        )
                        db.add(transaction)
                        print(f"   📝 Transaction created: bet_lost, loss: ${bet.bet_amount:.2f}")
                
                # Step 5: Update betting record
                bet.bet_status = "won" if bet_won else "lost"
                bet.actual_profit = profit
                bet.is_settled = True
                bet.settlement_date = datetime.utcnow()
                bet.match_status = "finished"
                
                print(f"   ✅ Betting record updated: {bet.bet_status}")
            
            # Step 6: Commit all changes
            await db.commit()
            
            print(f"\n🎉 MANUAL SETTLEMENT COMPLETE!")
            print(f"✅ All betting records processed")
            print(f"✅ User balances updated")
            print(f"✅ Transaction records created")
            print(f"✅ Betting records marked as settled")
            print()
            print("🚀 Your Dashboard should now show the correct results!")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Manual settlement failed: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(manual_settlement_fix())
