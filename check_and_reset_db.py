"""
Quick script to check database state and provide reset instructions.
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings
import sys

async def check_db_state():
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    engine = create_async_engine(database_url, echo=False)
    
    try:
        async with engine.begin() as conn:
            # Try a simple query to check if transaction is working
            try:
                result = await conn.execute(text("SELECT 1"))
                result.scalar()
                print("SUCCESS: Database connection is working.")
            except Exception as e:
                print(f"ERROR: Database transaction is in failed state: {e}")
                print("\nYou need to reset the database. Run these SQL commands:")
                print("\n--- SQL Commands to Reset ---")
                print("DROP TABLE IF EXISTS alembic_version CASCADE;")
                print("DROP TABLE IF EXISTS users CASCADE;")
                print("DROP TABLE IF EXISTS deposit_intents CASCADE;")
                print("DROP TABLE IF EXISTS crypto_transactions CASCADE;")
                print("DROP TABLE IF EXISTS betting_records CASCADE;")
                print("DROP TABLE IF EXISTS odds CASCADE;")
                print("DROP TABLE IF EXISTS user_crypto_balances CASCADE;")
                print("DROP TABLE IF EXISTS crypto_inventory CASCADE;")
                print("DROP TABLE IF EXISTS wallet_transactions CASCADE;")
                print("DROP TABLE IF EXISTS withdrawal_intents CASCADE;")
                print("DROP TABLE IF EXISTS user_daily_limits CASCADE;")
                print("DROP TABLE IF EXISTS platform_wallets CASCADE;")
                return
            
            # Check alembic_version
            try:
                result = await conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
                version = result.scalar()
                print(f"INFO: Current Alembic version: {version}")
            except Exception:
                print("INFO: alembic_version table does not exist (fresh database)")
                
    except Exception as e:
        print(f"ERROR: {e}")
        print("\nThe database is in a failed transaction state.")
        print("You MUST reset it before running migrations.")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_db_state())
