"""
Script to reset Alembic migration state when database is in a failed transaction.

This script will:
1. Check current Alembic version
2. Reset alembic_version table if needed
3. Allow you to run migrations from scratch

Usage:
    python reset_alembic_state.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings
import sys

async def reset_alembic_state():
    # Convert database URL to async version
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    engine = create_async_engine(database_url, echo=True)
    
    try:
        async with engine.begin() as conn:
            # Check if alembic_version table exists
            result = await conn.execute(
                text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'alembic_version'
                );
                """)
            )
            exists = result.scalar()
            
            if exists:
                print("WARNING: alembic_version table exists. Current state:")
                result = await conn.execute(text("SELECT version_num FROM alembic_version;"))
                version = result.scalar()
                print(f"   Current version: {version}")
                
                response = input("\nDo you want to DELETE the alembic_version table? (yes/no): ")
                if response.lower() == 'yes':
                    await conn.execute(text("DROP TABLE alembic_version;"))
                    print("SUCCESS: alembic_version table dropped. You can now run 'alembic upgrade head' from scratch.")
                else:
                    print("CANCELLED: Database state unchanged.")
            else:
                print("SUCCESS: alembic_version table does not exist. Database is ready for fresh migration.")
                
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    # Fix for Windows
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(reset_alembic_state())
