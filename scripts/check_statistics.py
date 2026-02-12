#!/usr/bin/env python3
"""
Check actual statistics values in the database to verify if displayed numbers are expected.
"""
import os
import sys
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
import psycopg
from psycopg.sql import SQL, Identifier

load_dotenv()

TABLE = "odds"


def check_statistics(conn):
    """Check actual statistics in database"""
    today = datetime.now().date()
    
    with conn.cursor() as cur:
        # Check bookmakers (bets column)
        print("\n📊 BOOKMAKERS STATISTICS:")
        print("=" * 60)
        
        # Max bookmakers
        cur.execute(f"SELECT MAX(bets) FROM {TABLE} WHERE bets IS NOT NULL")
        max_bets = cur.fetchone()[0]
        print(f"Maximum bookmakers for any match: {max_bets}")
        
        # Average bookmakers
        cur.execute(f"SELECT AVG(bets) FROM {TABLE} WHERE bets IS NOT NULL AND bets > 0")
        avg_bets = cur.fetchone()[0]
        print(f"Average bookmakers per match: {avg_bets:.2f}" if avg_bets else "Average bookmakers per match: N/A")
        
        # Distribution
        cur.execute(f"""
            SELECT 
                COUNT(*) as total_matches,
                MIN(bets) as min_bets,
                MAX(bets) as max_bets,
                AVG(bets) as avg_bets
            FROM {TABLE} 
            WHERE bets IS NOT NULL AND bets > 0
        """)
        dist = cur.fetchone()
        print(f"Matches with bookmaker data: {dist[0]}")
        if dist[0] > 0:
            print(f"  Min: {dist[1]}, Max: {dist[2]}, Avg: {dist[3]:.2f}")
        
        # Check sports/leagues
        print("\n🏆 SPORTS/LEAGUES STATISTICS:")
        print("=" * 60)
        cur.execute(f"SELECT COUNT(DISTINCT league) FROM {TABLE}")
        distinct_leagues = cur.fetchone()[0]
        print(f"Distinct leagues: {distinct_leagues}")
        
        cur.execute(f"SELECT league, COUNT(*) as match_count FROM {TABLE} GROUP BY league ORDER BY match_count DESC LIMIT 10")
        top_leagues = cur.fetchall()
        print("\nTop 10 leagues by match count:")
        for league, count in top_leagues:
            print(f"  {league}: {count} matches")
        
        # Check daily matches
        print(f"\n📅 DAILY MATCHES STATISTICS (for {today}):")
        print("=" * 60)
        cur.execute(f"SELECT COUNT(*) FROM {TABLE} WHERE date = %s", (today,))
        today_count = cur.fetchone()[0]
        print(f"Matches scheduled for today ({today}): {today_count}")
        
        # Check matches in next 7 days
        from datetime import timedelta
        next_week = today + timedelta(days=7)
        cur.execute(f"SELECT COUNT(*) FROM {TABLE} WHERE date BETWEEN %s AND %s", (today, next_week))
        week_count = cur.fetchone()[0]
        print(f"Matches in next 7 days: {week_count}")
        
        # Check total matches
        cur.execute(f"SELECT COUNT(*) FROM {TABLE}")
        total_matches = cur.fetchone()[0]
        print(f"Total matches in database: {total_matches:,}")
        
        # Date range
        cur.execute(f"SELECT MIN(date), MAX(date) FROM {TABLE}")
        date_range = cur.fetchone()
        print(f"Date range: {date_range[0]} to {date_range[1]}")
        
        print("\n" + "=" * 60)
        print("💡 INTERPRETATION:")
        print("=" * 60)
        print(f"- Bookmakers: Using AVG({avg_bets:.0f}) rounded = {((int(avg_bets or 0) + 9) // 10) * 10}+")
        print(f"- Sports: {distinct_leagues}+")
        print(f"- Daily Matches: {today_count}+")
        
        if today_count > 500:
            print("\n⚠️  WARNING: Daily matches count seems very high (>500).")
            print("   This might indicate:")
            print("   - Duplicate matches in database")
            print("   - Data quality issues")
            print("   - Or you're scraping many leagues (which is fine)")
        
        if max_bets and max_bets > 100:
            print(f"\n⚠️  NOTE: Maximum bookmakers ({max_bets}) seems high.")
            print("   This is the max for a single match, not total bookmakers.")


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
        check_statistics(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
