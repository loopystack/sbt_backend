import React from "react";
import { openBettingSiteByName } from "../config/bettingSites";

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
            className="bg-surface border border-border rounded-xl p-4 sm:p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-200 group min-h-[280px] sm:min-h-[320px] flex flex-col"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <span className="px-2 sm:px-3 py-1 bg-accent/20 text-accent text-xs font-semibold rounded-full border border-accent/30">
                {bonus.type}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span className="text-sm font-medium text-text">{bonus.rating}</span>
              </div>
            </div>
            

            <div className="mb-3">
              <span className="text-xs text-muted uppercase tracking-wide block mb-1">
                {bonus.bookmaker}
              </span>
              <h3 className="font-bold text-text text-base sm:text-lg leading-tight line-clamp-2">
                {bonus.title}
              </h3>
            </div>
            

            <p className="text-xs sm:text-sm text-muted mb-3 sm:mb-4 leading-relaxed line-clamp-2">
              {bonus.description}
            </p>

            {/* Additional Content Section */}
            <div className="flex-1 flex flex-col justify-center mb-3 sm:mb-4">
              <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-3 sm:p-4 mb-3">
                <div className="text-center">
                  <div className="text-xs text-muted mb-2">WHY CHOOSE THIS BONUS?</div>
                  <div className="text-sm text-text leading-relaxed">
                    {bonus.id === 1 && "Perfect for new players looking to maximize their first deposit with industry-leading odds and live betting features."}
                    {bonus.id === 2 && "Risk-free betting means you can explore new markets without worrying about losses. Great for trying different strategies."}
                    {bonus.id === 3 && "Weekly free bets keep the excitement going. Use them on any sport or market with no restrictions."}
                    {bonus.id === 4 && "Parlay insurance protects your multi-leg bets. Get your stake back if one leg fails on 4+ selections."}
                    {bonus.id === 5 && "Live betting bonus rewards your in-play success. Get 20% extra on all your live betting wins."}
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-muted mb-1">BONUS RATING</div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-sm ${i < Math.floor(bonus.rating) ? 'text-yellow-500' : 'text-gray-300'}`}>
                      ⭐
                    </span>
                  ))}
                  <span className="text-xs text-muted ml-1">({bonus.rating}/5)</span>
                </div>
              </div>
            </div>

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
            
            <button 
              onClick={() => openBettingSiteByName(bonus.bookmaker)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors group-hover:scale-105"
            >
              Claim Bonus
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
