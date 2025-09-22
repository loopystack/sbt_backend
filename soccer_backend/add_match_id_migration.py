#!/usr/bin/env python3
"""
Proper database migration to add match_id column to betting_records.
This will be done safely without breaking existing functionality.
"""

import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def add_match_id_migration():
    """Safely add match_id column to betting_records table"""
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔄 Starting safe database migration...")
            
            # Check if match_id column already exists
            check_query = """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'betting_records' 
            AND column_name = 'match_id';
            """
            
            result = await session.execute(text(check_query))
            column_exists = result.first() is not None
            
            if column_exists:
                print("✅ match_id column already exists - migration not needed")
                return
            
            print("🔧 Adding match_id column to betting_records table...")
            
            # Add the column safely
            migration_query = """
            ALTER TABLE betting_records 
            ADD COLUMN match_id INTEGER;
            """
            
            await session.execute(text(migration_query))
            
            # Add foreign key constraint
            fk_query = """
            ALTER TABLE betting_records 
            ADD CONSTRAINT fk_betting_records_match_id 
            FOREIGN KEY (match_id) REFERENCES odds(id);
            """
            
            await session.execute(text(fk_query))
            await session.commit()
            
            print("✅ Successfully added match_id column with foreign key!")
            print("📊 Column details:")
            print("   - Type: INTEGER")
            print("   - Nullable: YES (for backward compatibility)")
            print("   - Foreign Key: odds(id)")
            print("   - Existing records: match_id = NULL (will use team matching)")
            print("   - New records: match_id = actual match ID (perfect accuracy)")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting database migration...")
    asyncio.run(add_match_id_migration())
    print("✨ Database migration completed!")
