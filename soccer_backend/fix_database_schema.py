#!/usr/bin/env python3
"""
Script to fix the database schema by adding the missing match_id column.
"""

import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def fix_database_schema():
    """Add the missing match_id column to betting_records table"""
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔧 Fixing database schema...")
            
            # Check if match_id column already exists
            check_column_query = """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'betting_records' 
            AND column_name = 'match_id';
            """
            
            result = await session.execute(text(check_column_query))
            column_exists = result.first() is not None
            
            if column_exists:
                print("✅ match_id column already exists!")
            else:
                print("🔄 Adding match_id column to betting_records table...")
                
                # Add the match_id column
                add_column_query = """
                ALTER TABLE betting_records 
                ADD COLUMN match_id INTEGER REFERENCES odds(id);
                """
                
                await session.execute(text(add_column_query))
                await session.commit()
                
                print("✅ Successfully added match_id column!")
            
            # Now check existing betting records
            print("\n🔍 Checking existing betting records...")
            
            records_query = "SELECT COUNT(*) FROM betting_records;"
            result = await session.execute(text(records_query))
            count = result.scalar()
            
            print(f"📊 Found {count} existing betting record(s)")
            
            if count > 0:
                # Show some sample records
                sample_query = """
                SELECT id, user_id, match_teams, bet_amount, selected_outcome, 
                       bet_status, is_settled, created_at, match_id
                FROM betting_records 
                ORDER BY id DESC 
                LIMIT 5;
                """
                
                result = await session.execute(text(sample_query))
                records = result.fetchall()
                
                print(f"\n📋 Sample records:")
                for record in records:
                    print(f"   ID: {record[0]} | User: {record[1]} | Teams: {record[2]}")
                    print(f"   Amount: ${record[3]} | Bet: {record[4]} | Status: {record[5]}")
                    print(f"   Match ID: {record[8]} | Created: {record[7]}")
                    print()
            
            print("🎉 Database schema is now fixed!")
            print("📊 The betting history should now work correctly!")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error fixing database schema: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting database schema fix...")
    asyncio.run(fix_database_schema())
    print("✨ Database schema fix completed!")
