import React, { useState } from "react";
import { openBettingSiteByName } from "../config/bettingSites";
import { useCountry } from "../contexts/CountryContext";
import OddsTable from "../components/OddsTable";

export default function DroppingOdds() {
  const { selectedLeague } = useCountry();
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("12-hours");
  const [selectedDroppingFilter, setSelectedDroppingFilter] = useState("20-percent");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all-types");
  const [selectedSport, setSelectedSport] = useState("Football");

  const timeFilters = [
    { id: "12-hours", label: "Last 12 hours" },
    { id: "24-hours", label: "Last 24 hours" },
    { id: "48-hours", label: "Last 48 hours" }
  ];

  const droppingFilters = [
    { id: "20-percent", label: "20% dropping bookies" },
    { id: "30-percent", label: "30% dropping bookies" },
    { id: "50-percent", label: "50% dropping bookies" }
  ];

  const typeFilters = [
    { id: "all-types", label: "All types" },
    { id: "1x2", label: "1X2" },
    { id: "ht-ft", label: "HT/FT" },
    { id: "dnb", label: "DNB" }
  ];

  const sports = [
    { name: "All sports", icon: "🏆" },
    { name: "Football", icon: "⚽" },
    { name: "Basketball", icon: "🏀" },
    { name: "Tennis", icon: "🎾" },
    { name: "Baseball", icon: "⚾" }
  ];

  const matches = [
    {
      id: "1",
      sport: "Football",
      country: "Bulgaria",
      league: "Vtora liga",
      betType: "HT/FT",
      date: "17 Aug, 02:00",
      teams: "Pirin Blagoevgrad - Lok. Gorna",
      currentOdds: "79/1",
      previousOdds: "49/1",
      dropPercentage: -38,
      bestCurrentOdds: "59/1",
      bookmaker: "bets.io"
    },
    {
      id: "2",
      sport: "Football",
      country: "Belarus",
      league: "Vysshaya Liga",
      betType: "1X2",
      date: "16 Aug, 23:00",
      teams: "Zhodino - Slutsk",
      currentOdds: "11/1",
      previousOdds: "133/20",
      dropPercentage: -36,
      bestCurrentOdds: "6/1",
      bookmaker: "bet-at-home"
    },
    {
      id: "3",
      sport: "Football",
      country: "England",
      league: "NPL Premier Division",
      betType: "1X2",
      date: "16 Aug, 14:30",
      teams: "Hednesford - Workington",
      currentOdds: "137/10",
      previousOdds: "429/50",
      dropPercentage: -35,
      bestCurrentOdds: "9/1",
      bookmaker: "PINNACLE"
    },
    {
      id: "4",
      sport: "Hockey",
      country: "Australia",
      league: "AIHL",
      betType: "Home/Away",
      date: "16 Aug, 14:30",
      teams: "Central Coast Rhinos - Brisbane Lightning",
      currentOdds: "17/2",
      previousOdds: "21/4",
      dropPercentage: -34,
      bestCurrentOdds: "11/2",
      bookmaker: "bet-at-home"
    },
    {
      id: "5",
      sport: "Football",
      country: "Turkey",
      league: "1. Lig",
      betType: "1X2",
      date: "17 Aug, 03:30",
      teams: "Adana Demirspor - Corum",
      currentOdds: "37/50",
      previousOdds: "4/25",
      dropPercentage: -33,
      bestCurrentOdds: "6/25",
      bookmaker: "PINNACLE"
    }
  ];

  type Match = typeof matches[0];

  // If a league is selected, show the OddsTable (same as Home page)
  if (selectedLeague) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <OddsTable />
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Promotional Banners */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-gradient-to-tr from-slate-800 via-slate-700 to-slate-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">BETINASIA</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Premium Sportsbook</p>
                <p className="text-xs sm:text-sm opacity-95">100% Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BETINASIA")}
                className="w-full bg-blue-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-600 transition-all duration-300 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-bl from-amber-500 via-orange-500 to-red-500 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">bet-at-home</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">European Leader</p>
                <p className="text-xs sm:text-sm opacity-95">300€ Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet-at-home")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-tl from-violet-600 via-purple-600 to-indigo-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">bets.io</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Crypto Sportsbook</p>
                <p className="text-xs sm:text-sm opacity-95">Sport Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bets.io")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="text-sm text-muted px-2">
        Home &gt; Dropping Odds
      </div>

      {/* Main Heading */}
      <div className="space-y-3 sm:space-y-4 px-2">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          Dropping Odds
        </h1>
        <p className="text-muted text-sm max-w-4xl">
          Dropping odds occur when bookmakers reduce the odds for a specific outcome, often due to 
          increased betting activity, player injuries, team strategy changes, or other factors. 
          Identifying these movements early can give you an advantage in your betting strategy.
        </p>
      </div>

      {/* Filter Section */}
      <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 shadow-sm mx-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <span className="text-sm font-medium text-muted">Filter:</span>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            <select
              value={selectedTimeFilter}
              onChange={(e) => setSelectedTimeFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
            >
              {timeFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>

            <select
              value={selectedDroppingFilter}
              onChange={(e) => setSelectedDroppingFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
            >
              {droppingFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>

            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
            >
              {typeFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sport Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide px-2 pb-2">
        {sports.map((sport) => (
          <button
            key={sport.name}
            onClick={() => setSelectedSport(sport.name)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg whitespace-nowrap transition-colors duration-200 flex-shrink-0 ${
              selectedSport === sport.name
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent hover:bg-bg"
            }`}
          >
            <span className="text-base sm:text-lg">{sport.icon}</span>
            <span className="font-medium text-sm sm:text-base">{sport.name}</span>
          </button>
        ))}
        
        <button className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg whitespace-nowrap transition-colors duration-200 text-muted hover:text-text hover:bg-bg flex-shrink-0">
          <span className="font-medium text-sm sm:text-base">More</span>
          <span className="text-base sm:text-lg">⌄</span>
        </button>
      </div>

      {/* Mobile Matches View */}
      <div className="block lg:hidden space-y-3 px-2">
        {Object.entries(matches.reduce((groups, match) => {
          const key = `${match.sport} / ${match.country} / ${match.league}`;
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(match);
          return groups;
        }, {} as Record<string, Match[]>)).map(([key, group]) => (
          <div key={key} className="space-y-3">
            {/* League Header */}
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>{key.includes('Football') ? '⚽' : key.includes('Hockey') ? '🏒' : '🎾'}</span>
              <span className="text-xs sm:text-sm">{key}</span>
            </div>
            
            {/* Bet Type */}
            <div className="text-xs text-muted ml-4 sm:ml-6">
              {group[0]?.betType}
            </div>

            {/* Match Cards */}
            {group.map((match) => (
              <div key={match.id} className="bg-surface border border-border rounded-lg p-3 sm:p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                <div className="space-y-3">
                  {/* Match Info */}
                  <div className="space-y-1">
                    <div className="font-medium text-text text-sm sm:text-base">{match.teams}</div>
                    <div className="text-xs text-muted">{match.betType} • {match.date}</div>
                  </div>

                  {/* Dropping Odds */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-bg rounded-lg">
                      <div className="text-xs text-muted mb-1">Current Odds</div>
                      <div className="text-sm font-medium text-text">{match.currentOdds}</div>
                      <div className="text-xs text-muted">{match.previousOdds}</div>
                    </div>
                    <div className="text-center p-2 bg-bg rounded-lg">
                      <div className="text-xs text-muted mb-1">Drop</div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-red-400 text-xs">↓</span>
                        <span className="text-red-400 text-xs font-medium">{match.dropPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Best Current Odds */}
                  <div className="text-center pt-2 border-t border-border/50">
                    <div className="text-xs text-muted mb-1">Best Current Odds</div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">
                        {match.bestCurrentOdds}
                      </span>
                      <span className="text-xs text-muted">{match.bookmaker}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop Matches View */}
      <div className="hidden lg:block">
        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border border-border rounded-lg">
          <div className="col-span-3 text-sm font-medium text-muted">Match</div>
          <div className="col-span-2 text-sm font-medium text-muted">Bet Type</div>
          <div className="col-span-2 text-sm font-medium text-muted">Date/Time</div>
          <div className="col-span-2 text-sm font-medium text-muted text-center">Dropping Odds</div>
          <div className="col-span-3 text-sm font-medium text-muted text-center">Best Current Odds</div>
        </div>

        {/* Matches Content */}
        <div className="space-y-4">
          {Object.entries(matches.reduce((groups, match) => {
            const key = `${match.sport} / ${match.country} / ${match.league}`;
            if (!groups[key]) {
              groups[key] = [];
            }
            groups[key].push(match);
            return groups;
          }, {} as Record<string, Match[]>)).map(([key, group]) => (
            <div key={key} className="space-y-4">
              {/* League Header */}
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>{key.includes('Football') ? '⚽' : key.includes('Hockey') ? '🏒' : '🎾'}</span>
                <span>{key}</span>
              </div>
              
              {/* Bet Type */}
              <div className="text-xs text-muted ml-6">
                {group[0]?.betType}
              </div>

              {/* Match Rows */}
              {group.map((match) => (
                <div key={match.id} className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Match Info */}
                    <div className="col-span-3">
                      <div className="font-medium text-text">{match.teams}</div>
                    </div>

                    {/* Bet Type */}
                    <div className="col-span-2 text-sm text-muted">
                      {match.betType}
                    </div>

                    {/* Date/Time */}
                    <div className="col-span-2 text-sm text-muted">
                      {match.date}
                    </div>

                    {/* Dropping Odds */}
                    <div className="col-span-2 text-center">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-text">{match.currentOdds}</div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-red-400 text-xs">↓</span>
                          <span className="text-red-400 text-xs font-medium">{match.dropPercentage}%</span>
                        </div>
                        <div className="text-xs text-muted">{match.previousOdds}</div>
                      </div>
                    </div>

                    {/* Best Current Odds */}
                    <div className="col-span-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">
                          {match.bestCurrentOdds}
                        </span>
                        <span className="text-xs text-muted">{match.bookmaker}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
