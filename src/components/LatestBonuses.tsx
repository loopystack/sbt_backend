import React from "react";

export default function LatestBonuses() {
  const bonuses = [
    {
      id: 1,
      title: "100% Deposit Match",
      bookmaker: "Bet365",
      description: "Get up to $500 bonus on your first deposit",
      expiry: "7 days",
      code: "WELCOME500",
      type: "Deposit Bonus",
      value: "$500",
      rating: 4.8
    },
    {
      id: 2,
      title: "Risk-Free Bet",
      bookmaker: "DraftKings",
      description: "Up to $1000 risk-free first bet",
      expiry: "3 days",
      code: "RISKFREE1000",
      type: "Risk-Free",
      value: "$1000",
      rating: 4.9
    },
    {
      id: 3,
      title: "Free Bet Friday",
      bookmaker: "FanDuel",
      description: "Get a free $50 bet every Friday",
      expiry: "24 hours",
      code: "FREEFRIDAY",
      type: "Free Bet",
      value: "$50",
      rating: 4.7
    },
    {
      id: 4,
      title: "Parlay Insurance",
      bookmaker: "Caesars",
      description: "Get your stake back on 4+ leg parlays",
      expiry: "14 days",
      code: "PARLAYINS",
      type: "Insurance",
      value: "100%",
      rating: 4.6
    },
    {
      id: 5,
      title: "Live Betting Bonus",
      bookmaker: "PointsBet",
      description: "20% bonus on live betting wins",
      expiry: "30 days",
      code: "LIVE20",
      type: "Live Bonus",
      value: "20%",
      rating: 4.5
    }
  ];

  return (
    <section className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0 px-2">
        <h2 className="text-xl sm:text-2xl font-bold text-text">Latest Bonuses</h2>
        <button className="text-accent hover:text-accent/80 text-sm font-medium self-start sm:self-auto">
          View All Bonuses →
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {bonuses.map((bonus) => (
          <div
            key={bonus.id}
            className="bg-surface border border-border rounded-xl p-4 sm:p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-200 group"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <span className="px-2 sm:px-3 py-1 bg-accent/20 text-accent text-xs font-semibold rounded-full border border-accent/30">
                {bonus.type}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span className="text-sm font-medium text-text">{bonus.rating}</span>
              </div>
            </div>
            
            {/* Bookmaker & Title */}
            <div className="mb-3">
              <span className="text-xs text-muted uppercase tracking-wide block mb-1">
                {bonus.bookmaker}
              </span>
              <h3 className="font-bold text-text text-base sm:text-lg leading-tight line-clamp-2">
                {bonus.title}
              </h3>
            </div>
            
            {/* Description */}
            <p className="text-xs sm:text-sm text-muted mb-3 sm:mb-4 leading-relaxed line-clamp-2">
              {bonus.description}
            </p>
            
            {/* Value & Expiry */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-center">
                <span className="text-xs text-muted block">Bonus Value</span>
                <span className="text-lg sm:text-xl font-bold text-accent">{bonus.value}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted block">Expires</span>
                <span className="text-xs sm:text-sm font-medium text-text">{bonus.expiry}</span>
              </div>
            </div>
            
            {/* Promo Code */}
            <div className="bg-bg rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
              <span className="text-xs text-muted block mb-2">Promo Code</span>
              <div className="flex items-center gap-2">
                <code className="bg-accent text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-mono font-bold flex-1 text-center">
                  {bonus.code}
                </code>
                <button className="text-xs text-accent hover:text-accent/80 font-medium flex-shrink-0">
                  Copy
                </button>
              </div>
            </div>
            
            {/* Claim Button */}
            <button className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-accent text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors group-hover:scale-105">
              Claim Bonus
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
