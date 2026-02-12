#!/usr/bin/env python3
"""
Cleanup duplicate matches: same teams within 2 days.
Removes duplicates, keeping the one with a result (or earlier date if both pending).
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


def cleanup_duplicates(conn, dry_run=True):
    """Find and optionally remove duplicate matches"""
    with conn.cursor() as cur:
        # Find duplicates: same teams within 2 days, different dates
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
                AND o1.id < o2.id
                AND o1.date != o2.date
                AND ABS(o1.date - o2.date) <= 2
            )
            ORDER BY o1.country, o1.league, o1.home_team, o1.away_team, o1.date
        """).format(table=Identifier(TABLE))
        
        cur.execute(query)
        duplicates = cur.fetchall()
        
        if not duplicates:
            print("✅ No duplicates found")
            return
        
        print(f"\n🔍 Found {len(duplicates)} duplicate pairs\n")
        
        ids_to_delete = []
        for dup in duplicates:
            id1, date1, time1, result1, id2, date2, time2, result2, country, league, season, home, away = dup
            
            # Decide which to keep
            if result1 and not result2:
                keep_id, delete_id = id1, id2
                reason = "Match 1 has result"
            elif result2 and not result1:
                keep_id, delete_id = id2, id1
                reason = "Match 2 has result"
            elif date1 < date2:
                keep_id, delete_id = id1, id2
                reason = "Match 1 is earlier"
            else:
                keep_id, delete_id = id2, id1
                reason = "Match 2 is earlier"
            
            print(f"🔍 {home} vs {away} ({country} {league})")
            print(f"   Match 1: ID {id1}, {date1} {time1 or 'N/A'}, result: {result1 or 'None'}")
            print(f"   Match 2: ID {id2}, {date2} {time2 or 'N/A'}, result: {result2 or 'None'}")
            print(f"   → Keep ID {keep_id} ({reason}), delete ID {delete_id}")
            
            ids_to_delete.append(delete_id)
            print()
        
        if dry_run:
            print(f"🔍 DRY RUN: Would delete {len(ids_to_delete)} duplicate matches")
            print(f"   Run with --execute to actually delete")
        else:
            # Check if any bets reference these IDs
            bet_check_sql = SQL("""
                SELECT COUNT(*) FROM betting_records WHERE match_id = ANY(%s)
            """)
            cur.execute(bet_check_sql, (ids_to_delete,))
            bet_count = cur.fetchone()[0]
            
            if bet_count > 0:
                print(f"⚠️  WARNING: {bet_count} betting record(s) reference these matches!")
                print(f"   Deletion cancelled - update betting records first")
                return
            
            # Delete duplicates
            delete_sql = SQL("DELETE FROM {table} WHERE id = ANY(%s)").format(table=Identifier(TABLE))
            cur.execute(delete_sql, (ids_to_delete,))
            deleted = cur.rowcount
            conn.commit()
            print(f"✅ Deleted {deleted} duplicate matches")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Cleanup duplicate matches")
    parser.add_argument("--execute", action="store_true", help="Actually delete (default: dry-run)")
    args = parser.parse_args()
    
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
        cleanup_duplicates(conn, dry_run=not args.execute)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
