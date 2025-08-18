import React, { useState } from "react";
import { openBettingSiteByName } from "@/config/bettingSites";

export default function Matches() {
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedSport, setSelectedSport] = useState("Football");
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

  // Sample matches data
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

  return (
    <section className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Promotional Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-3 sm:p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-base sm:text-lg text-blue-100 mb-2">BETINASIA</h3>
                <p className="text-xs sm:text-sm text-blue-200/80 mb-2">Get 100% First Deposit Bonus!</p>
                <div className="text-xs text-blue-300 font-medium">🎯 Best Value</div>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BETINASIA")}
                className="w-full sm:w-auto bg-blue-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold hover:bg-blue-500 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-3 sm:p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-base sm:text-lg text-emerald-100 mb-2">bet-at-home</h3>
                <p className="text-xs sm:text-sm text-emerald-200/80 mb-2">Get a 300€ Welcome bonus!</p>
                <div className="text-xs text-emerald-300 font-medium">🔥 Hot Deal</div>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet-at-home")}
                className="w-full sm:w-auto bg-emerald-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold hover:bg-emerald-500 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-3 sm:p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 hover:-translate-y-1 relative overflow-hidden group md:col-span-2 lg:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-base sm:text-lg text-purple-100 mb-2">bets.io</h3>
                <p className="text-xs sm:text-sm text-purple-200/80 mb-2">First Deposit Sport Bonus</p>
                <div className="text-xs text-purple-300 font-medium">⭐ Premium</div>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bets.io")}
                className="w-full sm:w-auto bg-purple-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold hover:bg-purple-500 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="text-sm text-muted px-2">
        Home &gt; Next Matches &gt; Next Football Matches
      </div>

      {/* Main Heading */}
      <div className="space-y-3 sm:space-y-4 px-2">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          Next Football Matches: Today, 14 Aug 2025
        </h1>
        <p className="text-muted text-sm max-w-4xl">
          Betting odds displayed are average/highest across all bookmakers (premium + preferred). 
          Click on matches to see all betting odds available. Add your chosen pick to My Coupon by clicking the odds.
        </p>
      </div>

      {/* Date Selection */}
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

      {/* Sport Tabs */}
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

      {/* View Tabs */}
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

      {/* Mobile Matches View */}
      <div className="block lg:hidden space-y-3 px-2">
        {matches.map((match) => (
          <div key={match.id} className="bg-surface border border-border rounded-lg p-3 sm:p-4 hover:bg-bg/50 transition-colors cursor-pointer">
            <div className="space-y-3">
              {/* Match Header */}
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
              
              {/* Odds Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <div className="text-xs text-muted mb-1">1</div>
                  <div className={`text-xs sm:text-sm font-semibold ${
                    match.bestOdds === 'odds1' ? 'text-green-500 bg-green-500/20 px-2 py-1 rounded' : 'text-text'
                  }`}>
                    {match.odds1}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted mb-1">X</div>
                  <div className={`text-xs sm:text-sm font-semibold ${
                    match.bestOdds === 'oddsX' ? 'text-green-500 bg-green-500/20 px-2 py-1 rounded' : 'text-text'
                  }`}>
                    {match.oddsX}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted mb-1">2</div>
                  <div className={`text-xs sm:text-sm font-semibold ${
                    match.bestOdds === 'odds2' ? 'text-green-500 bg-green-500/20 px-2 py-1 rounded' : 'text-text'
                  }`}>
                    {match.odds2}
                  </div>
                </div>
              </div>
              
              {/* Bookmakers & Action */}
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

      {/* Desktop Matches View */}
      <div className="hidden lg:block">
        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border border-border rounded-lg">
          <div className="col-span-2 text-sm font-medium text-muted">Date</div>
          <div className="col-span-2 text-sm font-medium text-muted">Time</div>
          <div className="col-span-4 text-sm font-medium text-muted">Match</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">1</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">X</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">2</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">B's</div>
        </div>

        {/* Matches Content */}
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
