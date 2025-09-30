import React, { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useCountry } from "../../contexts/CountryContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOddsFormat } from "../../hooks/useOddsFormat";
import { OddsConverter } from "../../utils/oddsConverter";
import { calculateBettingReturnFromAmerican, calculateBettingReturnFromDecimal } from "../../utils/bettingCalculator";
import { useAppDispatch } from "../../store/hooks";
import { getMatchingInfoAction } from "../../store/matchinginfo/actions";
import { authService } from "../../services/authService";
import { bettingService, BettingRecordCreate } from "../../services/bettingService";
import { MatchingInfo, GetMatchingInfoResponse } from "../../store/matchinginfo/types";
import { transformMatchingInfoToMatch } from "../../data/sampleData";
import { getTeamLogo } from "../../utils/teamLogos";
import FantasticLoader from "../FantasticLoader";
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
  initialSearchTerm?: string;
}

export default function OddsTable({ highlightMatchId, initialSearchTerm }: OddsTableProps = {}) {
  const dispatch = useAppDispatch();
  const { selectedCountry, selectedLeague, setSelectedLeague, countries } = useCountry();
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { addNewBetNotification } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  

  // Helper function to check if a match should be highlighted
  const isMatchHighlighted = (match: Match): boolean => {
    if (!highlightMatchId) return false;
    
    // Parse teams from the match
    const [homeTeam, awayTeam] = match.teams.split(' vs ');
    
    // First try exact ID match
    if (parseInt(match.id) === highlightMatchId) {
      console.log('🎯 Match highlighted by ID:', match.id, 'Teams:', homeTeam, 'vs', awayTeam);
      return true;
    }
    
    // If ID doesn't match, try to extract team names from URL and match them
    const urlParams = new URLSearchParams(window.location.search);
    const highlightParam = urlParams.get('highlight');
    
    if (highlightParam && highlightParam.includes('_')) {
      const parts = highlightParam.split('_');
      if (parts.length >= 3) {
        const targetHomeTeam = parts[1].replace(/_/g, ' ').toLowerCase();
        const targetAwayTeam = parts[2].replace(/_/g, ' ').toLowerCase();
        
        console.log('🔍 Checking match for highlighting:', {
          currentMatch: `${homeTeam} vs ${awayTeam}`,
          targetMatch: `${targetHomeTeam} vs ${targetAwayTeam}`,
          matchId: match.id,
          highlightParam
        });
        
        // Flexible team name matching
        const normalizeTeamName = (name: string) => {
          return name.toLowerCase()
            .replace(/fc\s+/g, '') // Remove "FC "
            .replace(/\s+fc$/g, '') // Remove " FC" at end
            .replace(/^the\s+/g, '') // Remove "The " at start
            .replace(/[^\w\s]/g, '') // Remove special characters
            .trim();
        };
        
        const normalizedHomeTarget = normalizeTeamName(targetHomeTeam);
        const normalizedAwayTarget = normalizeTeamName(targetAwayTeam);
        const normalizedHomeMatch = normalizeTeamName(homeTeam);
        const normalizedAwayMatch = normalizeTeamName(awayTeam);
        
        console.log('🔍 Normalized team names:', {
          target: `${normalizedHomeTarget} vs ${normalizedAwayTarget}`,
          current: `${normalizedHomeMatch} vs ${normalizedAwayMatch}`
        });
        
        // Check if team names match (either direction)
        const homeMatch = normalizedHomeMatch.includes(normalizedHomeTarget) ||
                         normalizedHomeTarget.includes(normalizedHomeMatch) ||
                         normalizedHomeMatch === normalizedHomeTarget;
        
        const awayMatch = normalizedAwayMatch.includes(normalizedAwayTarget) ||
                         normalizedAwayTarget.includes(normalizedAwayMatch) ||
                         normalizedAwayMatch === normalizedAwayTarget;
        
        console.log('🔍 Match results:', { homeMatch, awayMatch });
        
        if (homeMatch && awayMatch) {
          console.log('✅ Match highlighted by team names:', {
            target: `${targetHomeTeam} vs ${targetAwayTeam}`,
            found: `${homeTeam} vs ${awayTeam}`,
            matchId: match.id
          });
          return true;
        }
        
        // Also try reverse matching (home vs away swapped)
        const homeMatchReversed = normalizedHomeMatch.includes(normalizedAwayTarget) ||
                                 normalizedAwayTarget.includes(normalizedHomeMatch) ||
                                 normalizedHomeMatch === normalizedAwayTarget;
        
        const awayMatchReversed = normalizedAwayMatch.includes(normalizedHomeTarget) ||
                                 normalizedHomeTarget.includes(normalizedAwayMatch) ||
                                 normalizedAwayMatch === normalizedHomeTarget;
        
        console.log('🔍 Reverse match results:', { homeMatchReversed, awayMatchReversed });
        
        if (homeMatchReversed && awayMatchReversed) {
          console.log('✅ Match highlighted by REVERSED team names:', {
            target: `${targetHomeTeam} vs ${targetAwayTeam}`,
            found: `${homeTeam} vs ${awayTeam}`,
            matchId: match.id,
            note: 'Teams were in reverse order'
          });
          return true;
        }
        
        // If no match found, log why
        console.log('❌ No match found for:', {
          target: `${targetHomeTeam} vs ${targetAwayTeam}`,
          current: `${homeTeam} vs ${awayTeam}`,
          normalizedTarget: `${normalizedHomeTarget} vs ${normalizedAwayTarget}`,
          normalizedCurrent: `${normalizedHomeMatch} vs ${normalizedAwayMatch}`,
          homeMatch, awayMatch, homeMatchReversed, awayMatchReversed
        });
        
        // Special case: If we're looking for BEST ODDS matches that don't exist in the main list,
        // we'll log it but NOT highlight anything - only exact matches should be highlighted
        if (highlightMatchId === 1 || highlightMatchId === 2 || highlightMatchId === 3) {
          console.log('🔄 BEST ODDS match not found in current league:', {
            targetMatch: `${targetHomeTeam} vs ${targetAwayTeam}`,
            currentMatch: `${homeTeam} vs ${awayTeam}`,
            matchId: match.id,
            league: match.league,
            note: 'This is expected - BEST ODDS matches may not exist in the current league'
          });
          
          return false; // Don't highlight anything if it's not an exact match
        }
      }
    }
    
    return false;
  };

  // Debug highlighting
  useEffect(() => {
    if (highlightMatchId) {
      console.log('🎯 OddsTable received highlightMatchId:', highlightMatchId);
    }
  }, [highlightMatchId]);

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
    console.log(`OddsTable: Converting ${odds} -> ${decimalOdds} -> ${formatted} (format: ${oddsFormat})`);
    return formatted;
  };
  
  // Debug authentication state
  console.log('🎯 OddsTable: Auth state - user:', user?.email || 'null', 'isAuthenticated:', isAuthenticated);

  // Function to fetch user's existing bets and get match_ids
  const fetchUserExistingBets = async () => {
    console.log('🚀 fetchUserExistingBets called');
    console.log('🔐 isAuthenticated:', isAuthenticated);
    console.log('👤 user:', user);
    console.log('🆔 user?.id:', user?.id);
    
    if (!isAuthenticated || !user?.id) {
      console.log('🚫 Not authenticated or no user ID, clearing bets');
      setUserBetMatchIds(new Set());
      return;
    }

    try {
      console.log('🔄 Fetching user existing bets for match_id comparison...');
      console.log('👤 Current user ID:', user.id, 'type:', typeof user.id);
      
      const response = await bettingService.getBettingRecords(1, 50); // Get up to 50 records (API limit)
      
      console.log('📋 Raw betting records response:', response);
      console.log('📋 Response type:', typeof response);
      console.log('📋 Response.records:', response?.records);
      console.log('📋 Response.records length:', response?.records?.length);
      
      if (response && response.records) {
        console.log('📊 Total betting records found:', response.records.length);
        
        // Filter records for current user first
        const userRecords = response.records.filter(record => {
          const isUserRecord = record.user_id === user.id;
          console.log(`👤 Record ${record.id} - user_id: ${record.user_id} (type: ${typeof record.user_id}), current user: ${user.id} (type: ${typeof user.id}), match: ${isUserRecord}`);
          return isUserRecord;
        });
        
        console.log(`👤 Records for current user (${user.id}):`, userRecords.length);
        
        // Log each record to see the data structure
        userRecords.forEach((record, index) => {
          console.log(`📝 User Record ${index + 1}:`, {
            id: record.id,
            user_id: record.user_id,
            match_id: record.match_id,
            match_teams: record.match_teams,
            match_id_type: typeof record.match_id,
            bet_status: record.bet_status
          });
        });
        
        // Extract match_ids from user's betting records
        const matchIds = new Set(
          userRecords
            .filter(record => {
              const hasMatchId = record.match_id !== null && record.match_id !== undefined;
              console.log(`🔍 User Record ${record.id} has match_id: ${hasMatchId}, value: ${record.match_id}, type: ${typeof record.match_id}`);
              return hasMatchId;
            })
            .map(record => {
              const matchIdString = record.match_id!.toString();
              console.log(`🔄 Converting match_id ${record.match_id} (${typeof record.match_id}) to string: "${matchIdString}"`);
              return matchIdString;
            })
        );
        
        setUserBetMatchIds(matchIds);
        console.log('✅ User existing bets loaded:', matchIds.size, 'matches');
        console.log('📊 Match IDs user has bet on (as strings):', Array.from(matchIds));
        console.log('📊 Match IDs user has bet on (types):', Array.from(matchIds).map(id => ({ value: id, type: typeof id })));
        
        // Enable odds buttons after user bets are loaded
        setIsOddsDisabled(false);
      } else {
        console.log('⚠️ No records found in response');
        console.log('⚠️ Response structure:', {
          hasResponse: !!response,
          hasRecords: !!(response && response.records),
          responseKeys: response ? Object.keys(response) : 'no response'
        });
        
        // Enable odds buttons even when no records are found
        setIsOddsDisabled(false);
      }
    } catch (error) {
      console.log('❌ Error fetching user existing bets:', error);
      // Enable odds buttons even if there's an error fetching user bets
      setIsOddsDisabled(false);
    }
  };

  // Function to check if user has already bet on a specific match
  const hasUserBetOnMatch = (matchId: string): boolean => {
    const result = userBetMatchIds.has(matchId);
    console.log(`🔍 Checking if user bet on match "${matchId}" (type: ${typeof matchId}): ${result}`);
    console.log('📊 Available match IDs in set:', Array.from(userBetMatchIds));
    console.log('📊 Match ID comparison:', {
      input: matchId,
      inputType: typeof matchId,
      availableIds: Array.from(userBetMatchIds),
      hasMatch: result
    });
    return result;
  };

  // Fetch user's existing bets when component loads or user changes
  useEffect(() => {
    console.log('🔄 useEffect triggered - fetchUserExistingBets will be called');
    console.log('🔐 useEffect - isAuthenticated:', isAuthenticated);
    console.log('👤 useEffect - user?.id:', user?.id);
    
    // Disable odds buttons during loading if authenticated
    if (isAuthenticated) {
      setIsOddsDisabled(true);
    }
    
    fetchUserExistingBets();
  }, [isAuthenticated, user?.id]);

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
  
  // State to track matches user has already bet on
  const [userBetMatchIds, setUserBetMatchIds] = useState<Set<string>>(new Set());
  
  // State to track if odds buttons should be disabled during data loading
  const [isOddsDisabled, setIsOddsDisabled] = useState(false);
  
  // Validation function to check for multiple bets on same match
  const validateBettingSelections = () => {
    const matchCounts = new Map<string, number>();
    const invalidMatchIds = new Set<string>();
    
    selectedOdds.forEach(odds => {
      const currentCount = matchCounts.get(odds.matchId) || 0;
      matchCounts.set(odds.matchId, currentCount + 1);
      
      if (currentCount + 1 > 1) {
        invalidMatchIds.add(odds.matchId);
      }
    });
    
    return {
      isValid: invalidMatchIds.size === 0,
      invalidMatchIds: Array.from(invalidMatchIds)
    };
  };
  
  const bettingValidation = validateBettingSelections();
  
  // Function to check if a match has invalid selections
  const isMatchInvalid = (matchId: string): boolean => {
    return bettingValidation.invalidMatchIds.includes(matchId);
  };
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
  // Get search term from URL parameters (this will be updated when URL changes)
  const urlSearchTerm = searchParams.get('search') || "";
  
  const [searchQuery, setSearchQuery] = useState(urlSearchTerm || initialSearchTerm || "");
  
  // State to track if search should be triggered
  const [shouldTriggerSearch, setShouldTriggerSearch] = useState(false);
  
  // State to track if user is actively editing the search input
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  
  // State to track if we're switching markets (to prevent flash of old data)
  const [isSwitchingMarket, setIsSwitchingMarket] = useState(false);
  const [switchingToMarket, setSwitchingToMarket] = useState<string>("");
  
  // Ref to track the current switching timeout to prevent race conditions
  const switchingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref to track last click time for debouncing
  const lastClickTimeRef = useRef<number>(0);
  
  // Robust market switching function that handles rapid clicks
  const handleMarketSwitch = useCallback((market: string) => {
    const now = Date.now();
    console.log("Market switch requested:", market, "Current market:", selectedMarket, "Time since last click:", now - lastClickTimeRef.current);
    
    // Debounce rapid clicks (ignore clicks within 300ms)
    if (now - lastClickTimeRef.current < 300) {
      console.log("Ignoring rapid click - debouncing");
      return;
    }
    
    // If already switching or clicking the same market, ignore
    if (isSwitchingMarket || market === selectedMarket) {
      console.log("Ignoring market switch - already switching or same market");
      return;
    }
    
    // Update last click time
    lastClickTimeRef.current = now;
    
    // Clear any existing timeout
    if (switchingTimeoutRef.current) {
      clearTimeout(switchingTimeoutRef.current);
      switchingTimeoutRef.current = null;
    }
    
    // Set switching state immediately
    setIsSwitchingMarket(true);
    setSwitchingToMarket(market);
    setMatchingInfo([]);
    setLoading(true);
    
    // Use a longer timeout for more stable switching
    switchingTimeoutRef.current = setTimeout(() => {
      console.log("Executing market switch to:", market);
      setSelectedMarket(market);
      setCurrentPage(1);
      if (market === "Next Matches") {
        setSelectedYear(undefined);
      }
      switchingTimeoutRef.current = null;
    }, 150);
  }, [isSwitchingMarket, selectedMarket]);
  
  // Betting states
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [bettingError, setBettingError] = useState<string>("");
  const [showBetConfirmation, setShowBetConfirmation] = useState(false);
  const [isConfirmingBet, setIsConfirmingBet] = useState(false);
  const [duplicateBetError, setDuplicateBetError] = useState<string>("");
  
  // Get user funds from auth context
  const userFunds = user?.funds_usd || 0;
  
  // Betting functions
  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }
    
    // Check for duplicate bets first
    const duplicateMatches = selectedOdds.filter(odds => hasUserBetOnMatch(odds.matchId));
    if (duplicateMatches.length > 0) {
      setDuplicateBetError("Bet Placed Already!");
      return;
    }
    
    // Check for invalid betting selections
    if (!bettingValidation.isValid) {
      setBettingError("Cannot place multiple bets on the same match");
      return;
    }
    
    // Prevent rapid clicking
    if (isPlacingBet || isConfirmingBet || showBetConfirmation) {
      console.log('🚫 Bet placement already in progress, ignoring click');
      return;
    }
    
    const totalBetAmount = selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0);
    
    // Check if bet amount is greater than 0
    if (totalBetAmount <= 0) {
      setBettingError("Amount must be greater than 0");
      return;
    }
    
    if (totalBetAmount > userFunds) {
      setBettingError("Balance is not enough, plz add fund");
      return;
    }
    
    setBettingError("");
    setDuplicateBetError("");
    setShowBetConfirmation(true);
  };

  const confirmBet = async () => {
    setIsConfirmingBet(true);
    
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

          // Calculate betting return using consistent utility function
          const stake = parseFloat(odds.stake || '10');
          // Detect if odds are already in decimal format or need conversion
          const oddsString = odds.odds || '2.0';
          const isDecimalFormat = oddsString.includes('.') || (parseFloat(oddsString) >= 1.0 && parseFloat(oddsString) <= 10.0);
          
          const bettingCalculation = isDecimalFormat 
            ? calculateBettingReturnFromDecimal(stake, oddsString)
            : calculateBettingReturnFromAmerican(stake, oddsString);
          
          const bettingRecord: BettingRecordCreate = {
            bet_amount: stake,
            // Potential win = Total Return = Stake × Decimal Odds
            // Example: $10 stake at 2.5 odds = $25 total return
            potential_win: bettingCalculation.totalReturn,
            match_id: odds.matchId ? parseInt(odds.matchId.toString()) : null, // Store exact match ID
            match_teams: odds.teams || 'Unknown Match',
            match_date: realMatchDate, // Save the REAL match date from interface (or null)
            match_league: odds.league || 'Unknown League',
            match_status: originalMatch?.status === "Live" ? "live" : "upcoming",
            selected_outcome: odds.type || 'home',
            selected_team: odds.type === 'home' ? (odds.teams || '').split(' vs ')[0] : 
                          odds.type === 'away' ? (odds.teams || '').split(' vs ')[1] : undefined,
            odds_value: odds.odds || '+100',
            odds_decimal: bettingCalculation.decimalOdds
          };
          
          console.log('📝 Creating betting record with data:', bettingRecord);
          
          try {
            const savedRecord = await bettingService.createBettingRecord(bettingRecord);
            console.log('✅ Betting record saved successfully:', savedRecord);
            
            // Add notification immediately after successful bet placement
            if (savedRecord && savedRecord.id) {
              addNewBetNotification(
                savedRecord.id,
                bettingRecord.match_teams,
                bettingRecord.bet_amount,
                bettingRecord.potential_win
              );
              console.log('🔔 Notification added for new bet:', savedRecord.id);
            }
          } catch (saveError: any) {
            console.error('❌ Failed to save individual betting record:', saveError);
            throw saveError; // Re-throw to be caught by outer catch block
          }
        }
        console.log('🎉 All betting records saved successfully');
        
        // IMMEDIATELY update local state to show "bet placed" effect - FORCE SYNC UPDATE
        const newBetMatchIds = new Set(userBetMatchIds);
        selectedOdds.forEach(odds => {
          newBetMatchIds.add(odds.matchId);
        });
        
        // Force synchronous state update to ensure immediate UI update
        flushSync(() => {
          setUserBetMatchIds(newBetMatchIds);
        });
        console.log('⚡ INSTANT UI update: Added match IDs to local state:', Array.from(newBetMatchIds));
        
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
      
      // Close confirmation modal first
      setShowBetConfirmation(false);
      setIsConfirmingBet(false);
      
      // Clear selected odds and show congratulations IMMEDIATELY
      setSelectedOdds([]);
      setShowBetSlip(false);
      setIsBetSlipHiding(false);
      setShowCongratulations(true);
      
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
      setIsConfirmingBet(false);
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
    // If we have API data, use it directly (backend already handles all filtering)
    if (matchingInfo && matchingInfo.length > 0) {
      // Backend already handles:
      // - Search filtering (home_team)
      // - Year filtering (season)
      // - Country/league filtering
      // - Date filtering (Next Matches vs Results)
      // - Pagination
      return transformMatchingInfoToMatch(matchingInfo);
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
  // Don't render matches when switching markets to prevent flash
  const groupedMatches = isSwitchingMarket ? [] : allGroupedMatches;
  const handleOddsClick = (match: Match, type: 'home' | 'draw' | 'away', odds: string, event: React.MouseEvent) => {
    // Clear any previous error messages
    setDuplicateBetError("");
    setBettingError("");

    const selectedBet = {
      matchId: match.id,
      type,
      odds,
      teams: match.teams,
      league: match.league,
      stake: "10",
      matchDate: match.date
    };
    
    // Clear duplicate bet error when selecting new odds
    setDuplicateBetError("");
    
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
      // Clear duplicate bet error when removing odds
      setDuplicateBetError("");
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

  // Convert American odds to decimal odds (consistent with OddsConverter)
  const americanToDecimal = (americanOdds: string): number => {
    // Use the same logic as OddsConverter for consistency
    return OddsConverter.stringToDecimal(americanOdds);
  };

  // Calculate total odds (multiply all decimal odds)
  const calculateTotalOdds = (): number => {
    return selectedOdds.reduce((total, odds) => {
      // Detect if odds are already in decimal format or need conversion
      const oddsString = odds.odds || '2.0';
      const isDecimalFormat = oddsString.includes('.') || (parseFloat(oddsString) >= 1.0 && parseFloat(oddsString) <= 10.0);
      
      const decimalOdd = isDecimalFormat 
        ? parseFloat(oddsString)
        : americanToDecimal(oddsString);
      return total * decimalOdd;
    }, 1);
  };

  // Calculate potential win based on individual bets (Single mode)
  const calculatePotentialWin = (): number => {
    return selectedOdds.reduce((totalWin, odds) => {
      const stake = parseFloat(odds.stake || '0');
      // Detect if odds are already in decimal format or need conversion
      const oddsString = odds.odds || '2.0';
      const isDecimalFormat = oddsString.includes('.') || (parseFloat(oddsString) >= 1.0 && parseFloat(oddsString) <= 10.0);
      
      const calculation = isDecimalFormat 
        ? calculateBettingReturnFromDecimal(stake, oddsString)
        : calculateBettingReturnFromAmerican(stake, oddsString);
      return totalWin + calculation.totalReturn;
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
    
    // Check if the click is on a navigation button
    const isNavigationButton = button && (
      button.className.includes('hover:bg-white/10') ||
      button.className.includes('hover:bg-white/5') ||
      button.className.includes('bg-gradient-to-r') ||
      button.className.includes('hover:text-white') ||
      button.className.includes('text-gray-400') ||
      button.closest('nav') !== null
    );
    
    // Check if the click is inside the betslip modal content area (not header)
    const isInsideBetSlipContent = target.closest('.betslip-content');
    
    // Check if the click is specifically on the betslip header
    const isBetSlipHeader = target.closest('.betslip-header');
    
    // Debug logging
    if (button) {
      console.log('OddsTable handleOutsideClick - Button clicked:', {
        className: button.className,
        isOddButton,
        isNavigationButton,
        isInsideBetSlipContent,
        isBetSlipHeader,
        showBetSlip
      });
    }
    
    // Only collapse if clicking outside both the betslip content, header, odd buttons, and navigation buttons
    if (showBetSlip && !isOddButton && !isNavigationButton && !isInsideBetSlipContent && !isBetSlipHeader) {
      console.log('OddsTable: Collapsing betslip due to outside click');
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
      console.log("Fetching with selectedYear:", selectedYear, "searchQuery:", searchQuery, "selectedMarket:", selectedMarket);
      
      // Build base parameters
      const params: any = { 
        page: currentPage,
        size: MATCHES_PER_PAGE
      };
      
      // Add year filter (season)
      if (selectedYear) {
        params.season = selectedYear;
      }
      
      // Add search query to backend - this is the key fix!
      if (searchQuery.trim()) {
        // Use home_team parameter to search for teams
        // The backend will search in home_team field using ILIKE
        params.home_team = searchQuery.trim();
        
        // When searching, don't apply country/league filters to allow global search
        // This allows users to search across all countries and leagues
        console.log('🔍 Global search mode - skipping country/league filters');
      } else {
        // Only apply country/league filters when not searching
        // This maintains the normal filtering behavior when browsing
        if (selectedLeague && selectedCountry) {
          params.league = selectedLeague.name;
          params.country = selectedCountry.name;
        } else if (selectedCountry) {
          params.country = selectedCountry.name;
        }
      }
      
      // Add date filtering for "Next Matches" vs "Results"
      if (selectedMarket === "Next Matches") {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        params.date_from = today; // Only future matches
      } else if (selectedMarket === "Results") {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        params.date_to = today; // Only past matches
      }
      
      console.log(`🚀 Fetching page ${currentPage} with backend search/filtering:`, params);
      console.log(`🔍 Debug - selectedYear: ${selectedYear}, params.season: ${params.season}`);
      const result = await dispatch(getMatchingInfoAction(params)).unwrap();
      
      setMatchingInfo(result.odds);
      setApiTotalPages(result.pages);
      setApiTotalMatches(result.total);
      
      // Reset switching state when data is loaded with a small delay
      setTimeout(() => {
        console.log("Resetting switching state after successful data load");
        setIsSwitchingMarket(false);
        setSwitchingToMarket("");
      }, 200);
      
      console.log(`✅ Loaded ${result.odds.length} matches (Page ${currentPage}/${result.pages}) with backend filtering`);
      console.log(`📊 Sample match data:`, result.odds[0] ? {
        season: result.odds[0].season,
        date: result.odds[0].date,
        home_team: result.odds[0].home_team,
        away_team: result.odds[0].away_team
      } : 'No matches');
    } catch (error) {
      console.error("Error fetching matching info:", error);
      // Reset switching state even on error with a small delay
      setTimeout(() => {
        console.log("Resetting switching state after error");
        setIsSwitchingMarket(false);
        setSwitchingToMarket("");
      }, 200);
    } finally {
      setLoading(false);
    }
  }, [dispatch, currentPage, selectedYear, selectedCountry, selectedLeague, selectedMarket, shouldTriggerSearch]);
    
  
  useEffect(() => {
    fetchCurrentPageMatches();
    // Also refresh user's existing bets when loading new matches
    // This ensures bet status is always up-to-date even after time passes
    if (isAuthenticated && user?.id) {
      fetchUserExistingBets();
    }
  }, [fetchCurrentPageMatches]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setSearchQuery("");
    setCurrentPage(1);
  }, [selectedLeague, selectedYear, selectedCountry, selectedMarket]);

  // Only trigger search when shouldTriggerSearch is true
  useEffect(() => {
    if (shouldTriggerSearch) {
      setCurrentPage(1); // Reset to first page when searching
      setShouldTriggerSearch(false); // Reset the trigger
    }
  }, [shouldTriggerSearch]);

  // Update search query when URL search parameter changes (only if user is not editing)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || "";
    
    // Only update from URL if user is not actively editing the input
    if (!isEditingSearch && urlSearchTerm !== searchQuery) {
      setSearchQuery(urlSearchTerm);
      // Trigger search if there's a search term in URL
      if (urlSearchTerm.trim()) {
        setShouldTriggerSearch(true);
      }
    }
  }, [searchParams, searchQuery, isEditingSearch]);
  
  // Update search query when initialSearchTerm prop changes (for backward compatibility)
  useEffect(() => {
    if (initialSearchTerm && !urlSearchTerm) {
      setSearchQuery(initialSearchTerm);
    }
  }, [initialSearchTerm, urlSearchTerm]);

  // Helper function to handle search and update URL parameters
  const handleSearch = useCallback(() => {
    const trimmedQuery = searchQuery.trim();
    
    // Update URL parameters to persist search across navigation
    const newSearchParams = new URLSearchParams(searchParams);
    if (trimmedQuery) {
      newSearchParams.set('search', trimmedQuery);
    } else {
      newSearchParams.delete('search');
    }
    
    // Update URL without triggering navigation
    setSearchParams(newSearchParams, { replace: true });
    
    // Reset editing state since search is being performed
    setIsEditingSearch(false);
    
    // Trigger the actual search
    setShouldTriggerSearch(true);
  }, [searchQuery, searchParams, setSearchParams]);

  // Helper function to handle pagination with scroll-to-top
  const handlePageChange = useCallback((newPage: number) => {
    // Scroll to top immediately when changing pages (especially important for mobile)
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    // Update the current page
    setCurrentPage(newPage);
    
    console.log('🔄 Page changed to:', newPage, '- scrolled to top');
  }, []);

  // Helper function to highlight search terms in text
  const highlightSearchTerm = useCallback((text: string, searchTerm: string) => {
    if (!searchTerm.trim()) {
      return text;
    }
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <span key={index} className="bg-yellow-300 text-black font-semibold px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);
  

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current);
      }
    };
  }, []);
  if (loading || isSwitchingMarket) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-bg via-surface to-bg">
        <FantasticLoader 
          size="large" 
          text={isSwitchingMarket ? `Switching to ${switchingToMarket}...` : "Loading odds for you..."} 
        />
      </div>
    );
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
              ? `Global Search Results for "${searchQuery}"`
              : selectedYear 
                ? selectedLeague
                  ? `${selectedLeague.name} ${selectedYear} Results`
                  : `${selectedYear} Results Only` 
                : selectedLeague && selectedCountry
                  ? `${selectedCountry.name} ${selectedLeague.name} Matches`
                  : selectedMarket === "Results"
                    ? "Match Results"
                    : selectedMarket === "Next Matches"
                      ? "Upcoming Matches"
                      : selectedCountry 
                        ? `${selectedCountry.name} - Football` 
                        : 'Live Matches'
            }
          </h2>
                     <p className="text-sm text-muted mt-1">
             {searchQuery.trim() 
               ? `${totalMatches} matches found across all leagues and countries`
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
        
        {/* Desktop: Original single row layout */}
        <div className="hidden lg:flex gap-2 overflow-x-auto scrollbar-hide">
          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[250px] flex">
            <input
              type="text"
              placeholder="Search teams... (Press Enter to search)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsEditingSearch(true); // Mark that user is actively editing
                // Don't trigger search on every keystroke
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm"
            />
            <button
              onClick={handleSearch}
              className="ml-2 px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
              title="Search teams"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setIsEditingSearch(true); // Set as editing to prevent URL sync from restoring the search
                  // Only clear the input text, don't clear results or change URL
                }}
                className="ml-1 px-2 py-2 text-muted hover:text-text"
                title="Clear search"
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
          
          {/* Show mode toggle */}
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
              onClick={() => handleMarketSwitch(market)}
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

        {/* Mobile: Two-row layout */}
        <div className="lg:hidden space-y-2">
          {/* Row 1: Search + Market buttons (Results) OR Search only (Next Matches) */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {/* Search Box */}
            <div className="relative min-w-[200px] sm:min-w-[250px] flex">
              <input
                type="text"
                placeholder="Search teams... (Press Enter to search)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsEditingSearch(true); // Mark that user is actively editing
                  // Don't trigger search on every keystroke
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm"
              />
              <button
                onClick={handleSearch}
                className="ml-2 px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
                title="Search teams"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setIsEditingSearch(true); // Set as editing to prevent URL sync from restoring the search
                    // Only clear the input text, don't clear results or change URL
                  }}
                  className="ml-1 px-2 py-2 text-muted hover:text-text"
                  title="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Market buttons - show on same row for Results, separate row for Next Matches */}
            {selectedMarket === "Results" && (
              <div className="flex gap-1">
                {markets.map((market) => (
                  <button
                    key={market}
                    onClick={() => {
                      console.log("Market button clicked:", market);
                      
                      // Set switching state and clear data immediately to prevent flash
                      setIsSwitchingMarket(true);
                      setMatchingInfo([]);
                      setLoading(true);
                      
                      // Use setTimeout to ensure state updates are processed
                      setTimeout(() => {
                        setSelectedMarket(market);
                        setCurrentPage(1);
                        if (market === "Next Matches") {
                          setSelectedYear(undefined);
                        }
                      }, 100);
                    }}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                      selectedMarket === market
                        ? "bg-accent text-white shadow-lg"
                        : "bg-surface text-muted hover:text-text hover:bg-surface/80 border border-border"
                    }`}
                  >
                    {market === "Results" ? "Results" : "Next"}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Row 2: Market buttons (Next Matches) OR Year filters (Results) */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {selectedMarket === "Next Matches" ? (
              // Show market buttons on second row for Next Matches
              <div className="flex gap-1">
                {markets.map((market) => (
                  <button
                    key={market}
                    onClick={() => {
                      console.log("Market button clicked:", market);
                      
                      // Set switching state and clear data immediately to prevent flash
                      setIsSwitchingMarket(true);
                      setMatchingInfo([]);
                      setLoading(true);
                      
                      // Use setTimeout to ensure state updates are processed
                      setTimeout(() => {
                        setSelectedMarket(market);
                        setCurrentPage(1);
                        if (market === "Next Matches") {
                          setSelectedYear(undefined);
                        }
                      }, 100);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      selectedMarket === market
                        ? "bg-accent text-white shadow-lg"
                        : "bg-surface text-muted hover:text-text hover:bg-surface/80 border border-border"
                    }`}
                  >
                    {market}
                  </button>
                ))}
              </div>
            ) : (
              // Show year filters on second row for Results
              <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
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
                    className={`px-2 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
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
          </div>
        </div>
      </div>
      
      {/* Betting disabled indicator */}
      {isOddsDisabled && isAuthenticated && (
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <div className="text-sm text-blue-300">
            <span className="font-medium">Checking your previous bets...</span>
            <span className="text-blue-200 ml-2">Betting temporarily disabled for your safety</span>
          </div>
        </div>
      )}
      
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groupedMatches.map(({ date, matches }) => 
            matches.map((match: Match) => (
              <div 
                key={match.id} 
                className={`relative overflow-hidden rounded-xl p-4 transition-all duration-500 ${
                  isMatchHighlighted(match)
                    ? 'bg-gradient-to-br from-yellow-400/20 via-orange-400/15 to-red-400/10 border-2 border-yellow-400 shadow-2xl shadow-yellow-400/30 transform scale-105 animate-glow-pulse'
                    : isMatchInvalid(match.id)
                    ? 'bg-surface border-2 border-red-500 hover:shadow-lg animate-pulse'
                    : 'bg-surface border border-border hover:shadow-lg'
                }`}
              >
                {/* Debug highlighting */}
                {isMatchHighlighted(match) && (
                  <div className="absolute top-1 right-1 text-xs text-yellow-400 font-bold bg-yellow-400/20 px-2 py-1 rounded-full">
                    ✨ HIGHLIGHTED ✨
                  </div>
                )}
                {isMatchHighlighted(match) && (
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
                
                {/* Blurred background and overlay for better text readability */}
                <div 
                  className="absolute inset-0 rounded-xl"
                  style={{
                    backgroundImage: `url('/assets/card_background/soccer_background.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: 'blur(3px)',
                    transform: 'scale(1.1)'
                  }}
                ></div>
                <div className="absolute inset-0 bg-black/30 rounded-xl"></div>
                
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
                
                 <div className="mb-4 min-h-[80px] flex flex-col justify-center">
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
                         {highlightSearchTerm(match.teams.split(' vs ')[0], searchQuery)}
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
                         {highlightSearchTerm(match.teams.split(' vs ')[1], searchQuery)}
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
                          { value: homeOdd, label: '1', text: formatOdds(match.bookmakers[0]?.home || '-') },
                          { value: drawOdd, label: 'X', text: formatOdds(match.bookmakers[0]?.draw || '-') },
                          { value: awayOdd, label: '2', text: formatOdds(match.bookmakers[0]?.away || '-') }
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
                    
                    {(() => {
                      console.log(`🎯 Checking match ${match.id} (type: ${typeof match.id}) for user bets`);
                      return hasUserBetOnMatch(match.id);
                    })() ? (
                      <div className="relative">
                        {/* Keep the same grid structure but make it invisible */}
                        <div className="grid grid-cols-3 gap-2 opacity-0">
                          <div className="text-center">
                            <div className="text-xs text-muted mb-1">1</div>
                            <div className="bg-muted/20 text-muted border border-muted/30 rounded px-2 py-1 text-xs font-semibold min-h-[32px] flex items-center justify-center">
                              --
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted mb-1">X</div>
                            <div className="bg-muted/20 text-muted border border-muted/30 rounded px-2 py-1 text-xs font-semibold min-h-[32px] flex items-center justify-center">
                              --
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted mb-1">2</div>
                            <div className="bg-muted/20 text-muted border border-muted/30 rounded px-2 py-1 text-xs font-semibold min-h-[32px] flex items-center justify-center">
                              --
                            </div>
                          </div>
                        </div>
                        
                        {/* Beautiful bet placed overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative w-full h-full flex flex-col items-center justify-center">
                            {/* Main overlay with glass effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/15 to-cyan-500/10 backdrop-blur-sm rounded-lg border border-emerald-400/30 shadow-xl">
                              {/* Animated background pattern */}
                              <div className="absolute inset-0 opacity-20">
                                <div className="absolute top-2 left-2 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                                <div className="absolute top-4 right-3 w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></div>
                                <div className="absolute bottom-3 left-4 w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></div>
                                <div className="absolute bottom-2 right-2 w-2 h-2 bg-emerald-300 rounded-full animate-ping"></div>
                              </div>
                            </div>
                            
                            {/* Success icon with animation - positioned in center */}
                            <div className="relative z-10 mb-4">
                              <div className="relative">
                                {/* Outer ring */}
                                <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                                  {/* Inner circle */}
                                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner">
                                    {/* Checkmark */}
                                    <svg className="w-8 h-8 text-emerald-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                                
                                {/* Floating particles */}
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                              </div>
                            </div>
                            
                            {/* Text with beautiful styling - positioned below icon */}
                            <div className="relative z-10 -top-5">
                              <div className="text-center">
                                <p className="text-emerald-700 font-bold text-sm tracking-wide bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-md">
                                  ❤️ Bet Placed Already!
                                </p>
                               
                              </div>
                            </div>
                            
                            {/* Subtle glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 rounded-lg blur-sm -z-10 animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <div className="text-xs text-muted mb-1">1</div>
                          <button 
                            disabled={isOddsDisabled}
                            className={`w-full py-2 px-1 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                              isOddsDisabled 
                                ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                                : isOddsSelected(match.id, 'home') 
                                  ? 'bg-yellow-500 text-black border-yellow-500' 
                                  : 'bg-transparent text-text border-border hover:bg-bg/50 hover:border-border/80'
                            }`}
                            onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'home', match.bookmakers[0]?.home || '-', e)}
                          >
                            {formatOdds(match.bookmakers[0]?.home || '-')}
                          </button>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted mb-1">X</div>
                          <button 
                            disabled={isOddsDisabled}
                            className={`w-full py-2 px-1 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                              isOddsDisabled 
                                ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                                : isOddsSelected(match.id, 'draw') 
                                  ? 'bg-yellow-500 text-black border-yellow-500' 
                                  : 'bg-transparent text-text border-border hover:bg-bg/50 hover:border-border/80'
                            }`}
                            onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'draw', match.bookmakers[0]?.draw || '-', e)}
                          >
                            {formatOdds(match.bookmakers[0]?.draw || '-')}
                          </button>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted mb-1">2</div>
                          <button 
                            disabled={isOddsDisabled}
                            className={`w-full py-2 px-1 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                              isOddsDisabled 
                                ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                                : isOddsSelected(match.id, 'away') 
                                  ? 'bg-yellow-500 text-black border-yellow-500' 
                                  : 'bg-transparent text-text border-border hover:bg-bg/50 hover:border-border/80'
                            }`}
                            onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'away', match.bookmakers[0]?.away || '-', e)}
                          >
                            {formatOdds(match.bookmakers[0]?.away || '-')}
                          </button>
                        </div>
                      </div>
                    )}
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
                    isMatchHighlighted(match)
                      ? 'bg-gradient-to-r from-yellow-400/15 via-orange-400/10 to-red-400/15 border-l-4 border-l-yellow-400 shadow-lg shadow-yellow-400/20 transform scale-[1.02]'
                      : 'hover:bg-surface/30'
                  } ${
                    isLastMatchOfDay ? 'border-b border-gray-400/50' : 'border-b border-border/30'
                  }`}
                >
                  {/* Debug highlighting for list view */}
                  {isMatchHighlighted(match) && (
                    <div className="absolute top-0 right-0 text-xs text-yellow-400 font-bold bg-yellow-400/20 px-2 py-1 rounded-full z-10">
                      ✨ HIGHLIGHTED ✨
                    </div>
                  )}
                  {isMatchHighlighted(match) && (
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
                      <span className="text-sm font-medium text-text truncate">{highlightSearchTerm(match.teams.split(' vs ')[0], searchQuery)}</span>
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
                      <span className="text-sm font-medium text-text truncate">{highlightSearchTerm(match.teams.split(' vs ')[1], searchQuery)}</span>
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
                    ) : (() => {
                      console.log(`🎯 Table view - Checking match ${match.id} (type: ${typeof match.id}) for user bets`);
                      return hasUserBetOnMatch(match.id);
                    })() ? (
                      <div className="flex items-center justify-center relative">
                        {/* Invisible placeholder to maintain space */}
                        <div className="opacity-0">
                          <div className="flex items-center gap-1">
                            <button className="bg-muted/20 text-muted border border-muted/30 rounded px-2 py-1 text-xs font-semibold min-w-[40px]">
                              --
                            </button>
                            <button className="bg-muted/20 text-muted border border-muted/30 rounded px-2 py-1 text-xs font-semibold min-w-[40px]">
                              --
                            </button>
                            <button className="bg-muted/20 text-muted border border-muted/30 rounded px-2 py-1 text-xs font-semibold min-w-[40px]">
                              --
                            </button>
                          </div>
                        </div>
                        
                        {/* Beautiful compact bet placed overlay for table */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative w-full h-full">
                            {/* Main overlay with glass effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 backdrop-blur-sm rounded-md border border-emerald-400/40 shadow-lg">
                              {/* Animated background dots */}
                              <div className="absolute inset-0 opacity-30">
                                <div className="absolute top-1 left-1 w-1 h-1 bg-emerald-400 rounded-full animate-ping"></div>
                                <div className="absolute bottom-1 right-1 w-1 h-1 bg-teal-400 rounded-full animate-pulse"></div>
                              </div>
                              
                              {/* Success icon */}
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                <div className="w-6 h-6 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center animate-pulse shadow-md">
                                  <svg className="w-4 h-4 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                              
                              {/* Text */}
                              <div className="absolute bottom-0 inset-x-0 flex justify-center">
                                <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm">
                                  <span className="text-emerald-700 font-bold text-xs tracking-wide">💕 Bet Placed</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Subtle glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-md blur-sm -z-10 animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button 
                          disabled={isOddsDisabled}
                          className={`text-sm font-semibold min-w-[40px] py-1 rounded border transition-all duration-200 ${
                            isOddsDisabled 
                              ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                              : isOddsSelected(match.id, 'home') 
                                ? 'bg-yellow-500 text-black border-yellow-500' 
                                : 'text-text hover:bg-surface/50 border-border hover:border-border/80'
                          }`}
                          onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'home', match.bookmakers[0]?.home || '-', e)}
                        >
                          {formatOdds(match.bookmakers[0]?.home || '-')}
                        </button>
                        <button 
                          disabled={isOddsDisabled}
                          className={`text-sm font-semibold min-w-[40px] py-1 rounded border transition-all duration-200 ${
                            isOddsDisabled 
                              ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                              : isOddsSelected(match.id, 'draw') 
                                ? 'bg-yellow-500 text-black border-yellow-500' 
                                : 'text-text hover:bg-surface/50 border-border hover:border-border/80'
                          }`}
                          onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'draw', match.bookmakers[0]?.draw || '-', e)}
                        >
                          {formatOdds(match.bookmakers[0]?.draw || '-')}
                        </button>
                        <button 
                          disabled={isOddsDisabled}
                          className={`text-sm font-semibold min-w-[40px] py-1 rounded border transition-all duration-200 ${
                            isOddsDisabled 
                              ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed' 
                              : isOddsSelected(match.id, 'away') 
                                ? 'bg-yellow-500 text-black border-yellow-500' 
                                : 'text-text hover:bg-surface/50 border-border hover:border-border/80'
                          }`}
                          onClick={(e) => !isOddsDisabled && handleOddsClick(match, 'away', match.bookmakers[0]?.away || '-', e)}
                        >
                          {formatOdds(match.bookmakers[0]?.away || '-')}
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
                            <span className="text-sm font-medium text-text">{highlightSearchTerm(odds.teams.split(' vs ')[0], searchQuery)}</span>
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
                            <span className="text-sm font-medium text-text">{highlightSearchTerm(odds.teams.split(' vs ')[1], searchQuery)}</span>
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
                       <span className="text-lg font-bold text-text">{formatOdds(odds.odds)}</span>
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
                      // Clear duplicate bet error when removing odds
                      setDuplicateBetError("");
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
            ) : duplicateBetError ? (
              <div className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-sm text-orange-400 mb-3">{duplicateBetError}</p>
                <button 
                  className="w-full py-3 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-400 transition-colors"
                  onClick={() => setDuplicateBetError("")}
                >
                  OK
                </button>
              </div>
            ) : (
              <div className={`flex items-center gap-2 mb-4 p-3 rounded-lg ${
                bettingValidation.isValid 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                {bettingValidation.isValid ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                <span className={`text-sm ${
                  bettingValidation.isValid ? 'text-green-400' : 'text-red-400'
                }`}>
                  {bettingValidation.isValid 
                    ? 'Ready to place your bet!' 
                    : 'At least one of the selections is invalid!'
                  }
                </span>
              </div>
            )}
            
            <div className="flex gap-2 mb-3">
              <button className="flex-1 py-3 bg-surface border border-border text-text rounded-lg text-sm font-medium">SHARE</button>
              <button 
                className="flex-1 py-3 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePlaceBet}
                disabled={isPlacingBet || isConfirmingBet || !bettingValidation.isValid}
              >
                {isAuthenticated ? (
                  isPlacingBet || isConfirmingBet ? "PLACING BET..." : "PLACE BET"
                ) : "LOGIN"}
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
             onClick={() => handlePageChange(1)}
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
             onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
                   onClick={() => handlePageChange(pageNum)}
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
             onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
             onClick={() => handlePageChange(totalPages)}
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

      {/* Beautiful Bet Confirmation Modal */}
      {showBetConfirmation && (
        <>
          {/* Confetti Animation */}
          <div className="fixed inset-0 pointer-events-none z-[100001]">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#A29BFE', '#FD79A8'][Math.floor(Math.random() * 8)]
                  }}
                />
              </div>
            ))}
          </div>

          {/* Main Modal */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100000] p-4">
            <div className="relative w-full max-w-lg mx-auto">
              {/* Background Glow Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 rounded-3xl blur-xl"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl"></div>
              
              {/* Main Card */}
              <div 
                className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-xl overflow-hidden"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-red-500/5 animate-gradient-shift"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-aurora"></div>
                
                {/* Floating Particles */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-8 left-8 w-2 h-2 bg-yellow-400 rounded-full animate-floating-particles animation-delay-100"></div>
                  <div className="absolute top-12 right-12 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-floating-particles animation-delay-300"></div>
                  <div className="absolute bottom-12 left-12 w-1 h-1 bg-pink-400 rounded-full animate-floating-particles animation-delay-500"></div>
                  <div className="absolute bottom-8 right-8 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-floating-particles animation-delay-700"></div>
                </div>
                
                {/* Shimmer Effect */}
                <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer opacity-50"></div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center animate-pulse-glow">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">🎯 Confirm Your Bet</h3>
                        <p className="text-sm text-white/70">Double-check your selections</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBetConfirmation(false)}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm border border-white/20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Main Question */}
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow backdrop-blur-sm border border-yellow-500/30">
                        <span className="text-4xl">🤔</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Ready to Place Your Bet?</h2>
                      <p className="text-white/80">Make sure everything looks good before confirming!</p>
                    </div>

                    {/* Bet Details */}
                    <div className="space-y-4 mb-8">
                      {/* Your Bets */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">🎲</span>
                          <h4 className="text-white font-semibold">Your Selections</h4>
                        </div>
                        <div className="space-y-3">
                          {selectedOdds.map((odds, index) => (
                            <div key={index} className="bg-white/5 rounded-xl p-3 border border-white/10">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="text-white font-medium text-sm mb-1">{highlightSearchTerm(odds.teams, searchQuery)}</div>
                                  <div className="text-white/70 text-xs">
                                    {odds.type === 'home' ? highlightSearchTerm(odds.teams.split(' vs ')[0], searchQuery) : 
                                     odds.type === 'away' ? highlightSearchTerm(odds.teams.split(' vs ')[1], searchQuery) : 'Draw'} 
                                    <span className="text-yellow-400 font-semibold ml-2">({formatOdds(odds.odds)})</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-white font-bold">${odds.stake}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="relative bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        {/* Loading Overlay */}
                        {isConfirmingBet && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-6">
                              {/* Soccer Ball Loading Effect */}
                              <div className="relative">
                                <div className="w-16 h-16 animate-football-bounce shadow-lg">
                                  {/* Real Soccer Ball Image */}
                                  <img 
                                    src="/assets/soccer_ball.png" 
                                    alt="Soccer Ball" 
                                    className="w-full h-full object-contain drop-shadow-lg"
                                  />
                                  
                                  {/* Golden Glow Effect */}
                                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 blur-sm animate-football-spin"></div>
                                </div>
                                
                                {/* Bouncing shadow */}
                                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-black/20 rounded-full blur-sm animate-football-bounce" style={{animationDelay: '0.1s'}}></div>
                              </div>
                              
                              <p className="text-yellow-300 font-bold text-lg text-center animate-pulse">
                                ⚽ Placing your bet...
                              </p>
                              <p className="text-white/80 text-sm text-center">
                                Please wait while we process your bet...
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Summary Content */}
                        <div className={isConfirmingBet ? "blur-sm" : ""}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">💰</span>
                            <h4 className="text-white font-semibold">Bet Summary</h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-white/80">Total Bet Amount:</span>
                              <span className="text-white font-bold">
                                ${selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/80">Potential Win:</span>
                              <span className="text-green-400 font-bold text-lg">
                                ${calculatePotentialWin().toFixed(2)}
                              </span>
                            </div>
                            <hr className="border-white/10 my-2" />
                            <div className="flex justify-between items-center">
                              <span className="text-white/80">Current Balance:</span>
                              <span className="text-blue-400 font-medium">${userFunds.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/80">After Bet:</span>
                              <span className="text-orange-400 font-medium">
                                ${(userFunds - selectedOdds.reduce((total, odds) => total + parseFloat(odds.stake || '0'), 0)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => setShowBetConfirmation(false)}
                        disabled={isConfirmingBet}
                        className="flex-1 py-4 px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm border border-white/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>❌</span>
                          <span>Cancel</span>
                        </span>
                      </button>
                      <button
                        onClick={confirmBet}
                        disabled={isConfirmingBet}
                        className="flex-1 py-4 px-6 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-yellow-500/25 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>🚀</span>
                          <span>Place Bet!</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
