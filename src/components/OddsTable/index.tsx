import React, { useState } from "react";

type Match = {
  id: string;
  time: string;
  status: "Live" | "Upcoming" | "Finished";
  teams: string;
  sport: string;
  league: string;
  bookmakers: {
    name: string;
    home: string;
    away: string;
    draw?: string;
    overUnder?: string;
  }[];
};

export default function OddsTable() {
  const [selectedMarket, setSelectedMarket] = useState("Match Winner");
  
  const matches: Match[] = [
    {
      id: "1",
      time: "LIVE",
      status: "Live",
      teams: "Kansas City Chiefs vs Buffalo Bills",
      sport: "Football",
      league: "NFL",
      bookmakers: [
        { name: "Bet365", home: "+150", away: "-180" },
        { name: "DraftKings", home: "+155", away: "-175" },
        { name: "FanDuel", home: "+145", away: "-185" }
      ]
    },
    {
      id: "2",
      time: "19:30",
      status: "Upcoming",
      teams: "Lakers vs Warriors",
      sport: "Basketball",
      league: "NBA",
      bookmakers: [
        { name: "Bet365", home: "-110", away: "-110" },
        { name: "DraftKings", home: "-105", away: "-115" },
        { name: "FanDuel", home: "-108", away: "-112" }
      ]
    },
    {
      id: "3",
      time: "20:00",
      status: "Upcoming",
      teams: "Djokovic vs Medvedev",
      sport: "Tennis",
      league: "Grand Slam",
      bookmakers: [
        { name: "Bet365", home: "+200", away: "-250" },
        { name: "DraftKings", home: "+195", away: "-245" },
        { name: "FanDuel", home: "+210", away: "-260" }
      ]
    },
    {
      id: "4",
      time: "21:00",
      status: "Upcoming",
      teams: "Yankees vs Red Sox",
      sport: "Baseball",
      league: "MLB",
      bookmakers: [
        { name: "Bet365", home: "-120", away: "+100" },
        { name: "DraftKings", home: "-125", away: "+105" },
        { name: "FanDuel", home: "-118", away: "+102" }
      ]
    }
  ];

  const markets = ["Match Winner", "Over/Under", "Handicap", "Both Teams Score"];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live": return "text-red-400 bg-red-500/20 border-red-500/30";
      case "Upcoming": return "text-blue-400 bg-blue-500/20 border-blue-500/30";
      case "Finished": return "text-muted bg-muted/20 border-muted/30";
      default: return "text-muted bg-muted/20 border-muted/30";
    }
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0 px-2">
        <h2 className="text-xl sm:text-2xl font-bold text-text">Live Matches & Odds</h2>
        
        {/* Market Selector */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {markets.map((market) => (
            <button
              key={market}
              onClick={() => setSelectedMarket(market)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                selectedMarket === market
                  ? "bg-accent text-white shadow-lg"
                  : "bg-surface text-muted hover:text-text hover:bg-surface/80 border border-border"
              }`}
            >
              {market}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="block lg:hidden space-y-3">
        {matches.map((match) => (
          <div key={match.id} className="bg-surface border border-border rounded-xl p-4">
            {/* Match Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text text-sm sm:text-base leading-tight line-clamp-2">
                  {match.teams}
                </h3>
                <p className="text-xs sm:text-sm text-muted mt-1">{match.sport} • {match.league}</p>
              </div>
              <div className="flex flex-col items-end gap-2 ml-3">
                <span className="text-xs sm:text-sm font-semibold text-text">{match.time}</span>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(match.status)}`}>
                  {match.status}
                </span>
              </div>
            </div>
            
            {/* Odds Grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {match.bookmakers.map((bookmaker, index) => (
                <div key={index} className="text-center">
                  <div className="text-xs text-muted mb-1">{bookmaker.name}</div>
                  <div className="text-xs sm:text-sm font-semibold text-text">{bookmaker.home}</div>
                  <div className="text-xs sm:text-sm font-semibold text-text">{bookmaker.away}</div>
                </div>
              ))}
            </div>
            
            {/* Best Odds & Action */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="text-center">
                <div className="text-xs text-muted">Best Odds</div>
                <div className="text-sm font-bold text-accent">+155 / -260</div>
              </div>
              <button className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors hover:scale-105">
                Compare
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full">
            <thead>
              <tr className="bg-bg border-b border-border">
                <th className="text-left p-4 font-semibold text-text">Match</th>
                <th className="text-center p-4 font-semibold text-text">Time</th>
                <th className="text-center p-4 font-semibold text-text">Status</th>
                <th className="text-center p-4 font-semibold text-text">Bet365</th>
                <th className="text-center p-4 font-semibold text-text">DraftKings</th>
                <th className="text-center p-4 font-semibold text-text">FanDuel</th>
                <th className="text-center p-4 font-semibold text-text">Best Odds</th>
                <th className="text-center p-4 font-semibold text-text">Action</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match, index) => (
                <tr key={match.id} className={`border-b border-border/50 hover:bg-bg/50 transition-colors ${
                  index % 2 === 0 ? 'bg-surface' : 'bg-surface/50'
                }`}>
                  <td className="p-4">
                    <div>
                      <div className="font-semibold text-text text-base">{match.teams}</div>
                      <div className="text-sm text-muted mt-1">{match.sport} • {match.league}</div>
                    </div>
                  </td>
                  <td className="text-center p-4">
                    <span className="text-sm font-semibold text-text">{match.time}</span>
                  </td>
                  <td className="text-center p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(match.status)}`}>
                      {match.status}
                    </span>
                  </td>
                  {match.bookmakers.map((bookmaker, index) => (
                    <td key={index} className="text-center p-4">
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted text-xs block">Home</span>
                          <span className="font-semibold text-text">{bookmaker.home}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted text-xs block">Away</span>
                          <span className="font-semibold text-text">{bookmaker.away}</span>
                        </div>
                      </div>
                    </td>
                  ))}
                  <td className="text-center p-4">
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-accent">
                        +155
                      </div>
                      <div className="text-sm font-bold text-accent">
                        -260
                      </div>
                    </div>
                  </td>
                  <td className="text-center p-4">
                    <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors hover:scale-105">
                      Compare
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
  