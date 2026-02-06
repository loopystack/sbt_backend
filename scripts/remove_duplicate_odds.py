"""
Remove duplicate or fake odds rows (e.g. same match scraped with wrong date due to timezone/header bug).

Examples:
  # List duplicate matches (same league + home + away, different date/time)
  python scripts/remove_duplicate_odds.py --list-dupes

  # Delete a specific fake row (dry run)
  python scripts/remove_duplicate_odds.py --country "France" --league "Ligue 1" --date 2026-02-06 --home "Metz" --away "Lille" --dry-run

  # Actually delete it
  python scripts/remove_duplicate_odds.py --country "France" --league "Ligue 1" --date 2026-02-06 --home "Metz" --away "Lille"

  # Remove all duplicates (keeps one row per match: latest date/time)
  python scripts/remove_duplicate_odds.py --remove-all-dupes
  python scripts/remove_duplicate_odds.py --remove-all-dupes --dry-run

Run from project root.
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, delete, func
from app.core.database import AsyncSessionLocal
from app.models.odds import Odds

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def list_duplicates(db) -> None:
    """Find (country, league, season, home_team, away_team) with more than one row."""
    q = (
        select(
            Odds.country,
            Odds.league,
            Odds.season,
            Odds.home_team,
            Odds.away_team,
            func.count(Odds.id).label("cnt"),
        )
        .group_by(Odds.country, Odds.league, Odds.season, Odds.home_team, Odds.away_team)
        .having(func.count(Odds.id) > 1)
    )
    result = await db.execute(q)
    rows = result.all()
    if not rows:
        print("No duplicate matches (same country/league/season/home/away) found.")
        return
    print(f"Found {len(rows)} match(es) with duplicate rows:")
    for r in rows:
        print(f"  {r.country} | {r.league} | season={r.season} | {r.home_team} vs {r.away_team} | rows={r.cnt}")
    print("\nTo remove a specific row use --country --league --date --home --away (and optionally --time).")
    print("To remove all duplicate rows (keep latest date/time per match): --remove-all-dupes")


async def remove_all_duplicates(db, dry_run: bool) -> None:
    """For each duplicate group (same country/league/season/home/away), keep the row with latest (date, time); delete the rest."""
    q = (
        select(
            Odds.country,
            Odds.league,
            Odds.season,
            Odds.home_team,
            Odds.away_team,
        )
        .group_by(Odds.country, Odds.league, Odds.season, Odds.home_team, Odds.away_team)
        .having(func.count(Odds.id) > 1)
    )
    result = await db.execute(q)
    groups = result.all()
    if not groups:
        print("No duplicate matches found. Nothing to remove.")
        return
    total_deleted = 0
    for g in groups:
        rows_q = select(Odds).where(
            Odds.country == g.country,
            Odds.league == g.league,
            Odds.season == g.season,
            Odds.home_team == g.home_team,
            Odds.away_team == g.away_team,
        ).order_by(Odds.date.desc(), Odds.time.desc().nulls_last())
        r = await db.execute(rows_q)
        rows = list(r.scalars().all())
        # keep first (latest date/time), delete the rest
        to_delete = rows[1:]
        for row in to_delete:
            print(f"  delete id={row.id} date={row.date} time={row.time} {row.home_team} vs {row.away_team}")
            if not dry_run:
                await db.delete(row)
            total_deleted += 1
    if dry_run:
        print(f"Dry run: would delete {total_deleted} row(s). Run without --dry-run to apply.")
    else:
        await db.commit()
        print(f"Deleted {total_deleted} duplicate row(s).")


async def delete_match(
    db,
    country: str,
    league: str,
    date_str: str,
    home_team: str,
    away_team: str,
    time_str: str | None,
    dry_run: bool,
) -> None:
    from datetime import date, time

    d = date.fromisoformat(date_str)
    t = None
    if time_str:
        parts = time_str.strip().split(":")
        if len(parts) >= 2:
            t = time(int(parts[0]), int(parts[1]), 0)

    stmt = select(Odds).where(
        Odds.country == country,
        Odds.league.ilike(f"%{league}%"),
        Odds.date == d,
        Odds.home_team.ilike(f"%{home_team}%"),
        Odds.away_team.ilike(f"%{away_team}%"),
    )
    if t is not None:
        stmt = stmt.where(Odds.time == t)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    if not rows:
        print("No matching row(s) found.")
        return
    for row in rows:
        print(f"  id={row.id} date={row.date} time={row.time} {row.home_team} vs {row.away_team}")
    if dry_run:
        print("Dry run: no rows deleted. Run without --dry-run to delete.")
        return
    for row in rows:
        await db.delete(row)
    await db.commit()
    print(f"Deleted {len(rows)} row(s).")


def main() -> None:
    p = argparse.ArgumentParser(description="List or remove duplicate/fake odds rows")
    p.add_argument("--list-dupes", action="store_true", help="List matches that have duplicate rows")
    p.add_argument("--remove-all-dupes", action="store_true", help="Remove all duplicate rows (keep one per match: latest date/time)")
    p.add_argument("--country", type=str, help="Filter by country (e.g. France)")
    p.add_argument("--league", type=str, help="Filter by league (e.g. Ligue 1)")
    p.add_argument("--date", type=str, help="Date YYYY-MM-DD of the row to delete")
    p.add_argument("--time", type=str, help="Optional time HH:MM of the row to delete")
    p.add_argument("--home", type=str, help="Home team name")
    p.add_argument("--away", type=str, help="Away team name")
    p.add_argument("--dry-run", action="store_true", help="Only show what would be deleted")
    args = p.parse_args()

    async def run():
        async with AsyncSessionLocal() as db:
            if args.list_dupes:
                await list_duplicates(db)
                return
            if args.remove_all_dupes:
                await remove_all_duplicates(db, args.dry_run)
                return
            if args.country and args.league and args.date and args.home and args.away:
                await delete_match(
                    db,
                    args.country,
                    args.league,
                    args.date,
                    args.home,
                    args.away,
                    args.time,
                    args.dry_run,
                )
                return
            p.print_help()
            print("\nUse --list-dupes to list duplicates, --remove-all-dupes to remove all, or --country --league --date --home --away to delete a specific row.")

    asyncio.run(run())


if __name__ == "__main__":
    main()
