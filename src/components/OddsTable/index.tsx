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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text">Live Matches & Odds</h2>
        
        {/* Market Selector */}
        <div className="flex gap-2">
          {markets.map((market) => (
            <button
              key={market}
              onClick={() => setSelectedMarket(market)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
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

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
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
                    <button className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors hover:scale-105">
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
  