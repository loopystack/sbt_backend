-- Remove duplicates where the same MATCH (home_team, away_team) and RESULT appear multiple times
-- in the same league/season (e.g. "Bayern Munich VS RB Leipzig" 6-0 on different dates/times).
-- Keeps ONE row per (home_team, away_team, result, league, season) - the one with the smallest id.
-- Run against your database (e.g. psql -f remove_duplicate_odds_by_match_and_result.sql).

-- ========== STEP 1: PREVIEW (optional) ==========
-- See duplicate match+result groups (same teams, same score, same league/season):
/*
SELECT home_team, away_team, result, league, season, COUNT(*) AS cnt
FROM odds
GROUP BY home_team, away_team, result, league, season
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
*/

-- Total rows that will be deleted:
/*
SELECT SUM(cnt - 1) AS rows_to_delete
FROM (
  SELECT COUNT(*) AS cnt
  FROM odds
  GROUP BY home_team, away_team, result, league, season
  HAVING COUNT(*) > 1
) t;
*/

-- ========== STEP 2: DELETE DUPLICATES (PostgreSQL) ==========
-- Keeps the row with the smallest id for each (home_team, away_team, result, league, season).

DELETE FROM odds o1
USING odds o2
WHERE o1.home_team = o2.home_team
  AND o1.away_team = o2.away_team
  AND (o1.result IS NOT DISTINCT FROM o2.result)
  AND o1.league = o2.league
  AND o1.season = o2.season
  AND o1.id > o2.id;

-- ========== OPTIONAL: Unique index to prevent same match+result appearing twice in same league/season ==========
/*
CREATE UNIQUE INDEX IF NOT EXISTS idx_odds_unique_match_result
ON odds (home_team, away_team, result, league, season);
*/
