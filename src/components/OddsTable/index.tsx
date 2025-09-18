import React, { useState, useEffect, useCallback } from "react";
import { useCountry } from "../../contexts/CountryContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../store/hooks";
import { getMatchingInfoAction } from "../../store/matchinginfo/actions";
import { authService } from "../../services/authService";
import { bettingService, BettingRecordCreate } from "../../services/bettingService";
import { MatchingInfo, GetMatchingInfoResponse } from "../../store/matchinginfo/types";
import { transformMatchingInfoToMatch } from "../../data/sampleData";
import { getTeamLogo } from "../../utils/teamLogos";
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
interface OddsTableProps {
  highlightMatchId?: number;
}

export default function OddsTable({ highlightMatchId }: OddsTableProps = {}) {
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
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 20;
  const [selectedOdds, setSelectedOdds] = useState<{
    matchId: string;
    type: 'home' | 'draw' | 'away';
    odds: string;
    teams: string;
    league: string;
    stake: string;
    matchDate?: string;
  }[]>([]);
  const [showBetSlip, setShowBetSlip] = useState(false);
  const [isBetSlipCollapsed, setIsBetSlipCollapsed] = useState(false);
  const [isBetSlipHiding, setIsBetSlipHiding] = useState(false);
  const [matchingInfo, setMatchingInfo] = useState<MatchingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  // API pagination state for total counts
  const [apiTotalPages, setApiTotalPages] = useState(1);
  const [apiTotalMatches, setApiTotalMatches] = useState(0);
  const MATCHES_PER_PAGE = 20; // Show only 20 matches per page
  const [animatingOdds, setAnimatingOdds] = useState<{
    matchId: string;
    type: 'home' | 'draw' | 'away';
    odds: string;
    teams: string;
    league: string;
    startPosition: { x: number; y: number };
  } | null>(null);
  const [selectedBetAmount, setSelectedBetAmount] = useState("10");
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [betDetails, setBetDetails] = useState<{
    betAmount: string;
    potentialWin: string;
    teams: string;
  }>({ betAmount: "10", potentialWin: "102.60", teams: "Team A vs Team B" });
  const [searchQuery, setSearchQuery] = useState("");
  
  // Betting states
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [bettingError, setBettingError] = useState<string>("");
  const [showBetConfirmation, setShowBetConfirmation] = useState(false);
  
  // Get user funds from auth context
  const userFunds = user?.funds_usd || 0;
  
  // Betting functions
  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }
    
    const totalBetAmount = selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0);
    if (totalBetAmount > userFunds) {
      setBettingError("Balance is not enough, plz add fund");
      return;
    }
    
    setBettingError("");
    setShowBetConfirmation(true);
  };

  const confirmBet = async () => {
    setShowBetConfirmation(false);
    setIsPlacingBet(true);
    
    try {
      const totalBetAmount = selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0);
      
      // Deduct funds from database using real API
      await authService.deductFunds(totalBetAmount);
      
      // Save each betting record to database with better error handling
      try {
        console.log('💾 Starting to save betting records...');
        
        // Check authentication first
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('No access token found - please sign in again');
        }
        
        console.log('🔐 Authentication check passed, proceeding to save records...');
        console.log('🔍 Debug info:', {
          tokenExists: !!token,
          tokenLength: token?.length,
          tokenStart: token?.substring(0, 20),
          baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001',
          currentUser: user?.email,
          selectedOddsCount: selectedOdds.length
        });
        
        for (const odds of selectedOdds) {
          // Get the ACTUAL match date and time from the selected match
          const originalMatch = getMatches().find(m => m.id === odds.matchId);
          let realMatchDate: string | null = null;
          
          console.log('🔍 Processing bet for match:', {
            matchId: odds.matchId,
            teams: odds.teams,
            originalMatch: originalMatch ? {
              id: originalMatch.id,
              date: originalMatch.date,
              time: originalMatch.time,
              status: originalMatch.status
            } : 'NOT FOUND'
          });
          
          if (originalMatch && originalMatch.date && originalMatch.time && originalMatch.time !== "LIVE") {
            try {
              // Create datetime string without timezone conversion
              // We want to preserve the exact time as shown in the UI
              const dateTimeString = `${originalMatch.date}T${originalMatch.time}`;
              
              // Create a date object but convert it to a timezone-naive string
              // This prevents timezone conversion issues
              const matchDateTime = new Date(dateTimeString);
              
              if (isNaN(matchDateTime.getTime())) {
                console.error('Invalid datetime from combined date+time:', {
                  originalDate: originalMatch.date,
                  originalTime: originalMatch.time,
                  combined: dateTimeString
                });
                realMatchDate = null;
              } else {
                // Create timezone-naive datetime string by manually formatting
                // This preserves the original time exactly as displayed
                const year = matchDateTime.getFullYear();
                const month = String(matchDateTime.getMonth() + 1).padStart(2, '0');
                const day = String(matchDateTime.getDate()).padStart(2, '0');
                const hours = String(matchDateTime.getHours()).padStart(2, '0');
                const minutes = String(matchDateTime.getMinutes()).padStart(2, '0');
                const seconds = String(matchDateTime.getSeconds()).padStart(2, '0');
                
                // Format as timezone-naive datetime string
                realMatchDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                
                console.log('📅 Successfully created match date (timezone-naive):', {
                  matchId: odds.matchId,
                  teams: odds.teams,
                  originalDate: originalMatch.date,
                  originalTime: originalMatch.time,
                  combinedDateTime: dateTimeString,
                  savedDateTime: realMatchDate,
                  displayFormat: matchDateTime.toLocaleString(),
                  preservedHour: hours,
                  preservedMinute: minutes,
                  originalHour: matchDateTime.getHours(),
                  originalMinute: matchDateTime.getMinutes()
                });
              }
            } catch (error) {
              console.error('❌ Error creating match date:', error);
              realMatchDate = null;
            }
          } else {
            console.log('⚠️ No valid match date/time found, saving without match_date');
          }

          const bettingRecord: BettingRecordCreate = {
            bet_amount: parseFloat(odds.stake || '10'),
            potential_win: parseFloat(odds.stake || '10') * americanToDecimal(odds.odds || '+100'),
            match_teams: odds.teams || 'Unknown Match',
            match_date: realMatchDate, // Save the REAL match date from interface (or null)
            match_league: odds.league || 'Unknown League',
            match_status: originalMatch?.status === "Live" ? "live" : "upcoming",
            selected_outcome: odds.type || 'home',
            selected_team: odds.type === 'home' ? (odds.teams || '').split(' vs ')[0] : 
                          odds.type === 'away' ? (odds.teams || '').split(' vs ')[1] : undefined,
            odds_value: odds.odds || '+100',
            odds_decimal: americanToDecimal(odds.odds || '+100')
          };
          
          console.log('📝 Creating betting record with data:', bettingRecord);
          
          try {
            const savedRecord = await bettingService.createBettingRecord(bettingRecord);
            console.log('✅ Betting record saved successfully:', savedRecord);
          } catch (saveError: any) {
            console.error('❌ Failed to save individual betting record:', saveError);
            throw saveError; // Re-throw to be caught by outer catch block
          }
        }
        console.log('🎉 All betting records saved successfully');
      } catch (recordError: any) {
        console.error('❌ Error saving betting records - FULL ERROR DETAILS:', {
          error: recordError,
          message: recordError.message,
          stack: recordError.stack,
          name: recordError.name,
          status: recordError.status,
          details: recordError.details
        });
        
        // Re-throw the original error without modification to see what's really happening
        throw recordError;
      }
      
      // Refresh user data to get updated funds
      const updatedUser = await authService.getCurrentUser();
      
      // Store bet details for congratulations
      setBetDetails({
        betAmount: totalBetAmount.toFixed(2),
        potentialWin: calculatePotentialWin().toFixed(2),
        teams: selectedOdds.map(odds => odds.teams).join(", ")
      });
      
      // Clear selected odds and show congratulations
      setSelectedOdds([]);
      setIsBetSlipHiding(true);
      setTimeout(() => {
        setShowBetSlip(false);
        setIsBetSlipHiding(false);
        // Show congratulations after betslip is fully hidden
        setTimeout(() => {
          setShowCongratulations(true);
        }, 100);
      }, 500);
      
      // Update auth context with new user data
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: true, user: updatedUser } 
      }));
      
      // Trigger betting data refresh for Dashboard
      window.dispatchEvent(new CustomEvent('bettingDataChanged', {
        detail: { message: 'New bet placed, refresh betting history' }
      }));
      
    } catch (error: any) {
      console.error('❌ BETTING ERROR - FULL DETAILS:', {
        error,
        message: error.message,
        stack: error.stack,
        name: error.name,
        status: error.status,
        details: error.details,
        fullError: JSON.stringify(error, null, 2)
      });
      
      // Show the actual error message to help with debugging
      setBettingError(error.message || "Unknown error occurred");
      setShowBetConfirmation(true); // Show confirmation again on error
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
      date: new Date().toISOString().split('T')[0], // Today's date
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
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow's date
      bookmakers: [
        { name: "Bet365", home: "-110", away: "-110", draw: undefined },
        { name: "DraftKings", home: "-105", away: "-115", draw: undefined },
        { name: "FanDuel", home: "-108", away: "-112", draw: undefined }
      ]
    },
    {
      id: "3",
      time: "15:00",
      status: "Upcoming",
      teams: "Arsenal vs Chelsea",
      sport: "Football",
      league: "Premier League",
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Day after tomorrow
      bookmakers: [
        { name: "Bet365", home: "+245", away: "-312", draw: "+190" },
        { name: "DraftKings", home: "+250", away: "-305", draw: "+185" },
        { name: "FanDuel", home: "+240", away: "-320", draw: "+195" }
      ]
    },
    {
      id: "4",
      time: "20:45",
      status: "Upcoming",
      teams: "Barcelona vs Real Madrid",
      sport: "Football",
      league: "La Liga",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
      bookmakers: [
        { name: "Bet365", home: "+180", away: "+165", draw: "+210" },
        { name: "DraftKings", home: "+175", away: "+170", draw: "+205" },
        { name: "FanDuel", home: "+185", away: "+160", draw: "+215" }
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
    // If we have API data, use it
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
      } else if (selectedCountry) {
        filteredMatches = filteredMatches.filter(match => 
          match.country.toLowerCase() === selectedCountry.name.toLowerCase()
        );
      }
      
      if (filteredMatches.length === 0 && selectedMarket !== "Results" && selectedMarket !== "Next Matches" && !selectedYear && !searchQuery.trim()) {
        filteredMatches = matchingInfo;
      }
      
      return transformMatchingInfoToMatch(filteredMatches);
    }
    
    if (selectedLeague && selectedLeague.matches.length > 0) {
      const leagueMatches = selectedLeague.matches.map((match: any) => ({
        id: match.id,
        time: match.time,
        status: "Upcoming" as const,
        teams: `${match.team1} vs ${match.team2}`,
        sport: "Football",
        league: selectedLeague.name,
        bookmakers: [
          { name: "Bet365", home: match.homeOdds || "+150", away: match.awayOdds || "-180", draw: match.drawOdds || "+200" },
          { name: "DraftKings", home: match.homeOdds || "+155", away: match.awayOdds || "-175", draw: match.drawOdds || "+195" },
          { name: "FanDuel", home: match.homeOdds || "+145", away: match.awayOdds || "-185", draw: match.drawOdds || "+205" }
        ],
        date: match.date || new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        bookmakerCount: match.bookmakers || 3
      }));
      
      // Check if matches have valid odds
      const hasValidOdds = leagueMatches.some((match: Match) => 
        match.bookmakers.some((bm: Bookmaker) => bm.home && bm.away)
      );
      
      if (!hasValidOdds) {
        console.log('⚠️ League matches have no valid odds, using default matches');
        return defaultMatches;
      }
      
      return leagueMatches;
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
    
    // If no API data, always return default matches as fallback
    console.log('⚠️ No API data available, using default matches');
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
  
  // Use server-side pagination - no need to slice data since API already returns paginated results
  const allMatches = allGroupedMatches.flatMap(({ matches }) => matches);
  
  // For pagination info display - use API data when available, fallback to local count
  const totalMatches = apiTotalMatches > 0 ? apiTotalMatches : allMatches.length;
  const totalPages = apiTotalPages > 0 ? apiTotalPages : Math.ceil(allMatches.length / matchesPerPage);
  
  // For display calculations
  const startIndex = (currentPage - 1) * matchesPerPage;
  const endIndex = startIndex + matchesPerPage;
  
  // No slicing needed - API already returns the correct page data
  const groupedMatches = allGroupedMatches;
  const handleOddsClick = (match: Match, type: 'home' | 'draw' | 'away', odds: string, event: React.MouseEvent) => {
    const selectedBet = {
      matchId: match.id,
      type,
      odds,
      teams: match.teams,
      league: match.league,
      stake: "10",
      matchDate: match.date
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
    // Update all individual stakes when buttons are clicked
    setSelectedOdds(prev => prev.map(odds => ({
      ...odds,
      stake: amount
    })));
  };

  const handleIndividualStakeChange = (matchId: string, type: 'home' | 'draw' | 'away', newStake: string) => {
    setSelectedOdds(prev => prev.map(odds => 
      odds.matchId === matchId && odds.type === type
        ? { ...odds, stake: newStake }
        : odds
    ));
  };

  // Convert American odds to decimal odds
  const americanToDecimal = (americanOdds: string): number => {
    const odds = parseFloat(americanOdds.replace('+', ''));
    if (odds > 0) {
      return (odds / 100) + 1;
    } else {
      return (100 / Math.abs(odds)) + 1;
    }
  };

  // Calculate total odds (multiply all decimal odds)
  const calculateTotalOdds = (): number => {
    return selectedOdds.reduce((total, odds) => {
      const decimalOdd = americanToDecimal(odds.odds);
      return total * decimalOdd;
    }, 1);
  };

  // Calculate potential win based on individual bets (Single mode)
  const calculatePotentialWin = (): number => {
    return selectedOdds.reduce((totalWin, odds) => {
      const stake = parseFloat(odds.stake || '0');
      const decimalOdd = americanToDecimal(odds.odds);
      return totalWin + (stake * decimalOdd);
    }, 0);
  };

  // Convert decimal odds back to American/Moneyline format
  const decimalToAmerican = (decimalOdds: number): string => {
    if (decimalOdds >= 2.0) {
      return `+${Math.round((decimalOdds - 1) * 100)}`;
    } else {
      return `${Math.round(-100 / (decimalOdds - 1))}`;
    }
  };

  // Get total odds in American format
  const getTotalOddsAmerican = (): string => {
    const decimalOdds = calculateTotalOdds();
    return decimalToAmerican(decimalOdds);
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
  const fetchCurrentPageMatches = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching with selectedYear:", selectedYear);
      
      if (selectedYear) {
        // ⚡ SINGLE PAGE FETCH - Much faster!
        const params: any = { 
          page: currentPage,
          size: MATCHES_PER_PAGE,
          season: selectedYear
        };
        
        if (selectedLeague && selectedCountry) {
          params.league = selectedLeague.name;
          params.country = selectedCountry?.name; // IMPORTANT: Filter by country too!
        }
        
        // Add date filtering for "Next Matches"
        if (selectedMarket === "Next Matches") {
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
          params.date_from = today; // Only future matches
        }
        
        console.log(`🚀 Fetching page ${currentPage} for year ${selectedYear}, market: ${selectedMarket}`, params);
        const result = await dispatch(getMatchingInfoAction(params)).unwrap();
        
        setMatchingInfo(result.odds);
        setApiTotalPages(result.pages);
        setApiTotalMatches(result.total);
        
        console.log(`✅ Loaded ${result.odds.length} matches (Page ${currentPage}/${result.pages})`);
      } else if (selectedLeague) {
        // ⚡ SINGLE PAGE FETCH for league - Much faster!
        const params: any = { 
          page: currentPage,
          size: MATCHES_PER_PAGE,
          league: selectedLeague.name,
          country: selectedCountry?.name // IMPORTANT: Filter by country too!
        };
        
        // Add date filtering for "Next Matches"
        if (selectedMarket === "Next Matches") {
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
          params.date_from = today; // Only future matches
        }
        
        console.log(`🚀 Fetching page ${currentPage} for league ${selectedLeague.name}, market: ${selectedMarket}`, params);
        const result = await dispatch(getMatchingInfoAction(params)).unwrap();
        
        setMatchingInfo(result.odds);
        setApiTotalPages(result.pages);
        setApiTotalMatches(result.total);
        
        console.log(`✅ Loaded ${result.odds.length} matches (Page ${currentPage}/${result.pages})`);
      } else {
        const params: any = { 
          page: currentPage, 
          size: MATCHES_PER_PAGE
        };
        
        if (selectedCountry && selectedCountry.name === "Brazil") {
          params.country = "Brazil";
          console.log("Sending country parameter:", params.country);
        }
        
        // Add date filtering for "Next Matches"
        if (selectedMarket === "Next Matches") {
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
          params.date_from = today; // Only future matches
        }
        
        console.log(`🚀 Fetching page ${currentPage}, market: ${selectedMarket}`, params);
        const result = await dispatch(getMatchingInfoAction(params)).unwrap();
        console.log("✅ API result:", result);
        setMatchingInfo(result.odds);
        setApiTotalPages(result.pages);
        setApiTotalMatches(result.total);
        setCurrentPage(result.page);
      }
    } catch (error) {
      console.error("Error fetching matching info:", error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, currentPage, selectedYear, selectedCountry, selectedLeague, selectedMarket]);
    
  
  useEffect(() => {
    fetchCurrentPageMatches();
  }, [fetchCurrentPageMatches]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setSearchQuery("");
    setCurrentPage(1);
  }, [selectedLeague, selectedYear, selectedCountry, selectedMarket]);
  

  // Add global click listener for betslip collapse
  useEffect(() => {
    if (showBetSlip) {
      document.addEventListener('click', handleOutsideClick);
      return () => {
        document.removeEventListener('click', handleOutsideClick);
      };
    }
  }, [showBetSlip, selectedOdds]);

  // Reset bet amount to $10 when betslip opens
  useEffect(() => {
    if (showBetSlip) {
      setSelectedBetAmount("10");
    }
  }, [showBetSlip]);
  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  }
    return (
    <section>
      {selectedLeague && (
        <div className="text-sm text-muted mb-4 px-2">
          Home {'>'} Football {'>'} {selectedCountry?.name || getCountryNameFromLeague(selectedLeague.name)} {'>'} {selectedLeague.name}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0 px-2">
        <div>
                               <h2 className="text-xl sm:text-2xl font-bold text-text">
            {searchQuery.trim() 
              ? `Search Results for "${searchQuery}"`
              : selectedYear 
                ? selectedLeague
                  ? `${selectedLeague.name} ${selectedYear} Results`
                  : `${selectedYear} Results Only` 
                : selectedLeague && selectedCountry
                  ? `${selectedCountry.name} ${selectedLeague.name} Matches & Odds`
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
                 ? `${totalMatches} ${selectedCountry?.name} ${selectedLeague.name} matches from ${selectedYear}`
                 : selectedYear && !selectedLeague
                   ? `${totalMatches} matches from ${selectedYear}`
                   : selectedLeague && !selectedYear
                     ? `${totalMatches} ${selectedCountry?.name} ${selectedLeague.name} matches`
                     : selectedMarket === "Results"
                       ? `${totalMatches} historical matches`
                       : selectedMarket === "Next Matches"
                         ? `${totalMatches} upcoming matches`
                         : `${totalMatches} matches`
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
              {[2021, 2022, 2023, 2024, 2025].map(year => (
                <button
                  key={year}
                                     onClick={() => {
                     const newYear = selectedYear === year ? undefined : year;
                     console.log("Year button clicked:", year, "new selectedYear:", newYear);
                     setSelectedYear(newYear);
                     setCurrentPage(1); 
                     setCurrentPage(1); 
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
                 setCurrentPage(1); // Reset API page
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
              <div 
                key={match.id} 
                className={`relative overflow-hidden rounded-xl p-4 transition-all duration-500 ${
                  highlightMatchId && parseInt(match.id) === highlightMatchId 
                    ? 'bg-gradient-to-br from-yellow-400/20 via-orange-400/15 to-red-400/10 border-2 border-yellow-400 shadow-2xl shadow-yellow-400/30 transform scale-105 animate-glow-pulse' 
                    : 'bg-surface border border-border hover:shadow-lg'
                }`}
              >
                {highlightMatchId && parseInt(match.id) === highlightMatchId && (
                  <>
                    {/* Animated background glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-red-400/20 animate-pulse rounded-xl"></div>
                    
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer opacity-40"></div>
                    
                    {/* Sparkle effects */}
                    <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-sparkle"></div>
                    <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-orange-400 rounded-full animate-sparkle animation-delay-300"></div>
                    <div className="absolute top-1/2 left-2 w-1 h-1 bg-red-400 rounded-full animate-sparkle animation-delay-700"></div>
                    
                    {/* Rotating border gradient */}
                    <div className="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 animate-spin-slow opacity-60"></div>
                    
                    {/* Floating particles */}
                    <div className="absolute top-1 right-1 w-1 h-1 bg-yellow-300 rounded-full animate-bounce-gentle"></div>
                    <div className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-orange-300 rounded-full animate-bounce-gentle animation-delay-500"></div>
                  </>
                )}
                
                {/* Content with relative positioning to stay above effects */}
                <div className="relative z-10">
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
                         {getTeamLogo(match.teams.split(' vs ')[0], selectedCountry?.name || getCountryNameFromLeague(match.league)) && (
                           <img 
                             src={getTeamLogo(match.teams.split(' vs ')[0], selectedCountry?.name || getCountryNameFromLeague(match.league))!}
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
                         {getTeamLogo(match.teams.split(' vs ')[1], selectedCountry?.name || getCountryNameFromLeague(match.league)) && (
                           <img 
                             src={getTeamLogo(match.teams.split(' vs ')[1], selectedCountry?.name || getCountryNameFromLeague(match.league))!}
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
                  className={`relative grid grid-cols-12 gap-1 px-2 py-2 transition-all duration-500 text-sm border-b ${
                    highlightMatchId && parseInt(match.id) === highlightMatchId
                      ? 'bg-gradient-to-r from-yellow-400/15 via-orange-400/10 to-red-400/15 border-l-4 border-l-yellow-400 shadow-lg shadow-yellow-400/20 transform scale-[1.02]'
                      : 'hover:bg-surface/30'
                  } ${
                    isLastMatchOfDay ? 'border-b border-gray-400/50' : 'border-b border-border/30'
                  }`}
                >
                  {highlightMatchId && parseInt(match.id) === highlightMatchId && (
                    <>
                      {/* Animated left border */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 via-orange-400 to-red-400 animate-pulse"></div>
                      
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-60"></div>
                      
                      {/* Sparkle dots */}
                      <div className="absolute top-1 right-1 w-1 h-1 bg-yellow-400 rounded-full animate-sparkle"></div>
                      <div className="absolute bottom-1 right-1 w-1 h-1 bg-orange-400 rounded-full animate-sparkle animation-delay-500"></div>
                      
                      {/* Floating indicator */}
                      <div className="absolute top-1/2 right-0 w-0.5 h-4 bg-gradient-to-b from-yellow-400 to-orange-400 animate-bounce-gentle"></div>
                    </>
                  )}

                  <div className="col-span-2 flex items-center justify-center">
                    <div className="text-sm text-muted">{match.date}</div>
                  </div>
                  
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-sm text-muted">{match.time}</span>
                  </div>
                  
                  <div className="col-span-4 flex items-center">
                    <div className="flex items-center gap-1 w-full min-w-0">
                      {getTeamLogo(match.teams.split(' vs ')[0], selectedCountry?.name || getCountryNameFromLeague(match.league)) && (
                        <img 
                          src={getTeamLogo(match.teams.split(' vs ')[0], selectedCountry?.name || getCountryNameFromLeague(match.league))!}
                          alt={`${match.teams.split(' vs ')[0]} icon`}
                          className="w-4 h-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-sm font-medium text-text truncate">{match.teams.split(' vs ')[0]}</span>
                      <span className="text-sm text-muted font-bold px-1">VS</span>
                      {getTeamLogo(match.teams.split(' vs ')[1], selectedCountry?.name || getCountryNameFromLeague(match.league)) && (
                        <img 
                          src={getTeamLogo(match.teams.split(' vs ')[1], selectedCountry?.name || getCountryNameFromLeague(match.league))!}
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
                            {getTeamLogo(odds.teams.split(' vs ')[0], selectedCountry?.name) && (
                              <img
                                src={getTeamLogo(odds.teams.split(' vs ')[0], selectedCountry?.name)!}
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
                            {getTeamLogo(odds.teams.split(' vs ')[1], selectedCountry?.name) && (
                              <img
                                src={getTeamLogo(odds.teams.split(' vs ')[1], selectedCountry?.name)!}
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
                         placeholder="10"
                         value={odds.stake}
                         onChange={(e) => handleIndividualStakeChange(odds.matchId, odds.type, e.target.value)}
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
            
            {/* Stake Amount Buttons */}
            <div className="flex gap-2 mb-4">
              <button 
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedBetAmount === "10" 
                    ? "bg-yellow-500 text-black" 
                    : "bg-surface border border-border text-text hover:bg-bg/50"
                }`}
                onClick={() => handleBetAmountClick("10")}
              >
                10
              </button>
              <button 
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedBetAmount === "20" 
                    ? "bg-yellow-500 text-black" 
                    : "bg-surface border border-border text-text hover:bg-bg/50"
                }`}
                onClick={() => handleBetAmountClick("20")}
              >
                20
              </button>
              <button 
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedBetAmount === "50" 
                    ? "bg-yellow-500 text-black" 
                    : "bg-surface border border-border text-text hover:bg-bg/50"
                }`}
                onClick={() => handleBetAmountClick("50")}
              >
                50
              </button>
            </div>
            
                         <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total Bet</span>
                <span className="text-text">${selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">POTENTIAL WIN</span>
                <span className="text-text">${calculatePotentialWin().toFixed(2)}</span>
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
               ? `Showing all ${totalMatches} ${selectedCountry?.name} ${selectedLeague.name} matches (${Math.ceil(totalMatches / matchesPerPage)} pages)`
               : `Showing ${Math.min(startIndex + 1, totalMatches)}-${Math.min(endIndex, totalMatches)} of ${totalMatches} matches`
           }
         </div>
       )}

      {/* Bet Confirmation Modal */}
      {showBetConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Confirm Your Bet</h3>
              <button
                onClick={() => setShowBetConfirmation(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-white text-lg font-medium mb-2">Are you really going to bet?</p>
              </div>

              {/* Bet Details */}
              <div className="space-y-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Your Bets:</h4>
                  <div className="space-y-2">
                    {selectedOdds.map((odds, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <div>
                          <div className="text-gray-300">{odds.teams}</div>
                          <div className="text-gray-400 text-xs">
                            {odds.type === 'home' ? odds.teams.split(' vs ')[0] : 
                             odds.type === 'away' ? odds.teams.split(' vs ')[1] : 'Draw'} 
                            ({odds.odds})
                          </div>
                        </div>
                        <div className="text-white font-medium">${odds.stake}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fund Information */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Bet Amount:</span>
                      <span className="text-white font-medium">
                        ${selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Potential Win:</span>
                      <span className="text-green-400 font-medium">
                        ${calculatePotentialWin().toFixed(2)}
                      </span>
                    </div>
                    <hr className="border-gray-700 my-2" />
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Balance:</span>
                      <span className="text-blue-400 font-medium">${userFunds.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">After Bet Balance:</span>
                      <span className="text-red-400 font-medium">
                        ${(userFunds - selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBetConfirmation(false)}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBet}
                  className="flex-1 py-3 px-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-medium transition-colors"
                >
                  Yes, Place Bet
                </button>
              </div>
            </div>
          </div>
         </div>
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
