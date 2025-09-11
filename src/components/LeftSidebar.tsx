import React, { useState, useEffect, useCallback } from "react";
import { useCountry } from "../contexts/CountryContext";
import { useAppDispatch } from "../store/hooks";
import { getMatchingInfoAction } from "../store/matchinginfo/actions";
import { MatchingInfo } from "../store/matchinginfo/types";

export default function LeftSidebar() {
  const { selectedCountry, setSelectedCountry, selectedLeague, setSelectedLeague, countries } = useCountry();
  const [expandedCountries, setExpandedCountries] = useState<string[]>([]);
  const dispatch = useAppDispatch();
  const [matchingInfo, setMatchingInfo] = useState<MatchingInfo[]>([]);
  const [leagueMatchCounts, setLeagueMatchCounts] = useState<Record<string, number>>({});
  
  const fetchMatchingInfo = useCallback(async () => {
    try {
      const params = { 
        page: "1", 
        size: "1000" 
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

  const handleCountryClick = (country: any) => {
    toggleCountryExpansion(country.name);
  };

  const handleLeagueClick = (league: any) => {
    setSelectedLeague(league);
  };

  return (
    <aside className="w-64 xl:w-72 bg-surface border-r border-border p-4 space-y-6">
      
      <div>
        <h3 className="text-sm font-semibold text-muted mb-3">FOOTBALL</h3>
        
        <div className="space-y-1 max-h-100 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {countries.map((country) => (
            <div key={country.name} className="space-y-1">
              <button
                onClick={() => handleCountryClick(country)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between hover:bg-white/5 text-text hover:text-text`}
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
                <div className="ml-6 space-y-1">
                  {country.leagues.map((league) => (
                    <button
                      key={league.name}
                      onClick={() => handleLeagueClick(league)} 
                      className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors hover:bg-white/5 ${
                        selectedLeague?.name === league.name
                          ? "bg-green-500/20 text-green-600 border border-green-500/30"
                          : "text-muted hover:text-text"
                      }`}
                    >
                      <span className="truncate">{league.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
