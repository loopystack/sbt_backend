#!/usr/bin/env python3
"""
Script to fix country name inconsistencies in the database.
Updates capitalized country names to lowercase to match existing data.
"""

import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def fix_country_names():
    """Fix country name inconsistencies"""
    
    # Mapping of capitalized to lowercase country names
    country_fixes = {
        "England": "england",
        "France": "france", 
        "Germany": "germany",
        "Italy": "italy",
        "Spain": "spain"
    }
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔄 Fixing country name inconsistencies...")
            
            for capitalized, lowercase in country_fixes.items():
                # Update all records with capitalized country names to lowercase
                result = await session.execute(
                    text("UPDATE odds SET country = :lowercase WHERE country = :capitalized"),
                    {"lowercase": lowercase, "capitalized": capitalized}
                )
                
                updated_count = result.rowcount
                if updated_count > 0:
                    print(f"✅ Updated {updated_count} records: '{capitalized}' → '{lowercase}'")
                else:
                    print(f"⏭️  No records found for '{capitalized}'")
            
            # Commit all changes
            await session.commit()
            print(f"\n🎉 Successfully standardized country names!")
            print("📊 All countries now use lowercase names consistently.")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error fixing country names: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting country name fix...")
    asyncio.run(fix_country_names())
    print("✨ Country name fix completed!")
