"""
Test script to check database schema and add funds column if needed
"""

import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check_and_fix_schema():
    """Check if funds_usd column exists and add it if needed"""
    try:
        async with engine.begin() as conn:
            # Check if funds_usd column exists
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'funds_usd'
            """))
            
            if result.fetchone():
                print("✅ funds_usd column already exists")
            else:
                print("❌ funds_usd column missing, adding it...")
                await conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN funds_usd NUMERIC(15, 2) DEFAULT 0.00 NOT NULL
                """))
                print("✅ funds_usd column added successfully")
            
            # Check table structure
            result = await conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            """))
            
            print("\n📋 Users table structure:")
            for row in result:
                print(f"  {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
                
    except Exception as e:
        print(f"❌ Database error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(check_and_fix_schema())
