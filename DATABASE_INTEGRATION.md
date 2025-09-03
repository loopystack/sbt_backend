# Database Integration Documentation

## Overview
This document explains how the sportsbetting_db database has been integrated with the frontend odds table.

## What was implemented

### 1. Database Service (`src/services/databaseService.ts`)
- Created a singleton service to handle database operations
- Provides methods for:
  - Getting paginated matching info
  - Filtering by country
  - Filtering by date
  - Getting live/finished matches
  - Adding/updating match data

### 2. Sample Data (`src/data/sampleData.ts`)
- Created sample data structure matching the `MatchingInfo` type from the database
- Includes real football matches with odds from major European leagues
- Provides transformation function to convert database format to UI format

### 3. Updated Services (`src/store/matchinginfo/services.ts`)
- Modified the matching info service to use local database service instead of API calls
- Returns data in the expected format for the Redux store

### 4. Enhanced OddsTable (`src/components/OddsTable/index.tsx`)
- Updated to prioritize database data over hardcoded matches
- Shows real match data with proper team names, odds, and leagues
- Displays "(from database)" indicator when using database data
- Maintains backward compatibility with country context data

## Database Structure

The `MatchingInfo` type includes:
```typescript
{
  id: string;
  season: string;
  date: string;
  time: string;
  home_team: string;
  away_team: string;
  result: string;
  odd_1: number;    // Home team odds
  odd_X: number;    // Draw odds
  odd_2: number;    // Away team odds
  bets: number;
  country: string;
  createdAt: string;
  updatedAt: string;
}
```

## Features

### Current Features
- ✅ Displays real match data from database
- ✅ Shows odds for Home/Draw/Away
- ✅ Multiple bookmaker odds (Bet365, DraftKings, FanDuel)
- ✅ Country filtering
- ✅ Date grouping
- ✅ Pagination support
- ✅ Both card and row view modes

### Future Enhancements (when connecting to actual PostgreSQL)
- 🔄 Real-time odds updates
- 🔄 Live score integration
- 🔄 More betting markets (Over/Under, Handicap, etc.)
- 🔄 Historical data analysis

## Testing
The integration has been tested with sample data containing:
- 10 sample matches from major European leagues
- Real team names (Manchester United, Barcelona, Bayern Munich, etc.)
- Realistic odds values
- Multiple countries (England, Spain, Germany, France, Italy)

## Notes
- Currently using sample data instead of the actual PostgreSQL dump
- The `sportsbetting_db` file is a binary PostgreSQL dump that would need PostgreSQL tools to restore
- The current implementation provides a foundation for connecting to the actual database when available
- All data transformation and UI integration is ready for real database connection

## How to Connect Real Database
When PostgreSQL is available:
1. Restore the `sportsbetting_db` dump to a PostgreSQL instance
2. Update the `databaseService.ts` to connect to the actual database
3. Replace sample data calls with actual database queries
4. Update environment variables for database connection
