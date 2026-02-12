#!/usr/bin/env python3
"""
Find duplicate matches: same teams within 2 days (likely timezone/parsing issues).
Helps identify data quality issues from scraper.
"""
import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
import psycopg
from psycopg.sql import SQL, Identifier

load_dotenv()

TABLE = "odds"


def find_duplicate_matches(conn):
    """Find matches with same teams within 2 days"""
    with conn.cursor() as cur:
        # Find all matches where same teams play within 2 days
        query = SQL("""
            SELECT 
                o1.id as id1, o1.date as date1, o1.time as time1, o1.result as result1,
                o2.id as id2, o2.date as date2, o2.time as time2, o2.result as result2,
                o1.country, o1.league, o1.season, o1.home_team, o1.away_team
            FROM {table} o1
            JOIN {table} o2 ON (
                o1.country = o2.country
                AND o1.league = o2.league
                AND o1.season = o2.season
                AND o1.home_team = o2.home_team
                AND o1.away_team = o2.away_team
                AND o1.id < o2.id  -- Avoid duplicate pairs
                AND ABS(o1.date - o2.date) <= 2
            )
            ORDER BY o1.country, o1.league, o1.home_team, o1.away_team, o1.date
        """).format(table=Identifier(TABLE))
        
        cur.execute(query)
        duplicates = cur.fetchall()
        
        if not duplicates:
            print("✅ No suspicious duplicates found (same teams within 2 days)")
            return
        
        print(f"\n⚠️  Found {len(duplicates)} suspicious duplicate pairs:\n")
        
        for dup in duplicates:
            id1, date1, time1, result1, id2, date2, time2, result2, country, league, season, home, away = dup
            days_diff = abs((date2 - date1).days)
            
            print(f"🔍 {home} vs {away} ({country} {league}, season {season})")
            print(f"   Match 1: ID {id1}, {date1} {time1 or 'N/A'}, result: {result1 or 'None'}")
            print(f"   Match 2: ID {id2}, {date2} {time2 or 'N/A'}, result: {result2 or 'None'}")
            print(f"   Days apart: {days_diff}")
            
            # Suggest which one to keep
            if result1 and not result2:
                print(f"   💡 Keep Match 1 (has result), delete Match 2")
            elif result2 and not result1:
                print(f"   💡 Keep Match 2 (has result), delete Match 1")
            elif result1 and result2:
                print(f"   ⚠️  Both have results - manual review needed!")
            else:
                print(f"   💡 Both pending - keep earlier date (Match 1)")
            print()


def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL not set in .env")
    
    # Normalize SQLAlchemy-style URLs for psycopg
    if "postgresql+psycopg://" in database_url:
        database_url = database_url.replace("postgresql+psycopg://", "postgresql://", 1)
    elif "postgresql+psycopg2://" in database_url:
        database_url = database_url.replace("postgresql+psycopg2://", "postgresql://", 1)
    
    conn = psycopg.connect(database_url)
    try:
        find_duplicate_matches(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
