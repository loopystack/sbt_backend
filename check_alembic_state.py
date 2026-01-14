"""Check Alembic migration state"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings
import sys

async def check_state():
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    engine = create_async_engine(database_url, echo=False)
    
    try:
        async with engine.begin() as conn:
            # Check alembic_version table
            result = await conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num;"))
            versions = result.fetchall()
            
            print("Current migration versions in database:")
            for row in versions:
                print(f"  - {row[0]}")
            
            if len(versions) > 1:
                print(f"\nWARNING: Multiple versions found! This might cause issues.")
            elif len(versions) == 1:
                print(f"\nDatabase is at version: {versions[0][0]}")
            else:
                print("\nNo versions found - database is fresh")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_state())
