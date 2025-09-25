import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { OddsConverter } from "../utils/oddsConverter";
import { useAppDispatch } from "../store/hooks";
import { getMatchingInfoAction } from "../store/matchinginfo/actions";
import { MatchingInfo } from "../store/matchinginfo/types";

// Custom hook for animated counting
const useCountUp = (end: number, duration: number = 2000, delay: number = 0) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasStarted(true);
      const startTime = Date.now();
      const startValue = 0;

      const updateCount = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (end - startValue) * easeOutQuart);
        
        setCount(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(updateCount);
        }
      };
      
      requestAnimationFrame(updateCount);
    }, delay);

    return () => clearTimeout(timer);
  }, [end, duration, delay]);

  return { count, hasStarted };
};

export default function HeroSection() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const dispatch = useAppDispatch();
  const [featuredMatches, setFeaturedMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Handle search - redirect to matches page with search term
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      return;
    }
    
    const encodedTerm = encodeURIComponent(searchTerm.trim());
    const targetUrl = `/all-events?search=${encodedTerm}`;
    
    console.log('🔍 Home page search redirect:', {
      searchTerm: searchTerm.trim(),
      encodedTerm,
      targetUrl
    });
    
    // Navigate to all-events page (odds table) with search term as URL parameter
    navigate(targetUrl);
  };

  // Animated counters - all start and finish at the same time
  const { count: bookmakersCount } = useCountUp(80, 2000, 0);
  const { count: sportsCount } = useCountUp(50, 2000, 0);
  const { count: matchesCount } = useCountUp(1000, 2000, 0);
  
  // Odds format conversion
  const { getOddsInFormat, oddsFormat } = useOddsFormat();
  
  // Fetch real upcoming matches for Featured Matches
  useEffect(() => {
    const fetchFeaturedMatches = async () => {
      try {
        setLoading(true);
        console.log('🔍 HeroSection: Starting to fetch featured matches...');
        
        const params = { 
          page: 1, 
          size: 50  // Get more matches to filter from
        };
        
        const result = await dispatch(getMatchingInfoAction(params)).unwrap();
        console.log('🔍 HeroSection: API result:', result);
        console.log('🔍 HeroSection: Total matches received:', result.odds?.length || 0);
        
        if (!result.odds || result.odds.length === 0) {
          console.log('⚠️ HeroSection: No matches received from API, using fallback');
          setFeaturedMatches(getFallbackMatches());
          return;
        }
        
        // Filter for upcoming matches and transform data
        const now = new Date();
        console.log('🔍 HeroSection: Current time:', now.toISOString());
        
        const upcomingMatches = result.odds
          .filter((match: MatchingInfo) => {
            const matchDate = new Date(match.date + 'T' + match.time);
            const isUpcoming = matchDate.getTime() >= now.getTime();
            console.log(`🔍 HeroSection: Match ${match.home_team} vs ${match.away_team} - Date: ${match.date} ${match.time} - Is upcoming: ${isUpcoming}`);
            return isUpcoming;
          })
          .slice(0, 6) // Take first 6 upcoming matches
          .map((match: MatchingInfo) => ({
            id: match.id,
            teams: `${match.home_team} vs ${match.away_team}`,
            league: `${match.country} ${match.league}`,
            time: match.time,
            date: formatMatchDate(match.date),
            odds: {
              home: match.odd_1 ? match.odd_1.toString() : null,
              away: match.odd_2 ? match.odd_2.toString() : null,
              draw: match.odd_X ? match.odd_X.toString() : null
            },
            status: "Upcoming"
          }));
        
        console.log('🔍 HeroSection: Upcoming matches found:', upcomingMatches.length);
        console.log('🔍 HeroSection: Featured matches:', upcomingMatches);
        
        if (upcomingMatches.length === 0) {
          console.log('⚠️ HeroSection: No upcoming matches found, using fallback');
          setFeaturedMatches(getFallbackMatches());
        } else {
          setFeaturedMatches(upcomingMatches);
        }
      } catch (error) {
        console.error("❌ HeroSection: Error fetching featured matches:", error);
        setFeaturedMatches(getFallbackMatches());
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedMatches();
  }, [dispatch]);

  // Helper function for fallback matches
  const getFallbackMatches = () => [
    {
      id: 1,
      teams: "Manchester City vs Arsenal",
      league: "Premier League",
      time: "15:00",
      date: "Today",
      odds: {
        home: "+180",
        away: "-220",
        draw: "+320"
      },
      status: "Upcoming"
    },
    {
      id: 2,
      teams: "Lakers vs Warriors",
      league: "NBA",
      time: "19:30",
      date: "Today",
      odds: {
        home: "-110",
        away: "-110",
        overUnder: "225.5"
      },
      status: "Upcoming"
    },
    {
      id: 3,
      teams: "Kansas City Chiefs vs Buffalo Bills",
      league: "NFL",
      time: "20:00",
      date: "Today",
      odds: {
        home: "+150",
        away: "-180",
        spread: "KC +3.5"
      },
      status: "Upcoming"
    }
  ];

  // Helper function to format match date
  const formatMatchDate = (dateString: string): string => {
    const matchDate = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (matchDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (matchDate.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return matchDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Debug: Log when odds format changes
  useEffect(() => {
    console.log('HeroSection: Odds format changed to:', oddsFormat);
  }, [oddsFormat]);
  
  // Debug: Log featured matches state
  useEffect(() => {
    console.log('🔍 HeroSection: Featured matches state updated:', featuredMatches);
    console.log('🔍 HeroSection: Loading state:', loading);
  }, [featuredMatches, loading]);
  
  // Helper function to convert and format odds
  const formatOdds = (odds: string): string => {
    if (!odds || odds.trim() === '') {
      return odds || '';
    }
    
    // Use the robust string parser with correct conversion formulas
    const decimalOdds = OddsConverter.stringToDecimal(odds);
    const formatted = getOddsInFormat(decimalOdds);
    console.log(`HeroSection: Converting ${odds} -> ${decimalOdds} -> ${formatted} (format: ${oddsFormat})`);
    return formatted;
  };

  return (
    <section className="mb-6 sm:mb-8">
      <div className="bg-gradient-to-br from-surface to-bg border border-border rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 relative">
        <div className="hidden lg:block absolute left-0 bottom-0">
          <img 
            src="/assets/LeftMan.png" 
            alt="Betting Expert" 
            className="object-contain rounded-xl"
          />
          

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 right-1/6 animate-money-spray-1">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/3 right-1/3 animate-money-spray-2">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-2/5 right-1/8 animate-money-spray-3">
              <span className="text-yellow-400 text-3xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-2/5 right-1/4 animate-money-spray-4">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-3/5 right-1/6 animate-money-spray-5">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-3/5 right-1/3 animate-money-spray-6">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/4 right-1/10 animate-money-spray-7">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/4 right-1/5 animate-money-spray-8">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/2 right-1/12 animate-money-spray-9">
              <span className="text-yellow-400 text-3xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/2 right-1/4 animate-money-spray-10">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/3 right-0 animate-money-spray-11">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-2/5 right-1/2 animate-money-spray-12">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-1/6 right-1/8 animate-money-spray-13">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-4/5 right-1/4 animate-money-spray-14">
              <span className="text-yellow-400 text-2xl font-bold drop-shadow-lg">$</span>
            </div>
            
            <div className="absolute top-3/5 right-1/8 animate-money-spray-15">
              <span className="text-yellow-400 text-xl font-bold drop-shadow-lg">$</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 lg:ml-60">
          <div className="text-center mb-4 sm:mb-6 lg:mb-8 p-2 sm:p-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-text mb-3 sm:mb-4">
              Find the Best Betting Odds
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted max-w-2xl mx-auto px-2">
              Compare odds from top bookmakers worldwide and get the biggest payouts on your bets
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto mb-4 sm:mb-6 lg:mb-8 px-2">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for teams, leagues, or matches..."
                className="w-full px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 pr-16 sm:pr-20 lg:pr-24 bg-bg border border-border rounded-xl text-text placeholder-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm sm:text-base"
              />
               <button 
                 onClick={handleSearch}
                 disabled={!searchTerm.trim()}
                 className="absolute right-0 top-0 h-full px-3 sm:px-4 lg:px-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-r-xl transition-colors text-xs sm:text-sm flex items-center justify-center"
               >
                 Search
               </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6 max-w-4xl mx-auto px-2">
            <div className="text-center">
              <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-text mb-1 sm:mb-2">
                {bookmakersCount}+
              </div>
              <div className="text-xs sm:text-sm lg:text-base text-muted">Bookmakers</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-text mb-1 sm:mb-2">
                {sportsCount}+
              </div>
              <div className="text-xs sm:text-sm lg:text-base text-muted">Sports</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-text mb-1 sm:mb-2">
                {matchesCount}+
              </div>
              <div className="text-xs sm:text-sm lg:text-base text-muted">Daily Matches</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-text mb-3 sm:mb-4 px-2">Featured Matches</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-3 sm:p-4 lg:p-5 animate-pulse">
                <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                  <div className="h-6 bg-muted/20 rounded-full w-20"></div>
                  <div className="text-right">
                    <div className="h-4 bg-muted/20 rounded w-16 mb-1"></div>
                    <div className="h-5 bg-muted/20 rounded w-12"></div>
                  </div>
                </div>
                <div className="h-5 bg-muted/20 rounded w-full mb-2 sm:mb-3"></div>
                <div className="h-4 bg-muted/20 rounded w-24 mb-2 sm:mb-3 lg:mb-4"></div>
                <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 lg:mb-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-muted/20 rounded w-12"></div>
                    <div className="h-4 bg-muted/20 rounded w-16"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-muted/20 rounded w-12"></div>
                    <div className="h-4 bg-muted/20 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-8 bg-muted/20 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : featuredMatches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {featuredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-surface border border-border rounded-xl p-3 sm:p-4 lg:p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                <span className="px-2 sm:px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/30">
                  {match.status}
                </span>
                <div className="text-right">
                  <div className="text-xs sm:text-sm text-muted">{match.date}</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-text">{match.time}</div>
                </div>
              </div>
              
              <h3 className="font-bold text-text text-sm sm:text-base lg:text-lg mb-2 sm:mb-3 leading-tight line-clamp-2">
                {match.teams}
              </h3>
              
              <div className="text-xs sm:text-sm text-muted mb-2 sm:mb-3 lg:mb-4">{match.league}</div>
              
              <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 lg:mb-4">
                {match.odds.home && match.odds.away && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Home:</span>
                    <span className="font-semibold text-text">{formatOdds(match.odds.home)}</span>
                  </div>
                )}
                {match.odds.away && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Away:</span>
                    <span className="font-semibold text-text">{formatOdds(match.odds.away)}</span>
                  </div>
                )}
                {match.odds.draw && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Draw:</span>
                    <span className="font-semibold text-text">{formatOdds(match.odds.draw)}</span>
                  </div>
                )}
                {match.odds.overUnder && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">O/U:</span>
                    <span className="font-semibold text-text">{match.odds.overUnder}</span>
                  </div>
                )}
                {match.odds.spread && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted">Spread:</span>
                    <span className="font-semibold text-text">{match.odds.spread}</span>
                  </div>
                )}
              </div>
              
              <button className="w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors group-hover:scale-105">
                Compare Odds
              </button>
            </div>
          ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-muted text-sm mb-2">No upcoming matches available</div>
            <div className="text-xs text-muted/70">Check back later for new matches</div>
          </div>
        )}
      </div>
    </section>
  );
}
