import React, { useState } from "react";

export default function SureBets() {
  const [selectedSport, setSelectedSport] = useState("All sports");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("today");

  const sports = [
    { name: "All sports", icon: "🏆" },
    { name: "Football", icon: "⚽" },
    { name: "Basketball", icon: "🏀" },
    { name: "Tennis", icon: "🎾" },
    { name: "Baseball", icon: "⚾" },
    { name: "Hockey", icon: "🏒" }
  ];

  const timeFilters = [
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "week", label: "This Week" }
  ];

  // Sample sure bets data (when available)
  const sampleSureBets = [
    {
      id: "1",
      sport: "Football",
      league: "Premier League",
      teams: "Arsenal vs Chelsea",
      date: "Today, 20:00",
      bet1: { outcome: "Arsenal Win", odds: "2.10", bookmaker: "Bet365" },
      bet2: { outcome: "Chelsea Win", odds: "2.05", bookmaker: "William Hill" },
      profit: "2.5%",
      stake: "£100",
      return: "£102.50"
    },
    {
      id: "2",
      sport: "Tennis",
      league: "Wimbledon",
      teams: "Djokovic vs Medvedev",
      date: "Tomorrow, 15:30",
      bet1: { outcome: "Djokovic Win", odds: "1.85", bookmaker: "Betway" },
      bet2: { outcome: "Medvedev Win", odds: "2.15", bookmaker: "Ladbrokes" },
      profit: "3.2%",
      stake: "£100",
      return: "£103.20"
    }
  ];

  // Currently no sure bets available (as shown in the image)
  const hasSureBets = false;

  return (
    <section className="space-y-6">
      {/* Promotional Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                  <span className="text-white font-bold text-sm">BC</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">BC.GAME</h3>
                  <p className="text-sm opacity-95">Up to 100% bonus + 20 Free Bet</p>
                </div>
              </div>
              <button className="bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 hover:border-white/50 transform hover:scale-105">
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">bet365</h3>
                <p className="text-sm opacity-95">Choose: First Bet Safety Net or Bet $5 & Get $150</p>
              </div>
              <button className="bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 hover:border-white/50 transform hover:scale-105">
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 rounded-2xl p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">BETINASIA</h3>
                <p className="text-sm opacity-95">Get 100% First Deposit Bonus!</p>
              </div>
              <button className="bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 hover:border-white/50 transform hover:scale-105">
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="text-sm text-muted">
        Home &gt; Sure Bets
      </div>

      {/* Main Heading and Description */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text">
          OddsPortal Sure Bets - Find Sure Odds Today
        </h1>
        <p className="text-muted text-sm max-w-4xl leading-relaxed">
          Sure bets are a way for you to win guaranteed profit by betting on two different outcomes 
          thanks to arbitrage odds from different online bookmakers. Due to online betting sites 
          offering different odds for the same markets, you can take advantage and earn profit 
          regardless of the result of the market for the match.
        </p>
        
        {/* Get More Link */}
        <div className="pt-2">
          <a 
            href="#" 
            className="text-accent hover:text-accent/80 font-semibold text-sm transition-colors"
          >
            Want more than 10 sure bets? GET MORE &gt;&gt;
          </a>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-surface border border-border rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-muted">Filter:</span>
          
          <select
            value={selectedTimeFilter}
            onChange={(e) => setSelectedTimeFilter(e.target.value)}
            className="px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
          >
            {timeFilters.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sport Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
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

      {/* Sure Bets Content */}
      {hasSureBets ? (
        <div className="space-y-6">
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border border-border rounded-lg">
            <div className="col-span-3 text-sm font-medium text-muted">Match</div>
            <div className="col-span-2 text-sm font-medium text-muted">Date/Time</div>
            <div className="col-span-2 text-sm font-medium text-muted text-center">Bet 1</div>
            <div className="col-span-2 text-sm font-medium text-muted text-center">Bet 2</div>
            <div className="col-span-3 text-sm font-medium text-muted text-center">Profit & Stakes</div>
          </div>

          {/* Sure Bets Listings */}
          <div className="space-y-4">
            {sampleSureBets.map((bet) => (
              <div key={bet.id} className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Match Info */}
                  <div className="col-span-3">
                    <div className="font-medium text-text">{bet.teams}</div>
                    <div className="text-sm text-muted">{bet.sport} • {bet.league}</div>
                  </div>

                  {/* Date/Time */}
                  <div className="col-span-2 text-sm text-muted">
                    {bet.date}
                  </div>

                  {/* Bet 1 */}
                  <div className="col-span-2 text-center">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-text">{bet.bet1.outcome}</div>
                      <div className="text-xs text-muted">{bet.bet1.odds}</div>
                      <div className="text-xs text-accent">{bet.bet1.bookmaker}</div>
                    </div>
                  </div>

                  {/* Bet 2 */}
                  <div className="col-span-2 text-center">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-text">{bet.bet2.outcome}</div>
                      <div className="text-xs text-muted">{bet.bet2.odds}</div>
                      <div className="text-xs text-accent">{bet.bet2.bookmaker}</div>
                    </div>
                  </div>

                  {/* Profit & Stakes */}
                  <div className="col-span-3 text-center">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-green-400">{bet.profit} Profit</div>
                      <div className="text-xs text-muted">Stake: {bet.stake}</div>
                      <div className="text-xs text-muted">Return: {bet.return}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* No Sure Bets Available Message */
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">i</span>
            </div>
            <span className="text-white font-medium">There are currently no sure bets available!</span>
          </div>
          <p className="text-gray-500 text-sm">
            Check back later for new arbitrage opportunities or try adjusting your filters.
          </p>
        </div>
      )}

      {/* Additional Information */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">How Sure Bets Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-text">What are Sure Bets?</h4>
            <p className="text-sm text-muted leading-relaxed">
              Sure bets (also known as arbitrage betting) occur when different bookmakers offer 
              different odds for the same event, creating an opportunity to bet on all possible 
              outcomes and guarantee a profit.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-text">How to Use Them</h4>
            <p className="text-sm text-muted leading-relaxed">
              When you find a sure bet, place the calculated stakes on each outcome with different 
              bookmakers. Regardless of the result, you'll make a guaranteed profit based on the 
              odds difference.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
