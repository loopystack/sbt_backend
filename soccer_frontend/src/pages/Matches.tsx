import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { openBettingSiteByName } from "../config/bettingSites";
import { useCountry } from "../contexts/CountryContext";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { OddsConverter } from "../utils/oddsConverter";
import OddsTable from "../components/OddsTable";

export default function Matches() {
  const { selectedLeague } = useCountry();
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedSport, setSelectedSport] = useState("Football");
  const [searchParams] = useSearchParams();
  
  // Get search term from URL parameter
  const searchFromHome = searchParams.get('search');
  
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
    console.log(`Matches: Converting ${odds} -> ${decimalOdds} -> ${formatted} (format: ${oddsFormat})`);
    return formatted;
  };
  
  const [selectedView, setSelectedView] = useState("kickoff");

  const dates = [
    { id: "yesterday", label: "Yesterday" },
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "16-aug", label: "16 Aug" },
    { id: "17-aug", label: "17 Aug" },
    { id: "18-aug", label: "18 Aug" },
    { id: "19-aug", label: "19 Aug" },
    { id: "20-aug", label: "20 Aug" }
  ];

  const sports = [
    { name: "Football", icon: "⚽" },
    { name: "Basketball", icon: "🏀" },
    { name: "Tennis", icon: "🎾" },
    { name: "Baseball", icon: "⚾" },
    { name: "Hockey", icon: "🏒" }
  ];

  const views = [
    { id: "kickoff", label: "Kick off time" },
    { id: "events", label: "Events" }
  ];

  const matches = [
    {
      id: "1",
      league: "Football / Chile / Primera Division Women",
      date: "Today, 14 Aug",
      time: "00:00",
      match: "U. Espanola W 2-1 Coquimbo W",
      odds1: "89/100",
      oddsX: "243/100",
      odds2: "51/20",
      bookmakers: 5,
      bestOdds: "odds1"
    },
    {
      id: "2",
      league: "Football / Chile / Primera Division Women",
      date: "Today, 14 Aug",
      time: "00:00",
      match: "Colo-Colo W 8-0 Huachipato W",
      odds1: "1/100",
      oddsX: "21/1",
      odds2: "49/1",
      bookmakers: 2,
      bestOdds: "odds1"
    },
    {
      id: "3",
      league: "Football / Czech Republic / MOL Cup",
      date: "Today, 14 Aug",
      time: "00:00",
      match: "Lanzhot 1-0 Opava (pen.)",
      odds1: "129/10",
      oddsX: "151/25",
      odds2: "3/20",
      bookmakers: 7,
      bestOdds: "oddsX"
    },
    {
      id: "4",
      league: "Football / Czech Republic / MOL Cup",
      date: "Today, 14 Aug",
      time: "00:00",
      match: "Brumov 1-6 Prostejov",
      odds1: "1017/50",
      oddsX: "453/50",
      odds2: "7/100",
      bookmakers: 6,
      bestOdds: "odds2"
    },
    {
      id: "5",
      league: "Football / Estonia / Estonian Cup",
      date: "Today, 14 Aug",
      time: "00:00",
      match: "Kuressaare 1-2 Paide",
      odds1: "189/25",
      oddsX: "104/25",
      odds2: "6/25",
      bookmakers: 6,
      bestOdds: "odds2"
    }
  ];

  // If a league is selected, show the OddsTable (same as Home page)
  if (selectedLeague) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <OddsTable initialSearchTerm={searchFromHome || undefined} />
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2 text-blue-100">BETINASIA</h3>
                <p className="text-xs sm:text-sm text-blue-200/60 mb-1 sm:mb-2">Premium Sportsbook</p>
                <p className="text-xs sm:text-sm text-blue-200/80">100% Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BETINASIA")}
                className="w-full sm:w-auto bg-blue-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-blue-500 transition-all duration-300 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2 text-emerald-100">bet-at-home</h3>
                <p className="text-xs sm:text-sm text-emerald-200/60 mb-1 sm:mb-2">European Leader</p>
                <p className="text-xs sm:text-sm text-emerald-200/80">300€ Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet-at-home")}
                className="w-full sm:w-auto bg-emerald-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-emerald-500 transition-all duration-300 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2 text-purple-100">bets.io</h3>
                <p className="text-xs sm:text-sm text-purple-200/60 mb-1 sm:mb-2">Crypto Sportsbook</p>
                <p className="text-xs sm:text-sm text-purple-200/80">Sport Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bets.io")}
                className="w-full sm:w-auto bg-purple-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-purple-500 transition-all duration-300 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted px-2">
        Home &gt; Next Matches &gt; Next Football Matches
      </div>

      <div className="space-y-3 sm:space-y-4 px-2">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          Next Football Matches: Today, 14 Aug 2025
        </h1>
        <p className="text-muted text-sm max-w-4xl">
          Betting odds displayed are average/highest across all bookmakers (premium + preferred). 
          Click on matches to see all betting odds available. Add your chosen pick to My Coupon by clicking the odds.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-2 pb-2">
        {dates.map((date) => (
          <button
            key={date.id}
            onClick={() => setSelectedDate(date.id)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
              selectedDate === date.id
                ? "bg-accent text-white shadow-lg"
                : "bg-surface text-muted hover:text-text hover:bg-surface/80 border border-border"
            }`}
          >
            {date.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto scrollbar-hide px-2 pb-2">
        <button className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg whitespace-nowrap transition-colors duration-200 text-muted hover:text-text hover:bg-bg flex-shrink-0">
          <span className="text-base sm:text-lg">⭐</span>
          <span className="font-medium text-sm sm:text-base">My Matches</span>
        </button>
        
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

      <div className="flex gap-1 border-b border-border px-2">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setSelectedView(view.id)}
            className={`px-3 sm:px-4 py-2 sm:py-3 text-sm font-medium transition-colors duration-200 ${
              selectedView === view.id
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="block lg:hidden space-y-3 px-2">
        {matches.map((match) => (
          <div key={match.id} className="bg-surface border border-border rounded-lg p-3 sm:p-4 hover:bg-bg/50 transition-colors cursor-pointer">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text text-sm sm:text-base leading-tight line-clamp-2">
                    {match.match}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted mt-1">{match.league}</p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-3">
                  <span className="text-xs sm:text-sm font-semibold text-text">{match.time}</span>
                  <span className="text-xs text-muted">{match.date}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <div className="text-xs text-muted mb-1">1</div>
                  <div className={`text-xs sm:text-sm font-semibold ${
                    match.bestOdds === 'odds1' ? 'text-green-500 bg-green-500/20 px-2 py-1 rounded' : 'text-text'
                  }`}>
                    {formatOdds(match.odds1)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted mb-1">X</div>
                  <div className={`text-xs sm:text-sm font-semibold ${
                    match.bestOdds === 'oddsX' ? 'text-green-500 bg-green-500/20 px-2 py-1 rounded' : 'text-text'
                  }`}>
                    {formatOdds(match.oddsX)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted mb-1">2</div>
                  <div className={`text-xs sm:text-sm font-semibold ${
                    match.bestOdds === 'odds2' ? 'text-green-500 bg-green-500/20 px-2 py-1 rounded' : 'text-text'
                  }`}>
                    {formatOdds(match.odds2)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="text-center">
                  <div className="text-xs text-muted">Bookmakers</div>
                  <div className="text-sm font-bold text-accent">{match.bookmakers}</div>
                </div>
                <button className="px-3 sm:px-4 py-2 bg-accent text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors hover:scale-105">
                  View Odds
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border border-border rounded-lg">
          <div className="col-span-2 text-sm font-medium text-muted">Date</div>
          <div className="col-span-2 text-sm font-medium text-muted">Time</div>
          <div className="col-span-4 text-sm font-medium text-muted">Match</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">1</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">X</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">2</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">B's</div>
        </div>

        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-2 text-sm text-muted">{match.date}</div>
                <div className="col-span-2 text-sm text-muted">{match.time}</div>
                <div className="col-span-4">
                  <div className="font-medium">{match.match}</div>
                  <div className="text-xs text-muted">{match.league}</div>
                </div>
                <div className="col-span-1 text-center">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    match.bestOdds === 'odds1' ? 'bg-green-500/20 text-green-400' : 'text-muted'
                  }`}>
                    {match.odds1}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    match.bestOdds === 'oddsX' ? 'bg-green-500/20 text-green-400' : 'text-muted'
                  }`}>
                    {match.oddsX}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    match.bestOdds === 'odds2' ? 'bg-green-500/20 text-green-400' : 'text-muted'
                  }`}>
                    {match.odds2}
                  </span>
                </div>
                <div className="col-span-1 text-center text-muted">{match.bookmakers}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
