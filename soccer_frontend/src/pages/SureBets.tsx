import React, { useState } from "react";
import { openBettingSiteByName } from "../config/bettingSites";
import { useCountry } from "../contexts/CountryContext";
import OddsTable from "../components/OddsTable";
export default function SureBets() {
  const { selectedLeague } = useCountry();
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
  const hasSureBets = false;

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
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">BC.GAME</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Crypto Casino</p>
                <p className="text-xs sm:text-sm opacity-95">100% + Free Bet</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BC.GAME")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">bet365</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Global Leader</p>
                <p className="text-xs sm:text-sm opacity-95">Safety Net</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet365")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
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
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="text-sm text-muted px-2">
        Home &gt; Sure Bets
      </div>
      <div className="space-y-3 sm:space-y-4 px-2">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          OddsPortal Sure Bets - Find Sure Odds Today
        </h1>
        <p className="text-muted text-sm max-w-4xl leading-relaxed">
          Sure bets are a way for you to win guaranteed profit by betting on two different outcomes 
          thanks to arbitrage odds from different online bookmakers. Due to online betting sites 
          offering different odds for the same markets, you can take advantage and earn profit 
          regardless of the result of the market for the match.
        </p>
        <div className="pt-2">
          <a 
            href="#" 
            className="text-accent hover:text-accent/80 font-semibold text-sm transition-colors"
          >
            Want more than 10 sure bets? GET MORE &gt;&gt;
          </a>
        </div>
      </div>
      <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 shadow-sm mx-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <span className="text-sm font-medium text-muted">Filter:</span>
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
        </div>
      </div>
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
      {hasSureBets ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="block lg:hidden space-y-3 px-2">
            {sampleSureBets.map((bet) => (
              <div key={bet.id} className="bg-surface border border-border rounded-lg p-3 sm:p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="font-medium text-text text-sm sm:text-base">{bet.teams}</div>
                    <div className="text-xs sm:text-sm text-muted">{bet.sport} • {bet.league}</div>
                    <div className="text-xs text-muted">{bet.date}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-bg rounded-lg">
                      <div className="text-xs text-muted mb-1">Bet 1</div>
                      <div className="text-sm font-medium text-text">{bet.bet1.outcome}</div>
                      <div className="text-xs text-muted">{bet.bet1.odds}</div>
                      <div className="text-xs text-accent">{bet.bet1.bookmaker}</div>
                    </div>
                    <div className="text-center p-2 bg-bg rounded-lg">
                      <div className="text-xs text-muted mb-1">Bet 2</div>
                      <div className="text-sm font-medium text-text">{bet.bet2.outcome}</div>
                      <div className="text-xs text-muted">{bet.bet2.odds}</div>
                      <div className="text-xs text-accent">{bet.bet2.bookmaker}</div>
                    </div>
                  </div>
                  <div className="text-center pt-2 border-t border-border/50">
                    <div className="text-sm font-bold text-green-400 mb-1">{bet.profit} Profit</div>
                    <div className="text-xs text-muted">Stake: {bet.stake} | Return: {bet.return}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border border-border rounded-lg">
              <div className="col-span-3 text-sm font-medium text-muted">Match</div>
              <div className="col-span-2 text-sm font-medium text-muted">Date/Time</div>
              <div className="col-span-2 text-sm font-medium text-muted text-center">Bet 1</div>
              <div className="col-span-2 text-sm font-medium text-muted text-center">Bet 2</div>
              <div className="col-span-3 text-sm font-medium text-muted text-center">Profit & Stakes</div>
            </div>
            <div className="space-y-4">
              {sampleSureBets.map((bet) => (
                <div key={bet.id} className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <div className="font-medium text-text">{bet.teams}</div>
                      <div className="text-sm text-muted">{bet.sport} • {bet.league}</div>
                    </div>
                    <div className="col-span-2 text-sm text-muted">
                      {bet.date}
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-text">{bet.bet1.outcome}</div>
                        <div className="text-xs text-muted">{bet.bet1.odds}</div>
                        <div className="text-xs text-accent">{bet.bet1.bookmaker}</div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-text">{bet.bet2.outcome}</div>
                        <div className="text-xs text-muted">{bet.bet2.odds}</div>
                        <div className="text-xs text-accent">{bet.bet2.bookmaker}</div>
                      </div>
                    </div>
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
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 mx-2">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-400 rounded-full flex items-center justify-center">
              <span className="text-text text-xs sm:text-sm font-bold">i</span>
            </div>
            <span className="text-text font-medium text-sm sm:text-base">There are currently no sure bets available!</span>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm text-center">
            Check back later for new arbitrage opportunities or try adjusting your filters.
          </p>
        </div>
      )}
      <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 mx-2">
        <h3 className="text-lg font-semibold text-text mb-4">How Sure Bets Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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


