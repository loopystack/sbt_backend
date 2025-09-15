import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check_odds_data():
    database_url = os.getenv('DATABASE_URL')
    
    try:
        conn = await asyncpg.connect(database_url)
        
        # Check total count
        total_count = await conn.fetchval('SELECT COUNT(*) FROM odds')
        print(f'Total odds records: {total_count}')
        
        # Check countries
        countries = await conn.fetch('SELECT DISTINCT country FROM odds ORDER BY country')
        print(f'\nCountries ({len(countries)}):')
        for country in countries[:10]:  # Show first 10
            print(f'  - {country["country"]}')
        
        # Check leagues per country
        print(f'\nLeagues per country:')
        for country in countries[:5]:  # Show first 5 countries
            leagues = await conn.fetch('SELECT DISTINCT league FROM odds WHERE country = $1 ORDER BY league', country['country'])
            print(f'  {country["country"]}: {len(leagues)} leagues')
            for league in leagues[:3]:  # Show first 3 leagues per country
                print(f'    - {league["league"]}')
        
        # Check years/seasons
        seasons = await conn.fetch('SELECT DISTINCT season FROM odds ORDER BY season')
        print(f'\nSeasons ({len(seasons)}):')
        for season in seasons:
            print(f'  - {season["season"]}')
        
        # Check dates
        date_range = await conn.fetch('SELECT MIN(date) as min_date, MAX(date) as max_date FROM odds')
        if date_range:
            print(f'\nDate range: {date_range[0]["min_date"]} to {date_range[0]["max_date"]}')
        
        await conn.close()
        
    except Exception as e:
        print(f'Error: {e}')

if __name__ == "__main__":
    asyncio.run(check_odds_data())
