import asyncio
import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_db_connection():
    database_url = os.getenv('DATABASE_URL')
    print(f"Database URL: {database_url}")
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return False
    
    try:
        # Use the original URL for asyncpg
        conn_str = database_url
        
        print(f"Connection string: {conn_str}")
        
        # Test connection
        conn = await asyncpg.connect(conn_str)
        print("✅ Database connection successful!")
        
        # Test a simple query
        result = await conn.fetchval('SELECT 1')
        print(f"✅ Test query result: {result}")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_db_connection())
