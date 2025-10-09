
import React, { useState } from "react";
import { openBettingSiteByName } from "../config/bettingSites";
export default function Bookmakers() {
  const [selectedTab, setSelectedTab] = useState("BOOKIE INFO");
  const subNavigationTabs = [
    "BOOKIE INFO",
    "BONUS OFFERS", 
    "ODDS QUALITY",
    "BETTING APPS"
  ];
  const bookmakers = [
    {
      id: "1",
      name: "888 sport",
      logo: "888 sport",
      logoColor: "bg-black text-white",
      rating: "5/5",
      reviewLink: "888sport Review",
      features: [
        "30,000+ Events Monthly",
        "More than 40 Sports",
        "Highly rated betting app"
      ],
      payout: "92.1%",
      inPlayPayout: null,
      payoutLabel: "Average payout"
    },
    {
      id: "2",
      name: "bet365",
      logo: "bet365",
      logoColor: "bg-green-600 text-white",
      rating: "5/5",
      reviewLink: "bet365.us Review",
      features: [
        "Extensive live betting options",
        "More markets than other online bookmaker",
        "One of the best betting apps"
      ],
      payout: null,
      inPlayPayout: null,
      payoutLabel: null
    },
    {
      id: "3",
      name: "BET MGM",
      logo: "BET MGM",
      logoColor: "bg-black text-yellow-400",
      rating: "5/5",
      reviewLink: "BetMGM.us Review",
      features: [
        'Exclusive "Bonus Wheel" feature for rewarding active bettors',
        "Virtual sports section with a wide range of simulated events",
        "Access to VIP rewards program with personalized offers and promotions"
      ],
      payout: "92.94%",
      inPlayPayout: "89.80%",
      payoutLabel: "Average payout"
    },
    {
      id: "4",
      name: "PINNA CLE",
      logo: "PINNA CLE",
      logoColor: "bg-black text-white",
      rating: "5/5",
      reviewLink: "Pinnacle Review",
      features: [
        "Best odds in the industry",
        "High betting limits",
        "Professional betting platform"
      ],
      payout: "93.26%",
      inPlayPayout: "92.68%",
      payoutLabel: "Average payout"
    },
    {
      id: "5",
      name: "William Hill",
      logo: "William Hill",
      logoColor: "bg-blue-600 text-white",
      rating: "4.8/5",
      reviewLink: "William Hill Review",
      features: [
        "Established brand with long history",
        "Comprehensive sports coverage",
        "Excellent customer service"
      ],
      payout: "91.5%",
      inPlayPayout: "89.2%",
      payoutLabel: "Average payout"
    },
    {
      id: "6",
      name: "Lad brokes",
      logo: "Lad brokes",
      logoColor: "bg-red-600 text-white",
      rating: "4.7/5",
      reviewLink: "Ladbrokes Review",
      features: [
        "High street presence",
        "Competitive odds",
        "User-friendly interface"
      ],
      payout: "90.8%",
      inPlayPayout: "88.5%",
      payoutLabel: "Average payout"
    },
    {
      id: "7",
      name: "Coral",
      logo: "Coral",
      logoColor: "bg-orange-500 text-white",
      rating: "4.6/5",
      reviewLink: "Coral Review",
      features: [
        "Great mobile experience",
        "Regular promotions",
        "Fast payouts"
      ],
      payout: "90.2%",
      inPlayPayout: "87.9%",
      payoutLabel: "Average payout"
    },
    {
      id: "8",
      name: "Betfair",
      logo: "Betfair",
      logoColor: "bg-green-500 text-white",
      rating: "4.5/5",
      reviewLink: "Betfair Review",
      features: [
        "Exchange betting platform",
        "Best odds guaranteed",
        "Advanced trading tools"
      ],
      payout: "89.7%",
      inPlayPayout: "86.4%",
      payoutLabel: "Average payout"
    }
  ];
  return (
    <section className="space-y-4 sm:space-y-8 max-w-full overflow-hidden">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
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
        <div className="bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-500 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">BETMGM</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">US Sportsbook</p>
                <p className="text-xs sm:text-sm opacity-95">$1,500 Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BETMGM")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">bet-at-home</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">European Leader</p>
                <p className="text-xs sm:text-sm opacity-95">300€ Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet-at-home")}
                className="w-full bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="text-sm text-muted">
        Home &gt; Bookmakers
      </div>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-text">
          Best Online Betting Sites for Aug 2025 - Where to Bet?
        </h1>
        <div className="text-lg text-muted font-medium">
          Best betting sites Aug 2025
        </div>
        <p className="text-muted text-sm max-w-4xl leading-relaxed">
          OddsPortal covers various bookmakers, providing details and incredible betting bonuses. 
          Our reviews consider welcome bonuses, website navigation, registration, payment methods, 
          and mobile apps. Check our reviews and visit bookmakers via the VISIT BOOKMAKER button.
        </p>
      </div>
      <div className="flex gap-1 border-b border-border">
        {subNavigationTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
              selectedTab === tab
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent "
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-text">
          Bookmakers ({bookmakers.length})
        </h2>
        <div className="space-y-6">
          {bookmakers.map((bookmaker) => (
            <div key={bookmaker.id} className="bg-surface border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300">
              {bookmaker.payout && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-semibold">{bookmaker.payout}</span> {bookmaker.payoutLabel}
                    {bookmaker.inPlayPayout && (
                      <span className="ml-4">
                        <span className="font-semibold">{bookmaker.inPlayPayout}</span> Avg. In-play Odds Payout
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 ${bookmaker.logoColor} rounded-lg flex items-center justify-center font-bold text-lg text-center`}>
                      {bookmaker.logo}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-lg">★</span>
                      <span className="font-semibold text-text">{bookmaker.rating}</span>
                    </div>
                  </div>
                  <div>
                    <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm underline">
                      {bookmaker.reviewLink}
                    </a>
                  </div>
                  <div className="space-y-2">
                    {bookmaker.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-black dark:text-white text-sm">✓</span>
                        <span className="text-sm text-text">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-2 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <button className="bg-gray-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors hover:scale-105">
                      Visit Bookmaker
                    </button>
                    <div>
                      <a href="#" className="text-xs text-muted hover:text-accent transition-colors underline">
                        Terms and Conditions
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Why Choose Our Recommended Bookmakers?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-text">Licensed & Regulated</h4>
            <p className="text-sm text-muted leading-relaxed">
              All recommended bookmakers are fully licensed and regulated by recognized gaming 
              authorities. This ensures your funds are protected and you're playing on fair, 
              secure platforms.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-text">Competitive Odds & Payouts</h4>
            <p className="text-sm text-muted leading-relaxed">
              Our selected bookmakers offer some of the best odds in the industry with high 
              payout percentages. This maximizes your potential returns and gives you the best 
              value for your bets.
            </p>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Choosing the Right Bookmaker</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              🎯
            </div>
            <h4 className="font-medium text-text mb-2">Compare Odds</h4>
            <p className="text-sm text-muted">Always compare odds across multiple bookmakers to get the best value.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              🔒
            </div>
            <h4 className="font-medium text-text mb-2">Check Licensing</h4>
            <p className="text-sm text-muted">Ensure the bookmaker is licensed and regulated in your jurisdiction.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              💰
            </div>
            <h4 className="font-medium text-text mb-2">Review Bonuses</h4>
            <p className="text-sm text-muted">Look for welcome bonuses and ongoing promotions to maximize value.</p>
          </div>
        </div>
      </div>
    </section>
  );
}


