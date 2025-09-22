#!/usr/bin/env python3
"""
Script to check betting records without using the new match_id column.
"""

import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check_betting_simple():
    """Check betting records using basic SQL"""
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔍 Checking betting records (simple check)...")
            
            # Check if betting_records table exists
            table_check = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'betting_records';
            """
            
            result = await session.execute(text(table_check))
            table_exists = result.first() is not None
            
            if not table_exists:
                print("❌ betting_records table does not exist!")
                return
            
            print("✅ betting_records table exists")
            
            # Count records
            count_query = "SELECT COUNT(*) FROM betting_records;"
            result = await session.execute(text(count_query))
            count = result.scalar()
            
            print(f"📊 Total betting records: {count}")
            
            if count == 0:
                print("❌ NO BETTING RECORDS FOUND!")
                print("🔍 This means your bets were never saved to the database.")
                print("📋 Possible causes:")
                print("   1. Frontend bet placement API call failed")
                print("   2. Authentication issue when saving bets")
                print("   3. Database connection issue during bet placement")
                print("   4. API endpoint not working properly")
                return
            
            # Show recent records
            recent_query = """
            SELECT id, user_id, match_teams, bet_amount, selected_outcome, 
                   bet_status, is_settled, created_at
            FROM betting_records 
            ORDER BY created_at DESC 
            LIMIT 5;
            """
            
            result = await session.execute(text(recent_query))
            records = result.fetchall()
            
            print(f"\n📋 Recent betting records:")
            for record in records:
                print(f"   🎯 Record ID: {record[0]}")
                print(f"      User ID: {record[1]}")
                print(f"      Match: {record[2]}")
                print(f"      Amount: ${record[3]}")
                print(f"      Bet: {record[4]}")
                print(f"      Status: {record[5]}")
                print(f"      Settled: {record[6]}")
                print(f"      Created: {record[7]}")
                print()
            
            # Check for your specific user (assuming user_id = 2)
            user_query = """
            SELECT COUNT(*) FROM betting_records WHERE user_id = 2;
            """
            
            result = await session.execute(text(user_query))
            user_count = result.scalar()
            
            print(f"🎯 Your betting records (user_id=2): {user_count}")
            
            if user_count == 0:
                print("❌ No betting records found for your user!")
                print("🔍 This suggests the bet placement didn't save properly.")
            else:
                print("✅ Found your betting records!")
                
                # Show your records
                your_records_query = """
                SELECT id, match_teams, bet_amount, selected_outcome, 
                       bet_status, is_settled, created_at
                FROM betting_records 
                WHERE user_id = 2
                ORDER BY created_at DESC;
                """
                
                result = await session.execute(text(your_records_query))
                your_records = result.fetchall()
                
                print(f"\n🎯 Your betting records:")
                for record in your_records:
                    print(f"   📝 {record[1]} - ${record[2]} on {record[3]}")
                    print(f"      Status: {record[4]} | Created: {record[6]}")
            
        except Exception as e:
            print(f"❌ Error checking betting records: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting simple betting records check...")
    asyncio.run(check_betting_simple())
    print("✨ Simple betting records check completed!")
