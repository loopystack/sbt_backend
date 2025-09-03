import React from "react";

export default function PopularSports() {
  const sports = [
    {
      id: 1,
      name: "Football",
      icon: "⚽",
      leagues: ["Premier League", "La Liga", "Bundesliga", "Serie A"],
      matches: 156,
      color: "bg-green-500/20 text-green-400 border-green-500/30"
    },
    {
      id: 2,
      name: "Basketball",
      icon: "🏀",
      leagues: ["NBA", "EuroLeague", "NCAA", "Super Lig"],
      matches: 89,
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30"
    },
    {
      id: 3,
      name: "Tennis",
      icon: "🎾",
      leagues: ["ATP", "WTA", "Grand Slams", "Masters"],
      matches: 67,
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    },
    {
      id: 4,
      name: "American Football",
      icon: "🏈",
      leagues: ["NFL", "NCAA", "CFL", "XFL"],
      matches: 34,
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30"
    },
    {
      id: 5,
      name: "Baseball",
      icon: "⚾",
      leagues: ["MLB", "NPB", "KBO", "CPBL"],
      matches: 45,
      color: "bg-red-500/20 text-red-400 border-red-500/30"
    },
    {
      id: 6,
      name: "Hockey",
      icon: "🏒",
      leagues: ["NHL", "SHL", "KHL", "Liiga"],
      matches: 23,
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  ];

  return (
    <section className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0 px-2">
        <h2 className="text-xl sm:text-2xl font-bold text-text">Popular Sports</h2>
        <button className="text-accent hover:text-accent/80 text-sm font-medium self-start sm:self-auto">
          View All Sports →
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {sports.map((sport) => (
          <div
            key={sport.id}
            className="bg-surface border border-border rounded-xl p-4 sm:p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl">{sport.icon}</span>
                <div>
                  <h3 className="font-bold text-text text-base sm:text-lg">{sport.name}</h3>
                  <span className="text-xs sm:text-sm text-muted">{sport.matches} matches</span>
                </div>
              </div>
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border ${sport.color}`}>
                Live
              </span>
            </div>
            
            <div className="space-y-2 mb-3 sm:mb-4">
              {sport.leagues.slice(0, 3).map((league, index) => (
                <div key={index} className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0"></span>
                  <span className="text-muted truncate">{league}</span>
                </div>
              ))}
              {sport.leagues.length > 3 && (
                <div className="text-xs text-accent font-medium">
                  +{sport.leagues.length - 3} more leagues
                </div>
              )}
            </div>
            
            <div className="pt-3 border-t border-border/50">
              <button className="w-full px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors group-hover:scale-105">
                View Odds
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
