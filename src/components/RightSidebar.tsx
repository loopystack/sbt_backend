
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCountry } from "../contexts/CountryContext";
import { getTeamIcon } from "../utils/teamIcons";

interface BestOdd {
  id: number;
  home_team: string;
  away_team: string;
  league: string;
  country: string;
  date: string;
  time: string;
  best_bet_type: string;
  best_odds_value: number;
  odd_1: number;
  odd_X: number;
  odd_2: number;
}

export default function RightSidebar() {
  const navigate = useNavigate();
  const { setSelectedLeague, setSelectedCountry, countries } = useCountry();
  const [bestOdds, setBestOdds] = useState<BestOdd[]>([]);
  const [loading, setLoading] = useState(false);

  const [alerts, setAlerts] = useState([
    { id: 1, message: "Best odds updated: Getafe vs Leganes", time: "2 min ago", type: "odds" },
    { id: 2, message: "High value bet: LaLiga matches", time: "15 min ago", type: "match" },
    { id: 3, message: "New bonus: 100% deposit match", time: "1 hour ago", type: "bonus" }
  ]);

  // Fetch best odds from API
  const fetchBestOdds = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/odds/best-odds?limit=3');
      if (response.ok) {
        const data = await response.json();
        setBestOdds(data.best_odds);
      }
    } catch (error) {
      console.error('Error fetching best odds:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle click to view matches for a specific league with match highlighting
  const handleViewMatches = (league: string, country: string, matchId: number) => {
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
        // Navigate to home page with highlighted match ID
        navigate(`/?highlight=${matchId}`);
      }
    }
  };

  useEffect(() => {
    fetchBestOdds();
    // Refresh best odds every 30 seconds
    const interval = setInterval(fetchBestOdds, 30000);
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
          <h3 className="text-sm font-semibold text-muted">🔥 BEST ODDS</h3>
          {loading && (
            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
        
        <div className="space-y-2">
          {bestOdds.length > 0 ? (
            bestOdds.map((odd, index) => {
              const homeIcon = getTeamIcon(odd.home_team, odd.country);
              const awayIcon = getTeamIcon(odd.away_team, odd.country);
              
              return (
              <div key={odd.id} className="bg-gradient-to-br from-bg to-surface rounded-lg border border-border hover:border-yellow-500/50 transition-all duration-300 group hover:shadow-lg hover:shadow-yellow-500/10">
                {/* Compact header */}
                <div className="flex items-center justify-between p-2 border-b border-border/50">
                  <div className="flex items-center gap-1">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' :
                      index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-black' :
                      'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-xs font-medium text-muted truncate">{odd.league}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-yellow-400">{odd.best_odds_value}</div>
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
                            alt={odd.home_team}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold ${homeIcon ? 'hidden' : 'flex'}`}>
                          {odd.home_team.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-text text-center leading-tight truncate w-full">{odd.home_team}</span>
                    </div>
                    
                    {/* VS */}
                    <div className="flex flex-col items-center px-2">
                      <div className="text-sm text-muted font-bold mb-1">VS</div>
                      <div className="text-xs text-muted">{odd.date}</div>
                    </div>
                    
                    {/* Away Team */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-12 h-12 mb-2 rounded-full bg-surface border border-border flex items-center justify-center overflow-hidden shadow-md">
                        {awayIcon ? (
                          <img 
                            src={awayIcon} 
                            alt={odd.away_team}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-sm font-bold ${awayIcon ? 'hidden' : 'flex'}`}>
                          {odd.away_team.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-text text-center leading-tight truncate w-full">{odd.away_team}</span>
                    </div>
                  </div>
                  
                  {/* Compact odds */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center bg-surface/50 rounded py-1.5">
                      <div className={`text-xs font-bold ${odd.best_bet_type === 'Home Win' ? 'text-yellow-400' : 'text-text'}`}>
                        {odd.odd_1}
                      </div>
                    </div>
                    <div className="text-center bg-surface/50 rounded py-1.5">
                      <div className={`text-xs font-bold ${odd.best_bet_type === 'Draw' ? 'text-yellow-400' : 'text-text'}`}>
                        {odd.odd_X}
                      </div>
                    </div>
                    <div className="text-center bg-surface/50 rounded py-1.5">
                      <div className={`text-xs font-bold ${odd.best_bet_type === 'Away Win' ? 'text-yellow-400' : 'text-text'}`}>
                        {odd.odd_2}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleViewMatches(odd.league, odd.country, odd.id)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 px-3 rounded-lg transition-all duration-300 font-bold text-xs shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Matches
                  </button>
                </div>
              </div>
              );
            })
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-3 border border-border">
                <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-sm text-muted">Loading best odds...</p>
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
                    <p className="text-xs sm:text-sm font-medium text-text leading-tight line-clamp-2">{alert.message}</p>
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
