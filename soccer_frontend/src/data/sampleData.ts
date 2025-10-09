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
    const bookmakers = [
      {
        name: "Bet365",
        home: match.odd_1?.toString() || "N/A",
        away: match.odd_2?.toString() || "N/A",
        draw: match.odd_X?.toString() || "N/A",
      },
      {
        name: "DraftKings", 
        home: match.odd_1?.toString() || "N/A",
        away: match.odd_2?.toString() || "N/A",
        draw: match.odd_X?.toString() || "N/A",
      },
      {
        name: "FanDuel",
        home: match.odd_1?.toString() || "N/A",
        away: match.odd_2?.toString() || "N/A",
        draw: match.odd_X?.toString() || "N/A",
      }
    ];

    return {
      id: match.id.toString(),
      time: match.time,
      status,
      teams: `${match.home_team} vs ${match.away_team}`,
      sport: "Football",
      league: match.league,
      result: match.result || undefined,
      isHistorical: status === "Finished",
      bookmakers,
      date: match.date,
      bookmakerCount: match.bets,
    };
  });
}
