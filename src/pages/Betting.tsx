import React, { useState } from "react";

export default function Betting() {
  const [selectedCategory, setSelectedCategory] = useState("Best Social Casinos");
  const [showLess, setShowLess] = useState<Record<string, boolean>>({});

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

  const bettingSites = [
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
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="text-sm uppercase tracking-wider text-muted">
          DISCOVER ONLINE BETTING IN 2025: ALL YOU NEED TO KNOW
        </div>
        <h1 className="text-3xl font-bold text-text">
          Learn Everything About Online Betting with Our Expert Guides
        </h1>
      </div>

      {/* Guide Categories */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {guideCategories.map((category) => (
          <div key={category.name} className="bg-surface border border-border rounded-lg p-4 text-center hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="w-12 h-12 mx-auto mb-3 text-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
              {category.icon}
            </div>
            <h3 className="font-semibold text-text text-sm mb-1">{category.name}</h3>
            <p className="text-xs text-muted">{category.description}</p>
          </div>
        ))}
      </div>

      {/* Find Best Betting Sites Section */}
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

      {/* Filter Tabs */}
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

      {/* Betting Sites Listings */}
      <div className="space-y-6">
        {bettingSites.map((site) => (
          <div key={site.id} className="bg-surface border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
            {/* Yellow Left Border */}
            <div className="flex">
              <div className="w-2 bg-yellow-400"></div>
              
              {/* Main Content */}
              <div className="flex-1 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Site Info */}
                  <div className="space-y-4">
                    {/* Header */}
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

                    {/* Review Link */}
                    <div className="space-y-1">
                      <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                        {site.name} Review
                      </a>
                      <div className="text-xs text-muted">by {site.reviewer}</div>
                    </div>

                    {/* Logo */}
                    <div className="text-xl font-bold text-text">{site.logo}</div>

                    {/* Features */}
                    <div className="space-y-2">
                      {site.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-green-500 text-sm">✓</span>
                          <span className="text-sm text-text">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Bonus Code (if exists) */}
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

                    {/* Info Table */}
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

                  {/* Right Column - Promotional Offer */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Offer */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-text mb-4">
                        {site.offer}
                      </div>
                      
                      {/* Play Now Button */}
                      <button className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors hover:scale-105 mb-4">
                        Play Now
                      </button>

                      {/* Payment Methods */}
                      <div className="flex items-center justify-center gap-2 mb-4">
                        {site.paymentMethods.map((method, index) => (
                          <div key={index} className=" text-gray-700 border-t border-border px-2 py-1 rounded text-xs font-medium">
                            {method}
                          </div>
                        ))}
                      </div>

                      {/* Show Less Link */}
                      <button
                        onClick={() => toggleShowLess(site.id)}
                        className="text-sm text-muted hover:text-accent transition-colors"
                      >
                        {showLess[site.id] ? "Show More ▼" : "Show Less ▲"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-border text-center">
                  <span className="text-xs text-muted">T&Cs apply, {site.ageRequirement}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Information */}
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

      {/* Expert Tips */}
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
    </section>
  );
}
