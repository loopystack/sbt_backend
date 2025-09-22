#!/usr/bin/env python3
"""
Script to finish the test match: Burnley vs Manchester City
This will set the result to "1-5" and change the time to past for settlement testing.
"""

import asyncio
from datetime import datetime, date, time
from app.models.odds import Odds
from app.core.database import AsyncSessionLocal

async def finish_test_match():
    """Finish the Burnley vs Manchester City test match"""
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔄 Finishing Burnley vs Manchester City test match...")
            
            # Find the test match
            from sqlalchemy import select
            result = await session.execute(
                select(Odds).where(
                    Odds.home_team == "Burnley",
                    Odds.away_team == "Manchester City",
                    Odds.league == "Premier League"
                )
            )
            
            match = result.first()
            if not match:
                print("❌ Test match not found! Please run setup_test_match.py first.")
                return
            
            odds_record = match[0]
            
            # Update match to be finished
            odds_record.result = "1-5"  # Burnley 1 - 5 Manchester City
            odds_record.date = date(2025, 9, 22)  # Change to past date
            odds_record.time = time(14, 0, 0)     # Past time
            
            await session.commit()
            
            print(f"✅ Test match finished!")
            print(f"🆔 Match ID: {odds_record.id}")
            print(f"⚽ Final Result: {odds_record.result} (Burnley 1 - 5 Manchester City)")
            print(f"📅 Match Date: {odds_record.date} at {odds_record.time}")
            print(f"🏆 Winner: Manchester City (Away Win)")
            
            print(f"\n📋 Settlement Info:")
            print(f"- Home Win (Burnley) bets: LOST")
            print(f"- Draw bets: LOST") 
            print(f"- Away Win (Manchester City) bets: WON")
            print(f"- Away win odds were: {odds_record.odd_2}")
            
            print(f"\n🔄 Next step:")
            print(f"Call the settlement API to process all bets for this match:")
            print(f"POST /api/betting/settle-specific-match/{odds_record.id}")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error finishing test match: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting test match finish...")
    asyncio.run(finish_test_match())
    print("✨ Test match finish completed!")
