#!/usr/bin/env python3
"""
AUTOMATIC DATABASE SETTLEMENT: Check for updated match results and settle bets automatically
This script will run periodically to check for matches with new results and settle all bets
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import AsyncSessionLocal
from app.models.odds import Odds
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User
from datetime import datetime, timedelta

async def auto_settle_updated_matches():
    """
    AUTOMATIC SETTLEMENT: Check for matches with updated results and settle all bets
    This runs automatically to catch any database updates
    """
    
    print("🤖 AUTOMATIC DATABASE SETTLEMENT CHECK")
    print("=" * 50)
    print(f"Checking for matches with updated results...")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    async with AsyncSessionLocal() as db:
        try:
            # Step 1: Find matches with results that have unsettled bets
            print("🔍 Step 1: Finding matches with results and unsettled bets...")
            
            # Get all matches with results
            matches_with_results_query = select(Odds).where(
                and_(
                    Odds.result.isnot(None),
                    Odds.result != '',
                    Odds.result != 'null'
                )
            )
            
            matches_result = await db.execute(matches_with_results_query)
            matches_with_results = matches_result.scalars().all()
            
            print(f"✅ Found {len(matches_with_results)} matches with results")
            
            total_settled = 0
            total_winnings = 0.0
            
            # Step 2: Check each match for unsettled bets
            for match in matches_with_results:
                print(f"\n🏟️  Checking: {match.home_team} vs {match.away_team} ({match.result})")
                
                # Find unsettled bets for this match
                unsettled_bets_query = select(BettingRecord).where(
                    and_(
                        BettingRecord.is_settled == False,
                        # Use both match_id and team matching for bulletproof settlement
                        (BettingRecord.match_id == match.id) |
                        (
                            and_(
                                BettingRecord.match_id.is_(None),
                                BettingRecord.match_teams == f"{match.home_team} vs {match.away_team}"
                            )
                        )
                    )
                )
                
                unsettled_result = await db.execute(unsettled_bets_query)
                unsettled_bets = unsettled_result.scalars().all()
                
                if not unsettled_bets:
                    print(f"   ℹ️  No unsettled bets found")
                    continue
                
                print(f"   🎯 Found {len(unsettled_bets)} unsettled bet(s)")
                
                # Step 3: Parse match result and determine winner
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
                
                # Step 4: Process each bet
                match_settled = 0
                match_winnings = 0.0
                
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
                                description=f"🏆 Bet Won: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome} (Profit: +${profit:.2f})",
                                reference_id=str(bet.id),
                                reference_type="betting_record",
                                status="completed",
                                payment_method="auto_database_settlement"
                            )
                            db.add(transaction)
                            match_winnings += winnings
                            
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
                                description=f"❌ Bet Lost: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome} (Loss: -${bet.bet_amount:.2f})",
                                reference_id=str(bet.id),
                                reference_type="betting_record",
                                status="completed",
                                payment_method="auto_database_settlement"
                            )
                            db.add(transaction)
                    
                    # Update betting record
                    bet.bet_status = "won" if bet_won else "lost"
                    bet.actual_profit = profit
                    bet.is_settled = True
                    bet.settlement_date = datetime.utcnow()
                    bet.match_status = "finished"
                    
                    match_settled += 1
                
                if match_settled > 0:
                    print(f"   ✅ Settled {match_settled} bet(s), Total winnings: ${match_winnings:.2f}")
                    total_settled += match_settled
                    total_winnings += match_winnings
            
            # Step 5: Commit all changes
            if total_settled > 0:
                await db.commit()
                print(f"\n🎉 AUTOMATIC SETTLEMENT COMPLETE!")
                print(f"✅ Total bets settled: {total_settled}")
                print(f"✅ Total winnings paid: ${total_winnings:.2f}")
                print(f"✅ All changes committed to database")
            else:
                print(f"\nℹ️  No bets needed settlement")
            
            print(f"\n🚀 Your Dashboard will show updated results after refresh!")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Automatic settlement failed: {str(e)}")
            import traceback
            traceback.print_exc()

async def run_continuous_settlement():
    """Run automatic settlement continuously"""
    print("🤖 STARTING CONTINUOUS AUTOMATIC SETTLEMENT")
    print("=" * 60)
    print("This will check for updated match results every 30 seconds")
    print("Press Ctrl+C to stop")
    print()
    
    while True:
        try:
            await auto_settle_updated_matches()
            print(f"\n⏰ Waiting 30 seconds before next check...")
            await asyncio.sleep(30)
        except KeyboardInterrupt:
            print(f"\n🛑 Automatic settlement stopped by user")
            break
        except Exception as e:
            print(f"❌ Error in continuous settlement: {str(e)}")
            await asyncio.sleep(30)  # Wait before retrying

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "continuous":
        asyncio.run(run_continuous_settlement())
    else:
        asyncio.run(auto_settle_updated_matches())
