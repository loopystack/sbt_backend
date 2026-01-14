"""
Script to reset database state and run migrations.
"""
import asyncio
import selectors
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings
import sys
import subprocess

# Fix for Windows
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    selector = selectors.SelectSelector()
    loop = asyncio.SelectorEventLoop(selector)
    asyncio.set_event_loop(loop)

async def reset_database():
    """Reset database by dropping all tables"""
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    engine = create_async_engine(database_url, echo=True)
    
    # Tables to drop in order (respecting foreign key constraints)
    tables_to_drop = [
        'alembic_version',
        'wallet_transactions',
        'crypto_transactions',
        'deposit_intents',
        'withdrawal_intents',
        'betting_records',
        'user_crypto_balances',
        'user_daily_limits',
        'platform_wallets',
        'odds',
        'crypto_inventory',
        'users',
    ]
    
    try:
        async with engine.begin() as conn:
            print("Attempting to reset database state...")
            
            # First, try to drop all tables with CASCADE
            for table in tables_to_drop:
                try:
                    await conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
                    print(f"  Dropped table: {table}")
                except Exception as e:
                    print(f"  Could not drop {table}: {e}")
            
            print("\nDatabase reset complete. Running migrations...")
            
    except Exception as e:
        print(f"Error resetting database: {e}")
        print("\nYou may need to reset the database manually on the server.")
        return False
    finally:
        await engine.dispose()
    
    return True

def run_migrations():
    """Run alembic upgrade head"""
    print("\n" + "="*60)
    print("Running: alembic upgrade head")
    print("="*60 + "\n")
    
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=".",
            capture_output=False,
            text=True
        )
        return result.returncode == 0
    except Exception as e:
        print(f"Error running migrations: {e}")
        return False

async def main():
    print("="*60)
    print("Database Reset and Migration Script")
    print("="*60 + "\n")
    
    # Reset database
    success = await reset_database()
    
    if success:
        # Run migrations
        migration_success = run_migrations()
        
        if migration_success:
            print("\n" + "="*60)
            print("SUCCESS: Database reset and migrations completed!")
            print("="*60)
        else:
            print("\n" + "="*60)
            print("ERROR: Migrations failed. Check the output above.")
            print("="*60)
    else:
        print("\n" + "="*60)
        print("ERROR: Database reset failed. Please reset manually.")
        print("="*60)

if __name__ == "__main__":
    if sys.platform == 'win32':
        loop = asyncio.get_event_loop()
        try:
            loop.run_until_complete(main())
        finally:
            loop.close()
    else:
        asyncio.run(main())
