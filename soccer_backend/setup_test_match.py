#!/usr/bin/env python3
"""
Script to set up the test match: Burnley vs Manchester City
This will add the match to the database for betting settlement testing.
"""

import asyncio
from datetime import datetime, date, time
from app.models.odds import Odds
from app.core.database import AsyncSessionLocal

async def setup_test_match():
    """Set up Burnley vs Manchester City test match"""
    
    # Test match data - upcoming match for betting
    test_match = {
        "season": 2025,
        "date": date(2025, 9, 25),  # Future date for now
        "time": time(14, 0, 0),     # Will change to past after betting
        "home_team": "Burnley",
        "away_team": "Manchester City",
        "result": None,             # Will be set to "1-5" after betting
        "odd_1": 8.50,             # Home win (Burnley)
        "odd_X": 5.25,             # Draw
        "odd_2": 1.35,             # Away win (Manchester City)
        "bets": 2500,
        "country": "england",       # lowercase to match existing data
        "league": "Premier League"
    }
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔄 Setting up Burnley vs Manchester City test match...")
            
            # Check if match already exists
            from sqlalchemy import select
            existing = await session.execute(
                select(Odds).where(
                    Odds.home_team == test_match['home_team'],
                    Odds.away_team == test_match['away_team'],
                    Odds.date == test_match['date']
                )
            )
            
            if not existing.first():
                odds_record = Odds(**test_match)
                session.add(odds_record)
                await session.commit()
                
                print(f"✅ Added test match: {test_match['home_team']} vs {test_match['away_team']}")
                print(f"📅 Match date: {test_match['date']} at {test_match['time']}")
                print(f"🎯 Odds - Home: {test_match['odd_1']}, Draw: {test_match['odd_X']}, Away: {test_match['odd_2']}")
                print(f"⚽ League: {test_match['league']}")
                print(f"🔄 Status: Upcoming (result = null)")
                
                # Get the match ID for reference
                result = await session.execute(
                    select(Odds).where(
                        Odds.home_team == test_match['home_team'],
                        Odds.away_team == test_match['away_team'],
                        Odds.date == test_match['date']
                    )
                )
                match = result.first()
                if match:
                    print(f"🆔 Match ID: {match[0].id}")
                    print(f"\n📋 Next steps:")
                    print(f"1. Place a bet on this match from the frontend")
                    print(f"2. Run finish_test_match.py to set result and change time")
                    print(f"3. Run settlement API to process the bet")
                
            else:
                print(f"⏭️  Test match already exists: {test_match['home_team']} vs {test_match['away_team']}")
                existing_match = existing.first()[0]
                print(f"🆔 Existing Match ID: {existing_match.id}")
                print(f"📅 Current result: {existing_match.result or 'None (upcoming)'}")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error setting up test match: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting test match setup...")
    asyncio.run(setup_test_match())
    print("✨ Test match setup completed!")
