import React, { useState } from "react";
import { openBettingSiteByName } from "../config/bettingSites";
import { getTeamIcon } from "../utils/teamIcons";
import { useCountry } from "../contexts/CountryContext";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { OddsConverter } from "../utils/oddsConverter";
import OddsTable from "../components/OddsTable";

const formatScore = (score: string): string => {
  if (!score || score === "" || score === "-") return "-";
  
  if (score.includes(':')) {
    const parts = score.split(':');
    if (parts.length === 2) {
      const homeScore = parts[0].replace(/^0+/, ''); 
      const awayScore = parts[1].replace(/^0+/, ''); 
      
      if (!homeScore && !awayScore) return "0-0";
      
      return `${homeScore || '0'}-${awayScore || '0'}`;
    }
  }
  
  return score;
};

export default function InPlayOdds() {
  const { selectedLeague } = useCountry();
  const [selectedSport, setSelectedSport] = useState("All sports");
  const [selectedView, setSelectedView] = useState("live");
  
  // Odds format conversion
  const { getOddsInFormat, oddsFormat } = useOddsFormat();
  
  // Helper function to convert and format odds
  const formatOdds = (odds: string): string => {
    if (!odds || odds.trim() === '') {
      return odds || '';
    }
    
    // Use the robust string parser with correct conversion formulas
    const decimalOdds = OddsConverter.stringToDecimal(odds);
    const formatted = getOddsInFormat(decimalOdds);
    console.log(`InPlayOdds: Converting ${odds} -> ${decimalOdds} -> ${formatted} (format: ${oddsFormat})`);
    return formatted;
  };

  const sports = [
    { name: "All sports", icon: "🏆" },
    { name: "Football", icon: "⚽" },
    { name: "Basketball", icon: "🏀" },
    { name: "Tennis", icon: "🎾" },
    { name: "Baseball", icon: "⚾" }
  ];

  const viewTabs = [
    { id: "live", label: "LIVE Now" },
    { id: "scheduled", label: "Scheduled" }
  ];

  const liveMatches = [
    {
      id: "1",
      sport: "Tennis",
      country: "Indonesia",
      league: "ITF M25 Bali 4 Men (hard)",
      status: "3S",
      player1: "Rai A.",
      player2: "Dellavedova M.",
      score: "1:1",
      odds1: "23/25",
      odds2: "43/50",
      bookmakers: 2,
      hasInfo: true
    },
    {
      id: "2",
      sport: "Tennis",
      country: "Indonesia",
      league: "ITF M25 Bali 4 Men (hard)",
      status: "2S",
      player1: "Zhang T.",
      player2: "Hazawa S.",
      score: "1:0",
      odds1: "117/100",
      odds2: "69/100",
      bookmakers: 1,
      hasInfo: false
    },
    {
      id: "3",
      sport: "Tennis",
      country: "Indonesia",
      league: "ITF M25 Bali 4 Men (hard)",
      status: "9I",
      player1: "Shin S.",
      player2: "Wang X.",
      score: "6:9",
      odds1: "6/25",
      odds2: "43/50",
      bookmakers: 2,
      hasInfo: true
    },
    {
      id: "4",
      sport: "Tennis",
      country: "Indonesia",
      league: "ITF M25 Bali 4 Men (hard)",
      status: "8I",
      player1: "Laguna",
      player2: "Toros de Tijuana",
      score: "6:7",
      odds1: "117/100",
      odds2: "69/100",
      bookmakers: 1,
      hasInfo: false
    },
    {
      id: "5",
      sport: "Baseball",
      country: "Mexico",
      league: "Liga Mexicana de Beisbol",
      status: "Live",
      player1: "Jalisco",
      player2: "Monterrey",
      score: "3:2",
      odds1: "2/5",
      odds2: "7/4",
      bookmakers: 3,
      hasInfo: true
    }
  ];

  const getStatusColor = (status: string) => {
    if (status.includes('S') || status.includes('I')) {
      return "bg-red-500 text-white";
    }
    return "bg-green-500 text-white";
  };

  const getStatusText = (status: string) => {
    if (status.includes('S')) {
      return `Set ${status.replace('S', '')}`;
    }
    if (status.includes('I')) {
      return `Inning ${status.replace('I', '')}`;
    }
    return status;
  };

  // If a league is selected, show the OddsTable (same as Home page)
  if (selectedLeague) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <OddsTable />
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-slate-900 border border-cyan-400/50 rounded-lg p-4 text-white shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg text-cyan-100 mb-1 sm:mb-2">BETINASIA</h3>
                <p className="text-xs sm:text-sm text-cyan-200/60 mb-1 sm:mb-2">Premium Sportsbook</p>
                <p className="text-xs sm:text-sm text-cyan-200/80">100% Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BETINASIA")}
                className="w-full bg-cyan-500 text-slate-900 px-3 py-1.5 rounded-lg font-semibold hover:bg-cyan-400 transition-all duration-300 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-400/50 rounded-lg p-4 text-white shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg text-emerald-100 mb-1 sm:mb-2">bets.io</h3>
                <p className="text-xs sm:text-sm text-emerald-200/60 mb-1 sm:mb-2">Crypto Sportsbook</p>
                <p className="text-xs sm:text-sm text-emerald-200/80">Sport Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bets.io")}
                className="w-full bg-emerald-500 text-slate-900 px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-400 transition-all duration-300 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-blue-400/50 rounded-lg p-4 text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg text-blue-100 mb-1 sm:mb-2">bet-at-home</h3>
                <p className="text-xs sm:text-sm text-blue-200/60 mb-1 sm:mb-2">European Leader</p>
                <p className="text-xs sm:text-sm text-blue-200/80">300€ Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet-at-home")}
                className="w-full bg-blue-500 text-slate-900 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-400 transition-all duration-300 text-xs"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted">
        Home &gt; In-Play Odds
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text">
          Live Betting Odds and Scores
        </h1>
        <p className="text-muted text-sm max-w-4xl leading-relaxed">
          This page lists in-play (LIVE now) matches from top bookmakers. The odds displayed are 
          current average/highest across all bookmakers, providing you with real-time betting 
          opportunities as matches unfold.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {sports.map((sport) => (
          <button
            key={sport.name}
            onClick={() => setSelectedSport(sport.name)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition-colors duration-200 ${
              selectedSport === sport.name
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent hover:bg-bg"
            }`}
          >
            <span className="text-lg">{sport.icon}</span>
            <span className="font-medium">{sport.name}</span>
          </button>
        ))}
        
        <button className="flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition-colors duration-200 text-muted hover:text-text hover:bg-bg">
          <span className="font-medium">More</span>
          <span className="text-lg">⌄</span>
        </button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {viewTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedView(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors duration-200 ${
              selectedView === tab.id
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border border-border rounded-lg">
        <div className="col-span-1 text-sm font-medium text-muted text-center">Status</div>
        <div className="col-span-4 text-sm font-medium text-muted">Match</div>
        <div className="col-span-2 text-sm font-medium text-muted text-center">Score</div>
        <div className="col-span-2 text-sm font-medium text-muted text-center">1</div>
        <div className="col-span-2 text-sm font-medium text-muted text-center">2</div>
        <div className="col-span-1 text-sm font-medium text-muted text-center">B's</div>
      </div>

      <div className="space-y-6">
        {Object.entries(liveMatches.reduce((groups, match) => {
          const key = `${match.sport} / ${match.country} / ${match.league}`;
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(match);
          return groups;
        }, {} as Record<string, typeof liveMatches>)).map(([key, group]) => (
          <div key={key} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>{key.includes('Tennis') ? '🎾' : key.includes('Baseball') ? '⚾' : '🏆'}</span>
              <span>{key}</span>
            </div>
            {group.map((match) => (
              <div key={match.id} className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1 text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mx-auto ${getStatusColor(match.status)}`}>
                      {match.status}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {getStatusText(match.status)}
                    </div>
                  </div>

                  <div className="col-span-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🇮🇩</span>
                        {getTeamIcon(match.player1) && (
                          <img 
                            src={getTeamIcon(match.player1)!}
                            alt={`${match.player1} icon`}
                            className="w-4 h-4"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <span className="font-medium text-text">{match.player1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🇯🇵</span>
                        {getTeamIcon(match.player2) && (
                          <img 
                            src={getTeamIcon(match.player2)!}
                            alt={`${match.player2} icon`}
                            className="w-4 h-4"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <span className="font-medium text-text">{match.player2}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 text-center">
                    <div className="text-lg font-bold text-text">{formatScore(match.score)}</div>
                  </div>

                  <div className="col-span-2 text-center">
                    <div className="text-sm font-medium text-text">{formatOdds(match.odds1)}</div>
                  </div>

                  <div className="col-span-2 text-center">
                    <div className="text-sm font-medium text-text">{formatOdds(match.odds2)}</div>
                  </div>

                  <div className="col-span-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm text-muted">{match.bookmakers}</span>
                      {match.hasInfo && (
                        <button className="w-4 h-4 bg-muted rounded-full flex items-center justify-center hover:bg-accent transition-colors">
                          <span className="text-xs text-text">i</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Live Betting Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-text">Real-Time Updates</h4>
            <p className="text-sm text-muted leading-relaxed">
              All odds and scores are updated in real-time as matches progress. Live betting 
              allows you to place bets while matches are ongoing, taking advantage of changing 
              game situations.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-text">Status Indicators</h4>
            <p className="text-sm text-muted leading-relaxed">
              Status indicators show the current progress of matches (e.g., "3S" for Set 3 in 
              tennis, "9I" for Inning 9 in baseball). This helps you understand the current 
              stage of play when making live bets.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
