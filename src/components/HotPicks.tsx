import React from "react";

export default function HotPicks() {
  const hotPicks = [
    {
      id: 1,
      teams: "Kansas City Chiefs vs Buffalo Bills",
      sport: "Football",
      league: "NFL",
      odds: "+150",
      confidence: "High",
      tip: "Chiefs at home with Mahomes healthy",
      time: "20:00",
      date: "Today"
    },
    {
      id: 2,
      teams: "Lakers vs Warriors",
      sport: "Basketball",
      league: "NBA",
      odds: "-110",
      confidence: "Medium",
      tip: "Lakers coming off big win",
      time: "19:30",
      date: "Today"
    },
    {
      id: 3,
      teams: "Djokovic vs Medvedev",
      sport: "Tennis",
      league: "Grand Slam",
      odds: "+200",
      confidence: "High",
      tip: "Djokovic on hard court",
      time: "20:00",
      date: "Today"
    },
    {
      id: 4,
      teams: "Yankees vs Red Sox",
      sport: "Baseball",
      league: "MLB",
      odds: "-120",
      confidence: "Medium",
      tip: "Yankees strong pitching",
      time: "21:00",
      date: "Today"
    },
    {
      id: 5,
      teams: "Manchester City vs Arsenal",
      sport: "Soccer",
      league: "Premier League",
      odds: "+180",
      confidence: "High",
      tip: "City at home advantage",
      time: "15:00",
      date: "Tomorrow"
    }
  ];

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text">Hot Picks</h2>
        <button className="text-accent hover:text-accent/80 text-sm font-medium">
          View All →
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {hotPicks.map((pick) => (
          <div
            key={pick.id}
            className="bg-surface border border-border rounded-xl p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-200 group"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-accent rounded-full"></span>
                <span className="text-xs font-medium text-muted uppercase tracking-wide">
                  {pick.sport}
                </span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                pick.confidence === 'High' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                pick.confidence === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {pick.confidence}
              </span>
            </div>
            
            {/* Teams */}
            <h3 className="font-bold text-text mb-3 text-lg leading-tight">
              {pick.teams}
            </h3>
            
            {/* League & Time */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted">{pick.league}</span>
              <div className="text-right">
                <div className="text-sm text-muted">{pick.date}</div>
                <div className="text-lg font-bold text-accent">{pick.time}</div>
              </div>
            </div>
            
            {/* Odds & Action */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <span className="text-xs text-muted block">Best Odds</span>
                <span className="text-2xl font-bold text-accent">{pick.odds}</span>
              </div>
              <button className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors group-hover:scale-105">
                Compare Odds
              </button>
            </div>
            
            {/* Tip */}
            <div className="pt-3 border-t border-border/50">
              <p className="text-sm text-muted italic flex items-start gap-2">
                <span className="text-accent text-lg">💡</span>
                {pick.tip}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
