#!/usr/bin/env python3
"""
Check if ID 20669 exists in our database and verify the correct match ID
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal
from app.models.odds import Odds
from app.models.betting_record import BettingRecord

async def check_match_ids():
    """Check which ID is correct for Burnley vs Manchester City"""
    
    print("🔍 CHECKING MATCH IDs")
    print("=" * 30)
    
    async with AsyncSessionLocal() as db:
        try:
            # Check if ID 20669 exists
            print("🔍 Checking ID 20669...")
            match_20669 = await db.get(Odds, 20669)
            if match_20669:
                print(f"✅ ID 20669 EXISTS:")
                print(f"   Match: {match_20669.home_team} vs {match_20669.away_team}")
                print(f"   Result: {match_20669.result}")
                print(f"   Date: {match_20669.date}")
                print(f"   League: {match_20669.league}")
            else:
                print("❌ ID 20669 does not exist")
            
            print()
            
            # Check if ID 19477 exists
            print("🔍 Checking ID 19477...")
            match_19477 = await db.get(Odds, 19477)
            if match_19477:
                print(f"✅ ID 19477 EXISTS:")
                print(f"   Match: {match_19477.home_team} vs {match_19477.away_team}")
                print(f"   Result: {match_19477.result}")
                print(f"   Date: {match_19477.date}")
                print(f"   League: {match_19477.league}")
            else:
                print("❌ ID 19477 does not exist")
            
            print()
            
            # Search for Burnley vs Manchester City matches
            print("🔍 Searching for Burnley vs Manchester City matches...")
            burnley_query = select(Odds).where(
                (Odds.home_team.like("%Burnley%") & Odds.away_team.like("%Manchester City%")) |
                (Odds.home_team.like("%Manchester City%") & Odds.away_team.like("%Burnley%"))
            )
            
            result = await db.execute(burnley_query)
            burnley_matches = result.scalars().all()
            
            if burnley_matches:
                print(f"✅ Found {len(burnley_matches)} Burnley vs Manchester City match(es):")
                for match in burnley_matches:
                    print(f"   ID: {match.id}")
                    print(f"   Match: {match.home_team} vs {match.away_team}")
                    print(f"   Result: {match.result}")
                    print(f"   Date: {match.date}")
                    print(f"   League: {match.league}")
                    print()
            else:
                print("❌ No Burnley vs Manchester City matches found")
            
            # Check betting records
            print("🔍 Checking betting records...")
            betting_query = select(BettingRecord).where(
                BettingRecord.match_teams.like("%Burnley%Manchester City%")
            )
            
            betting_result = await db.execute(betting_query)
            betting_records = betting_result.scalars().all()
            
            if betting_records:
                print(f"✅ Found {len(betting_records)} betting record(s):")
                for bet in betting_records:
                    print(f"   Bet ID: {bet.id}")
                    print(f"   Match: {bet.match_teams}")
                    print(f"   Match ID: {bet.match_id}")
                    print(f"   Amount: ${bet.bet_amount}")
                    print(f"   Outcome: {bet.selected_outcome}")
                    print(f"   Status: {bet.bet_status}")
                    print(f"   Settled: {bet.is_settled}")
                    print()
            else:
                print("❌ No betting records found")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_match_ids())
