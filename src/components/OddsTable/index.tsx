import React, { useState } from "react";
import { useCountry } from "../../contexts/CountryContext";

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
  date?: string;
  bookmakerCount?: number;
};

export default function OddsTable() {
  const { selectedCountry, selectedLeague } = useCountry();
  const [selectedMarket, setSelectedMarket] = useState("Match Winner");
  
  // Default matches when no country is selected
  const defaultMatches = [
    {
      id: "1",
      time: "LIVE",
      status: "Live",
      teams: "Kansas City Chiefs vs Buffalo Bills",
      sport: "Football",
      league: "NFL",
      bookmakers: [
        { name: "Bet365", home: "+150", away: "-180", draw: undefined },
        { name: "DraftKings", home: "+155", away: "-175", draw: undefined },
        { name: "FanDuel", home: "+145", away: "-185", draw: undefined }
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
        { name: "Bet365", home: "-110", away: "-110", draw: undefined },
        { name: "DraftKings", home: "-105", away: "-115", draw: undefined },
        { name: "FanDuel", home: "-108", away: "-112", draw: undefined }
      ]
    }
  ];

  // Get matches based on selected country
  const getMatches = () => {
    if (selectedLeague && selectedLeague.matches.length > 0) {
      // Return matches from the selected league
      return selectedLeague.matches.map(match => ({
        id: match.id,
        time: match.time,
        status: "Upcoming" as const,
        teams: `${match.team1} vs ${match.team2}`,
        sport: "Football",
        league: selectedLeague.name,
        bookmakers: [
          { name: "Bet365", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds },
          { name: "DraftKings", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds },
          { name: "FanDuel", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds }
        ],
        date: match.date,
        bookmakerCount: match.bookmakers
      }));
    }
    
    if (!selectedCountry) return defaultMatches;
    
    // Get all matches from all leagues of the selected country
    const allMatches = selectedCountry.leagues.flatMap(league => 
      league.matches.map(match => ({
        id: match.id,
        time: match.time,
        status: "Upcoming" as const,
        teams: `${match.team1} vs ${match.team2}`,
        sport: "Football",
        league: league.name,
        bookmakers: [
          { name: "Bet365", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds },
          { name: "DraftKings", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds },
          { name: "FanDuel", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds }
        ],
        date: match.date,
        bookmakerCount: match.bookmakers
      }))
    );
    
    return allMatches;
  };

  const matches = getMatches();
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
      {/* Breadcrumbs */}
      {selectedLeague && (
        <div className="text-sm text-muted mb-4 px-2">
          Home {'>'} Football {'>'} {selectedCountry?.name} {'>'} {selectedLeague.name}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0 px-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text">
            {selectedLeague ? `${selectedLeague.name} Betting Odds & Fixtures` : selectedCountry ? `${selectedCountry.name} - ${selectedCountry.leagues[0]?.name || 'Football'}` : 'Live Matches & Odds'}
          </h2>
          {selectedLeague ? (
            <p className="text-sm text-muted mt-1">
              {selectedLeague.matchCount} matches
            </p>
          ) : selectedCountry && (
            <p className="text-sm text-muted mt-1">
              {selectedCountry.leagues.length} leagues • {selectedCountry.leagues.reduce((total, league) => total + league.matchCount, 0)} matches
            </p>
          )}
        </div>
        
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
                {(match as any).date && (
                  <p className="text-xs text-muted mt-1">{(match as any).date}</p>
                )}
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
                  {bookmaker.draw && (
                    <div className="text-xs sm:text-sm font-semibold text-text">{bookmaker.draw}</div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Best Odds & Action */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="text-center">
                <div className="text-xs text-muted">Best Odds</div>
                <div className="text-sm font-bold text-accent">
                  {match.bookmakers[0]?.home} / {match.bookmakers[0]?.away}
                </div>
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
                <th className="text-center p-4 font-semibold text-text">Date</th>
                <th className="text-center p-4 font-semibold text-text">Time</th>
                <th className="text-center p-4 font-semibold text-text">Status</th>
                <th className="text-center p-4 font-semibold text-text">1</th>
                <th className="text-center p-4 font-semibold text-text">X</th>
                <th className="text-center p-4 font-semibold text-text">2</th>
                <th className="text-center p-4 font-semibold text-text">B's</th>
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
                    <span className="text-sm text-muted">{(match as any).date || '-'}</span>
                  </td>
                  <td className="text-center p-4">
                    <span className="text-sm font-semibold text-text">{match.time}</span>
                  </td>
                  <td className="text-center p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(match.status)}`}>
                      {match.status}
                    </span>
                  </td>
                  <td className="text-center p-4">
                    <span className="font-semibold text-text">{match.bookmakers[0]?.home}</span>
                  </td>
                  <td className="text-center p-4">
                    <span className="font-semibold text-text">{match.bookmakers[0]?.draw || '-'}</span>
                  </td>
                  <td className="text-center p-4">
                    <span className="font-semibold text-text">{match.bookmakers[0]?.away}</span>
                  </td>
                  <td className="text-center p-4">
                    <span className="text-sm text-muted">{(match as any).bookmakerCount || match.bookmakers.length}</span>
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
  