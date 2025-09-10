"""
Database Migration: Add funds_usd column to users table
Run this script to add the funds column to existing users
"""

import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate_add_funds_column():
    """Add funds_usd column to users table"""
    async with engine.begin() as conn:
        try:
            # Add the funds_usd column
            await conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS funds_usd NUMERIC(15, 2) DEFAULT 0.00 NOT NULL
            """))
            
            print("✅ Successfully added funds_usd column to users table")
            
            # Update existing users to have 0.00 funds
            result = await conn.execute(text("""
                UPDATE users 
                SET funds_usd = 0.00 
                WHERE funds_usd IS NULL
            """))
            
            print(f"✅ Updated {result.rowcount} existing users with default funds")
            
        except Exception as e:
            print(f"❌ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    asyncio.run(migrate_add_funds_column())
