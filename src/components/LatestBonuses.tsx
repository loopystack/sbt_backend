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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text">Latest Bonuses</h2>
        <button className="text-accent hover:text-accent/80 text-sm font-medium">
          View All Bonuses →
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bonuses.map((bonus) => (
          <div
            key={bonus.id}
            className="bg-surface border border-border rounded-xl p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-200 group"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-accent/20 text-accent text-xs font-semibold rounded-full border border-accent/30">
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
              <h3 className="font-bold text-text text-lg leading-tight">
                {bonus.title}
              </h3>
            </div>
            
            {/* Description */}
            <p className="text-sm text-muted mb-4 leading-relaxed">
              {bonus.description}
            </p>
            
            {/* Value & Expiry */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <span className="text-xs text-muted block">Bonus Value</span>
                <span className="text-xl font-bold text-accent">{bonus.value}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted block">Expires</span>
                <span className="text-sm font-medium text-text">{bonus.expiry}</span>
              </div>
            </div>
            
            {/* Promo Code */}
            <div className="bg-bg rounded-lg p-3 mb-4">
              <span className="text-xs text-muted block mb-2">Promo Code</span>
              <div className="flex items-center gap-2">
                <code className="bg-accent text-white px-3 py-2 rounded-lg text-sm font-mono font-bold flex-1 text-center">
                  {bonus.code}
                </code>
                <button className="text-xs text-accent hover:text-accent/80 font-medium">
                  Copy
                </button>
              </div>
            </div>
            
            {/* Claim Button */}
            <button className="w-full px-4 py-3 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors group-hover:scale-105">
              Claim Bonus
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
