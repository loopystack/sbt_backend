import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def test_odds_query():
    database_url = os.getenv('DATABASE_URL')
    
    try:
        conn = await asyncpg.connect(database_url)
        
        # Test the exact query that the API is trying to run
        query = """
        SELECT id, season, date, time, home_team, away_team, result, 
               odd_1, odd_X, odd_2, bets, country, league, 
               pre_odd_1, pre_odd_x, pre_odd_2
        FROM odds 
        WHERE country ILIKE '%brazil%'
        ORDER BY date DESC, time DESC
        LIMIT 3
        """
        
        result = await conn.fetch(query)
        print(f"Query executed successfully, found {len(result)} records")
        
        if result:
            print("Sample record:")
            for key, value in result[0].items():
                print(f"  {key}: {value}")
        
        await conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_odds_query())
