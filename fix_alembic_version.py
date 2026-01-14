"""Fix alembic_version table to have only the latest version"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings
import sys

async def fix_version():
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    engine = create_async_engine(database_url, echo=True)
    
    try:
        async with engine.begin() as conn:
            # Check current versions
            result = await conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num;"))
            versions = [row[0] for row in result.fetchall()]
            
            print(f"Found versions: {versions}")
            
            if len(versions) > 1:
                # Keep only the latest version (bc91ff2443aa)
                latest = 'bc91ff2443aa'
                print(f"\nRemoving old versions, keeping only: {latest}")
                
                # Delete all versions
                await conn.execute(text("DELETE FROM alembic_version;"))
                
                # Insert only the latest
                await conn.execute(text(f"INSERT INTO alembic_version (version_num) VALUES ('{latest}');"))
                
                print(f"Fixed! Database now has only version: {latest}")
            elif len(versions) == 1:
                print(f"\nDatabase already has correct state: {versions[0]}")
            else:
                print("\nNo versions found - database is fresh")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(fix_version())
