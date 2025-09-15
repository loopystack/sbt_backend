import React, { useState, useEffect, useCallback } from "react";
import { useCountry } from "../../contexts/CountryContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../store/hooks";
import { getMatchingInfoAction } from "../../store/matchinginfo/actions";
import { MatchingInfo, GetMatchingInfoResponse } from "../../store/matchinginfo/types";
import { transformMatchingInfoToMatch } from "../../data/sampleData";
import { getTeamIcon } from "../../utils/teamIcons";
import CongratulationsAlert from "../CongratulationsAlert";
type Match = {
  id: string;
  time: string;
  status: "Live" | "Upcoming" | "Finished";
  teams: string;
  sport: string;
  league: string;
  result?: string;
  isHistorical?: boolean;
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
  const dispatch = useAppDispatch();
  const { selectedCountry, selectedLeague, setSelectedLeague, countries } = useCountry();
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Debug authentication state
  console.log('🎯 OddsTable: Auth state - user:', user?.email || 'null', 'isAuthenticated:', isAuthenticated);
  const [selectedMarket, setSelectedMarket] = useState("Next Matches");
  const [viewMode, setViewMode] = useState<"cards" | "rows">("cards");
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [availableYears, setAvailableYears] = useState<number[]>([2021, 2022, 2023, 2024, 2025]);
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 20;
  const [selectedOdds, setSelectedOdds] = useState<{
    matchId: string;
    type: 'home' | 'draw' | 'away';
    odds: string;
    teams: string;
    league: string;
  }[]>([]);
  const [showBetSlip, setShowBetSlip] = useState(false);
  const [isBetSlipCollapsed, setIsBetSlipCollapsed] = useState(false);
  const [isBetSlipHiding, setIsBetSlipHiding] = useState(false);
  const [matchingInfo, setMatchingInfo] = useState<MatchingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [currectPage, setCurrectPage] = useState(1);
  const limit = 20000; // Show all matches (19,000+)
  const [animatingOdds, setAnimatingOdds] = useState<{
    matchId: string;
    type: 'home' | 'draw' | 'away';
    odds: string;
    teams: string;
    league: string;
    startPosition: { x: number; y: number };
  } | null>(null);
  const [selectedBetAmount, setSelectedBetAmount] = useState("0.0001");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Betting states
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [bettingError, setBettingError] = useState<string>("");
  const [userFunds, setUserFunds] = useState<number>(0.5); // Mock user funds
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [betDetails, setBetDetails] = useState<{
    betAmount: string;
    potentialWin: string;
    teams: string;
  }>({ betAmount: "0.0001", potentialWin: "0.001026", teams: "Team A vs Team B" });
  
  // Betting functions
  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }
    
    const betAmount = parseFloat(selectedBetAmount);
    if (betAmount > userFunds) {
      setBettingError("Not enough funds to make a bet. Top up your account to bet more!");
      return;
    }
    
    setIsPlacingBet(true);
    setBettingError("");
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Calculate potential win
      const totalOdds = 10.26; // This could be calculated from selected odds
      const potentialWin = (betAmount * totalOdds).toFixed(6);
      
      // Get team names from selected odds
      const teams = selectedOdds.length > 0 ? selectedOdds[0].teams : "Selected Match";
      
      // Set bet details for congratulations alert
      setBetDetails({
        betAmount: selectedBetAmount,
        potentialWin,
        teams
      });
      
      // Mock successful bet placement
      setUserFunds(prev => prev - betAmount);
      setSelectedOdds([]);
      setIsBetSlipHiding(true);
      setTimeout(() => {
        setShowBetSlip(false);
        setIsBetSlipHiding(false);
      }, 500);
      
      // Show congratulations alert
      setTimeout(() => {
        setShowCongratulations(true);
      }, 600);
      
    } catch (error) {
      setBettingError("Failed to place bet. Please try again.");
    } finally {
      setIsPlacingBet(false);
    }
  };
  
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
  const getCountryNameFromLeague = (leagueName: string) => {
    for (const country of countries) {
      const foundLeague = country.leagues.find(league => league.name === leagueName);
      if (foundLeague) {
        return country.name;
      }
    }
    return '';
  };

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

  const getMatches = (): Match[] => {
    if (matchingInfo && matchingInfo.length > 0) {
      let filteredMatches = matchingInfo;
      
      // Apply search filter if search query exists
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredMatches = matchingInfo.filter(match => {
          const homeTeam = match.home_team.toLowerCase();
          const awayTeam = match.away_team.toLowerCase();
          return homeTeam.includes(query) || awayTeam.includes(query);
        });
      }
      
      // Apply year filter
      if (selectedYear) {
        filteredMatches = filteredMatches.filter(match => match.season === selectedYear);
      }
      
      // Apply country filter
      if (selectedCountry) {
        filteredMatches = filteredMatches.filter(match => 
          match.country.toLowerCase() === selectedCountry.name.toLowerCase()
        );
      }
      
      // Apply league filter - THIS WAS MISSING!
      if (selectedLeague) {
        filteredMatches = filteredMatches.filter(match => 
          match.league.toLowerCase() === selectedLeague.name.toLowerCase()
        );
      }
      
      if (selectedMarket === "Results") {
        filteredMatches = filteredMatches.filter(match => {
          const matchDate = new Date(match.date + 'T00:00:00'); 
          const now = new Date();
          const isPastMatch = matchDate.getTime() < now.getTime();
          return isPastMatch;
        });
      } else if (selectedMarket === "Next Matches") {
        filteredMatches = filteredMatches.filter(match => {
          const matchDate = new Date(match.date + 'T00:00:00'); 
          const now = new Date();
          const isFutureMatch = matchDate.getTime() >= now.getTime();
          return isFutureMatch;
        });
      }
      
      return transformMatchingInfoToMatch(filteredMatches);
    }
    
    if (selectedLeague && selectedLeague.matches.length > 0) {
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
    
    if (selectedCountry) {
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
    }
    
    return defaultMatches;
  };
  const matches = getMatches();
  const markets = ["Results", "Next Matches"];
  const groupMatchesByDate = (matches: Match[]) => {
    const grouped: { [key: string]: Match[] } = {};
    
    matches.forEach(match => {
      const date = match.date || 'No Date';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(match);
    });
    
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => {
        if (dateA === 'No Date') return 1;
        if (dateB === 'No Date') return -1;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      })
      .map(([date, matches]) => ({ 
        date, 
        matches: matches.sort((a, b) => {
          const timeA = a.time.replace(':', '');
          const timeB = b.time.replace(':', '');
          return parseInt(timeA) - parseInt(timeB);
        })
      }));
  };
  const allGroupedMatches = groupMatchesByDate(matches);
  
  const allMatches = allGroupedMatches.flatMap(({ matches }) => matches);
  const totalMatches = allMatches.length;
  const totalPages = Math.ceil(totalMatches / matchesPerPage);
  
  const startIndex = (currentPage - 1) * matchesPerPage;
  const endIndex = startIndex + matchesPerPage;
  const paginatedMatches = allMatches.slice(startIndex, endIndex);
  
  const groupedMatches = groupMatchesByDate(paginatedMatches);
  const handleOddsClick = (match: Match, type: 'home' | 'draw' | 'away', odds: string, event: React.MouseEvent) => {
    const selectedBet = {
      matchId: match.id,
      type,
      odds,
      teams: match.teams,
      league: match.league
    };
    
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const startPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    const isAlreadySelected = selectedOdds.some(
      odds => odds.matchId === match.id && odds.type === type
    );
    
    if (isAlreadySelected) {
      setSelectedOdds(prev => prev.filter(
        odds => !(odds.matchId === match.id && odds.type === type)
      ));
      if (selectedOdds.length === 1) {
        setIsBetSlipHiding(true);
        setTimeout(() => {
          setShowBetSlip(false);
          setIsBetSlipHiding(false);
        }, 500);
      }
    } else {
      setAnimatingOdds({
        ...selectedBet,
        startPosition
      });
      
      setTimeout(() => {
        setSelectedOdds(prev => [...prev, selectedBet]);
        setAnimatingOdds(null);
        setShowBetSlip(true);
        setIsBetSlipCollapsed(false); // Reset collapsed state when new odds are added
      }, 300);
    }
  };
  const isOddsSelected = (matchId: string, type: 'home' | 'draw' | 'away') => {
    return selectedOdds.some(odds => odds.matchId === matchId && odds.type === type);
  };
  const handleBetAmountClick = (amount: string) => {
    setSelectedBetAmount(amount);
  };

  // Handle clicks outside odd buttons to collapse betslip
  const handleOutsideClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Check if the click is on an odd button by looking for specific classes
    const button = target.closest('button');
    const isOddButton = button && (
      button.className.includes('bg-yellow-500') ||
      button.className.includes('hover:bg-surface/50') ||
      button.className.includes('hover:bg-bg/50')
    );
    
    // Check if the click is inside the betslip modal content area (not header)
    const isInsideBetSlipContent = target.closest('.betslip-content');
    
    // Check if the click is specifically on the betslip header
    const isBetSlipHeader = target.closest('.betslip-header');
    
    // Only collapse if clicking outside both the betslip content and header
    if (showBetSlip && !isOddButton && !isInsideBetSlipContent && !isBetSlipHeader) {
      setIsBetSlipCollapsed(true);
    }
  };

  // Handle betslip header click to expand
  const handleBetSlipHeaderClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling
    setIsBetSlipCollapsed(false);
  };
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
  const fetchAllMatchingInfo = useCallback(async () => {
    // Don't fetch if no league is selected
    if (!selectedLeague) {
      setMatchingInfo([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log("Fetching with selectedYear:", selectedYear, "selectedLeague:", selectedLeague?.name, "selectedCountry:", selectedCountry?.name);
      
      // Build query parameters
      const params: any = { 
        page: "1",
        size: limit.toString()
      };
      
      if (selectedYear) {
        params.season = selectedYear;
      }
      
      if (selectedLeague) {
        params.league = selectedLeague.name;
      }
      
      if (selectedCountry) {
        params.country = selectedCountry.name.toLowerCase();
      }
      
      console.log("Fetching with params:", params);
      const result = await dispatch(getMatchingInfoAction(params)).unwrap();
      console.log("API result:", result);
      console.log("Number of odds returned:", result.odds.length);
      setMatchingInfo(result.odds);
      setCurrectPage(result.page);
      
    } catch (error) {
      console.error("Error fetching matching info:", error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, selectedYear, selectedLeague, selectedCountry, limit]);
    
  
  // Fetch available years from the database
  const fetchAvailableYears = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5001/api/odds/?size=20000');
      if (response.ok) {
        const data = await response.json();
        // Extract unique years from the data
        const years = [...new Set(data.odds.map((match: MatchingInfo) => match.season))].sort() as number[];
        setAvailableYears(years);
      }
    } catch (error) {
      console.error('Error fetching available years:', error);
    }
  }, []);

  useEffect(() => {
    fetchAvailableYears();
  }, [fetchAvailableYears]);

  useEffect(() => {
    fetchAllMatchingInfo();
  }, [fetchAllMatchingInfo]);

  // Clear search query when league changes
  useEffect(() => {
    setSearchQuery("");
    setCurrentPage(1);
  }, [selectedLeague]);

  // Add global click listener for betslip collapse
  useEffect(() => {
    if (showBetSlip) {
      document.addEventListener('click', handleOutsideClick);
      return () => {
        document.removeEventListener('click', handleOutsideClick);
      };
    }
  }, [showBetSlip, selectedOdds]);
  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  }
    return (
    <section>
      {selectedLeague ? (
        <div className="text-sm text-muted mb-4 px-2">
          Home {'>'} Football {'>'} {getCountryNameFromLeague(selectedLeague.name)} {'>'} {selectedLeague.name}
        </div>
      ) : (
        <div className="text-center py-20">
          <h1 className="text-3xl font-bold text-text mb-4">Welcome to Sports Betting</h1>
          <p className="text-muted text-lg mb-8">Select a country and league from the left sidebar to view matches and odds</p>
          <div className="text-sm text-muted">
            <p>Available countries: {countries.length}</p>
            <p>Total leagues: {countries.reduce((total, country) => total + country.leagues.length, 0)}</p>
          </div>
        </div>
      )}
      
      {selectedLeague && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0 px-2">
        <div>
                               <h2 className="text-xl sm:text-2xl font-bold text-text">
            {searchQuery.trim() 
              ? `Search Results for "${searchQuery}"`
              : selectedYear 
                ? selectedLeague
                  ? `${selectedLeague.name} ${selectedYear} Results`
                  : `${selectedYear} Results Only` 
                : selectedLeague
                  ? `${selectedLeague.name} Matches & Odds`
                  : selectedMarket === "Results"
                    ? "Match Results"
                    : selectedMarket === "Next Matches"
                      ? "Upcoming Matches & Odds"
                      : selectedCountry 
                        ? `${selectedCountry.name} - Football` 
                        : 'Live Matches & Odds'
            }
          </h2>
                     <p className="text-sm text-muted mt-1">
             {searchQuery.trim() 
               ? `${matches.length} matches found for "${searchQuery}"`
               : selectedYear && selectedLeague
                 ? `${matches.length} ${selectedLeague.name} matches from ${selectedYear}`
                 : selectedYear && !selectedLeague
                   ? `${matches.length} matches from ${selectedYear}`
                   : selectedLeague && !selectedYear
                     ? `${matches.length} ${selectedLeague.name} matches`
                     : selectedMarket === "Results"
                       ? `${matches.length} historical matches`
                       : selectedMarket === "Next Matches"
                         ? `${matches.length} upcoming matches`
                         : `${matches.length} matches`
             }
           </p>
        </div>
        
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[250px]">
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted hover:text-text"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {selectedMarket !== "Next Matches" && (
            <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 mr-2">
              {availableYears.map(year => (
                <button
                  key={year}
                                     onClick={() => {
                     const newYear = selectedYear === year ? undefined : year;
                     console.log("Year button clicked:", year, "new selectedYear:", newYear);
                     setSelectedYear(newYear);
                     setCurrentPage(1); 
                     setCurrectPage(1); 
                   }}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                    selectedYear === year
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-muted hover:text-text hover:bg-surface/80"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                viewMode === "cards"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("rows")}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                viewMode === "rows"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          {markets.map((market) => (
            <button
              key={market}
                             onClick={() => {
                 console.log("Market button clicked:", market);
                 setSelectedMarket(market);
                 setCurrentPage(1);
                 setCurrectPage(1); // Reset API page
                 if (market === "Next Matches") {
                   setSelectedYear(undefined);
                 }
               }}
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
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groupedMatches.map(({ date, matches }) => 
            matches.map((match: Match) => (
              <div key={match.id} className="bg-surface border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200">
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
                
                 <div className="mb-4">
                   <div className="flex items-center justify-between">
                     {/* First Team */}
                     <div className="flex flex-col items-center text-center flex-1">
                       <div className="mb-2">
                         {getTeamIcon(match.teams.split(' vs ')[0], getCountryNameFromLeague(match.league)) && (
                           <img 
                             src={getTeamIcon(match.teams.split(' vs ')[0], getCountryNameFromLeague(match.league))!}
                             alt={`${match.teams.split(' vs ')[0]} icon`}
                             className="w-8 h-8"
                             onError={(e) => {
                               e.currentTarget.style.display = 'none';
                             }}
                           />
                         )}
                       </div>
                       <div className="text-sm font-medium text-text text-center">
                         {match.teams.split(' vs ')[0]}
                       </div>
                     </div>

                     {/* Score */}
                     <div className="flex flex-col items-center mx-4">
                       {match.isHistorical && match.result && match.result !== "" ? (
                         <div className="text-2xl font-bold text-green-500">
                           {formatScore(match.result)}
                         </div>
                       ) : (
                         <div className="text-lg font-bold text-muted">VS</div>
                       )}
                     </div>

                     {/* Second Team */}
                     <div className="flex flex-col items-center text-center flex-1">
                       <div className="mb-2">
                         {getTeamIcon(match.teams.split(' vs ')[1], getCountryNameFromLeague(match.league)) && (
                           <img 
                             src={getTeamIcon(match.teams.split(' vs ')[1], getCountryNameFromLeague(match.league))!}
                             alt={`${match.teams.split(' vs ')[1]} icon`}
                             className="w-8 h-8"
                             onError={(e) => {
                               e.currentTarget.style.display = 'none';
                             }}
                           />
                         )}
                       </div>
                       <div className="text-sm font-medium text-text text-center">
                         {match.teams.split(' vs ')[1]}
                       </div>
                     </div>
                   </div>
                 </div>
                
                {match.isHistorical ? (
                  <div className="border-t border-border/50 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted">Historical Odds</span>
                      <span className="text-xs text-blue-500 font-medium">Past Match</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {(() => {
                        const homeOdd = parseFloat(match.bookmakers[0]?.home || '0');
                        const drawOdd = parseFloat(match.bookmakers[0]?.draw || '0');
                        const awayOdd = parseFloat(match.bookmakers[0]?.away || '0');
                        const odds = [
                          { value: homeOdd, label: '1', text: match.bookmakers[0]?.home || '-' },
                          { value: drawOdd, label: 'X', text: match.bookmakers[0]?.draw || '-' },
                          { value: awayOdd, label: '2', text: match.bookmakers[0]?.away || '-' }
                        ];
                        const sortedOdds = [...odds].sort((a, b) => b.value - a.value);
                        
                        const getOddColor = (oddValue: number) => {
                          if (oddValue === sortedOdds[0].value) return 'text-green-500'; 
                          if (oddValue === sortedOdds[1].value) return 'text-red-500';   
                          return 'text-blue-500';
                        };
                        
                        return odds.map((odd, index) => (
                          <div key={index} className="text-center">
                            <div className="text-xs text-muted mb-1">{odd.label}</div>
                            <div className={`w-full py-2 px-1 text-sm font-semibold ${getOddColor(odd.value)}`}>
                              {odd.text}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-border/50 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted">1x2</span>
                      <button className="text-xs text-muted hover:text-text">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    
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
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">

          <div className="grid grid-cols-12 gap-1 px-2 py-2 text-sm font-medium text-muted bg-surface/50 border-b border-border/50">
            <div className="col-span-2 text-center">Date</div>
            <div className="col-span-1 text-center">Time</div>
            <div className="col-span-4">Match</div>
            <div className="col-span-2 text-center">Result</div>
            <div className="col-span-3 flex justify-center gap-1">
              <div className="min-w-[40px] text-center">1</div>
              <div className="min-w-[40px] text-center">X</div>
              <div className="min-w-[40px] text-center">2</div>
            </div>
          </div>
          
          <div>
            {groupedMatches.map(({ date, matches }) =>
              matches.map((match: Match, matchIndex: number) => {
                const isLastMatchOfDay = matchIndex === matches.length - 1;
                return (
                <div 
                  key={match.id} 
                  className={`grid grid-cols-12 gap-1 px-2 py-2 hover:bg-surface/30 transition-colors text-sm border-b ${
                    isLastMatchOfDay ? 'border-b border-gray-400/50' : 'border-b border-border/30'
                  }`}
                >

                  <div className="col-span-2 flex items-center justify-center">
                    <div className="text-sm text-muted">{match.date}</div>
                  </div>
                  
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-sm text-muted">{match.time}</span>
                  </div>
                  
                  <div className="col-span-4 flex items-center">
                    <div className="flex items-center gap-1 w-full min-w-0">
                      {getTeamIcon(match.teams.split(' vs ')[0], getCountryNameFromLeague(match.league)) && (
                        <img 
                          src={getTeamIcon(match.teams.split(' vs ')[0], getCountryNameFromLeague(match.league))!}
                          alt={`${match.teams.split(' vs ')[0]} icon`}
                          className="w-4 h-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-sm font-medium text-text truncate">{match.teams.split(' vs ')[0]}</span>
                      <span className="text-sm text-muted font-bold px-1">VS</span>
                      {getTeamIcon(match.teams.split(' vs ')[1], getCountryNameFromLeague(match.league)) && (
                        <img 
                          src={getTeamIcon(match.teams.split(' vs ')[1], getCountryNameFromLeague(match.league))!}
                          alt={`${match.teams.split(' vs ')[1]} icon`}
                          className="w-4 h-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-sm font-medium text-text truncate">{match.teams.split(' vs ')[1]}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex items-center justify-center">
                                         {match.isHistorical ? (
                       <div className="text-sm font-semibold text-green-400">
                         {match.result && match.result !== "" ? formatScore(match.result) : "-"}
                       </div>
                     ) : (
                      <div className="text-sm text-muted">
                        {match.status === "Live" ? "LIVE" : "Upcoming"}
                      </div>
                    )}
                  </div>
                  
                  <div className="col-span-3 flex items-center justify-center">
                    {match.isHistorical ? (
                      <div className="flex items-center gap-1">
                        {(() => {
                          const homeOdd = parseFloat(match.bookmakers[0]?.home || '0');
                          const drawOdd = parseFloat(match.bookmakers[0]?.draw || '0');
                          const awayOdd = parseFloat(match.bookmakers[0]?.away || '0');
                          const odds = [
                            { value: homeOdd, label: '1', text: match.bookmakers[0]?.home || '-' },
                            { value: drawOdd, label: 'X', text: match.bookmakers[0]?.draw || '-' },
                            { value: awayOdd, label: '2', text: match.bookmakers[0]?.away || '-' }
                          ];
                          const sortedOdds = [...odds].sort((a, b) => b.value - a.value);
                          
                          const getOddColor = (oddValue: number) => {
                            if (oddValue === sortedOdds[0].value) return 'text-green-500'; // Highest
                            if (oddValue === sortedOdds[1].value) return 'text-red-500';   // Middle
                            return 'text-blue-500'; // Lowest
                          };
                          
                          return odds.map((odd, index) => (
                            <div key={index} className="text-center min-w-[40px]">
                              <div className={`text-sm font-semibold ${getOddColor(odd.value)}`}>
                                {odd.text}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button 
                          className={`text-sm font-semibold min-w-[40px] py-1 rounded border transition-all duration-200 ${
                            isOddsSelected(match.id, 'home') 
                              ? 'bg-yellow-500 text-black border-yellow-500' 
                              : 'text-text hover:bg-surface/50 border-border hover:border-border/80'
                          }`}
                          onClick={(e) => handleOddsClick(match, 'home', match.bookmakers[0]?.home || '-', e)}
                        >
                          {match.bookmakers[0]?.home || '-'}
                        </button>
                        <button 
                          className={`text-sm font-semibold min-w-[40px] py-1 rounded border transition-all duration-200 ${
                            isOddsSelected(match.id, 'draw') 
                              ? 'bg-yellow-500 text-black border-yellow-500' 
                              : 'text-text hover:bg-surface/50 border-border hover:border-border/80'
                          }`}
                          onClick={(e) => handleOddsClick(match, 'draw', match.bookmakers[0]?.draw || '-', e)}
                        >
                          {match.bookmakers[0]?.draw || '-'}
                        </button>
                        <button 
                          className={`text-sm font-semibold min-w-[40px] py-1 rounded border transition-all duration-200 ${
                            isOddsSelected(match.id, 'away') 
                              ? 'bg-yellow-500 text-black border-yellow-500' 
                              : 'text-text hover:bg-surface/50 border-border hover:border-border/80'
                          }`}
                          onClick={(e) => handleOddsClick(match, 'away', match.bookmakers[0]?.away || '-', e)}
                        >
                          {match.bookmakers[0]?.away || '-'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}
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
      {(showBetSlip || isBetSlipHiding) && selectedOdds.length > 0 && (
        <div 
          className={`fixed bottom-4 right-4 w-80 bg-surface border border-border rounded-xl shadow-2xl z-50 betslip-modal ${
            isBetSlipCollapsed ? 'h-16' : 'h-auto'
          }`}
          style={{
            transform: isBetSlipHiding ? 'translateY(100%)' : 'translateY(0)',
            opacity: isBetSlipHiding ? '0' : '1',
            transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out'
          }}
        >
          <div 
            className="bg-yellow-500 text-black px-4 py-3 rounded-t-xl flex items-center justify-between cursor-pointer hover:bg-yellow-400 transition-colors betslip-header"
            onClick={handleBetSlipHeaderClick}
          >
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
              <svg 
                className={`w-4 h-4 transition-transform duration-300 ease-in-out ${
                  isBetSlipCollapsed ? 'rotate-180' : 'rotate-0'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div 
            className={`betslip-content transition-all duration-300 ease-in-out ${
              isBetSlipCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[600px] opacity-100'
            }`}
            style={{
              transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out'
            }}
          >
            <div className="flex border-b border-border" onClick={(e) => e.stopPropagation()}>
              <button className="flex-1 py-2 text-sm font-medium text-yellow-500 border-b-2 border-yellow-500">Single</button>
              <button className="flex-1 py-2 text-sm font-medium text-muted/50 cursor-not-allowed" disabled>Combo</button>
              <button className="flex-1 py-2 text-sm font-medium text-muted/50 cursor-not-allowed" disabled>System</button>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto betting-slip-scroll" onClick={(e) => e.stopPropagation()}>
            {selectedOdds.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <svg className="w-12 h-12 mx-auto mb-4 text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No bets selected</p>
                <p className="text-xs text-muted/70 mt-1">Click on odds to add them to your betslip</p>
              </div>
            ) : (
              selectedOdds.map((odds, index) => (
              <div key={`${odds.matchId}-${odds.type}`} className="bg-surface border border-border rounded-lg p-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div className="flex items-center gap-2">
                        {odds.type === 'home' ? (
                          <>
                            {getTeamIcon(odds.teams.split(' vs ')[0]) && (
                              <img 
                                src={getTeamIcon(odds.teams.split(' vs ')[0])!}
                                alt={`${odds.teams.split(' vs ')[0]} icon`}
                                className="w-6 h-6"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <span className="text-sm font-medium text-text">{odds.teams.split(' vs ')[0]}</span>
                          </>
                        ) : odds.type === 'away' ? (
                          <>
                            {getTeamIcon(odds.teams.split(' vs ')[1]) && (
                              <img 
                                src={getTeamIcon(odds.teams.split(' vs ')[1])!}
                                alt={`${odds.teams.split(' vs ')[1]} icon`}
                                className="w-6 h-6"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <span className="text-sm font-medium text-text">{odds.teams.split(' vs ')[1]}</span>
                          </>
                        ) : (
                          <span className="text-sm font-medium text-text">Draw</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-9 space-y-1">
                      <div className="text-xs text-muted">{odds.teams}</div>
                      <div className="text-xs text-muted">1x2</div>
                    </div>
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
                  <button 
                    className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-400 transition-colors"
                    onClick={() => {
                      setSelectedOdds(prev => prev.filter(
                        item => !(item.matchId === odds.matchId && item.type === odds.type)
                      ));
                      if (selectedOdds.length === 1) {
                        setIsBetSlipHiding(true);
                        setTimeout(() => {
                          setShowBetSlip(false);
                          setIsBetSlipHiding(false);
                        }, 500);
                      }
                    }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
            )}
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
            
            {/* Authentication and Betting States */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-2 mb-4 p-3 bg-bg/50 rounded-lg">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-muted">Please, login to place bet</span>
              </div>
            ) : bettingError ? (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="text-sm text-red-400 mb-3">{bettingError}</p>
                <button 
                  className="w-full py-3 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors"
                  onClick={() => navigate("/profile")}
                >
                  DEPOSIT
                </button>
              </div>
            ) : isPlacingBet ? (
              <div className="mb-4 p-4 text-center">
                <div className="w-8 h-8 mx-auto mb-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                </div>
                <p className="text-sm text-muted">Please wait. We are processing your bets.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-green-400">Ready to place your bet!</span>
              </div>
            )}
            
            <div className="flex gap-2 mb-3">
              <button className="flex-1 py-3 bg-surface border border-border text-text rounded-lg text-sm font-medium">SHARE</button>
              <button 
                className="flex-1 py-3 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePlaceBet}
                disabled={isPlacingBet}
              >
                {isAuthenticated ? "PLACE BET" : "LOGIN"}
              </button>
            </div>
            
            {!isAuthenticated && (
              <div className="text-center mb-3">
                <span className="text-xs text-muted">Don't you have an account? </span>
                <button 
                  className="text-xs text-yellow-500 hover:underline font-medium"
                  onClick={() => navigate("/signin")}
                >
                  Join Now!
                </button>
              </div>
            )}
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
        </div>
      )}
      
             {totalPages > 1 && (
         <div className="flex items-center justify-center gap-2 mt-8 px-2">
           <button
             onClick={() => setCurrentPage(1)}
             disabled={currentPage === 1}
             className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
               currentPage === 1
                 ? 'bg-surface text-muted cursor-not-allowed'
                 : 'bg-surface text-text hover:bg-surface/80 border border-border'
             }`}
           >
             First
           </button>
           
           <button
             onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
             disabled={currentPage === 1}
             className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
               currentPage === 1
                 ? 'bg-surface text-muted cursor-not-allowed'
                 : 'bg-surface text-text hover:bg-surface/80 border border-border'
             }`}
           >
             Previous
           </button>
           
           <div className="flex items-center gap-1">
             {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
               let pageNum;
               if (totalPages <= 5) {
                 pageNum = i + 1;
               } else if (currentPage <= 3) {
                 pageNum = i + 1;
               } else if (currentPage >= totalPages - 2) {
                 pageNum = totalPages - 4 + i;
               } else {
                 pageNum = currentPage - 2 + i;
               }
               
               return (
                 <button
                   key={pageNum}
                   onClick={() => setCurrentPage(pageNum)}
                   className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                     currentPage === pageNum
                       ? 'bg-accent text-white'
                       : 'bg-surface text-text hover:bg-surface/80 border border-border'
                   }`}
                 >
                   {pageNum}
                 </button>
               );
             })}
           </div>
           
           <button
             onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
             disabled={currentPage === totalPages}
             className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
               currentPage === totalPages
                 ? 'bg-surface text-muted cursor-not-allowed'
                 : 'bg-surface text-text hover:bg-surface/80 border border-border'
             }`}
           >
             Next
           </button>
           
           <button
             onClick={() => setCurrentPage(totalPages)}
             disabled={currentPage === totalPages}
             className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
               currentPage === totalPages
                 ? 'bg-surface text-muted cursor-not-allowed'
                 : 'bg-surface text-text hover:bg-surface/80 border border-border'
             }`}
           >
             Last
           </button>
         </div>
             )}
      
             {totalMatches > 0 && (
         <div className="text-center mt-4 text-sm text-muted">
           {selectedYear 
             ? selectedLeague
               ? `Showing ${totalMatches} ${selectedLeague.name} matches from ${selectedYear} only (${Math.ceil(totalMatches / matchesPerPage)} pages)`
               : `Showing ${totalMatches} matches from ${selectedYear} only (${Math.ceil(totalMatches / matchesPerPage)} pages)`
             : selectedLeague
               ? `Showing all ${totalMatches} ${selectedLeague.name} matches (${Math.ceil(totalMatches / matchesPerPage)} pages)`
               : `Showing ${Math.min(startIndex + 1, totalMatches)}-${Math.min(endIndex, totalMatches)} of ${totalMatches} matches`
           }
         </div>
             )}
         </>
      )}
      
      {/* Congratulations Alert */}
      <CongratulationsAlert
        isVisible={showCongratulations}
        onClose={() => setShowCongratulations(false)}
        betAmount={betDetails.betAmount}
        potentialWin={betDetails.potentialWin}
        teams={betDetails.teams}
      />
    </section>
  );
}
