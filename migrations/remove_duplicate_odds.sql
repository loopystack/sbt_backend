-- Remove duplicate rows from odds table
-- Keeps one row per (date, time, country, home_team, away_team, league, season) - the one with the smallest id.
-- Run against your database (e.g. psql -f remove_duplicate_odds.sql or run in your SQL client).

-- ========== STEP 1: PREVIEW (optional, no changes) ==========
-- See how many duplicate groups and rows would be affected:
/*
SELECT date, time, country, home_team, away_team, league, season, COUNT(*) AS duplicate_count
FROM odds
GROUP BY date, time, country, home_team, away_team, league, season
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
*/

-- Total number of duplicate rows that will be deleted (optional):
/*
SELECT SUM(cnt - 1) AS rows_to_delete
FROM (
  SELECT COUNT(*) AS cnt
  FROM odds
  GROUP BY date, time, country, home_team, away_team, league, season
  HAVING COUNT(*) > 1
) t;
*/

-- ========== STEP 2: DELETE DUPLICATES (PostgreSQL) ==========
-- Keeps the row with the smallest id for each (date, time, country, home_team, away_team, league, season).
-- Uses IS NOT DISTINCT FROM so NULL in time/country is treated as equal to NULL.

DELETE FROM odds o1
USING odds o2
WHERE o1.date = o2.date
  AND (o1.time IS NOT DISTINCT FROM o2.time)
  AND (o1.country IS NOT DISTINCT FROM o2.country)
  AND o1.home_team = o2.home_team
  AND o1.away_team = o2.away_team
  AND o1.league = o2.league
  AND o1.season = o2.season
  AND o1.id > o2.id;

-- ========== OPTIONAL: Add unique constraint to prevent future duplicates ==========
-- Uncomment only after duplicates are removed and you're sure (date, time, country, home_team, away_team, league, season) is unique.
/*
CREATE UNIQUE INDEX IF NOT EXISTS idx_odds_unique_match
ON odds (date, time, country, home_team, away_team, league, season);
*/
