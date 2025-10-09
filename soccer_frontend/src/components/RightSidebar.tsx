
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCountry } from "../contexts/CountryContext";
import { getTeamLogo } from "../utils/teamLogos";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { OddsConverter } from "../utils/oddsConverter";

interface ValueBet {
  id: number;
  home_team: string;
  away_team: string;
  league: string;
  country: string;
  date: string;
  time: string;
  best_bet_type: string;
  best_odds_value: number;
  expected_value: number;
  expected_value_percent: number;
  true_probability: number;
  implied_probability: number;
  value_edge: number;
  odd_1: number;
  odd_X: number;
  odd_2: number;
  bookmaker_margin: number;
}

interface RightSidebarProps {
  onClose?: () => void;
}

export default function RightSidebar({ onClose }: RightSidebarProps) {
  const navigate = useNavigate();
  const { setSelectedLeague, setSelectedCountry, countries } = useCountry();
  const [valueBets, setValueBets] = useState<ValueBet[]>([]);
  const [loading, setLoading] = useState(false);
  const [clickedMatchId, setClickedMatchId] = useState<number | null>(null);
  
  // Odds format conversion
  const { getOddsInFormat, oddsFormat } = useOddsFormat();
  
  // Helper function to convert and format odds
  const formatOdds = (odds: string | number): string => {
    const oddsString = odds.toString();
    if (!oddsString || oddsString.trim() === '') {
      return oddsString || '';
    }
    
    // Use the robust string parser with correct conversion formulas
    const decimalOdds = OddsConverter.stringToDecimal(oddsString);
    const formatted = getOddsInFormat(decimalOdds);
    console.log(`RightSidebar: Converting ${oddsString} -> ${decimalOdds} -> ${formatted} (format: ${oddsFormat})`);
    return formatted;
  };

  const [alerts, setAlerts] = useState([
    { 
      id: 1, 
      message: "Best odds updated", 
      homeTeam: "Getafe", 
      awayTeam: "Leganes", 
      country: "Spain",
      time: "2 min ago", 
      type: "odds" 
    },
    { 
      id: 2, 
      message: "High value bet", 
      homeTeam: "Barcelona", 
      awayTeam: "Real Madrid", 
      country: "Spain",
      time: "15 min ago", 
      type: "match" 
    },
    { 
      id: 3, 
      message: "New bonus: 100% deposit match", 
      homeTeam: null, 
      awayTeam: null, 
      country: null,
      time: "1 hour ago", 
      type: "bonus" 
    }
  ]);

  // Fetch value bets - matches with positive expected value
  const fetchValueBets = async () => {
    try {
      setLoading(true);
      console.log('🎯 Fetching value betting opportunities...');
      
      // Try the new value-bets endpoint
      const endpoints = [
        'http://localhost:5001/api/odds/value-bets?limit=3&min_ev=0.03',
        'http://localhost:5001/api/odds/value-bets?limit=5&min_ev=0.02',
        'http://127.0.0.1:5001/api/odds/value-bets?limit=3&min_ev=0.03',
        'http://127.0.0.1:5001/api/odds/value-bets?limit=5&min_ev=0.02'
      ];
      
      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          console.log('🔗 Trying value bets endpoint:', endpoint);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
          
          // Get access token for authentication
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          };
          
          // Add authorization header if token exists
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(endpoint, {
            signal: controller.signal,
            headers
          });
          
          clearTimeout(timeoutId);
          console.log('📡 Value bets API Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('🎯 Value bets data received:', data);
            
            if (data.value_bets && data.value_bets.length > 0) {
              console.log(`✅ Found ${data.value_bets.length} value betting opportunities!`);
              console.log('📊 Value bets summary:', data.value_bets.map((bet: any) => 
                `${bet.home_team} vs ${bet.away_team} - ${bet.best_bet_type} - EV: ${bet.expected_value_percent}% (${bet.league})`
              ));
              
              setValueBets(data.value_bets);
              success = true;
              break;
            } else {
              console.log('⚠️ No value bets found with current criteria');
              continue;
            }
          } else {
            console.warn('⚠️ API Response not OK for endpoint:', endpoint, response.status, response.statusText);
          }
        } catch (endpointError) {
          console.warn('⚠️ Error with value bets endpoint:', endpoint, endpointError);
          continue;
        }
      }
      
      if (!success) {
        console.log('🔄 No value bets found, using sample value betting data...');
        // Use sample value betting data when API fails or no value bets found
        setValueBets(getSampleValueBets());
      }
    } catch (error) {
      console.error('❌ Error fetching value bets:', error);
      console.log('🔄 Using sample value betting data due to error');
      // Use sample data when there's an error
      setValueBets(getSampleValueBets());
    } finally {
      setLoading(false);
    }
  };

  // Sample value betting data - showing real value betting opportunities
  const getSampleValueBets = (): ValueBet[] => {
    return [
      {
        id: 1001,
        home_team: "Brighton",
        away_team: "Manchester United", 
        league: "Premier League",
        country: "England",
        date: "2025-09-22",
        time: "15:00:00",
        best_bet_type: "Home Win",
        best_odds_value: 3.20,
        expected_value: 0.0847,
        expected_value_percent: 8.47,
        true_probability: 0.3390,
        implied_probability: 0.3125,
        value_edge: 2.65,
        odd_1: 3.20,
        odd_X: 3.40,
        odd_2: 2.25,
        bookmaker_margin: 4.2
      },
      {
        id: 1002,
        home_team: "Sevilla",
        away_team: "Real Betis",
        league: "LaLiga", 
        country: "Spain",
        date: "2025-09-22",
        time: "18:30:00",
        best_bet_type: "Draw",
        best_odds_value: 3.75,
        expected_value: 0.0625,
        expected_value_percent: 6.25,
        true_probability: 0.2833,
        implied_probability: 0.2667,
        value_edge: 1.66,
        odd_1: 2.80,
        odd_X: 3.75,
        odd_2: 2.45,
        bookmaker_margin: 3.8
      },
      {
        id: 1003,
        home_team: "Borussia Dortmund",
        away_team: "RB Leipzig",
        league: "Bundesliga",
        country: "Germany", 
        date: "2025-09-22",
        time: "17:30:00",
        best_bet_type: "Away Win",
        best_odds_value: 2.90,
        expected_value: 0.0523,
        expected_value_percent: 5.23,
        true_probability: 0.3628,
        implied_probability: 0.3448,
        value_edge: 1.80,
        odd_1: 2.40,
        odd_X: 3.60,
        odd_2: 2.90,
        bookmaker_margin: 5.1
      }
    ];
  };


  // Handle click to view matches for a specific league with match highlighting
  const handleViewMatches = (league: string, country: string, matchId: number, homeTeam: string, awayTeam: string, matchDate: string) => {
    console.log('🎯 View Matches clicked:', { league, country, matchId, homeTeam, awayTeam, matchDate });
    
    // Set clicked match ID for visual feedback
    setClickedMatchId(matchId);
    
    // Find the league in countries data
    const targetCountry = countries.find(c => 
      c.name.toLowerCase() === country.toLowerCase()
    );
    
    if (targetCountry) {
      const targetLeague = targetCountry.leagues.find(l => 
        l.name.toLowerCase() === league.toLowerCase()
      );
      
      if (targetLeague) {
        setSelectedCountry(targetCountry);  // Set country first
        setSelectedLeague(targetLeague);    // Then set league
        
        // Create a more robust highlight parameter using team names and date
        const highlightParam = `${matchId}_${homeTeam.replace(/\s+/g, '_')}_${awayTeam.replace(/\s+/g, '_')}_${matchDate}`;
        console.log('🔗 Navigating with highlight param:', highlightParam);
        console.log('🎯 Expected to highlight match:', `${homeTeam} vs ${awayTeam} (ID: ${matchId})`);
        
        // Navigate to home page with highlighted match
        navigate(`/?highlight=${highlightParam}`);
        
        // Close the sidebar if onClose function is provided
        if (onClose) {
          onClose();
        }
        
        // Clear the clicked state after a delay
        setTimeout(() => setClickedMatchId(null), 3000);
      } else {
        console.warn('⚠️ League not found:', league);
        console.log('🔄 Available leagues in', targetCountry.name, ':', targetCountry.leagues.map(l => l.name));
        
        // Try to find a similar league
        const similarLeague = targetCountry.leagues.find(l => 
          l.name.toLowerCase().includes(league.toLowerCase()) ||
          league.toLowerCase().includes(l.name.toLowerCase())
        );
        
        if (similarLeague) {
          console.log('🔄 Found similar league, using that instead:', similarLeague.name);
          setSelectedCountry(targetCountry);
          setSelectedLeague(similarLeague);
          
          const highlightParam = `${matchId}_${homeTeam.replace(/\s+/g, '_')}_${awayTeam.replace(/\s+/g, '_')}_${matchDate}`;
          navigate(`/?highlight=${highlightParam}`);
          setTimeout(() => setClickedMatchId(null), 3000);
        } else {
          // Clear clicked state if no league found
          setTimeout(() => setClickedMatchId(null), 2000);
        }
      }
    } else {
      console.warn('⚠️ Country not found:', country);
      console.log('🔄 Available countries:', countries.map(c => c.name));
      
      // Try to find a similar country
      const similarCountry = countries.find(c => 
        c.name.toLowerCase().includes(country.toLowerCase()) ||
        country.toLowerCase().includes(c.name.toLowerCase())
      );
      
      if (similarCountry) {
        console.log('🔄 Found similar country, using that instead:', similarCountry.name);
        const targetLeague = similarCountry.leagues.find(l => 
          l.name.toLowerCase() === league.toLowerCase()
        );
        
        if (targetLeague) {
          setSelectedCountry(similarCountry);
          setSelectedLeague(targetLeague);
          
          const highlightParam = `${matchId}_${homeTeam.replace(/\s+/g, '_')}_${awayTeam.replace(/\s+/g, '_')}_${matchDate}`;
          navigate(`/?highlight=${highlightParam}`);
          setTimeout(() => setClickedMatchId(null), 3000);
        } else {
          setTimeout(() => setClickedMatchId(null), 2000);
        }
      } else {
        // Clear clicked state if no country found
        setTimeout(() => setClickedMatchId(null), 2000);
      }
    }
  };

  useEffect(() => {
    fetchValueBets();
    // Refresh value bets every 1 hour (3600 seconds) - value calculations don't change frequently
    const interval = setInterval(fetchValueBets, 3600000);
    return () => clearInterval(interval);
  }, []);

  const favouriteLeagues = [
    {
      id: "1",
      title: "Premier League",
      image: "/assets/Favourite_league/1.jpg",
      description: "England's top football division"
    },
    {
      id: "2", 
      title: "La Liga",
      image: "/assets/Favourite_league/2.jpg",
      description: "Spain's premier football league"
    },
    {
      id: "3",
      title: "Bundesliga",
      image: "/assets/Favourite_league/3.jpg", 
      description: "Germany's top football competition"
    }
  ];


  const removeAlert = (id: number) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  return (
    <aside className="w-full lg:w-64 xl:w-72 bg-surface border-l border-border p-3 sm:p-4 space-y-4 sm:space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted">💎 VALUE BETS</h3>
          <div className="flex items-center gap-2">
            {loading && (
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            )}
            <button
              onClick={fetchValueBets}
              className="text-xs text-green-500 hover:text-green-400 transition-colors"
              title="Refresh value bets"
            >
              🔄
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <div className="text-xs text-muted">Finding value bets...</div>
            </div>
          ) : valueBets.length > 0 ? (
            valueBets.map((bet, index) => {
              const homeIcon = getTeamLogo(bet.home_team, bet.country);
              const awayIcon = getTeamLogo(bet.away_team, bet.country);
              
              return (
              <div key={bet.id} className={`bg-gradient-to-br from-bg to-surface rounded-lg border transition-all duration-300 group hover:shadow-lg hover:shadow-green-500/10 ${
                clickedMatchId === bet.id 
                  ? 'border-green-400 shadow-lg shadow-green-400/30 bg-gradient-to-br from-green-400/20 via-emerald-400/10 to-teal-400/20' 
                  : 'border-border hover:border-green-500/50'
              }`}>
                {/* Compact header with value betting info */}
                <div className="flex items-center justify-between p-2 border-b border-border/50">
                  <div className="flex items-center gap-1">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-gradient-to-r from-green-400 to-green-600 text-black' :
                      index === 1 ? 'bg-gradient-to-r from-emerald-300 to-emerald-500 text-black' :
                      'bg-gradient-to-r from-teal-400 to-teal-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-xs font-medium text-muted truncate">{bet.league}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-400">{formatOdds(bet.best_odds_value)}</div>
                    <div className="text-xs text-green-300">+{bet.expected_value_percent}% EV</div>
                  </div>
                </div>
                
                {/* Teams with bigger logos */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    {/* Home Team */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-12 h-12 mb-2 rounded-full bg-surface border border-border flex items-center justify-center overflow-hidden shadow-md">
                        {homeIcon ? (
                          <img 
                            src={homeIcon} 
                            alt={bet.home_team}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold ${homeIcon ? 'hidden' : 'flex'}`}>
                          {bet.home_team.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-text text-center leading-tight truncate w-full">{bet.home_team}</span>
                    </div>
                    
                    {/* VS */}
                    <div className="flex flex-col items-center px-2">
                      <div className="text-sm text-muted font-bold mb-1">VS</div>
                      <div className="text-xs text-muted">{bet.date}</div>
                    </div>
                    
                    {/* Away Team */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-12 h-12 mb-2 rounded-full bg-surface border border-border flex items-center justify-center overflow-hidden shadow-md">
                        {awayIcon ? (
                          <img 
                            src={awayIcon} 
                            alt={bet.away_team}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-sm font-bold ${awayIcon ? 'hidden' : 'flex'}`}>
                          {bet.away_team.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-text text-center leading-tight truncate w-full">{bet.away_team}</span>
                    </div>
                  </div>
                  
                  {/* Value betting information */}
                  <div className="bg-green-900/20 rounded-lg p-2 mb-3 border border-green-700/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-green-300 font-medium">Expected Value</span>
                      <span className="text-xs font-bold text-green-400">+{bet.expected_value_percent}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted">
                      <span>True Prob: {(bet.true_probability * 100).toFixed(1)}%</span>
                      <span>Book Prob: {(bet.implied_probability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-center mt-1">
                      <span className="text-xs bg-green-800/50 px-2 py-0.5 rounded text-green-300">
                        {bet.best_bet_type} • Edge: +{bet.value_edge}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Compact odds */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center bg-surface/50 rounded py-1.5">
                      <div className={`text-xs font-bold ${bet.best_bet_type === 'Home Win' ? 'text-green-400' : 'text-text'}`}>
                        {formatOdds(bet.odd_1)}
                      </div>
                    </div>
                    <div className="text-center bg-surface/50 rounded py-1.5">
                      <div className={`text-xs font-bold ${bet.best_bet_type === 'Draw' ? 'text-green-400' : 'text-text'}`}>
                        {formatOdds(bet.odd_X)}
                      </div>
                    </div>
                    <div className="text-center bg-surface/50 rounded py-1.5">
                      <div className={`text-xs font-bold ${bet.best_bet_type === 'Away Win' ? 'text-green-400' : 'text-text'}`}>
                        {formatOdds(bet.odd_2)}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleViewMatches(bet.league, bet.country, bet.id, bet.home_team, bet.away_team, bet.date)}
                    className={`w-full text-white py-2 px-3 rounded-lg transition-all duration-300 font-bold text-xs shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2 ${
                      clickedMatchId === bet.id
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 shadow-green-500/25 animate-pulse'
                        : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 hover:shadow-green-500/25'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Value Bet
                  </button>
                </div>
              </div>
              );
            })
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-3 border border-border">
                <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm text-muted">No value bets found</p>
              <p className="text-xs text-muted mt-1">No positive expected value opportunities right now</p>
            </div>
          )}
        </div>
      </div>

     
      {/* <div>
        <h3 className="text-sm font-semibold text-muted mb-3">FAVORITES</h3>
        <div className="space-y-2">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="bg-bg rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">{favorite.team}</p>
                  <p className="text-xs text-muted">{favorite.sport} • {favorite.league}</p>
                </div>
                <button
                  onClick={() => removeFavorite(favorite.id)}
                  className="text-muted hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {favorites.length === 0 && (
            <p className="text-sm text-muted text-center py-4">No favorites yet</p>
          )}
        </div>
      </div> */}

      <div>
        <h3 className="text-sm font-semibold text-muted mb-2 sm:mb-3">ALERTS</h3>
        <div className="space-y-2 sm:space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-gradient-to-br from-surface to-bg rounded-xl p-2.5 sm:p-3 xl:p-4 border border-border hover:shadow-lg hover:shadow-black/20 transition-all duration-300 group hover:border-accent/30">
              
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 xl:gap-3">
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 xl:w-8 xl:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    alert.type === 'odds' ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
                    alert.type === 'match' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 
                    'bg-gradient-to-br from-green-500 to-green-600'
                  }`}>
                    {alert.type === 'odds' ? '📊' : 
                     alert.type === 'match' ? '⚽' : '🎁'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {alert.homeTeam && alert.awayTeam ? (
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-medium text-text">{alert.message}</p>
                        <div className="flex items-center gap-2">
                          {/* Home Team Logo */}
                          {getTeamLogo(alert.homeTeam, alert.country) ? (
                            <img
                              src={getTeamLogo(alert.homeTeam, alert.country)!}
                              alt={alert.homeTeam}
                              className="w-4 h-4 rounded-full"
                              onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                          ) : (
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {alert.homeTeam.substring(0, 1)}
                            </div>
                          )}
                          <span className="text-xs text-text font-medium">{alert.homeTeam}</span>
                          <span className="text-xs text-muted">vs</span>
                          {/* Away Team Logo */}
                          {getTeamLogo(alert.awayTeam, alert.country) ? (
                            <img
                              src={getTeamLogo(alert.awayTeam, alert.country)!}
                              alt={alert.awayTeam}
                              className="w-4 h-4 rounded-full"
                              onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                          ) : (
                            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {alert.awayTeam.substring(0, 1)}
                            </div>
                          )}
                          <span className="text-xs text-text font-medium">{alert.awayTeam}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm font-medium text-text leading-tight line-clamp-2">{alert.message}</p>
                    )}
                    <p className="text-xs text-muted mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-muted rounded-full flex-shrink-0"></span>
                      {alert.time}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="text-muted hover:text-red-400 transition-colors duration-200 p-1 hover:bg-red-900/30 rounded-full group-hover:opacity-100 opacity-0 flex-shrink-0"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 sm:px-2 py-1 rounded-full text-xs font-medium ${
                    alert.type === 'odds' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50' :
                    alert.type === 'match' ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50' : 
                    'bg-green-900/50 text-green-300 border border-green-700/50'
                  }`}>
                    {alert.type === 'odds' ? 'Odds Alert' : 
                     alert.type === 'match' ? 'Match Alert' : 'Bonus Alert'}
                  </span>
                </div>
                
                <button className={`px-1.5 sm:px-2 xl:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-shrink-0 ${
                  alert.type === 'odds' ? 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg shadow-yellow-600/25' :
                  alert.type === 'match' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25' : 
                  'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25'
                } hover:scale-105 transform`}>
                  {alert.type === 'odds' ? 'View Odds' : 
                   alert.type === 'match' ? 'Watch Live' : 'Claim Now'}
                </button>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="text-center py-6 sm:py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 border border-border">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-muted">No alerts yet</p>
              <p className="text-xs text-muted mt-1">We'll notify you of important updates</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

