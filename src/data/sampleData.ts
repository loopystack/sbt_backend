import { MatchingInfo } from '../store/matchinginfo/types';

export type Match = {
  id: string;
  time: string;
  status: "Live" | "Upcoming" | "Finished";
  teams: string;
  sport: string;
  league: string;
  result?: string;
  isHistorical?: boolean;
  bookmakers: {
    name: string;
    home: string;
    away: string;
    draw?: string;
    overUnder?: string;
  }[];
  date?: string;
  bookmakerCount?: number;
};

export function transformMatchingInfoToMatch(matchingInfo: MatchingInfo[]): Match[] {
  return matchingInfo.map((match) => {
    // Determine match status based on date/time
    const matchDate = new Date(`${match.date}T${match.time}`);
    const now = new Date();
    const isLive = Math.abs(matchDate.getTime() - now.getTime()) < 2 * 60 * 60 * 1000; // Within 2 hours
    const isFinished = matchDate.getTime() < now.getTime() && !isLive;
    
    let status: "Live" | "Upcoming" | "Finished";
    if (isLive) {
      status = "Live";
    } else if (isFinished) {
      status = "Finished";
    } else {
      status = "Upcoming";
    }

    // Create bookmakers array with the odds data
    // Handle null/undefined odd values safely
    const safeToString = (value: number | null | undefined): string => {
      if (value === null || value === undefined) {
        return 'N/A';
      }
      return value.toString();
    };

    const bookmakers = [
      {
        name: "Bet365",
        home: safeToString(match.odd_1),
        away: safeToString(match.odd_2),
        draw: safeToString(match.odd_X),
      },
      {
        name: "DraftKings", 
        home: safeToString(match.odd_1),
        away: safeToString(match.odd_2),
        draw: safeToString(match.odd_X),
      },
      {
        name: "FanDuel",
        home: safeToString(match.odd_1),
        away: safeToString(match.odd_2),
        draw: safeToString(match.odd_X),
      }
    ];

    return {
      id: match.id || 'unknown',
      time: match.time || 'TBD',
      status,
      teams: `${match.home_team || 'Home Team'} vs ${match.away_team || 'Away Team'}`,
      sport: "Football",
      league: match.league || 'Unknown League',
      result: match.result || undefined,
      isHistorical: status === "Finished",
      bookmakers,
      date: match.date || new Date().toISOString().split('T')[0],
      bookmakerCount: match.bets || 0,
    };
  });
}
