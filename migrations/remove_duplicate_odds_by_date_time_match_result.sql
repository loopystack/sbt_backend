-- Remove duplicate rows from odds where Date, Time, Match (home_team, away_team) and Result are the same.
-- Keeps one row per (date, time, home_team, away_team, result, league, season) - the one with the smallest id.
-- Run against your database (e.g. psql -f remove_duplicate_odds_by_date_time_match_result.sql).

-- ========== STEP 1: PREVIEW (optional) ==========
-- Count duplicate groups by date, time, match, result:
/*
SELECT date, time, home_team, away_team, result, league, season, COUNT(*) AS cnt
FROM odds
GROUP BY date, time, home_team, away_team, result, league, season
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
*/

-- Total duplicate rows that will be deleted:
/*
SELECT SUM(cnt - 1) AS rows_to_delete
FROM (
  SELECT COUNT(*) AS cnt
  FROM odds
  GROUP BY date, time, home_team, away_team, result, league, season
  HAVING COUNT(*) > 1
) t;
*/

-- ========== STEP 2: DELETE DUPLICATES (PostgreSQL) ==========
-- Keeps the row with the smallest id for each (date, time, home_team, away_team, result, league, season).
-- Uses IS NOT DISTINCT FROM for NULL-safe comparison on time and result.

DELETE FROM odds o1
USING odds o2
WHERE o1.date = o2.date
  AND (o1.time IS NOT DISTINCT FROM o2.time)
  AND o1.home_team = o2.home_team
  AND o1.away_team = o2.away_team
  AND (o1.result IS NOT DISTINCT FROM o2.result)
  AND o1.league = o2.league
  AND o1.season = o2.season
  AND o1.id > o2.id;

-- ========== OPTIONAL: Unique index to prevent future duplicates ==========
/*
CREATE UNIQUE INDEX IF NOT EXISTS idx_odds_unique_date_time_match_result
ON odds (date, time, home_team, away_team, result, league, season);
*/
