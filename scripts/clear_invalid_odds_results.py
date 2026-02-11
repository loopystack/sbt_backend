#!/usr/bin/env python3
"""
One-off: set invalid 'result' values in the odds table to NULL.
Invalid = not a football score (e.g. xx-xxx like 16-384, 19-823).
Valid = N-M with both N and M in 0-15 (e.g. 1-0, 2-1).

Run from backend root: python scripts/clear_invalid_odds_results.py
Requires .env with DATABASE_URL.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
import psycopg

load_dotenv()
database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)
for prefix in ("postgresql+psycopg://", "postgresql+psycopg2://"):
    if prefix in database_url:
        database_url = database_url.replace(prefix, "postgresql://", 1)
        break

def is_valid_result(result: str) -> bool:
    if not result or not str(result).strip():
        return False
    parts = str(result).strip().split("-")
    if len(parts) != 2:
        return False
    try:
        a, b = int(parts[0].strip()), int(parts[1].strip())
        return 0 <= a <= 15 and 0 <= b <= 15
    except ValueError:
        return False

def main():
    conn = psycopg.connect(database_url)
    try:
        with conn.cursor() as cur:
            # Count invalid
            cur.execute("""
                SELECT id, country, league, home_team, away_team, date, result
                FROM odds
                WHERE result IS NOT NULL AND trim(result) != ''
            """)
            rows = cur.fetchall()
        invalid = [r for r in rows if not is_valid_result(r[6])]
        if not invalid:
            print("No invalid results found. All stored results are valid (x-x with 0-15).")
            return
        print(f"Found {len(invalid)} row(s) with invalid result (e.g. xx-xxx). Clearing result to NULL.")
        ids = [r[0] for r in invalid]
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE odds SET result = NULL WHERE id = ANY(%s)",
                (ids,)
            )
        conn.commit()
        print(f"Updated {len(ids)} row(s). Re-run the scraper to fill correct results where available.")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
