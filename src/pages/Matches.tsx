import React, { useState } from "react";

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

  return (
    <section className="space-y-6">
      {/* Promotional Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-blue-100 mb-2">BETINASIA</h3>
                <p className="text-sm text-blue-200/80 mb-2">Get 100% First Deposit Bonus!</p>
                <div className="text-xs text-blue-300 font-medium">🎯 Best Value</div>
              </div>
              <button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-500 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105">
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-emerald-100 mb-2">bet-at-home</h3>
                <p className="text-sm text-emerald-200/80 mb-2">Get a 300€ Welcome bonus!</p>
                <div className="text-xs text-emerald-300 font-medium">🔥 Hot Deal</div>
              </div>
              <button className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-500 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105">
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-purple-100 mb-2">bets.io</h3>
                <p className="text-sm text-purple-200/80 mb-2">First Deposit Sport Bonus</p>
                <div className="text-xs text-purple-300 font-medium">⭐ Premium</div>
              </div>
              <button className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-500 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105">
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="text-sm text-muted">
        Home &gt; Next Matches &gt; Next Football Matches
      </div>

      {/* Main Heading */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text">
          Next Football Matches: Today, 14 Aug 2025
        </h1>
        <p className="text-muted text-sm max-w-4xl">
          Betting odds displayed are average/highest across all bookmakers (premium + preferred). 
          Click on matches to see all betting odds available. Add your chosen pick to My Coupon by clicking the odds.
        </p>
      </div>

      {/* Date Selection */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {dates.map((date) => (
          <button
            key={date.id}
            onClick={() => setSelectedDate(date.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
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
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        <button className="flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition-colors duration-200 text-muted hover:text-text hover:bg-bg">
          <span className="text-lg">⭐</span>
          <span className="font-medium">My Matches</span>
        </button>
        
        {sports.map((sport) => (
          <button
            key={sport.name}
            onClick={() => setSelectedSport(sport.name)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition-colors duration-200 ${
              selectedSport === sport.name
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent hover:bg-bg"
            }`}
          >
            <span className="text-lg">{sport.icon}</span>
            <span className="font-medium">{sport.name}</span>
          </button>
        ))}
        
        <button className="flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition-colors duration-200 text-muted hover:text-text hover:bg-bg">
          <span className="font-medium">More</span>
          <span className="text-lg">⌄</span>
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 border-b border-border">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setSelectedView(view.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors duration-200 ${
              selectedView === view.id
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

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
      <div className="space-y-6">
        {/* League Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>⚽</span>
            <span>Football / Chile / Primera Division Women</span>
          </div>
          
          {/* Match Row */}
          <div className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-2 text-sm text-muted">Today, 14 Aug</div>
              <div className="col-span-2 text-sm text-muted">00:00</div>
              <div className="col-span-4">
                <div className="font-medium">U. Espanola W 2-1 Coquimbo W</div>
              </div>
              <div className="col-span-1 text-center">
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">89/100</span>
              </div>
              <div className="col-span-1 text-center text-muted">243/100</div>
              <div className="col-span-1 text-center text-muted">51/20</div>
              <div className="col-span-1 text-center text-muted">5</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-2 text-sm text-muted">Today, 14 Aug</div>
              <div className="col-span-2 text-sm text-muted">00:00</div>
              <div className="col-span-4">
                <div className="font-medium">Colo-Colo W 8-0 Huachipato W</div>
              </div>
              <div className="col-span-1 text-center">
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">1/100</span>
              </div>
              <div className="col-span-1 text-center text-muted">21/1</div>
              <div className="col-span-1 text-center text-muted">49/1</div>
              <div className="col-span-1 text-center text-muted">2</div>
            </div>
          </div>
        </div>

        {/* Another League Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>⚽</span>
            <span>Football / Czech Republic / MOL Cup</span>
          </div>
          
          <div className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-2 text-sm text-muted">Today, 14 Aug</div>
              <div className="col-span-2 text-sm text-muted">00:00</div>
              <div className="col-span-4">
                <div className="font-medium">Lanzhot 1-0 Opava (pen.)</div>
              </div>
              <div className="col-span-1 text-center text-muted">129/10</div>
              <div className="col-span-1 text-center">
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">151/25</span>
              </div>
              <div className="col-span-1 text-center text-muted">3/20</div>
              <div className="col-span-1 text-center text-muted">7</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-2 text-sm text-muted">Today, 14 Aug</div>
              <div className="col-span-2 text-sm text-muted">00:00</div>
              <div className="col-span-4">
                <div className="font-medium">Brumov 1-6 Prostejov</div>
              </div>
              <div className="col-span-1 text-center text-muted">1017/50</div>
              <div className="col-span-1 text-center text-muted">453/50</div>
              <div className="col-span-1 text-center">
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">7/100</span>
              </div>
              <div className="col-span-1 text-center text-muted">6</div>
            </div>
          </div>
        </div>

        {/* Estonia League Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>⚽</span>
            <span>Football / Estonia / Estonian Cup</span>
          </div>
          
          <div className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-2 text-sm text-muted">Today, 14 Aug</div>
              <div className="col-span-2 text-sm text-muted">00:00</div>
              <div className="col-span-4">
                <div className="font-medium">Kuressaare 1-2 Paide</div>
              </div>
              <div className="col-span-1 text-center text-muted">189/25</div>
              <div className="col-span-1 text-center text-muted">104/25</div>
              <div className="col-span-1 text-center">
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">6/25</span>
              </div>
              <div className="col-span-1 text-center text-muted">6</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
