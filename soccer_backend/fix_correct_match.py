#!/usr/bin/env python3
"""
Script to fix the correct Burnley vs Manchester City match.
Update the match that the user actually bet on (ID: 20669).
"""

import asyncio
from app.models.odds import Odds
from app.models.betting_record import BettingRecord
from app.core.database import AsyncSessionLocal
from sqlalchemy import select

async def fix_correct_match():
    """Fix the correct match that the user bet on"""
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔧 Fixing the correct Burnley vs Manchester City match...")
            
            # Find the user's betting record to see which match they bet on
            bet_result = await session.execute(
                select(BettingRecord).where(
                    BettingRecord.match_teams.contains("Manchester City"),
                    BettingRecord.match_teams.contains("Burnley")
                ).order_by(BettingRecord.id.desc()).limit(1)
            )
            
            user_bet = bet_result.first()
            if user_bet:
                bet = user_bet[0]
                print(f"🎯 Found user's bet (ID: {bet.id}):")
                print(f"   Match: {bet.match_teams}")
                print(f"   Amount: ${bet.bet_amount}")
                print(f"   Bet on: {bet.selected_outcome}")
                print(f"   Status: {bet.bet_status}")
                print(f"   Match Date: {bet.match_date}")
            
            # Find the upcoming match (ID: 20669) that should be updated
            match_result = await session.execute(
                select(Odds).where(
                    Odds.id == 20669
                )
            )
            
            match = match_result.first()
            if not match:
                print("❌ Match ID 20669 not found!")
                return
            
            odds = match[0]
            print(f"\n🏟️  Found match to update:")
            print(f"   ID: {odds.id}")
            print(f"   Teams: {odds.home_team} vs {odds.away_team}")
            print(f"   Current Result: {odds.result or 'NULL'}")
            print(f"   Date: {odds.date}")
            
            # Update this match with the result
            odds.result = "1-5"  # Burnley 1 - 5 Manchester City
            odds.date = "2025-09-22"  # Set to past date
            
            await session.commit()
            
            print(f"\n✅ Successfully updated match ID {odds.id}!")
            print(f"   New Result: {odds.result}")
            print(f"   New Date: {odds.date}")
            print(f"\n🎉 Now the frontend should show the correct result!")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error fixing match: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting match fix...")
    asyncio.run(fix_correct_match())
    print("✨ Match fix completed!")
