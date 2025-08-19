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
    <section className="mb-6 sm:mb-8">
      {/* Hero Content */}
      <div className="bg-gradient-to-br from-surface to-bg border border-border rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 relative">
        {/* Left Side - Image positioned absolutely to align with card edges */}
        <div className="hidden lg:block absolute left-0 bottom-0">
          <img 
            src="/assets/LeftMan.png" 
            alt="Betting Expert" 
            className="object-contain rounded-xl"
          />
          
          {/* Animated Dollar Signs Spraying from Phone */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Dollar Sign 1 - Top Right of Phone */}
            <div className="absolute top-1/3 right-1/6 animate-money-spray-1">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 2 - Top Left of Phone */}
            <div className="absolute top-1/3 right-1/3 animate-money-spray-2">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 3 - Middle Right of Phone */}
            <div className="absolute top-2/5 right-1/8 animate-money-spray-3">
              <span className="text-yellow-400 text-3xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 4 - Middle Left of Phone */}
            <div className="absolute top-2/5 right-1/4 animate-money-spray-4">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 5 - Bottom Right of Phone */}
            <div className="absolute top-3/5 right-1/6 animate-money-spray-5">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 6 - Bottom Left of Phone */}
            <div className="absolute top-3/5 right-1/3 animate-money-spray-6">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 7 - Upper Right of Phone */}
            <div className="absolute top-1/4 right-1/10 animate-money-spray-7">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 8 - Upper Left of Phone */}
            <div className="absolute top-1/4 right-1/5 animate-money-spray-8">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 9 - Center Right of Phone */}
            <div className="absolute top-1/2 right-1/12 animate-money-spray-9">
              <span className="text-yellow-400 text-3xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 10 - Center Left of Phone */}
            <div className="absolute top-1/2 right-1/4 animate-money-spray-10">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 11 - Additional Right */}
            <div className="absolute top-1/3 right-0 animate-money-spray-11">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 12 - Additional Left */}
            <div className="absolute top-2/5 right-1/2 animate-money-spray-12">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 13 - Additional Upper */}
            <div className="absolute top-1/6 right-1/8 animate-money-spray-13">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 14 - Additional Lower */}
            <div className="absolute top-4/5 right-1/4 animate-money-spray-14">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            {/* Dollar Sign 15 - Additional Center */}
            <div className="absolute top-3/5 right-1/8 animate-money-spray-15">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
          </div>
        </div>
        
        {/* Right Side - Keep original layout unchanged */}
        <div className="flex-1 lg:ml-60">
          <div className="text-center mb-4 sm:mb-6 lg:mb-8 p-2 sm:p-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-text mb-3 sm:mb-4">
              Find the Best Betting Odds
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted max-w-2xl mx-auto px-2">
              Compare odds from top bookmakers worldwide and get the biggest payouts on your bets
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-4 sm:mb-6 lg:mb-8 px-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for teams, leagues, or matches..."
                className="w-full px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 bg-bg border border-border rounded-xl text-text placeholder-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm sm:text-base"
              />
              <button className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 px-3 sm:px-4 lg:px-6 py-1 sm:py-1.5 lg:py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-colors text-xs sm:text-sm">
                Search
              </button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-4xl mx-auto px-2">
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-text mb-1 sm:mb-2">50+</div>
              <div className="text-xs sm:text-sm lg:text-base text-muted">Bookmakers</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-text mb-1 sm:mb-2">20+</div>
              <div className="text-xs sm:text-sm lg:text-base text-muted">Sports</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-text mb-1 sm:mb-2">1000+</div>
              <div className="text-xs sm:text-sm lg:text-base text-muted">Daily Matches</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Featured Matches */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-text mb-3 sm:mb-4 px-2">Featured Matches</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {featuredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-surface border border-border rounded-xl p-3 sm:p-4 lg:p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-200 group"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                <span className="px-2 sm:px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/30">
                  {match.status}
                </span>
                <div className="text-right">
                  <div className="text-xs sm:text-sm text-muted">{match.date}</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-text">{match.time}</div>
                </div>
              </div>
              
              {/* Teams */}
              <h3 className="font-bold text-text text-sm sm:text-base lg:text-lg mb-2 sm:mb-3 leading-tight line-clamp-2">
                {match.teams}
              </h3>
              
              {/* League */}
              <div className="text-xs sm:text-sm text-muted mb-2 sm:mb-3 lg:mb-4">{match.league}</div>
              
              {/* Odds */}
              <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 lg:mb-4">
                {match.odds.home && match.odds.away && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Home:</span>
                    <span className="font-semibold text-text">{match.odds.home}</span>
                  </div>
                )}
                {match.odds.away && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Away:</span>
                    <span className="font-semibold text-text">{match.odds.away}</span>
                  </div>
                )}
                {match.odds.draw && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Draw:</span>
                    <span className="font-semibold text-text">{match.odds.draw}</span>
                  </div>
                )}
                {match.odds.overUnder && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">O/U:</span>
                    <span className="font-semibold text-text">{match.odds.overUnder}</span>
                  </div>
                )}
                {match.odds.spread && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Spread:</span>
                    <span className="font-semibold text-text">{match.odds.spread}</span>
                  </div>
                )}
              </div>
              
              {/* Action */}
              <button className="w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors group-hover:scale-105">
                Compare Odds
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
