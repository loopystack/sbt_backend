#!/usr/bin/env python3
"""
Script to check the actual status of the Burnley vs Manchester City match in the database.
"""

import asyncio
from app.models.odds import Odds
from app.core.database import AsyncSessionLocal
from sqlalchemy import select

async def check_match_status():
    """Check the current status of the test match"""
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔍 Checking Burnley vs Manchester City match status...")
            
            # Find all Burnley vs Manchester City matches
            result = await session.execute(
                select(Odds).where(
                    Odds.home_team == "Burnley",
                    Odds.away_team == "Manchester City"
                ).order_by(Odds.id.desc())
            )
            
            matches = result.scalars().all()
            
            if not matches:
                print("❌ No Burnley vs Manchester City matches found!")
                return
            
            print(f"📊 Found {len(matches)} match(es):")
            
            for i, match in enumerate(matches, 1):
                print(f"\n🏟️  Match #{i} (ID: {match.id}):")
                print(f"   Teams: {match.home_team} vs {match.away_team}")
                print(f"   Date: {match.date}")
                print(f"   Time: {match.time}")
                print(f"   League: {match.league}")
                print(f"   Result: {match.result if match.result else 'NULL (upcoming)'}")
                print(f"   Odds - Home: {match.odd_1}, Draw: {match.odd_X}, Away: {match.odd_2}")
                print(f"   Season: {match.season}")
                
                if match.result:
                    print(f"   ✅ Status: FINISHED")
                else:
                    print(f"   ⏳ Status: UPCOMING/PENDING")
            
        except Exception as e:
            print(f"❌ Error checking match status: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting match status check...")
    asyncio.run(check_match_status())
    print("✨ Match status check completed!")
