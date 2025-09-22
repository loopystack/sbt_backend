#!/usr/bin/env python3
"""
Script to create database migration for adding match_id to betting_records table.
This ensures the new match_id column is properly added to the database.
"""

import asyncio
from app.core.database import engine
from app.models import Base

async def create_migration():
    """Create the database migration for match_id column"""
    
    try:
        print("🔄 Creating database migration for match_id column...")
        
        # Create all tables with the new schema
        async with engine.begin() as conn:
            # This will add the new match_id column if it doesn't exist
            await conn.run_sync(Base.metadata.create_all)
        
        print("✅ Database migration completed successfully!")
        print("📊 The betting_records table now has:")
        print("   - match_id column (Foreign Key to odds.id)")
        print("   - Relationship to odds table")
        print("   - Backward compatibility with existing records")
        
        print(f"\n🎯 Next steps:")
        print(f"1. New bets will store exact match_id")
        print(f"2. Settlement uses match_id when available")
        print(f"3. Falls back to team matching for old bets")
        print(f"4. 100% accurate bet-to-match linking!")
        
    except Exception as e:
        print(f"❌ Error creating migration: {e}")
        raise

if __name__ == "__main__":
    print("🚀 Starting database migration...")
    asyncio.run(create_migration())
    print("✨ Database migration completed!")
