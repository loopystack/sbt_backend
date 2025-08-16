import React, { useState } from "react";

export default function DroppingOdds() {
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

  return (
    <section className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Promotional Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-tr from-slate-800 via-slate-700 to-slate-600 rounded-3xl p-3 sm:p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 hover:rotate-1 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/20 rounded-full blur-xl"></div>
          <div className="relative z-10">
            <div className="text-center">
              <h3 className="font-bold text-base sm:text-lg mb-2">BETINASIA</h3>
              <p className="text-xs sm:text-sm opacity-90 mb-3">Get 100% First Deposit Bonus!</p>
              <button className="w-full bg-blue-500 text-white py-2 sm:py-3 rounded-2xl font-semibold hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 text-sm">
                CLAIM OFFER
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-bl from-amber-500 via-orange-500 to-red-500 rounded-3xl p-3 sm:p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 hover:-rotate-1 relative overflow-hidden">
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-yellow-500/20 rounded-full blur-xl"></div>
          <div className="relative z-10">
            <div className="text-center">
              <h3 className="font-bold text-base sm:text-lg mb-2">bet-at-home</h3>
              <p className="text-xs sm:text-sm opacity-90 mb-3">Get a 300€ Welcome bonus!</p>
              <button className="w-full bg-white/20 backdrop-blur-sm text-white py-2 sm:py-3 rounded-2xl font-semibold hover:bg-white/30 transition-all duration-300 transform hover:scale-105 border border-white/30 text-sm">
                CLAIM OFFER
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-tl from-violet-600 via-purple-600 to-indigo-600 rounded-3xl p-3 sm:p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 hover:rotate-1 relative overflow-hidden md:col-span-2 lg:col-span-1">
          <div className="absolute -top-4 -left-4 w-20 h-20 bg-pink-500/20 rounded-full blur-xl"></div>
          <div className="relative z-10">
            <div className="text-center">
              <h3 className="font-bold text-base sm:text-lg mb-2">bets.io</h3>
              <p className="text-xs sm:text-sm opacity-90 mb-3">First Deposit Sport Bonus</p>
              <button className="w-full bg-white/20 backdrop-blur-sm text-white py-2 sm:py-3 rounded-2xl font-semibold hover:bg-white/30 transition-all duration-300 transform hover:scale-105 border border-white/30 text-sm">
                CLAIM OFFER
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
