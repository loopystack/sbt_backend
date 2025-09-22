#!/usr/bin/env python3
"""
Script to add test data to the odds table for value betting testing.
This will create upcoming matches with realistic odds that will generate value betting opportunities.
"""

import asyncio
from datetime import datetime, date, time
from app.models.odds import Odds
from app.core.database import AsyncSessionLocal

async def add_test_data():
    """Add test data for value betting system"""
    
    # Test data - upcoming matches with various odds for value betting
    test_matches = [
        # Premier League matches
        {
            "season": 2025,
            "date": date(2025, 9, 22),
            "time": time(15, 0, 0),
            "home_team": "Brighton",
            "away_team": "Manchester United",
            "result": None,
            "odd_1": 3.20,  # Home win
            "odd_X": 3.40,  # Draw  
            "odd_2": 2.25,  # Away win
            "bets": 1500,
            "country": "England",
            "league": "Premier League"
        },
        {
            "season": 2025,
            "date": date(2025, 9, 22),
            "time": time(17, 30, 0),
            "home_team": "West Ham",
            "away_team": "Chelsea",
            "result": None,
            "odd_1": 4.50,
            "odd_X": 3.75,
            "odd_2": 1.80,
            "bets": 2200,
            "country": "England", 
            "league": "Premier League"
        },
        {
            "season": 2025,
            "date": date(2025, 9, 23),
            "time": time(16, 0, 0),
            "home_team": "Liverpool",
            "away_team": "Arsenal",
            "result": None,
            "odd_1": 2.40,
            "odd_X": 3.60,
            "odd_2": 2.90,
            "bets": 3500,
            "country": "England",
            "league": "Premier League"
        },
        
        # La Liga matches
        {
            "season": 2025,
            "date": date(2025, 9, 22),
            "time": time(18, 30, 0),
            "home_team": "Sevilla",
            "away_team": "Real Betis",
            "result": None,
            "odd_1": 2.80,
            "odd_X": 3.75,
            "odd_2": 2.45,
            "bets": 1800,
            "country": "Spain",
            "league": "LaLiga"
        },
        {
            "season": 2025,
            "date": date(2025, 9, 23),
            "time": time(20, 0, 0),
            "home_team": "Barcelona",
            "away_team": "Atletico Madrid",
            "result": None,
            "odd_1": 2.10,
            "odd_X": 3.20,
            "odd_2": 3.60,
            "bets": 4200,
            "country": "Spain",
            "league": "LaLiga"
        },
        {
            "season": 2025,
            "date": date(2025, 9, 24),
            "time": time(19, 0, 0),
            "home_team": "Valencia",
            "away_team": "Villarreal",
            "result": None,
            "odd_1": 3.10,
            "odd_X": 3.30,
            "odd_2": 2.35,
            "bets": 1200,
            "country": "Spain",
            "league": "LaLiga"
        },
        
        # Bundesliga matches
        {
            "season": 2025,
            "date": date(2025, 9, 22),
            "time": time(17, 30, 0),
            "home_team": "Borussia Dortmund",
            "away_team": "RB Leipzig",
            "result": None,
            "odd_1": 2.40,
            "odd_X": 3.60,
            "odd_2": 2.90,
            "bets": 2800,
            "country": "Germany",
            "league": "Bundesliga"
        },
        {
            "season": 2025,
            "date": date(2025, 9, 23),
            "time": time(15, 30, 0),
            "home_team": "Bayern Munich",
            "away_team": "Bayer Leverkusen",
            "result": None,
            "odd_1": 1.95,
            "odd_X": 3.80,
            "odd_2": 3.75,
            "bets": 5000,
            "country": "Germany",
            "league": "Bundesliga"
        },
        
        # Serie A matches
        {
            "season": 2025,
            "date": date(2025, 9, 22),
            "time": time(18, 45, 0),
            "home_team": "Napoli",
            "away_team": "AC Milan",
            "result": None,
            "odd_1": 2.65,
            "odd_X": 3.25,
            "odd_2": 2.70,
            "bets": 2100,
            "country": "Italy",
            "league": "Serie A"
        },
        {
            "season": 2025,
            "date": date(2025, 9, 23),
            "time": time(20, 45, 0),
            "home_team": "Juventus",
            "away_team": "Inter Milan",
            "result": None,
            "odd_1": 2.55,
            "odd_X": 3.40,
            "odd_2": 2.80,
            "bets": 3800,
            "country": "Italy",
            "league": "Serie A"
        },
        
        # Ligue 1 matches
        {
            "season": 2025,
            "date": date(2025, 9, 22),
            "time": time(21, 0, 0),
            "home_team": "PSG",
            "away_team": "Olympique Marseille",
            "result": None,
            "odd_1": 1.70,
            "odd_X": 4.20,
            "odd_2": 4.80,
            "bets": 4500,
            "country": "France",
            "league": "Ligue 1"
        },
        {
            "season": 2025,
            "date": date(2025, 9, 24),
            "time": time(19, 0, 0),
            "home_team": "Lyon",
            "away_team": "Monaco",
            "result": None,
            "odd_1": 2.90,
            "odd_X": 3.35,
            "odd_2": 2.50,
            "bets": 1600,
            "country": "France",
            "league": "Ligue 1"
        },
        
        # Some underdog matches with high odds for variety
        {
            "season": 2025,
            "date": date(2025, 9, 25),
            "time": time(14, 0, 0),
            "home_team": "Burnley",
            "away_team": "Manchester City",
            "result": None,
            "odd_1": 8.50,
            "odd_X": 5.25,
            "odd_2": 1.35,
            "bets": 2500,
            "country": "England",
            "league": "Premier League"
        },
        {
            "season": 2025,
            "date": date(2025, 9, 25),
            "time": time(16, 30, 0),
            "home_team": "Getafe",
            "away_team": "Real Madrid",
            "result": None,
            "odd_1": 7.20,
            "odd_X": 4.80,
            "odd_2": 1.40,
            "bets": 3200,
            "country": "Spain",
            "league": "LaLiga"
        }
    ]
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔄 Adding test data to odds table...")
            
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
                    print(f"✅ Added: {match_data['home_team']} vs {match_data['away_team']} ({match_data['league']})")
                else:
                    print(f"⏭️  Skipped: {match_data['home_team']} vs {match_data['away_team']} (already exists)")
            
            # Commit all changes
            await session.commit()
            print(f"\n🎉 Successfully added {len(test_matches)} test matches!")
            print("📊 These matches will now appear in the value betting system.")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error adding test data: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting test data insertion...")
    asyncio.run(add_test_data())
    print("✨ Test data insertion completed!")
