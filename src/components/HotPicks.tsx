import React from "react";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { OddsConverter } from "../utils/oddsConverter";

export default function HotPicks() {
  // Odds format conversion
  const { getOddsInFormat, oddsFormat } = useOddsFormat();
  
  // Helper function to convert and format odds
  const formatOdds = (odds: string): string => {
    if (!odds || odds.trim() === '') {
      return odds || '';
    }
    
    // Use the robust string parser with correct conversion formulas
    const decimalOdds = OddsConverter.stringToDecimal(odds);
    const formatted = getOddsInFormat(decimalOdds);
    console.log(`HotPicks: Converting ${odds} -> ${decimalOdds} -> ${formatted} (format: ${oddsFormat})`);
    return formatted;
  };

  const hotPicks = [
    {
      id: 1,
      teams: "Kansas City Chiefs vs Buffalo Bills",
      sport: "Football",
      league: "NFL",
      odds: "+150",
      confidence: "High",
      tip: "Chiefs at home with Mahomes healthy",
      time: "20:00",
      date: "Today"
    },
    {
      id: 2,
      teams: "Lakers vs Warriors",
      sport: "Basketball",
      league: "NBA",
      odds: "-110",
      confidence: "Medium",
      tip: "Lakers coming off big win",
      time: "19:30",
      date: "Today"
    },
    {
      id: 3,
      teams: "Djokovic vs Medvedev",
      sport: "Tennis",
      league: "Grand Slam",
      odds: "+200",
      confidence: "High",
      tip: "Djokovic on hard court",
      time: "20:00",
      date: "Today"
    },
    {
      id: 4,
      teams: "Yankees vs Red Sox",
      sport: "Baseball",
      league: "MLB",
      odds: "-120",
      confidence: "Medium",
      tip: "Yankees strong pitching",
      time: "21:00",
      date: "Today"
    },
    {
      id: 5,
      teams: "Manchester City vs Arsenal",
      sport: "Soccer",
      league: "Premier League",
      odds: "+180",
      confidence: "High",
      tip: "City at home advantage",
      time: "15:00",
      date: "Tomorrow"
    }
  ];

  return (
    <section className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0 px-2">
        <h2 className="text-xl sm:text-2xl font-bold text-text">Hot Picks</h2>
        <button className="text-accent hover:text-accent/80 text-sm font-medium self-start sm:self-auto">
          View All →
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {hotPicks.map((pick) => (
          <div
            key={pick.id}
            className="bg-surface border border-border rounded-xl p-4 sm:p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0"></span>
                <span className="text-xs font-medium text-muted uppercase tracking-wide">
                  {pick.sport}
                </span>
              </div>
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                pick.confidence === 'High' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                pick.confidence === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {pick.confidence}
              </span>
            </div>
            
            <h3 className="font-bold text-text mb-2 sm:mb-3 text-base sm:text-lg leading-tight line-clamp-2">
              {pick.teams}
            </h3>
            
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <span className="text-xs sm:text-sm text-muted truncate">{pick.league}</span>
              <div className="text-right">
                <div className="text-xs sm:text-sm text-muted">{pick.date}</div>
                <div className="text-base sm:text-lg font-bold text-accent">{pick.time}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
              <div className="text-center">
                <span className="text-xs text-muted block">Best Odds</span>
                <span className="text-xl sm:text-2xl font-bold text-text">{formatOdds(pick.odds)}</span>
              </div>
              <button className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors group-hover:scale-105 flex-shrink-0">
                Compare Odds
              </button>
            </div>
            
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs sm:text-sm text-muted italic flex items-start gap-2">
                <span className="text-accent text-base sm:text-lg flex-shrink-0">💡</span>
                <span className="line-clamp-2">{pick.tip}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
