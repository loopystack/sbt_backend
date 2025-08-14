import React from "react";

export default function HeroSection() {
  const featuredMatches = [
    {
      id: 1,
      teams: "Manchester City vs Arsenal",
      league: "Premier League",
      time: "15:00",
      date: "Today",
      odds: {
        home: "+180",
        away: "-220",
        draw: "+320"
      },
      status: "Upcoming"
    },
    {
      id: 2,
      teams: "Lakers vs Warriors",
      league: "NBA",
      time: "19:30",
      date: "Today",
      odds: {
        home: "-110",
        away: "-110",
        overUnder: "225.5"
      },
      status: "Upcoming"
    },
    {
      id: 3,
      teams: "Kansas City Chiefs vs Buffalo Bills",
      league: "NFL",
      time: "20:00",
      date: "Today",
      odds: {
        home: "+150",
        away: "-180",
        spread: "KC +3.5"
      },
      status: "Upcoming"
    }
  ];

  return (
    <section className="mb-8">
      {/* Hero Content */}
      <div className="bg-gradient-to-br from-surface to-bg border border-border rounded-2xl p-8 mb-8 relative">
        {/* Left Side - Image positioned absolutely to align with card edges */}
        <div className="hidden lg:block absolute left-0 bottom-0 ">
          <img 
            src="/assets/LeftMan.png" 
            alt="Betting Expert" 
            className="object-contain rounded-xl shadow-lg"
          />
        </div>
        
        {/* Right Side - Keep original layout unchanged */}
        <div className="flex-1 ml-60">
          <div className="text-center mb-8 p-3">
            <h1 className="text-4xl md:text-5xl font-bold text-text mb-4">
              Find the Best Betting Odds
            </h1>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Compare odds from top bookmakers worldwide and get the biggest payouts on your bets
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for teams, leagues, or matches..."
                className="w-full px-6 py-4 bg-bg border border-border rounded-xl text-text placeholder-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              />
              <button className="absolute right-2 top-2 px-6 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors">
                Search
              </button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">50+</div>
              <div className="text-muted">Bookmakers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">20+</div>
              <div className="text-muted">Sports</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">1000+</div>
              <div className="text-muted">Daily Matches</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Featured Matches */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text mb-4">Featured Matches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-surface border border-border rounded-xl p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-200 group"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/30">
                  {match.status}
                </span>
                <div className="text-right">
                  <div className="text-sm text-muted">{match.date}</div>
                  <div className="text-lg font-bold text-accent">{match.time}</div>
                </div>
              </div>
              
              {/* Teams */}
              <h3 className="font-bold text-text text-lg mb-3 leading-tight">
                {match.teams}
              </h3>
              
              {/* League */}
              <div className="text-sm text-muted mb-4">{match.league}</div>
              
              {/* Odds */}
              <div className="space-y-2 mb-4">
                {match.odds.home && match.odds.away && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Home:</span>
                    <span className="font-semibold text-text">{match.odds.home}</span>
                  </div>
                )}
                {match.odds.away && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Away:</span>
                    <span className="font-semibold text-text">{match.odds.away}</span>
                  </div>
                )}
                {match.odds.draw && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Draw:</span>
                    <span className="font-semibold text-text">{match.odds.draw}</span>
                  </div>
                )}
                {match.odds.overUnder && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">O/U:</span>
                    <span className="font-semibold text-text">{match.odds.overUnder}</span>
                  </div>
                )}
                {match.odds.spread && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Spread:</span>
                    <span className="font-semibold text-text">{match.odds.spread}</span>
                  </div>
                )}
              </div>
              
              {/* Action */}
              <button className="w-full px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors group-hover:scale-105">
                Compare Odds
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
