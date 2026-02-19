#!/usr/bin/env python3
"""
Audit odds table for data quality issues:
  - Duplicate matches (same teams, date, time)
  - Invalid results (e.g. 3-15, likely time misparsed)
  - Season/date mismatch (season 2025 for date in 2026 - may be OK for two-year leagues)

Run from project root: python scripts/audit_odds_data.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.odds import Odds

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


def _norm(s):
    return (s or "").strip().lower()


async def audit():
    async with AsyncSessionLocal() as db:
        # 1. Duplicates (same country, league, date, time, home, away - normalized)
        from collections import defaultdict
        q = select(Odds).order_by(Odds.date, Odds.time)
        r = await db.execute(q)
        rows = r.scalars().all()
        groups = defaultdict(list)
        for row in rows:
            key = (_norm(row.country), _norm(row.league), row.date, row.time, _norm(row.home_team), _norm(row.away_team))
            groups[key].append(row)
        dupes = [(k, v) for k, v in groups.items() if len(v) > 1]
        print("=" * 60)
        print("1. DUPLICATE MATCHES (same teams, date, time)")
        print("=" * 60)
        if not dupes:
            print("  None found.")
        else:
            for key, rows in dupes[:20]:  # limit output
                print(f"  {rows[0].home_team} vs {rows[0].away_team} | {rows[0].date} {rows[0].time} | {len(rows)} rows")
                for row in rows:
                    print(f"    id={row.id} season={row.season} result={row.result} bets={row.bets}")
            if len(dupes) > 20:
                print(f"  ... and {len(dupes) - 20} more. Run: python scripts/remove_duplicate_odds.py --remove-all-dupes")

        # 2. Invalid results (either score > 10)
        invalid_results = []
        for row in rows:
            if not row.result or not str(row.result).strip():
                continue
            parts = str(row.result).strip().split("-")
            if len(parts) != 2:
                invalid_results.append(row)
                continue
            try:
                a, b = int(parts[0]), int(parts[1])
                if a > 10 or b > 10:
                    invalid_results.append(row)
            except ValueError:
                invalid_results.append(row)
        print("\n" + "=" * 60)
        print("2. INVALID RESULTS (score > 10, e.g. 3-15 from time misparse)")
        print("=" * 60)
        if not invalid_results:
            print("  None found.")
        else:
            for row in invalid_results[:30]:
                print(f"  id={row.id} {row.home_team} vs {row.away_team} | result={row.result}")
            if len(invalid_results) > 30:
                print(f"  ... and {len(invalid_results) - 30} more.")
            print(f"\n  Run: python scripts/clear_invalid_odds_results.py")

        # 3. Season vs date (informational)
        print("\n" + "=" * 60)
        print("3. SEASON vs DATE (informational)")
        print("=" * 60)
        print("  season=2025 with date in 2026 is OK for two-year leagues (2025/26).")
        print("  season=2026 with date in 2026 is OK for single-year leagues.")
        print("  Duplicates with different seasons are now deduped by remove_duplicate_odds.py")

        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"  Duplicates: {len(dupes)} match(es)")
        print(f"  Invalid results: {len(invalid_results)} row(s)")
        print(f"  Total odds rows: {len(rows)}")


if __name__ == "__main__":
    asyncio.run(audit())
