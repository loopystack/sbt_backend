
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCountry } from "../contexts/CountryContext";
import { useAppDispatch } from "../store/hooks";
import { getMatchingInfoAction } from "../store/matchinginfo/actions";
import { MatchingInfo } from "../store/matchinginfo/types";

interface LeftSidebarProps {
  onClose?: () => void;
}

export default function LeftSidebar({ onClose }: LeftSidebarProps) {
  const { selectedCountry, setSelectedCountry, selectedLeague, setSelectedLeague, countries, loading } = useCountry();
  const [expandedCountries, setExpandedCountries] = useState<string[]>([]);
  const [expandedSports, setExpandedSports] = useState<string[]>(["Football"]);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [matchingInfo, setMatchingInfo] = useState<MatchingInfo[]>([]);
  const [leagueMatchCounts, setLeagueMatchCounts] = useState<Record<string, number>>({});
  
  const fetchMatchingInfo = useCallback(async () => {
    try {
      const params = { 
        page: 1, 
        size: 100  // Reduced for better performance
      };
      
      const result = await dispatch(getMatchingInfoAction(params)).unwrap();
      setMatchingInfo(result.odds);
      
      
      const counts: Record<string, number> = {};
      const now = new Date();
      
      result.odds.forEach((match: MatchingInfo) => {
        const matchDate = new Date(match.date + 'T00:00:00');
        const isUpcoming = matchDate.getTime() >= now.getTime();
        
        if (isUpcoming) {
          const leagueName = `${match.country} League`;
          counts[leagueName] = (counts[leagueName] || 0) + 1;
        }
      });
      
      setLeagueMatchCounts(counts);
    } catch (error) {
      console.error("Error fetching matching info:", error);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchMatchingInfo();
  }, [fetchMatchingInfo]);

  const getFlagUrl = (flagCode: string) => {
    try {
      return new URL(`../assets/flags/${flagCode}.svg`, import.meta.url).href;
    } catch {
      return '';
    }
  };

  const toggleCountryExpansion = (countryName: string) => {
    setExpandedCountries(prev => 
      prev.includes(countryName) 
        ? prev.filter(name => name !== countryName)
        : [...prev, countryName]
    );
  };

  const toggleSportExpansion = (sportName: string) => {
    setExpandedSports(prev => 
      prev.includes(sportName) 
        ? prev.filter(name => name !== sportName)
        : [...prev, sportName]
    );
  };

  const handleCountryClick = (country: any) => {
    toggleCountryExpansion(country.name);
  };

  const handleSportClick = (sportName: string) => {
    toggleSportExpansion(sportName);
  };

  const handleLeagueClick = (league: any, country: any) => {
    console.log(`🏆 League clicked: ${country.name} ${league.name}`);
    setSelectedCountry(country);  // Set the country first
    setSelectedLeague(league);    // Then set the league
    
    // Navigate to homepage to show the league matches
    navigate('/');
    
    // Close the sidebar if onClose function is provided
    if (onClose) {
      onClose();
    }
  };

  if (loading) {
    return (
      <aside className="w-64 xl:w-72 bg-surface px-2 py-4 space-y-4 h-full">
        {/* Football Section Skeleton */}
        <div>
          <div className="h-4 bg-muted/20 rounded w-20 mb-3 animate-pulse"></div>
          
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="space-y-1 animate-pulse">
                <div className="w-full px-3 py-2 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-4 bg-muted/20 rounded"></div>
                    <div className="h-4 bg-muted/15 rounded w-24"></div>
                  </div>
                  <div className="w-2 h-2 bg-muted/15 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other Sports Sections Skeleton */}
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full px-2 py-2 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-4 bg-muted/20 rounded"></div>
                  <div className="h-4 bg-muted/15 rounded w-20"></div>
                </div>
                <div className="w-2 h-2 bg-muted/15 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 xl:w-72 bg-surface px-2 py-4 space-y-4">
      
      {/* Football Section */}
      <div>
        <button
          onClick={() => handleSportClick("Football")}
          className="w-full text-left px-2 py-2 rounded-lg text-sm transition-colors flex items-center justify-between hover:bg-white/5 text-text hover:text-text mb-3 pr-1"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">⚽</span>
            <span className="font-semibold">FOOTBALL</span>
          </div>
          <span 
            className={`text-[10px] transition-transform duration-200 ${
              expandedSports.includes("Football") ? 'rotate-90' : ''
            }`}
          >
            ▶
          </span>
        </button>
        
        {expandedSports.includes("Football") && (
          <div className="space-y-1 max-h-100 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {countries.map((country) => (
              <div key={country.name} className="space-y-1">
                <button
                  onClick={() => handleCountryClick(country)}
                  className={`w-[calc(100%-2rem)] ml-4 text-left px-2 py-2 rounded-lg text-sm transition-colors flex items-center justify-between hover:bg-white/5 text-text hover:text-text pr-1`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={getFlagUrl(country.flag)}
                      alt={`${country.name} flag`}
                      className="w-5 h-4 object-contain flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = document.createElement('span');
                        fallback.textContent = '🏳️';
                        fallback.className = 'text-lg';
                        e.currentTarget.parentNode?.insertBefore(fallback, e.currentTarget);
                      }}
                    />
                    <span className="truncate">{country.name}</span>
                  </div>
                  <span 
                    className={`text-[10px] transition-transform duration-200 ${
                      expandedCountries.includes(country.name) ? 'rotate-90' : ''
                    }`}
                  >
                    ▶
                  </span>
                </button>
                
                {expandedCountries.includes(country.name) && (
                  <div className="ml-6 mr-4 space-y-1">
                    {country.leagues.map((league) => (
                      <button
                        key={league.name}
                        onClick={() => handleLeagueClick(league, country)} 
                        className={`w-[calc(100%-1rem)] text-left px-2 py-1 rounded text-xs transition-colors hover:bg-white/5 ${
                          selectedLeague?.name === league.name && selectedCountry?.name === country.name
                            ? "bg-green-500/20 text-green-600 border border-green-500/30"
                            : "text-muted hover:text-text"
                        }`}
                      >
                        <span className="truncate text-xs">{league.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Other Sports Sections */}
      <div className="space-y-2">
        {[
          { name: "Tennis", icon: "🎾", leagues: ["ATP Tour", "WTA Tour", "Grand Slams", "Challenger"] },
          { name: "Basketball", icon: "🏀", leagues: ["NBA", "EuroLeague", "NCAA", "WNBA"] },
          { name: "Hockey", icon: "🏒", leagues: ["NHL", "KHL", "AHL", "SHL"] },
          { name: "Golf", icon: "⛳", leagues: ["PGA Tour", "European Tour", "Masters", "US Open"] }
        ].map((sport) => (
          <div key={sport.name}>
            <button
              onClick={() => handleSportClick(sport.name)}
              className="w-full text-left px-2 py-2 rounded-lg text-sm transition-colors flex items-center justify-between hover:bg-white/5 text-text hover:text-text pr-1"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{sport.icon}</span>
                <span className="font-semibold">{sport.name.toUpperCase()}</span>
              </div>
              <span 
                className={`text-[10px] transition-transform duration-200 ${
                  expandedSports.includes(sport.name) ? 'rotate-90' : ''
                }`}
              >
                ▶
              </span>
            </button>
            
            {expandedSports.includes(sport.name) && (
              <div className="ml-4 mr-2 space-y-1">
                {sport.leagues.map((league) => (
                  <button
                    key={league}
                    className="w-[calc(100%-1rem)] text-left px-2 py-1 rounded text-xs transition-colors hover:bg-white/5 text-muted hover:text-text"
                  >
                    <span className="truncate text-xs">{league}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
