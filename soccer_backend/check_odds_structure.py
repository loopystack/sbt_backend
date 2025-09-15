import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check_odds_structure():
    database_url = os.getenv('DATABASE_URL')
    
    try:
        conn = await asyncpg.connect(database_url)
        
        # Get table structure
        columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'odds' 
            ORDER BY ordinal_position;
        """)
        
        print('Odds table structure:')
        for col in columns:
            print(f'  - {col["column_name"]}: {col["data_type"]} (nullable: {col["is_nullable"]})')
        
        # Get a sample record
        sample = await conn.fetchrow('SELECT * FROM odds LIMIT 1')
        if sample:
            print(f'\nSample record:')
            for key, value in sample.items():
                print(f'  {key}: {value}')
        
        await conn.close()
        
    except Exception as e:
        print(f'Error: {e}')

if __name__ == "__main__":
    asyncio.run(check_odds_structure())
