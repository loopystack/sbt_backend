#!/usr/bin/env python3
"""
Script to check all betting records in the database and diagnose issues.
"""

import asyncio
from app.models.betting_record import BettingRecord
from app.models.user import User
from app.core.database import AsyncSessionLocal
from sqlalchemy import select

async def check_betting_records():
    """Check all betting records and diagnose issues"""
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔍 Checking all betting records in database...")
            
            # Get all betting records
            result = await session.execute(
                select(BettingRecord).order_by(BettingRecord.id.desc())
            )
            
            records = result.scalars().all()
            
            if not records:
                print("❌ NO BETTING RECORDS FOUND in database!")
                print("📋 This means either:")
                print("   1. Bets were never saved to database")
                print("   2. Database connection issue")
                print("   3. API endpoint not working")
                return
            
            print(f"📊 Found {len(records)} betting record(s):")
            
            for i, record in enumerate(records, 1):
                print(f"\n🎯 Record #{i} (ID: {record.id}):")
                print(f"   User ID: {record.user_id}")
                print(f"   Match ID: {record.match_id}")
                print(f"   Match Teams: {record.match_teams}")
                print(f"   Bet Amount: ${record.bet_amount}")
                print(f"   Selected: {record.selected_outcome}")
                print(f"   Odds: {record.odds_value} (decimal: {record.odds_decimal})")
                print(f"   Status: {record.bet_status}")
                print(f"   Settled: {record.is_settled}")
                print(f"   Profit: ${record.actual_profit if record.actual_profit else 'N/A'}")
                print(f"   Created: {record.created_at}")
                print(f"   Match Date: {record.match_date}")
                print(f"   Match League: {record.match_league}")
                
                # Get user info
                user_result = await session.execute(
                    select(User).where(User.id == record.user_id)
                )
                user = user_result.first()
                if user:
                    print(f"   User: {user[0].username} ({user[0].email})")
                else:
                    print(f"   User: NOT FOUND (ID: {record.user_id})")
            
            # Check if there are any issues
            print(f"\n🔍 Diagnostic Summary:")
            print(f"   Total Records: {len(records)}")
            print(f"   With Match ID: {len([r for r in records if r.match_id])}")
            print(f"   Without Match ID: {len([r for r in records if not r.match_id])}")
            print(f"   Pending Bets: {len([r for r in records if r.bet_status == 'pending'])}")
            print(f"   Won Bets: {len([r for r in records if r.bet_status == 'won'])}")
            print(f"   Lost Bets: {len([r for r in records if r.bet_status == 'lost'])}")
            
        except Exception as e:
            print(f"❌ Error checking betting records: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting betting records check...")
    asyncio.run(check_betting_records())
    print("✨ Betting records check completed!")
