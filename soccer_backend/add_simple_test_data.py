#!/usr/bin/env python3
"""
Script to add simple test data matching the screenshot format.
3 test matches in Bundesliga Austria with null results.
"""

import asyncio
from datetime import datetime, date, time
from app.models.odds import Odds
from app.core.database import AsyncSessionLocal

async def add_simple_test_data():
    """Add 3 simple test matches like in the screenshot"""
    
    # Test data - exactly like the screenshot but with null results
    test_matches = [
        {
            "season": 2025,
            "date": date(2025, 10, 30),
            "time": time(15, 0, 5),
            "home_team": "Test1",
            "away_team": "Test2",
            "result": None,  # Changed from "3-2" to null
            "odd_1": 100.00,
            "odd_X": -200.00,
            "odd_2": -300.00,
            "bets": 7,
            "country": "Austria",
            "league": "Bundesliga"
        },
        {
            "season": 2025,
            "date": date(2025, 10, 30),
            "time": time(13, 30, 0),
            "home_team": "Test3",
            "away_team": "Test4",
            "result": None,  # Changed from "1-3" to null
            "odd_1": 500.00,
            "odd_X": 400.00,
            "odd_2": 600.00,
            "bets": 7,
            "country": "Austria",
            "league": "Bundesliga"
        },
        {
            "season": 2025,
            "date": date(2025, 10, 28),
            "time": time(18, 30, 0),
            "home_team": "Test5",
            "away_team": "Test6",
            "result": None,  # Changed from "0-0" to null
            "odd_1": -150.00,
            "odd_X": 200.00,
            "odd_2": 350.00,
            "bets": 7,
            "country": "Austria",
            "league": "Bundesliga"
        }
    ]
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔄 Adding 3 simple test matches...")
            
            # Add all test matches
            for match_data in test_matches:
                # Check if match already exists
                from sqlalchemy import select
                existing = await session.execute(
                    select(Odds).where(
                        Odds.home_team == match_data['home_team'],
                        Odds.away_team == match_data['away_team'],
                        Odds.date == match_data['date']
                    )
                )
                
                if not existing.first():
                    odds_record = Odds(**match_data)
                    session.add(odds_record)
                    print(f"✅ Added: {match_data['home_team']} vs {match_data['away_team']} (result: null)")
                else:
                    print(f"⏭️  Skipped: {match_data['home_team']} vs {match_data['away_team']} (already exists)")
            
            # Commit all changes
            await session.commit()
            print(f"\n🎉 Successfully added test matches!")
            print("📊 These matches are now upcoming (result = null) and will appear in value betting.")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error adding test data: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting simple test data insertion...")
    asyncio.run(add_simple_test_data())
    print("✨ Simple test data insertion completed!")
