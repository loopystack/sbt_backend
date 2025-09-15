import asyncio
import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def check_tables():
    database_url = os.getenv('DATABASE_URL')
    
    try:
        conn = await asyncpg.connect(database_url)
        
        # Check if users table exists
        users_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        """)
        
        print(f"Users table exists: {users_exists}")
        
        if users_exists:
            # Check users table structure
            columns = await conn.fetch("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position;
            """)
            
            print("\nUsers table columns:")
            for col in columns:
                print(f"  - {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']})")
        
        # Check other required tables
        tables_to_check = ['email_verifications', 'password_resets']
        for table in tables_to_check:
            exists = await conn.fetchval(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = '{table}'
                );
            """)
            print(f"{table} table exists: {exists}")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error checking tables: {e}")

if __name__ == "__main__":
    asyncio.run(check_tables())
