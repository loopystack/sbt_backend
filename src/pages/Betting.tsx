import React, { useState } from "react";
import { bettingSites, openBettingSite } from "../config/bettingSites";
export default function Betting() {
  const [selectedCategory, setSelectedCategory] = useState("Best Social Casinos");
  const [showLess, setShowLess] = useState<Record<string, boolean>>({});
  const [showBettingSitesModal, setShowBettingSitesModal] = useState(false);
  const [showBettingBonusesModal, setShowBettingBonusesModal] = useState(false);
  const [showBettingGuidesModal, setShowBettingGuidesModal] = useState(false);
  const [showBestBettingAppsModal, setShowBestBettingAppsModal] = useState(false);
  const [showSweepstakesCasinosModal, setShowSweepstakesCasinosModal] = useState(false);
  const [showSweepstakesPromoCodesModal, setShowSweepstakesPromoCodesModal] = useState(false);
  const categories = [
    "Best Social Casinos",
    "New Social Casinos", 
    "Highest Bonus",
    "Number of Slots"
  ];
  const guideCategories = [
    { name: "Betting Sites", icon: "🏆", description: "Find the best betting platforms" },
    { name: "Betting Bonuses", icon: "🎁", description: "Discover amazing bonus offers" },
    { name: "Betting Guides", icon: "📊", description: "Learn betting strategies" },
    { name: "Best Betting Apps", icon: "📱", description: "Top mobile betting apps" },
    { name: "Sweepstakes Casinos", icon: "⭐", description: "Sweepstakes gaming sites" },
    { name: "Sweepstakes Casinos Promo Codes", icon: "🎫", description: "Exclusive promo codes" }
  ];
  const localBettingSites = [
    {
      id: "1",
      name: "Real Prize",
      rating: "4.8/5",
      reviewer: "James Leeland",
      logo: "REAL PRIZE",
      features: [
        "300+ games available.",
        "New games added every week.",
        "Regular tournaments and contests."
      ],
      offer: "625K Golden Coins + Up to 125 SC FREE + 1250 VIP Points",
      paymentMethods: ["VISA", "Mastercard", "Maestro", "+1"],
      gamingLicense: "n/a",
      withdrawalTime: "",
      supportTypes: ["Live Chat", "Email Support"],
      ageRequirement: "18+"
    },
    {
      id: "2", 
      name: "Stake.us",
      rating: "4.6/5",
      reviewer: "James Leeland",
      logo: "Stake.us",
      features: [
        "Welcome bonus of 560,000 GC and 56 SC + 5% Rakeback",
        "1,500+ games from 30+ providers",
        "25 Stake.us original games"
      ],
      bonusCode: "STAKEOP",
      offer: "56 Stake Cash + 560K Gold Coins + 5% Rakeback",
      paymentMethods: ["Bitcoin", "Ethereum", "Litecoin", "Dogecoin", "+5"],
      gamingLicense: "n/a",
      withdrawalTime: "",
      supportTypes: ["Live Chat", "Email Support"],
      ageRequirement: "18+"
    },
    {
      id: "3",
      name: "High5Casino", 
      rating: "4.5/5",
      reviewer: "James Leeland",
      logo: "HIGH 5 CASINO",
      features: [
        "Bonus Harvest every four hours",
        "Coin Store packages in all price ranges", 
        "Free SC with most purchased packages"
      ],
      offer: "245% Extra up to 60 SC FREE + 700 Gold Coins and 400 Diamonds!",
      paymentMethods: ["Visa", "Skrill", "+4"],
      gamingLicense: "n/a",
      withdrawalTime: "",
      supportTypes: ["Live Chat", "Phone", "Email Support"],
      ageRequirement: "21+"
    }
  ];
  const toggleShowLess = (id: string) => {
    setShowLess(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  return (
    <section className="space-y-4 sm:space-y-8 max-w-full overflow-hidden">
      <div className="text-center space-y-4">
        <div className="text-sm uppercase tracking-wider text-muted">
          DISCOVER ONLINE BETTING IN 2025: ALL YOU NEED TO KNOW
        </div>
        <h1 className="text-3xl font-bold text-text">
          Learn Everything About Online Betting with Our Expert Guides
        </h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {guideCategories.map((category) => (
          <div 
            key={category.name} 
            className="bg-surface border border-border rounded-lg p-4 text-center hover:shadow-lg transition-all duration-300 cursor-pointer group"
                         onClick={() => {
               if (category.name === "Betting Sites") {
                 setShowBettingSitesModal(true);
               } else if (category.name === "Betting Bonuses") {
                 setShowBettingBonusesModal(true);
               } else if (category.name === "Betting Guides") {
                 setShowBettingGuidesModal(true);
               } else if (category.name === "Best Betting Apps") {
                 setShowBestBettingAppsModal(true);
               } else if (category.name === "Sweepstakes Casinos") {
                 setShowSweepstakesCasinosModal(true);
               } else if (category.name === "Sweepstakes Casinos Promo Codes") {
                 setShowSweepstakesPromoCodesModal(true);
               }
             }}
          >
            <div className="w-16 h-16 mx-auto mb-3 text-4xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
              {category.icon}
            </div>
            <h3 className="font-semibold text-text text-sm mb-1">{category.name}</h3>
            <p className="text-xs text-muted">{category.description}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-text">
          Find the Best Betting Sites Available
        </h2>
        <p className="text-muted text-sm max-w-4xl leading-relaxed">
          Choosing the best betting brands is crucial for a successful online betting experience. 
          We consider factors like odds quality, market range, user experience, and security. 
          All listed brands are fully licensed and secure for online bettors in 2025.
        </p>
      </div>
      <div className="flex gap-1 border-b border-border">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
              selectedCategory === category
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="space-y-6">
        {localBettingSites.map((site) => (
          <div key={site.id} className="bg-surface border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="flex">
              <div className="w-2 bg-yellow-400"></div>
              <div className="flex-1 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-500 text-white text-sm font-bold rounded flex items-center justify-center">
                          {site.id}.
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-500 text-lg">⭐</span>
                          <span className="font-semibold text-text">{site.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                        {site.name} Review
                      </a>
                      <div className="text-xs text-muted">by {site.reviewer}</div>
                    </div>
                    <div className="text-xl font-bold text-text">{site.logo}</div>
                    <div className="space-y-2">
                      {site.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-green-500 text-sm">✓</span>
                          <span className="text-sm text-text">{feature}</span>
                        </div>
                      ))}
                    </div>
                    {site.bonusCode && (
                      <div className="flex items-center gap-2">
                        <button className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm font-medium hover:bg-gray-200 transition-colors">
                          BONUS CODE
                        </button>
                        <span className="text-sm font-medium text-text">{site.bonusCode}</span>
                        <button className="text-gray-500 hover:text-gray-700">
                          📋
                        </button>
                      </div>
                    )}
                    <div className=" rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Gaming Licence:</span>
                        <span className="text-text">{site.gamingLicense}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Withdrawal Time:</span>
                        <span className="text-text">{site.withdrawalTime || "-"}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Support Types:</span>
                        <span className="text-text">{site.supportTypes.join(", ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-text mb-4">
                        {site.offer}
                      </div>
                      <button className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors hover:scale-105 mb-4">
                        Play Now
                      </button>
                      <div className="flex items-center justify-center gap-2 mb-4">
                        {site.paymentMethods.map((method, index) => (
                          <div key={index} className=" text-gray-700 border-t border-border px-2 py-1 rounded text-xs font-medium">
                            {method}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => toggleShowLess(site.id)}
                        className="text-sm text-muted hover:text-accent transition-colors"
                      >
                        {showLess[site.id] ? "Show More ▼" : "Show Less ▲"}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-border text-center">
                  <span className="text-xs text-muted">T&Cs apply, {site.ageRequirement}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Why Choose Our Recommended Betting Sites?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-text">Security & Licensing</h4>
            <p className="text-sm text-muted leading-relaxed">
              All recommended sites are fully licensed and regulated, ensuring your funds and 
              personal information are protected. We only feature platforms with proven security 
              measures and fair gaming practices.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-text">Best Odds & Bonuses</h4>
            <p className="text-sm text-muted leading-relaxed">
              Our selected sites offer competitive odds and generous bonuses to maximize your 
              betting value. We regularly review and update our recommendations to ensure you 
              always get the best deals available.
            </p>
          </div>
        </div>
      </div>
      <div className="g-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Expert Betting Tips for 2025</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              💡
            </div>
            <h4 className="font-medium text-text mb-2">Start Small</h4>
            <p className="text-sm text-muted">Begin with small stakes to understand the platform and build confidence.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              📊
            </div>
            <h4 className="font-medium text-text mb-2">Research Thoroughly</h4>
            <p className="text-sm text-muted">Always research teams, players, and statistics before placing bets.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              🎯
            </div>
            <h4 className="font-medium text-text mb-2">Set Limits</h4>
            <p className="text-sm text-muted">Establish betting limits and stick to them to maintain responsible gaming.</p>
          </div>
        </div>
      </div>
      {showBettingSitesModal && (
        <div 
          className="fixed top-32 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4"
          onClick={() => setShowBettingSitesModal(false)}
        >
          <div 
            className="bg-surface border border-border rounded-lg max-w-6xl w-full max-h-[calc(100vh-160px)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text">Top Betting Sites</h2>
                <p className="text-muted text-sm mt-1">Discover the best betting platforms with exclusive bonuses</p>
              </div>
              <button
                onClick={() => setShowBettingSitesModal(false)}
                className="text-muted hover:text-text transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bettingSites.map((site) => (
                  <div key={site.id} className="bg-surface border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300 group">
                     <div className="text-center mb-4">
                                               <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold text-white ${
                          site.id === "1" ? "bg-gradient-to-r from-yellow-400 to-orange-500" :
                          site.id === "2" ? "bg-gradient-to-r from-pink-400 to-rose-500" :
                          site.id === "3" ? "bg-gradient-to-r from-purple-400 to-indigo-500" :
                          site.id === "4" ? "bg-gradient-to-r from-green-400 to-emerald-500" :
                          site.id === "5" ? "bg-gradient-to-r from-blue-400 to-cyan-500" :
                          site.id === "6" ? "bg-gradient-to-r from-red-400 to-pink-500" :
                          site.id === "7" ? "bg-gradient-to-r from-indigo-400 to-purple-500" :
                          site.id === "8" ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
                          "bg-gradient-to-r from-orange-400 to-red-500"
                        }`}>
                         {site.name.charAt(0)}
                       </div>
                      <h3 className="text-lg font-bold text-text mb-1">{site.name}</h3>
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-lg ${i < Math.floor(site.rating) ? 'text-yellow-500' : 'text-gray-300'}`}>
                            ⭐
                          </span>
                        ))}
                        <span className="text-sm text-muted ml-1">({site.rating})</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted text-center mb-4 leading-relaxed">
                      {site.description}
                    </p>
                    <div className="text-center mb-4">
                      <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-3">
                        <div className="text-xs text-muted mb-1">BONUS TYPE</div>
                        <div className="text-sm font-semibold text-text">{site.type}</div>
                      </div>
                      <div className="text-lg font-bold text-accent mb-3">
                        {site.bonus}
                      </div>
                    </div>
                     <button
                       onClick={() => openBettingSite(site.id)}
                       className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300"
                     >
                       Claim Bonus
                     </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border p-6 text-center">
              <p className="text-sm text-muted mb-4">
                All betting sites are licensed and regulated. Please gamble responsibly.
              </p>
              <button
                onClick={() => setShowBettingSitesModal(false)}
                className="bg-muted hover:bg-muted/80 text-text px-6 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showBettingBonusesModal && (
        <div 
          className="fixed top-32 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4"
          onClick={() => setShowBettingBonusesModal(false)}
        >
          <div 
            className="bg-surface border border-border rounded-lg max-w-6xl w-full max-h-[calc(100vh-160px)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text">Best Betting Site Bonuses & Offers</h2>
                <p className="text-muted text-sm mt-1">Compare the best betting bonuses for August 2025</p>
              </div>
              <button
                onClick={() => setShowBettingBonusesModal(false)}
                className="text-muted hover:text-text transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-4">
              <div className="flex gap-1 border-b border-border">
                {["Best Sportsbook Bonus", "Welcome Bonuses", "1st Deposit Bonuses", "No Deposit Bonuses"].map((tab) => (
                  <button
                    key={tab}
                    className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                      tab === "Best Sportsbook Bonus"
                        ? "text-accent border-b-2 border-accent"
                        : "text-muted hover:text-accent"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {bettingSites.map((site, index) => (
                  <div key={site.id} className="bg-surface border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start gap-4">
                       <div className="w-12 h-12 bg-accent/30 dark:bg-accent/20 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                         {index + 1}
                       </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500 text-lg">⭐</span>
                            <span className="font-semibold text-text">{site.rating}/5</span>
                          </div>
                          <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                            {site.name} Review
                          </a>
                          <span className="text-xs text-muted">by Jim Knight</span>
                        </div>
                        <h3 className="text-xl font-bold text-text mb-3">{site.name}</h3>
                        <div className="bg-orange-500 text-white px-4 py-3 rounded-lg mb-3 inline-block">
                          <div className="text-lg font-bold">{site.bonus}</div>
                        </div>
                        <div className="text-xs text-muted mb-4">T&Cs apply, 18+</div>
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-muted mb-1">Bonus Type</div>
                            <div className="text-sm font-semibold text-text">{site.type}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted mb-1">Wager</div>
                            <div className="text-sm font-semibold text-text">40x (Bonus + Deposit)</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted mb-1">Min. Deposit</div>
                            <div className="text-sm font-semibold text-text">$50</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted mb-1">Cashable</div>
                            <div className="text-sm font-semibold text-text">Yes</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">B</div>
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">E</div>
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">V</div>
                          <div className="text-sm text-muted">+23</div>
                        </div>
                        <button
                          onClick={() => openBettingSite(site.id)}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors mb-3"
                        >
                          Get Bonus
                        </button>
                        <button className="text-sm text-muted hover:text-accent transition-colors">
                          Show More ▼
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border p-6 text-center">
              <p className="text-sm text-muted mb-4">
                All bonuses are subject to terms and conditions. Please gamble responsibly.
              </p>
              <button
                onClick={() => setShowBettingBonusesModal(false)}
                className="bg-muted hover:bg-muted/80 text-text px-6 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showBettingGuidesModal && (
        <div 
          className="fixed top-32 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4"
          onClick={() => setShowBettingGuidesModal(false)}
        >
          <div 
            className="bg-surface border border-border rounded-lg max-w-6xl w-full max-h-[calc(100vh-160px)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text">Betting Guides for 2025: Expert Guides for a Range of Betting Topics</h2>
                <p className="text-muted text-sm mt-1">Learn everything about online betting with our comprehensive expert guides</p>
              </div>
              <button
                onClick={() => setShowBettingGuidesModal(false)}
                className="text-muted hover:text-text transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-text mb-6">Featured Articles</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-surface border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide1.png" 
                      alt="Lucky 15 Bet Guide" 
                      className="w-full h-48 object-cover"
                    />
                                         <div className="p-4">
                       <h4 className="font-bold text-text mb-2">What Is a Lucky 15 Bet? How It Works and When to Use It</h4>
                       <p className="text-sm text-muted mb-3">Jim Knight - 07.07.2025</p>
                       <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300">
                         Read Guide
                       </button>
                     </div>
                  </div>
                  <div className="bg-surface border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide2.png" 
                      alt="Trixie Bet Guide" 
                      className="w-full h-48 object-cover"
                    />
                                         <div className="p-4">
                       <h4 className="font-bold text-text mb-2">What Is a Trixie Bet? Full Explanation and Examples</h4>
                       <p className="text-sm text-muted mb-3">Jim Knight - 07.07.2025</p>
                       <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300">
                         Read Guide
                       </button>
                     </div>
                  </div>
                  <div className="bg-surface border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide3.png" 
                      alt="Asian Handicap Guide" 
                      className="w-full h-48 object-cover"
                    />
                                         <div className="p-4">
                       <h4 className="font-bold text-text mb-2">Asian Handicap Betting Explained: Complete Guide for 2025</h4>
                       <p className="text-sm text-muted mb-3">Jim Knight - 24.06.2025</p>
                       <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300">
                         Read Guide
                       </button>
                     </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-text mb-6">All Betting Guides</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide4.png" 
                      alt="Lucky 31 Bet Guide" 
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-text mb-2">Lucky 31 Bet Explained: A Complete Guide for 2025</h4>
                      <p className="text-sm text-muted mb-2">One of the most common questions bettors ask me is What is a Lucky 31 bet? And the answer? A Lucky 31 bet is a comprehensive multiple bet that combines 31 different bets across 5 selections...</p>
                      <p className="text-xs text-muted">Jim Knight - 25.06.2025</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide5.png" 
                      alt="Patent Bet Guide" 
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-text mb-2">What Is a Patent Bet? Complete Guide to Patent Betting</h4>
                      <p className="text-sm text-muted mb-2">A Patent bet is a popular multiple bet type that combines 7 different bets across 3 selections. This comprehensive guide explains how Patent bets work, their advantages, and when to use them...</p>
                      <p className="text-xs text-muted">Jim Knight - 23.06.2025</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide6.png" 
                      alt="Heinz Bet Guide" 
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-text mb-2">Heinz and Super Heinz Bets Explained: Full Guide for 2025</h4>
                      <p className="text-sm text-muted mb-2">One of the most common questions bettors ask me is What is a Heinz bet? And the answer? A Heinz bet is a comprehensive multiple bet that combines 57 different bets across 6 selections...</p>
                      <p className="text-xs text-muted">Jim Knight - 25.06.2005</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide7.png" 
                      alt="Handball Betting Guide" 
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-text mb-2">Handball Betting Guide - Expert Tips on How to Bet on Handball</h4>
                      <p className="text-sm text-muted mb-2">Handball is one of the top sports at online betting sites. This article discusses how to bet on handball, including the best strategies, markets, and tips for success...</p>
                      <p className="text-xs text-muted">Jim Knight - 23.06.2005</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide8.png" 
                      alt="Volleyball Betting Guide" 
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-text mb-2">Volleyball Betting Guide - Expert Tips on How to Bet on Volleyball</h4>
                      <p className="text-sm text-muted mb-2">After spending some time betting at various volleyball sportsbooks, I've decided to help you learn how to bet on volleyball with expert strategies and insights...</p>
                      <p className="text-xs text-muted">Jim Knight - 25.06.2005</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide9.png" 
                      alt="eSports Betting Guide" 
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-text mb-2">How to Bet on eSports Betting Explained: Full Guide for 2025</h4>
                      <p className="text-sm text-muted mb-2">ESports betting continues to rise in popularity alongside the stratospheric explosion of the eSports industry in general with a seemingly endless stream of tournaments and events...</p>
                      <p className="text-xs text-muted">Jim Knight - 08.05.2025</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide10.png" 
                      alt="Draw No Bet Guide" 
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-text mb-2">Draw No Bet Strategy: Expert Guide for 2025</h4>
                      <p className="text-sm text-muted mb-2">I used to hate when a football match ended in a draw until I came across the Draw no Bet strategy. This comprehensive guide explains how to use this betting approach effectively...</p>
                      <p className="text-xs text-muted">Jim Knight - 07.05.2005</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide11.png" 
                      alt="Formula 1 Betting Guide" 
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-text mb-2">How to Bet on Formula 1: Complete F1 Betting Guide for 2025</h4>
                      <p className="text-sm text-muted mb-2">If you're looking to learn how to bet on Formula 1, you've come to the right place, as I've compiled a comprehensive guide covering all aspects of F1 betting...</p>
                      <p className="text-xs text-muted">Jim Knight - 07.05.2005</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide12.png" 
                      alt="Half Time Full Time Guide" 
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-text mb-2">Half time/Full time Betting: How-To Guide and Where to Wager</h4>
                      <p className="text-sm text-muted mb-2">One of the great things I've found about online sportsbooks is the betting variety you get and one of the most interesting markets is the Half Time/Full Time betting option...</p>
                      <p className="text-xs text-muted">Jim Knight - 06.05.2025</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                    <img 
                      src="/assets/Betting_guide/guide13.png" 
                      alt="3-Way Handicap Guide" 
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-text mb-2">3-Way Handicap Betting Explained: Full Guide & Examples for 2025</h4>
                      <p className="text-sm text-muted mb-2">A 3-way handicap bet - also known as a European handicap - is a sports wager where one team is given a goal advantage or disadvantage to level the playing field...</p>
                      <p className="text-xs text-muted">Jim Knight - 05.05.2005</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-border p-6 text-center">
              <p className="text-sm text-muted mb-4">
                All guides are written by betting experts. Please gamble responsibly and use these guides to make informed decisions.
              </p>
              <button
                onClick={() => setShowBettingGuidesModal(false)}
                className="bg-muted hover:bg-muted/80 text-text px-6 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
             )}
       {showBestBettingAppsModal && (
         <div 
           className="fixed top-32 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4"
           onClick={() => setShowBestBettingAppsModal(false)}
         >
           <div 
             className="bg-surface border border-border rounded-lg max-w-6xl w-full max-h-[calc(100vh-160px)] overflow-y-auto"
             onClick={(e) => e.stopPropagation()}
           >
             <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
               <div>
                 <h2 className="text-2xl font-bold text-text">Best Betting Apps Available in 2025</h2>
                 <p className="text-muted text-sm mt-1">Find reliable and high-quality betting apps for mobile betting</p>
               </div>
               <button
                 onClick={() => setShowBestBettingAppsModal(false)}
                 className="text-muted hover:text-text transition-colors p-2"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
             <div className="px-6 pb-4">
               <div className="flex gap-1 border-b border-border">
                 {["Best Sportsbook", "New Sportsbooks", "Highest Bonus", "Best Odds", "Offers Livestreams"].map((tab) => (
                   <button
                     key={tab}
                     className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                       tab === "Best Sportsbook"
                         ? "text-accent border-b-2 border-accent"
                         : "text-muted hover:text-accent"
                     }`}
                   >
                     {tab}
                   </button>
                 ))}
               </div>
             </div>
             <div className="p-6">
               <div className="space-y-6">
                 <div className="bg-surface border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300">
                   <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                        1
                      </div>
                     <div className="flex-1">
                       <div className="flex items-center gap-3 mb-3">
                         <div className="flex items-center gap-1">
                           <span className="text-yellow-500 text-lg">⭐</span>
                           <span className="font-semibold text-text">4.9/5</span>
                         </div>
                         <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                           Stake Review
                         </a>
                         <span className="text-xs text-muted">by Jim Knight</span>
                       </div>
                       <h3 className="text-xl font-bold text-text mb-3">Stake</h3>
                       <div className="space-y-2 mb-4">
                         <div className="flex items-center gap-2">
                           <span className="text-green-500 text-sm">✓</span>
                           <span className="text-sm text-text">Betting from $10 with no max win limits</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-green-500 text-sm">✓</span>
                           <span className="text-sm text-text">Live betting with interactive visuals, stats, and commentary</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-green-500 text-sm">✓</span>
                           <span className="text-sm text-text">Fast, secure, and borderless betting with cryptocurrencies</span>
                         </div>
                       </div>
                       <div className="flex items-center gap-2 mb-4">
                         <button className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm font-medium hover:bg-gray-200 transition-colors">
                           BONUS CODE
                         </button>
                         <span className="text-sm font-medium text-text">STAKEOP</span>
                         <button className="text-gray-500 hover:text-gray-700">📋</button>
                       </div>
                       <div className="bg-orange-500 text-white px-4 py-3 rounded-lg mb-3 inline-block">
                         <div className="text-lg font-bold">200% up to $2000</div>
                       </div>
                       <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors mb-3">
                         Play Now
                       </button>
                       <div className="flex items-center gap-2 mb-4">
                         <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">B</div>
                         <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">E</div>
                         <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">L</div>
                         <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">D</div>
                         <div className="text-sm text-muted">+23</div>
                       </div>
                       <div className="space-y-2 mb-4">
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Bet Selection:</span>
                           <span className="text-text">Basketball, Cycling, Darts, Football,...</span>
                         </div>
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Gaming Licence:</span>
                           <span className="text-text">Curacao</span>
                         </div>
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Withdrawal Time:</span>
                           <span className="text-text">0-5 Days</span>
                         </div>
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Support Types:</span>
                           <span className="text-text">Live Chat, Phone, Email Support</span>
                         </div>
                       </div>
                       <div className="text-xs text-muted">T&Cs apply, 18+</div>
                     </div>
                   </div>
                 </div>
                 <div className="bg-surface border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300">
                   <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                        2
                      </div>
                     <div className="flex-1">
                       <div className="flex items-center gap-3 mb-3">
                         <div className="flex items-center gap-1">
                           <span className="text-yellow-500 text-lg">⭐</span>
                           <span className="font-semibold text-text">4.8/5</span>
                         </div>
                         <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                           BC.GAME Review
                         </a>
                         <span className="text-xs text-muted">by James Leeland</span>
                       </div>
                       <h3 className="text-xl font-bold text-text mb-3">BC.GAME</h3>
                       <div className="space-y-2 mb-4">
                         <div className="flex items-center gap-2">
                           <span className="text-green-500 text-sm">✓</span>
                           <span className="text-sm text-text">Over 60 sports to choose from</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-green-500 text-sm">✓</span>
                           <span className="text-sm text-text">Friendly interface, smooth navigation, and a modern design</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-green-500 text-sm">✓</span>
                           <span className="text-sm text-text">Several cryptocurrency payment options</span>
                         </div>
                       </div>
                       <div className="bg-orange-500 text-white px-4 py-3 rounded-lg mb-3 inline-block">
                         <div className="text-lg font-bold">200% up to $500</div>
                       </div>
                       <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors mb-3">
                         Play Now
                       </button>
                       <div className="flex items-center gap-2 mb-4">
                         <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">B</div>
                         <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">E</div>
                         <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">L</div>
                         <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">D</div>
                         <div className="text-sm text-muted">+77</div>
                       </div>
                       <div className="space-y-2 mb-4">
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Bet Selection:</span>
                           <span className="text-text">Basketball, Cycling, Dog Racing, Darts,...</span>
                         </div>
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Gaming Licence:</span>
                           <span className="text-text">Curacao</span>
                         </div>
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Withdrawal Time:</span>
                           <span className="text-text">0-5 Days</span>
                         </div>
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Support Types:</span>
                           <span className="text-text">Live Chat, Phone, Email Support</span>
                         </div>
                       </div>
                       <div className="text-xs text-muted">T&Cs apply, 18+</div>
                     </div>
                   </div>
                 </div>
                 <div className="bg-surface border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300">
                   <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                        3
                      </div>
                     <div className="flex-1">
                       <div className="flex items-center gap-3 mb-3">
                         <div className="flex items-center gap-1">
                           <span className="text-yellow-500 text-lg">⭐</span>
                           <span className="font-semibold text-text">4.7/5</span>
                         </div>
                         <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                           GG.Bet Review
                         </a>
                         <span className="text-xs text-muted">by Jim Knight</span>
                       </div>
                       <h3 className="text-xl font-bold text-text mb-3">GG.Bet</h3>
                       <div className="space-y-2 mb-4">
                         <div className="flex items-center gap-2">
                           <span className="text-green-500 text-sm">✓</span>
                           <span className="text-sm text-text">Wide range options of betting markets</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-green-500 text-sm">✓</span>
                           <span className="text-sm text-text">Competitive odds across a variety of sports</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-green-500 text-sm">✓</span>
                           <span className="text-sm text-text">Thrilling eSports betting features, including HD streaming</span>
                         </div>
                       </div>
                       <div className="bg-orange-500 text-white px-4 py-3 rounded-lg mb-3 inline-block">
                         <div className="text-lg font-bold">Up to €1000 + €250 in Freebet</div>
                       </div>
                       <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors mb-3">
                         Play Now
                       </button>
                       <div className="flex items-center gap-2 mb-4">
                         <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">V</div>
                         <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">M</div>
                         <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">S</div>
                         <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">N</div>
                         <div className="text-sm text-muted">+29</div>
                       </div>
                       <div className="space-y-2 mb-4">
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Bet Selection:</span>
                           <span className="text-text">Basketball, Cycling, Darts, Football,...</span>
                         </div>
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Gaming Licence:</span>
                           <span className="text-text">Curacao</span>
                         </div>
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Withdrawal Time:</span>
                           <span className="text-text">1-5 Days</span>
                         </div>
                         <div className="flex justify-between text-xs">
                           <span className="text-muted">Support Types:</span>
                           <span className="text-text">Live Chat, Phone, Email Support</span>
                         </div>
                       </div>
                       <div className="text-xs text-muted">T&Cs apply, 18+</div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
             <div className="border-t border-border p-6 text-center">
               <p className="text-sm text-muted mb-4">
                 All betting apps are licensed and regulated. Please gamble responsibly.
               </p>
               <button
                 onClick={() => setShowBestBettingAppsModal(false)}
                 className="bg-muted hover:bg-muted/80 text-text px-6 py-2 rounded-lg transition-colors"
               >
                 Close
               </button>
             </div>
           </div>
         </div>
               )}
        {showSweepstakesCasinosModal && (
          <div 
            className="fixed top-32 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4"
            onClick={() => setShowSweepstakesCasinosModal(false)}
          >
            <div 
              className="bg-surface border border-border rounded-lg max-w-6xl w-full max-h-[calc(100vh-160px)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-text">Best Sweepstakes Casinos Online with Expert Ratings & Promotions</h2>
                  <p className="text-muted text-sm mt-1">Discover the top sweepstakes casinos for 2025 with exclusive bonuses and expert reviews</p>
                </div>
                <button
                  onClick={() => setShowSweepstakesCasinosModal(false)}
                  className="text-muted hover:text-text transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 pb-4">
                <div className="flex gap-1 border-b border-border">
                  {["Best Social Casinos", "New Social Casinos", "Highest Bonus", "Number of Slots"].map((tab) => (
                    <button
                      key={tab}
                      className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                        tab === "Best Social Casinos"
                          ? "text-accent border-b-2 border-accent"
                          : "text-muted hover:text-accent"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-text mb-6">Top 3 Online Sweepstakes Casino Sites: Expert-Reviewed</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-surface border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
                      <img 
                        src="/assets/sweepstakes/casino1.png" 
                        alt="Stake.us Casino" 
                        className="w-full h-48 object-cover"
                      />
                                             <div className="p-4">
                         <h4 className="font-bold text-text mb-2">Stake.us - Best Online Sweepstakes Casino for Welcome Bonus</h4>
                         <p className="text-sm text-muted mb-3">James Leeland - 08.08.2025</p>
                         <div className="space-y-2 mb-3">
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">260K GC & 55 SC welcome bonus</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">Original games from in-house developers</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">Live dealer games</span>
                           </div>
                         </div>
                         <button 
                           onClick={() => window.open('https://stake.us', '_blank')}
                           className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                         >
                           Visit Casino
                         </button>
                       </div>
                    </div>
                    <div className="bg-surface border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
                      <img 
                        src="/assets/sweepstakes/casino2.png" 
                        alt="WOW Vegas Casino" 
                        className="w-full h-48 object-cover"
                      />
                                             <div className="p-4">
                         <h4 className="font-bold text-text mb-2">WOW Vegas - Best Sweepstake Casino Online for Slot Games</h4>
                         <p className="text-sm text-muted mb-3">James Leeland - 08.08.2025</p>
                         <div className="space-y-2 mb-3">
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">860+ casino-style games</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">250k WOW Coins and 5 SC welcome bonus</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">Star system VIP club</span>
                           </div>
                         </div>
                         <button 
                           onClick={() => window.open('https://wowvegas.com', '_blank')}
                           className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                         >
                           Visit Casino
                         </button>
                       </div>
                    </div>
                    <div className="bg-surface border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
                      <img 
                        src="/assets/sweepstakes/casino3.png" 
                        alt="Pulsz Casino" 
                        className="w-full h-48 object-cover"
                      />
                                             <div className="p-4">
                         <h4 className="font-bold text-text mb-2">Pulsz - Best Sweepstakes Casino for Prize Redemption</h4>
                         <p className="text-sm text-muted mb-3">James Leeland - 08.08.2025</p>
                         <div className="space-y-2 mb-3">
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">Bank, Skrill, and gift card redemption</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">16k GC and 3.2 SC welcome offer</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">Android and iOS mobile apps</span>
                           </div>
                         </div>
                         <button 
                           onClick={() => window.open('https://pulsz.com', '_blank')}
                           className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                         >
                           Visit Casino
                         </button>
                       </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text mb-6">All Sweepstakes Casinos</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                      <img 
                        src="/assets/sweepstakes/casino4.png" 
                        alt="Casino 4" 
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-text mb-2">High5Casino - Premium Social Gaming Experience</h4>
                        <p className="text-sm text-muted mb-2">High5Casino offers a premium social gaming experience with high-quality graphics, regular tournaments, and a generous rewards system...</p>
                        <p className="text-xs text-muted">James Leeland - 07.08.2025</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                      <img 
                        src="/assets/sweepstakes/casino5.png" 
                        alt="Casino 5" 
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-text mb-2">Fortune Coins - Daily Rewards & Tournaments</h4>
                        <p className="text-sm text-muted mb-2">Fortune Coins features daily rewards, exciting tournaments, and a wide variety of slot games with stunning visuals and engaging gameplay...</p>
                        <p className="text-xs text-muted">James Leeland - 06.08.2025</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300">
                      <img 
                        src="/assets/sweepstakes/casino6.png" 
                        alt="Casino 6" 
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-text mb-2">Chumba Casino - Licensed & Regulated Gaming</h4>
                        <p className="text-sm text-muted mb-2">Chumba Casino provides a licensed and regulated gaming environment with secure transactions, fair play, and excellent customer support...</p>
                        <p className="text-xs text-muted">James Leeland - 05.08.2025</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-border p-6 text-center">
                <p className="text-sm text-muted mb-4">
                  All sweepstakes casinos are licensed and regulated. Please gamble responsibly and use these guides to make informed decisions.
                </p>
                <button
                  onClick={() => setShowSweepstakesCasinosModal(false)}
                  className="bg-muted hover:bg-muted/80 text-text px-6 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
                 )}
         {showSweepstakesPromoCodesModal && (
           <div 
             className="fixed top-32 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4"
             onClick={() => setShowSweepstakesPromoCodesModal(false)}
           >
             <div 
               className="bg-surface border border-border rounded-lg max-w-6xl w-full max-h-[calc(100vh-160px)] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}
             >
               <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
                 <div>
                   <h2 className="text-2xl font-bold text-text">The Best Sweepstake Casino Promo Codes in 2025</h2>
                   <p className="text-muted text-sm mt-1">Discover exclusive promo codes and bonuses for sweepstakes casinos</p>
                 </div>
                 <button
                   onClick={() => setShowSweepstakesPromoCodesModal(false)}
                   className="text-muted hover:text-text transition-colors p-2"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
               <div className="px-6 pb-4">
                 <div className="flex gap-1 border-b border-border">
                   {["Best Social Casino Bonus", "Welcome Bonuses", "1st Deposit Bonuses", "No Deposit Bonuses"].map((tab) => (
                     <button
                       key={tab}
                       className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                         tab === "Best Social Casino Bonus"
                           ? "text-accent border-b-2 border-accent"
                           : "text-muted hover:text-accent"
                       }`}
                     >
                       {tab}
                     </button>
                   ))}
                 </div>
               </div>
               <div className="p-6">
                 <div className="mb-8">
                   <h3 className="text-xl font-bold text-text mb-4">Compare the top bonuses offered at social and sweepstakes casinos in August</h3>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <div className="bg-surface border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300">
                       <h4 className="text-lg font-bold text-text mb-4">Stake.us - Notable Welcome Bonus by Using Our Promo Code</h4>
                       <div className="grid grid-cols-2 gap-4 mb-4">
                         <div className="text-center">
                           <img 
                             src="/assets/sweepstakes/casino1.png" 
                             alt="Stake.us mobile casino" 
                             className="w-full h-32 object-cover rounded-lg mb-2"
                           />
                           <p className="text-xs text-muted">Stake.us mobile casino</p>
                         </div>
                         <div className="text-center">
                           <img 
                             src="/assets/sweepstakes/casino2.png" 
                             alt="Stake.us slot games" 
                             className="w-full h-32 object-cover rounded-lg mb-2"
                           />
                           <p className="text-xs text-muted">Stake.us slot games</p>
                         </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4 mb-4">
                         <div className="space-y-2">
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">Weekly Raffles</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">Valuable Promo Code</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">50m GC Daily Races</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">Slot Battle Promotion</span>
                           </div>
                         </div>
                         <div className="space-y-2">
                           <div className="flex items-center gap-2">
                             <span className="text-red-500 text-sm">✗</span>
                             <span className="text-sm text-text">No mobile app</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-red-500 text-sm">✗</span>
                             <span className="text-sm text-text">Verification May Take Longer</span>
                           </div>
                         </div>
                       </div>
                       <p className="text-sm text-muted mb-4">
                         Stake.us is known for its brand ambassadors and unique promo code offers. Use the Odds Portal promo code "STAKEOP" for 260k GC, 55 SC, and a 5% Rakeback at Stake.us! Also enjoy the 50M GC Daily Races promo that doesn't require a code.
                       </p>
                       <button 
                         onClick={() => window.open('https://stake.us', '_blank')}
                         className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300"
                       >
                         Use Promo Code
                       </button>
                     </div>
                     <div className="bg-surface border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300">
                       <h4 className="text-lg font-bold text-text mb-4">Sportzino - Straightforward Welcome Bonus with Quick Sign Up Steps and No Promo Code</h4>
                       <div className="grid grid-cols-2 gap-4 mb-4">
                         <div className="text-center">
                           <img 
                             src="/assets/sweepstakes/casino3.png" 
                             alt="Sportzino mobile casino" 
                             className="w-full h-32 object-cover rounded-lg mb-2"
                           />
                           <p className="text-xs text-muted">Sportzino mobile casino</p>
                         </div>
                         <div className="text-center">
                           <img 
                             src="/assets/sweepstakes/casino4.png" 
                             alt="Sportzino casino games" 
                             className="w-full h-32 object-cover rounded-lg mb-2"
                           />
                           <p className="text-xs text-muted">Sportzino casino games</p>
                         </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4 mb-4">
                         <div className="space-y-2">
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">Welcome Bonus of 1.5M GC and 41 SC</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">5-League VIP Program</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">Cherry Blossom Raffle</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-green-500 text-sm">✓</span>
                             <span className="text-sm text-text">Refer a Friend Bonus</span>
                           </div>
                         </div>
                         <div className="space-y-2">
                           <div className="flex items-center gap-2">
                             <span className="text-red-500 text-sm">✗</span>
                             <span className="text-sm text-text">No Table Games</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-red-500 text-sm">✗</span>
                             <span className="text-sm text-text">No Live Casino</span>
                           </div>
                         </div>
                       </div>
                       <p className="text-sm text-muted mb-4">
                         The Sportzino welcome bonus offers GC 1.5k and SC 6. Simple actions contribute to these prizes, making it easy to earn rewards.
                       </p>
                       <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-4">
                         <div className="text-xs text-muted mb-2">Action</div>
                         <div className="space-y-1 text-xs">
                           <div className="flex justify-between">
                             <span>Registration:</span>
                             <span className="font-semibold">20,000 GC, 1 SC</span>
                           </div>
                           <div className="flex justify-between">
                             <span>Connecting Facebook:</span>
                             <span className="font-semibold">20,000 GC, 1 SC</span>
                           </div>
                           <div className="flex justify-between">
                             <span>Phone verification:</span>
                             <span className="font-semibold">30,000 GC, 1 SC</span>
                           </div>
                           <div className="flex justify-between">
                             <span>Email notifications:</span>
                             <span className="font-semibold">30,000 GC, 1 SC</span>
                           </div>
                           <div className="flex justify-between">
                             <span>SMS notifications:</span>
                             <span className="font-semibold">30,000 GC, 1 SC</span>
                           </div>
                           <div className="flex justify-between">
                             <span>First Daily Login:</span>
                             <span className="font-semibold">20,000 GC, 1 SC</span>
                           </div>
                         </div>
                       </div>
                       <button 
                         onClick={() => window.open('https://sportzino.com', '_blank')}
                         className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300"
                       >
                         Get Welcome Bonus
                       </button>
                     </div>
                   </div>
                 </div>
                 <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-center">
                   <p className="text-sm text-text">
                     Get an extra 1,350,000 Gold Coins and 35 free Sweepstake Coins by completing all actions!
                   </p>
                 </div>
               </div>
               <div className="border-t border-border p-6 text-center">
                 <p className="text-sm text-muted mb-4">
                   All promo codes are subject to terms and conditions. Please gamble responsibly and use these codes to maximize your gaming experience.
                 </p>
                 <button
                   onClick={() => setShowSweepstakesPromoCodesModal(false)}
                   className="bg-muted hover:bg-muted/80 text-text px-6 py-2 rounded-lg transition-colors"
                 >
                   Close
                 </button>
               </div>
             </div>
           </div>
         )}
       </section>
     );
   }


