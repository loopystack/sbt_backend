import React, { useState } from "react";
import { useCountry } from "../../contexts/CountryContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";

type Match = {
  id: string;
  time: string;
  status: "Live" | "Upcoming" | "Finished";
  teams: string;
  sport: string;
  league: string;
  bookmakers: {
    name: string;
    home: string;
    away: string;
    draw?: string;
    overUnder?: string;
  }[];
  date?: string;
  bookmakerCount?: number;
};

type Bookmaker = {
  name: string;
  home: string;
  away: string;
  draw?: string;
  overUnder?: string;
};

export default function OddsTable() {
  const { selectedCountry, selectedLeague } = useCountry();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [selectedMarket, setSelectedMarket] = useState("Match Winner");
  const [selectedOdds, setSelectedOdds] = useState<{
    matchId: string;
    type: 'home' | 'draw' | 'away';
    odds: string;
    teams: string;
    league: string;
  }[]>([]);
  const [showBetSlip, setShowBetSlip] = useState(false);
  const [animatingOdds, setAnimatingOdds] = useState<{
    matchId: string;
    type: 'home' | 'draw' | 'away';
    odds: string;
    teams: string;
    league: string;
    startPosition: { x: number; y: number };
  } | null>(null);
  const [selectedBetAmount, setSelectedBetAmount] = useState("0.0001");
  
  // Default matches when no country is selected
  const defaultMatches: Match[] = [
    {
      id: "1",
      time: "LIVE",
      status: "Live",
      teams: "Kansas City Chiefs vs Buffalo Bills",
      sport: "Football",
      league: "NFL",
      bookmakers: [
        { name: "Bet365", home: "+150", away: "-180", draw: undefined },
        { name: "DraftKings", home: "+155", away: "-175", draw: undefined },
        { name: "FanDuel", home: "+145", away: "-185", draw: undefined }
      ]
    },
    {
      id: "2",
      time: "19:30",
      status: "Upcoming",
      teams: "Lakers vs Warriors",
      sport: "Basketball",
      league: "NBA",
      bookmakers: [
        { name: "Bet365", home: "-110", away: "-110", draw: undefined },
        { name: "DraftKings", home: "-105", away: "-115", draw: undefined },
        { name: "FanDuel", home: "-108", away: "-112", draw: undefined }
      ]
    }
  ];

  // Get matches based on selected country
  const getMatches = (): Match[] => {
    if (selectedLeague && selectedLeague.matches.length > 0) {
      // Return matches from the selected league
      return selectedLeague.matches.map((match: any) => ({
        id: match.id,
        time: match.time,
        status: "Upcoming" as const,
        teams: `${match.team1} vs ${match.team2}`,
        sport: "Football",
        league: selectedLeague.name,
        bookmakers: [
          { name: "Bet365", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds },
          { name: "DraftKings", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds },
          { name: "FanDuel", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds }
        ],
        date: match.date,
        bookmakerCount: match.bookmakers
      }));
    }
    
    if (!selectedCountry) return defaultMatches;
    
    // Get all matches from all leagues of the selected country
    const allMatches: Match[] = selectedCountry.leagues.flatMap((league: any) => 
      league.matches.map((match: any) => ({
        id: match.id,
        time: match.time,
        status: "Upcoming" as const,
        teams: `${match.team1} vs ${match.team2}`,
        sport: "Football",
        league: league.name,
        bookmakers: [
          { name: "Bet365", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds },
          { name: "DraftKings", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds },
          { name: "FanDuel", home: match.homeOdds, away: match.awayOdds, draw: match.drawOdds }
        ],
        date: match.date,
        bookmakerCount: match.bookmakers
      }))
    );
    
    return allMatches;
  };

  const matches = getMatches();
  const markets = ["Match Winner", "Over/Under", "Handicap", "Both Teams Score"];

  // Group matches by date
  const groupMatchesByDate = (matches: Match[]) => {
    const grouped: { [key: string]: Match[] } = {};
    
    matches.forEach(match => {
      const date = match.date || 'No Date';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(match);
    });
    
    // Sort dates and return as array
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => {
        // Sort by date if available, otherwise keep original order
        if (dateA === 'No Date') return 1;
        if (dateB === 'No Date') return -1;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      })
      .map(([date, matches]) => ({ date, matches }));
  };

  const groupedMatches = groupMatchesByDate(matches);

  // Handle odds selection
  const handleOddsClick = (match: Match, type: 'home' | 'draw' | 'away', odds: string, event: React.MouseEvent) => {
    const selectedBet = {
      matchId: match.id,
      type,
      odds,
      teams: match.teams,
      league: match.league
    };
    
    // Get button position for animation
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const startPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    // Check if this odds is already selected
    const isAlreadySelected = selectedOdds.some(
      odds => odds.matchId === match.id && odds.type === type
    );
    
    if (isAlreadySelected) {
      // Remove from selection
      setSelectedOdds(prev => prev.filter(
        odds => !(odds.matchId === match.id && odds.type === type)
      ));
      if (selectedOdds.length === 1) {
        setShowBetSlip(false);
      }
    } else {
      // Add to selection with animation
      setAnimatingOdds({
        ...selectedBet,
        startPosition
      });
      
      // Add to selected odds after animation
      setTimeout(() => {
        setSelectedOdds(prev => [...prev, selectedBet]);
        setAnimatingOdds(null);
        setShowBetSlip(true);
      }, 300);
    }
  };

  // Check if odds is selected
  const isOddsSelected = (matchId: string, type: 'home' | 'draw' | 'away') => {
    return selectedOdds.some(odds => odds.matchId === matchId && odds.type === type);
  };

  // Handle bet amount selection
  const handleBetAmountClick = (amount: string) => {
    setSelectedBetAmount(amount);
  };

  // Theme-aware color functions
  const getDateColor = () => theme === 'light' ? 'text-blue-600' : 'text-blue-400';
  const getTeamColor = () => theme === 'light' ? 'text-green-700' : 'text-green-300';
  const getLeagueColor = () => theme === 'light' ? 'text-amber-700' : 'text-yellow-400';
  const getTimeColor = () => theme === 'light' ? 'text-cyan-700' : 'text-cyan-300';
  const getHomeOddsColor = () => theme === 'light' ? 'text-orange-700' : 'text-orange-300';
  const getAwayOddsColor = () => theme === 'light' ? 'text-pink-700' : 'text-pink-300';
  const getDrawOddsColor = () => theme === 'light' ? 'text-emerald-700' : 'text-emerald-300';
  const getBookmakerColor = () => theme === 'light' ? 'text-purple-700' : 'text-purple-300';

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live": return "text-red-400 bg-red-500/20 border-red-500/30";
      case "Upcoming": return "text-blue-400 bg-blue-500/20 border-blue-500/30";
      case "Finished": return "text-muted bg-muted/20 border-muted/30";
      default: return "text-muted bg-muted/20 border-muted/30";
    }
  };

    return (
    <section>
      {/* Breadcrumbs */}
      {selectedLeague && (
        <div className="text-sm text-muted mb-4 px-2">
          Home {'>'} Football {'>'} {selectedCountry?.name} {'>'} {selectedLeague.name}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0 px-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text">
            {selectedLeague ? `${selectedLeague.name} Betting Odds & Fixtures` : selectedCountry ? `${selectedCountry.name} - ${selectedCountry.leagues[0]?.name || 'Football'}` : 'Live Matches & Odds'}
          </h2>
          {selectedLeague ? (
            <p className="text-sm text-muted mt-1">
              {selectedLeague.matchCount} matches
            </p>
          ) : selectedCountry && (
            <p className="text-sm text-muted mt-1">
              {selectedCountry.leagues.length} leagues • {selectedCountry.leagues.reduce((total, league) => total + league.matchCount, 0)} matches
            </p>
          )}
        </div>
        
        {/* Market Selector */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {markets.map((market) => (
            <button
              key={market}
              onClick={() => setSelectedMarket(market)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                selectedMarket === market
                  ? "bg-accent text-white shadow-lg"
                  : "bg-surface text-muted hover:text-text hover:bg-surface/80 border border-border"
              }`}
            >
              {market}
            </button>
          ))}
        </div>
      </div>

                           {/* Grid Layout - All Screen Sizes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groupedMatches.map(({ date, matches }) => 
            matches.map((match: Match) => (
              <div key={match.id} className="bg-surface border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200">
                {/* Competition Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-text truncate">{match.league}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted">{match.date}</div>
                    <div className="text-xs text-muted">{match.time}</div>
                  </div>
                </div>
                
                {/* Teams */}
                <div className="mb-4">
                  <div className="text-sm font-semibold text-text leading-tight">
                    {match.teams}
                  </div>
                </div>
                
                {/* Odds Section */}
                <div className="border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted">1x2</span>
                    <button className="text-xs text-muted hover:text-text">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                                     {/* Odds Row */}
                   <div className="grid grid-cols-3 gap-2">
                     <div className="text-center">
                       <div className="text-xs text-muted mb-1">1</div>
                                               <button 
                          className={`w-full py-2 px-1 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                            isOddsSelected(match.id, 'home') 
                              ? 'bg-yellow-500 text-black border-yellow-500' 
                              : 'bg-transparent text-text border-border hover:bg-bg/50 hover:border-border/80'
                          }`}
                          onClick={(e) => handleOddsClick(match, 'home', match.bookmakers[0]?.home || '-', e)}
                        >
                          {match.bookmakers[0]?.home || '-'}
                        </button>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted mb-1">X</div>
                        <button 
                          className={`w-full py-2 px-1 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                            isOddsSelected(match.id, 'draw') 
                              ? 'bg-yellow-500 text-black border-yellow-500' 
                              : 'bg-transparent text-text border-border hover:bg-bg/50 hover:border-border/80'
                          }`}
                          onClick={(e) => handleOddsClick(match, 'draw', match.bookmakers[0]?.draw || '-', e)}
                        >
                          {match.bookmakers[0]?.draw || '-'}
                        </button>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted mb-1">2</div>
                        <button 
                          className={`w-full py-2 px-1 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                            isOddsSelected(match.id, 'away') 
                              ? 'bg-yellow-500 text-black border-yellow-500' 
                              : 'bg-transparent text-text border-border hover:bg-bg/50 hover:border-border/80'
                          }`}
                          onClick={(e) => handleOddsClick(match, 'away', match.bookmakers[0]?.away || '-', e)}
                        >
                          {match.bookmakers[0]?.away || '-'}
                        </button>
                     </div>
                   </div>
                </div>
              </div>
            ))
          )}
                </div>

      {/* Animated Yellow Circle */}
      {animatingOdds && (
        <div 
          className="fixed w-4 h-4 bg-yellow-500 rounded-full z-50 pointer-events-none"
          style={{
            left: animatingOdds.startPosition.x - 8,
            top: animatingOdds.startPosition.y - 8,
            animation: 'circleToDialog 0.3s ease-out forwards'
          }}
        />
      )}

            {/* Betting Slip Dialog */}
      {showBetSlip && selectedOdds.length > 0 && (
        <div 
          className="fixed bottom-4 right-4 w-80 bg-surface border border-border rounded-xl shadow-2xl z-50"
          style={{
            animation: 'slideUp 0.3s ease-out',
            transform: 'translateY(0)',
            opacity: '1'
          }}
        >
          {/* Header */}
          <div className="bg-yellow-500 text-black px-4 py-3 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Betslip</span>
              <div className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">
                {selectedOdds.length}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">QUICK BET</span>
              <div className="w-8 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button className="flex-1 py-2 text-sm font-medium text-muted">Single</button>
            <button className="flex-1 py-2 text-sm font-medium text-yellow-500 border-b-2 border-yellow-500">Combo</button>
            <button className="flex-1 py-2 text-sm font-medium text-muted">System</button>
          </div>

          {/* Selected Bet Cards */}
          <div className="p-4 max-h-[600px] overflow-y-auto betting-slip-scroll">
            {selectedOdds.map((odds, index) => (
              <div key={`${odds.matchId}-${odds.type}`} className="bg-surface border border-border rounded-lg p-3 mb-4">
                <div className="flex items-start gap-3">
                  <button 
                    className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-400 transition-colors"
                    onClick={() => {
                      setSelectedOdds(prev => prev.filter(
                        item => !(item.matchId === odds.matchId && item.type === odds.type)
                      ));
                      if (selectedOdds.length === 1) {
                        setShowBetSlip(false);
                      }
                    }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-text">
                        {odds.type === 'home' ? odds.teams.split(' vs ')[0] : 
                         odds.type === 'away' ? odds.teams.split(' vs ')[1] : 'Draw'}
                      </span>
                    </div>
                    <div className="text-xs text-muted mb-1">{odds.teams}</div>
                    <div className="text-xs text-muted mb-2">1x2</div>
                                         <div className="flex items-center justify-between">
                       <span className="text-lg font-bold text-text">{odds.odds}</span>
                       <input 
                         type="text" 
                         className="w-20 px-2 py-1 bg-bg border border-border rounded text-sm text-text"
                         placeholder="0.0001"
                         value={selectedBetAmount}
                         onChange={(e) => setSelectedBetAmount(e.target.value)}
                       />
                     </div>
                  </div>
                </div>
              </div>
            ))}

                         {/* Quick Bet Amounts */}
             <div className="flex gap-2 mb-4">
               <button 
                 className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                   selectedBetAmount === "0.0001" 
                     ? "bg-yellow-500 text-black" 
                     : "bg-surface border border-border text-text hover:bg-bg/50"
                 }`}
                 onClick={() => handleBetAmountClick("0.0001")}
               >
                 0.0001
               </button>
               <button 
                 className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                   selectedBetAmount === "0.0002" 
                     ? "bg-yellow-500 text-black" 
                     : "bg-surface border border-border text-text hover:bg-bg/50"
                 }`}
                 onClick={() => handleBetAmountClick("0.0002")}
               >
                 0.0002
               </button>
               <button 
                 className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                   selectedBetAmount === "0.0005" 
                     ? "bg-yellow-500 text-black" 
                     : "bg-surface border border-border text-text hover:bg-bg/50"
                 }`}
                 onClick={() => handleBetAmountClick("0.0005")}
               >
                 0.0005
               </button>
             </div>

                         {/* Bet Summary */}
             <div className="space-y-2 mb-4">
               <div className="flex justify-between text-sm">
                 <span className="text-muted">Total Odds</span>
                 <span className="text-text">10.26</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-muted">Total Bet</span>
                 <span className="text-text">{selectedBetAmount} B</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-muted">POTENTIAL WIN</span>
                 <span className="text-text">{(parseFloat(selectedBetAmount) * 10.26).toFixed(6)} B</span>
               </div>
             </div>

            {/* Login Prompt */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-bg/50 rounded-lg">
              <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm text-muted">Please, login to place bet</span>
            </div>

                               {/* Action Buttons */}
                   <div className="flex gap-2 mb-3">
                     <button className="flex-1 py-3 bg-surface border border-border text-text rounded-lg text-sm font-medium">SHARE</button>
                     <button 
                       className="flex-1 py-3 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors"
                       onClick={() => navigate("/signin")}
                     >
                       LOGIN
                     </button>
                   </div>

                               {/* Account Link */}
                   <div className="text-center mb-3">
                     <span className="text-xs text-muted">Don't you have an account? </span>
                     <button 
                       className="text-xs text-yellow-500 hover:underline font-medium"
                       onClick={() => navigate("/signin")}
                     >
                       Join Now!
                     </button>
                   </div>

            {/* Bottom Icons */}
            <div className="flex items-center justify-center gap-4 text-muted">
              <button className="flex items-center gap-1 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button className="flex items-center gap-1 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Odds Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
  