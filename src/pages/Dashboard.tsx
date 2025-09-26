import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService, tokenManager } from "../services/authService";
import { bettingService, BettingRecord, BettingStats } from "../services/bettingService";
import { transactionService, Transaction, TransactionSummary } from "../services/transactionService";
import { getTeamLogo } from "../utils/teamLogos";
import { useOddsFormat } from "../hooks/useOddsFormat";
import { OddsConverter } from "../utils/oddsConverter";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { clearNotifications } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userFunds, setUserFunds] = useState(0);
  const [fundsLoading, setFundsLoading] = useState(true);
  
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
    console.log(`Dashboard: Converting ${oddsString} -> ${decimalOdds} -> ${formatted} (format: ${oddsFormat})`);
    return formatted;
  };

  // Helper function to format currency amounts with proper precision
  const formatCurrency = (amount: number): string => {
    // Round to 2 decimal places to avoid floating point precision issues
    const rounded = Math.round(amount * 100) / 100;
    return rounded.toFixed(2);
  };

  // Helper function to format transaction description with odds conversion
  const formatTransactionDescription = (description: string): string => {
    if (!description || description.trim() === '') {
      return description || '';
    }
    
    // Look for odds patterns in the description (e.g., "at odds +150", "odds: 2.50", "with odds 3/2", "@ 189")
    const oddsPatterns = [
      /@\s*([+-]?\d+(?:\.\d+)?)/gi,  // "@ 189" format
      /at odds ([+-]?\d+(?:\.\d+)?)/gi,
      /odds:?\s*([+-]?\d+(?:\.\d+)?)/gi,
      /with odds\s*([+-]?\d+(?:\.\d+)?)/gi,
      /odds\s*([+-]?\d+(?:\.\d+)?)/gi,
      /([+-]?\d+(?:\.\d+)?)\s*odds/gi
    ];
    
    let formattedDescription = description;
    
    oddsPatterns.forEach(pattern => {
      formattedDescription = formattedDescription.replace(pattern, (match, oddsValue) => {
        const convertedOdds = formatOdds(oddsValue);
        return match.replace(oddsValue, convertedOdds);
      });
    });
    
    return formattedDescription;
  };
  const [bettingRecords, setBettingRecords] = useState<BettingRecord[]>([]);
  const [bettingStats, setBettingStats] = useState<BettingStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [transactionCurrentPage, setTransactionCurrentPage] = useState(1);
  const [transactionTotalPages, setTransactionTotalPages] = useState(1);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort betting records
  const sortedBettingRecords = [...bettingRecords].sort((a, b) => {
    let aValue: any = a[sortField as keyof BettingRecord];
    let bValue: any = b[sortField as keyof BettingRecord];

    // Handle different data types
    if (sortField === 'bet_amount' || sortField === 'potential_win') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    } else if (sortField === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else {
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Fetch betting records and stats
  const fetchBettingData = async () => {
    if (!isAuthenticated) return;
    
    try {
      setRecordsLoading(true);
      setStatsLoading(true);
      
      // First, fix any missing match dates
      try {
        await bettingService.fixMissingMatchDates();
      } catch (error) {
        console.log('No missing dates to fix or error fixing dates:', error);
      }
      
      const [recordsResponse, statsResponse] = await Promise.all([
        bettingService.getBettingRecords(currentPage, 10), // 10 records per page for dashboard
        bettingService.getBettingStats()
      ]);
      
      setBettingRecords(recordsResponse.records);
      setTotalPages(recordsResponse.total_pages);
      setBettingStats(statsResponse);
    } catch (error) {
      console.error('Error fetching betting data:', error);
      setBettingRecords([]);
      setBettingStats(null);
    } finally {
      setRecordsLoading(false);
      setStatsLoading(false);
    }
  };

  // Fetch transaction data
  const fetchTransactionData = async () => {
    if (!isAuthenticated) return;
    
    try {
      setTransactionsLoading(true);
      console.log('🔄 Fetching transaction data...');
      const transactionsResponse = await transactionService.getTransactions(transactionCurrentPage, 10);
      
      console.log('📊 Transaction data received:', {
        transactionCount: transactionsResponse.transactions.length,
        transactions: transactionsResponse.transactions,
        page: transactionsResponse.page,
        totalPages: transactionsResponse.total_pages
      });
      
      setTransactions(transactionsResponse.transactions);
      setTransactionTotalPages(transactionsResponse.total_pages);
    } catch (error) {
      console.error('❌ Error fetching transaction data:', error);
      setTransactions([]);
      setTransactionTotalPages(1);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Clear notifications when user visits Dashboard
  useEffect(() => {
    console.log('🏠 Dashboard visited - clearing notifications');
    clearNotifications();
  }, [clearNotifications]);

  // Handle Google OAuth success redirect
  useEffect(() => {
    const googleAuth = searchParams.get('google_auth');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (googleAuth === 'success' && accessToken && refreshToken) {
      console.log('🎉 Google OAuth success! Setting tokens and staying on dashboard...');
      // Store tokens immediately
      tokenManager.setTokens(accessToken, refreshToken);
      
      // Clean up URL parameters without redirecting
      const cleanUrl = window.location.pathname; // Remove query params
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [searchParams]);

  // Fetch user funds and betting data on component mount
  useEffect(() => {
    const fetchUserFunds = async () => {
      if (isAuthenticated) {
        try {
          setFundsLoading(true);
          const fundsData = await authService.getUserFunds();
          setUserFunds(fundsData.funds_usd);
        } catch (error) {
          console.error('Error fetching user funds:', error);
          setUserFunds(0);
        } finally {
          setFundsLoading(false);
        }
      }
    };

    fetchUserFunds();
    fetchBettingData();
    fetchTransactionData();
  }, [isAuthenticated, currentPage, transactionCurrentPage]);

  // Function to refresh all data
  const refreshAllData = async () => {
    if (isAuthenticated) {
      try {
        setFundsLoading(true);
        setTransactionsLoading(true);
        setStatsLoading(true);
        
        // Fetch fresh balance
        const fundsData = await authService.getUserFunds();
        setUserFunds(fundsData.funds_usd);
        
        // Refresh transaction data to get latest balance_after values
        await fetchTransactionData();
        
        // Refresh betting data to get latest stats
        await fetchBettingData();
        
        console.log('✅ All data refreshed successfully');
      } catch (error) {
        console.error('❌ Error refreshing data:', error);
      } finally {
        setFundsLoading(false);
        setTransactionsLoading(false);
        setStatsLoading(false);
      }
    }
  };

  // Function to check balance synchronization
  const checkBalanceSync = () => {
    if (transactions.length > 0) {
      const latestTransaction = transactions[0]; // Assuming transactions are ordered by date (newest first)
      const currentBalance = userFunds;
      const latestTransactionBalance = latestTransaction.balance_after;
      
      const difference = Math.abs(currentBalance - latestTransactionBalance);
      const isOutOfSync = difference > 0.01; // Allow for small floating point differences
      
      // Debug logging
      if (isOutOfSync) {
        console.log('⚠️ Balance discrepancy detected:', {
          currentBalance,
          latestTransactionBalance,
          difference,
          latestTransactionDate: latestTransaction.created_at,
          latestTransactionType: latestTransaction.transaction_type,
          latestTransactionAmount: latestTransaction.amount
        });
      }
      
      return {
        isOutOfSync,
        difference,
        currentBalance,
        latestTransactionBalance,
        latestTransactionDate: latestTransaction.created_at
      };
    }
    return null;
  };

  // Listen for betting data changes
  useEffect(() => {
    const handleBettingDataChange = () => {
      console.log('🔄 Betting data changed, refreshing...');
      fetchBettingData();
      fetchTransactionData(); // Also refresh transaction data
    };

    window.addEventListener('bettingDataChanged', handleBettingDataChange);
    
    return () => {
      window.removeEventListener('bettingDataChanged', handleBettingDataChange);
    };
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">Access Required</h2>
          <p className="text-muted mb-4">Please sign in to view your dashboard</p>
          <button
            onClick={() => navigate('/signin')}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-2xl">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-4 left-4 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
          <div className="absolute bottom-4 right-4 w-24 h-24 bg-white/5 rounded-full blur-xl" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-white/5 rounded-full blur-xl" style={{animationDelay: '2s'}}></div>
        </div>
        
        {/* Animated Geometric Shapes - Enhanced Visibility */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating Circles with staggered delays - MUCH MORE VISIBLE */}
          <div className="absolute top-8 left-8 w-20 h-20 bg-gradient-to-r from-cyan-400/50 to-blue-400/50 rounded-full animate-pulse-visible blur-sm" style={{animationDelay: '0s'}}></div>
          <div className="absolute top-16 right-12 w-16 h-16 bg-gradient-to-r from-purple-400/50 to-pink-400/50 rounded-full animate-bounce-visible blur-sm" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-20 left-16 w-24 h-24 bg-gradient-to-r from-emerald-400/50 to-teal-400/50 rounded-full animate-pulse-visible blur-sm" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-8 right-8 w-18 h-18 bg-gradient-to-r from-yellow-400/50 to-orange-400/50 rounded-full animate-bounce-visible blur-sm" style={{animationDelay: '3s'}}></div>
          
          {/* Floating Squares with different rotations - MORE VISIBLE */}
          <div className="absolute top-1/4 left-1/3 w-12 h-12 bg-gradient-to-r from-indigo-400/40 to-purple-400/40 rotate-45 animate-spin-visible blur-sm" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute top-1/3 right-1/4 w-10 h-10 bg-gradient-to-r from-rose-400/40 to-pink-400/40 rotate-12 animate-spin-reverse-visible blur-sm" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute bottom-1/3 left-1/4 w-14 h-14 bg-gradient-to-r from-green-400/40 to-emerald-400/40 rotate-45 animate-spin-visible blur-sm" style={{animationDelay: '2.5s'}}></div>
          
          {/* Large Animated Gradient Orbs - MUCH MORE VISIBLE */}
          <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-purple-500/30 rounded-full animate-float-visible blur-xl" style={{animationDelay: '0s'}}></div>
          <div className="absolute top-1/4 right-1/3 w-32 h-32 bg-gradient-to-r from-pink-500/30 via-rose-500/30 to-orange-500/30 rounded-full animate-float-reverse-visible blur-xl" style={{animationDelay: '5s'}}></div>
          
          {/* Additional floating elements - MORE VISIBLE */}
          <div className="absolute top-3/4 left-1/2 w-22 h-22 bg-gradient-to-r from-violet-400/40 to-fuchsia-400/40 rounded-full animate-pulse-visible blur-lg" style={{animationDelay: '4s'}}></div>
          <div className="absolute top-1/6 left-1/6 w-18 h-18 bg-gradient-to-r from-amber-400/40 to-yellow-400/40 rounded-full animate-bounce-visible blur-lg" style={{animationDelay: '6s'}}></div>
          
          {/* Extra visible elements */}
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-gradient-to-r from-red-400/45 to-pink-400/45 rounded-full animate-float-visible blur-md" style={{animationDelay: '7s'}}></div>
          <div className="absolute bottom-1/4 right-1/6 w-14 h-14 bg-gradient-to-r from-lime-400/45 to-green-400/45 rounded-full animate-bounce-visible blur-md" style={{animationDelay: '8s'}}></div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* User Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
                Welcome back, {user?.username}! 👋
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-white/90 font-medium">Ready to make some winning bets today?</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs sm:text-sm text-white/80">Online • Active Session</span>
              </div>
            </div>
          </div>
          
          <div className="w-full sm:w-auto mt-4 sm:mt-0">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 shadow-xl">
              <div className="text-sm text-white/80 mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                  </svg>
                  Account Balance
                </div>
                <button
                  onClick={refreshAllData}
                  className="text-white/60 hover:text-white/90 hover:bg-white/10 p-1 rounded transition-all duration-200"
                  title="Refresh balance and transaction data"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {fundsLoading ? (
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                  <div className="bg-white/20 h-8 sm:h-10 w-24 sm:w-32 rounded-lg shimmer"></div>
                </div>
              ) : (
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-300 drop-shadow-lg">
                  ${formatCurrency(userFunds)}
                </div>
              )}
              <div className="text-xs text-white/70 mt-1">Available for betting</div>
              
              {/* Balance Sync Warning */}
              {(() => {
                const syncCheck = checkBalanceSync();
                if (syncCheck && syncCheck.isOutOfSync) {
                  return (
                    <div className="mt-3 p-2 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-orange-200">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Balance may be out of sync
                      </div>
                      <div className="text-xs text-orange-300/80 mt-1">
                        Current: ${formatCurrency(syncCheck.currentBalance)} | 
                        Latest transaction: ${formatCurrency(syncCheck.latestTransactionBalance)}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Bets Card */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-3 sm:p-4 lg:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-2 right-2 w-6 h-6 sm:w-8 sm:h-8 bg-white/10 rounded-full"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                </svg>
              </div>
              <span className="text-xl sm:text-2xl lg:text-3xl">📊</span>
            </div>
            {statsLoading ? (
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">
                <div className="bg-white/20 h-6 sm:h-8 w-12 sm:w-16 rounded-lg shimmer"></div>
              </div>
            ) : (
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 drop-shadow-lg">{bettingStats?.total_bets || 0}</div>
            )}
            <div className="text-blue-100 font-medium text-xs sm:text-sm">Total Bets Placed</div>
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 rounded-2xl p-3 sm:p-4 lg:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-2 right-2 w-6 h-6 sm:w-8 sm:h-8 bg-white/10 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-xl sm:text-2xl lg:text-3xl">🏆</span>
            </div>
            {statsLoading ? (
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">
                <div className="bg-white/20 h-6 sm:h-8 w-10 sm:w-12 rounded-lg shimmer"></div>
              </div>
            ) : (
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 drop-shadow-lg">{bettingStats?.win_rate || 0}%</div>
            )}
            <div className="text-emerald-100 font-medium text-xs sm:text-sm">Success Rate</div>
          </div>
        </div>

        {/* Total Profit Card */}
        <div className={`group relative overflow-hidden ${(bettingStats?.total_profit || 0) >= 0 ? 'bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700' : 'bg-gradient-to-br from-red-500 via-rose-600 to-pink-700'} rounded-2xl p-3 sm:p-4 lg:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105`}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-2 right-2 w-6 h-6 sm:w-8 sm:h-8 bg-white/10 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <span className="text-xl sm:text-2xl lg:text-3xl">{(bettingStats?.total_profit || 0) >= 0 ? '💰' : '📉'}</span>
            </div>
            {statsLoading ? (
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">
                <div className="bg-white/20 h-6 sm:h-8 w-16 sm:w-20 rounded-lg shimmer"></div>
              </div>
            ) : (
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 drop-shadow-lg">
                {(bettingStats?.total_profit || 0) >= 0 ? '+' : '-'}${formatCurrency(Math.abs(bettingStats?.total_profit || 0))}
              </div>
            )}
            <div className={`font-medium text-xs sm:text-sm ${(bettingStats?.total_profit || 0) >= 0 ? 'text-green-100' : 'text-red-100'}`}>
              {(bettingStats?.total_profit || 0) >= 0 ? 'Total Profit' : 'Total Loss'}
            </div>
          </div>
        </div>

        {/* Active Bets Card */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-700 rounded-2xl p-3 sm:p-4 lg:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-2 right-2 w-6 h-6 sm:w-8 sm:h-8 bg-white/10 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl sm:text-2xl lg:text-3xl">⚡</span>
            </div>
            {statsLoading ? (
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">
                <div className="bg-white/20 h-6 sm:h-8 w-10 sm:w-12 rounded-lg shimmer"></div>
              </div>
            ) : (
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 drop-shadow-lg">{bettingStats?.pending_bets || 0}</div>
            )}
            <div className="text-purple-100 font-medium text-xs sm:text-sm">Active Bets</div>
          </div>
        </div>
      </div>

      {/* Betting Records */}
      <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
          <h3 className="text-base sm:text-lg font-semibold text-text flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Your Betting History
            <button
              onClick={fetchBettingData}
              className="ml-2 px-2 sm:px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white text-xs rounded-lg transition-colors"
              title="Refresh betting history"
            >
              🔄 Refresh
            </button>
          </h3>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-bg border border-border rounded-lg text-sm text-text hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ←
              </button>
              <span className="text-sm text-muted">
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-bg border border-border rounded-lg text-sm text-text hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          )}
        </div>

        {recordsLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Status</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Match</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Bet</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Odds</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Amount</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Match Date</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Bet Date</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted">Result</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-border/10">
                    <td className="py-3 px-2"><div className="w-8 h-8 bg-gray-300/20 rounded-full shimmer"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300/20 rounded w-32 shimmer"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300/20 rounded w-20 shimmer"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300/20 rounded w-16 shimmer"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300/20 rounded w-16 shimmer"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300/20 rounded w-20 shimmer"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300/20 rounded w-20 shimmer"></div></td>
                    <td className="py-3 px-2 text-right"><div className="h-4 bg-gray-300/20 rounded w-16 ml-auto shimmer"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : bettingRecords.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-text mb-2">No betting records yet</h4>
            <p className="text-muted mb-4">Place your first bet to see your betting history here!</p>
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              Place Your First Bet
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">
                    <button
                      onClick={() => handleSort('bet_status')}
                      className="flex items-center gap-1 hover:text-text transition-colors"
                    >
                      Status
                      <span className="text-xs ml-1">
                        {sortField === 'bet_status' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </button>
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">
                    <button
                      onClick={() => handleSort('match_teams')}
                      className="flex items-center gap-1 hover:text-text transition-colors"
                    >
                      Match
                      <span className="text-xs ml-1">
                        {sortField === 'match_teams' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </button>
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">
                    <button
                      onClick={() => handleSort('selected_outcome')}
                      className="flex items-center gap-1 hover:text-text transition-colors"
                    >
                      Bet
                      <span className="text-xs ml-1">
                        {sortField === 'selected_outcome' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </button>
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">
                    <button
                      onClick={() => handleSort('odds_value')}
                      className="flex items-center gap-1 hover:text-text transition-colors"
                    >
                      Odds
                      <span className="text-xs ml-1">
                        {sortField === 'odds_value' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </button>
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">
                    <button
                      onClick={() => handleSort('bet_amount')}
                      className="flex items-center gap-1 hover:text-text transition-colors"
                    >
                      Amount
                      <span className="text-xs ml-1">
                        {sortField === 'bet_amount' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </button>
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">
                    Match Date
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center gap-1 hover:text-text transition-colors"
                    >
                      Bet Date
                      <span className="text-xs ml-1">
                        {sortField === 'created_at' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </button>
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted">
                    <button
                      onClick={() => handleSort('potential_win')}
                      className="flex items-center gap-1 hover:text-text transition-colors"
                    >
                      Result
                      <span className="text-xs ml-1">
                        {sortField === 'potential_win' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedBettingRecords.map((record) => (
                  <tr key={record.id} className="border-b border-border/10 hover:bg-bg/50 transition-colors">
                    {/* Status */}
                    <td className="py-3 px-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        record.bet_status === 'won' ? 'bg-green-500/20 text-green-500' :
                        record.bet_status === 'lost' ? 'bg-red-500/20 text-red-500' :
                        'bg-yellow-500/20 text-yellow-500'
                      }`} title={
                        record.bet_status === 'won' ? 'Bet Won! 🎉' :
                        record.bet_status === 'lost' ? 'Bet Lost 😞' :
                        'Match Pending ⏳'
                      }>
                        {record.bet_status === 'won' ? '🎉' : record.bet_status === 'lost' ? '💔' : '⏳'}
                      </div>
                    </td>
                    
                    {/* Match */}
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2 mb-1">
                        {(() => {
                          const teams = record.match_teams.split(' vs ');
                          const homeTeam = teams[0];
                          const awayTeam = teams[1];
                          return (
                            <>
                              {getTeamLogo(homeTeam, record.match_league) && (
                                <img
                                  src={getTeamLogo(homeTeam, record.match_league)!}
                                  alt={homeTeam}
                                  className="w-4 h-4"
                                  onError={(e) => e.currentTarget.style.display = 'none'}
                                />
                              )}
                              <span className="text-sm font-medium text-text">{homeTeam}</span>
                              <span className="text-xs text-muted">vs</span>
                              {getTeamLogo(awayTeam, record.match_league) && (
                                <img
                                  src={getTeamLogo(awayTeam, record.match_league)!}
                                  alt={awayTeam}
                                  className="w-4 h-4"
                                  onError={(e) => e.currentTarget.style.display = 'none'}
                                />
                              )}
                              <span className="text-sm font-medium text-text">{awayTeam}</span>
                            </>
                          );
                        })()}
                      </div>
                      {record.match_league && (
                        <div className="text-xs text-muted">{record.match_league}</div>
                      )}
                    </td>
                    
                    {/* Bet Selection */}
                    <td className="py-3 px-2">
                      <div className="text-sm text-text">{record.selected_team || record.selected_outcome}</div>
                      <div className="text-xs text-muted capitalize">{record.match_status}</div>
                    </td>
                    
                    {/* Odds */}
                    <td className="py-3 px-2">
                      <div className="text-sm font-medium text-text">{formatOdds(record.odds_value)}</div>
                    </td>
                    
                    {/* Amount */}
                    <td className="py-3 px-2">
                      <div className="text-sm text-text">${formatCurrency(record.bet_amount)}</div>
                    </td>
                    
                    {/* Match Date */}
                    <td className="py-3 px-2">
                      {record.match_date ? (
                        <>
                          <div className="text-sm text-text">{new Date(record.match_date).toLocaleDateString()}</div>
                          <div className="text-xs text-muted">{new Date(record.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </>
                      ) : (
                        <div className="text-sm text-muted">
                          No match date available
                        </div>
                      )}
                    </td>
                    
                    {/* Bet Date */}
                    <td className="py-3 px-2">
                      <div className="text-sm text-text">{new Date(record.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-muted">{new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    
                    {/* Result */}
                    <td className="py-3 px-2 text-right">
                      <div className={`text-sm font-semibold ${
                        record.bet_status === 'won' ? 'text-green-500' :
                        record.bet_status === 'lost' ? 'text-red-500' :
                        'text-yellow-500'
                      }`}>
                        {record.bet_status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                            {/* Show total return for pending bets */}
                            <span>${formatCurrency(record.potential_win)}</span>
                          </div>
                        ) : record.actual_profit !== undefined ? (
                          /* Show actual profit/loss for settled bets */
                          `${record.actual_profit >= 0 ? '+' : '-'}$${formatCurrency(Math.abs(record.actual_profit))}`
                        ) : (
                          /* Calculate profit from potential_win (total return) - stake */
                          record.bet_status === 'won' ? 
                            `+$${formatCurrency(record.potential_win - record.bet_amount)}` : 
                            `-$${formatCurrency(record.bet_amount)}`
                        )}
                      </div>
                      <div className="text-xs text-muted capitalize">
                        {record.bet_status === 'pending' ? 'Pending' : 
                         record.bet_status === 'won' ? '🏆 Won' : 
                         record.bet_status === 'lost' ? '❌ Lost' : 
                         record.bet_status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {sortedBettingRecords.map((record) => (
                <div key={record.id} className="bg-bg border border-border rounded-lg p-4 hover:bg-surface/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        record.bet_status === 'won' ? 'bg-green-500/20 text-green-500' :
                        record.bet_status === 'lost' ? 'bg-red-500/20 text-red-500' :
                        'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {record.bet_status === 'won' ? '🎉' : record.bet_status === 'lost' ? '😞' : '⏳'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text">{record.match_teams}</div>
                        <div className="text-xs text-muted">{record.selected_outcome}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-text">${formatCurrency(record.bet_amount)}</div>
                      <div className="text-xs text-muted">Bet Amount</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted">Odds:</span>
                      <span className="ml-1 font-medium text-text">{record.odds_value}</span>
                    </div>
                    <div>
                      <span className="text-muted">Potential:</span>
                      <span className="ml-1 font-medium text-green-400">${formatCurrency(record.potential_win)}</span>
                    </div>
                    <div>
                      <span className="text-muted">Match Date:</span>
                      <span className="ml-1 text-text">{record.match_date ? new Date(record.match_date).toLocaleDateString() : 'TBD'}</span>
                    </div>
                    <div>
                      <span className="text-muted">Bet Date:</span>
                      <span className="ml-1 text-text">{new Date(record.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
          <h3 className="text-base sm:text-lg font-semibold text-text flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Transaction History
            <button
              onClick={fetchTransactionData}
              className="ml-2 px-2 sm:px-3 py-1 bg-purple-500 hover:bg-purple-400 text-white text-xs rounded-lg transition-colors"
              title="Refresh transaction history"
            >
              🔄 Refresh
            </button>
          </h3>
          {transactionTotalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTransactionCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={transactionCurrentPage === 1}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                  transactionCurrentPage === 1
                    ? 'bg-surface text-muted cursor-not-allowed'
                    : 'bg-surface text-text hover:bg-surface/80 border border-border'
                }`}
              >
                ←
              </button>
              <span className="text-sm text-muted">
                {transactionCurrentPage} of {transactionTotalPages}
              </span>
              <button
                onClick={() => setTransactionCurrentPage(prev => Math.min(transactionTotalPages, prev + 1))}
                disabled={transactionCurrentPage === transactionTotalPages}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                  transactionCurrentPage === transactionTotalPages
                    ? 'bg-surface text-muted cursor-not-allowed'
                    : 'bg-surface text-text hover:bg-surface/80 border border-border'
                }`}
              >
                →
              </button>
            </div>
          )}
        </div>

        {transactionsLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Type</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Description</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Amount</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Balance After</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted">Date</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-border/10">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-300/20 rounded-full shimmer"></div>
                        <div className="h-4 bg-gray-300/20 rounded w-20 shimmer"></div>
                      </div>
                    </td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300/20 rounded w-40 shimmer"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300/20 rounded w-16 shimmer"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300/20 rounded w-16 shimmer"></div></td>
                    <td className="py-3 px-2">
                      <div className="h-4 bg-gray-300/20 rounded w-20 mb-1 shimmer"></div>
                      <div className="h-3 bg-gray-300/20 rounded w-16 shimmer"></div>
                    </td>
                    <td className="py-3 px-2 text-right"><div className="h-4 bg-gray-300/20 rounded w-16 ml-auto shimmer"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-text mb-2">No transactions yet</h4>
            <p className="text-muted mb-4">Add funds or place bets to see your transaction history!</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/profile')}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                Add Funds
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                Place Bet
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted">Type</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted">Description</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted">Amount</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted">Balance After</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted">Date</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 10).map((transaction) => (
                    <tr key={transaction.id} className="border-b border-border/10 hover:bg-bg/50 transition-colors">
                      {/* Transaction Type */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                            transaction.transaction_type === 'deposit' ? 'bg-green-500/20 text-green-500' :
                            transaction.transaction_type === 'withdrawal' ? 'bg-red-500/20 text-red-500' :
                            transaction.transaction_type === 'bet_placed' ? 'bg-blue-500/20 text-blue-500' :
                            transaction.transaction_type === 'bet_won' ? 'bg-green-500/20 text-green-500' :
                            transaction.transaction_type === 'bet_lost' ? 'bg-red-500/20 text-red-500' :
                            'bg-gray-500/20 text-gray-500'
                          }`}>
                            {transactionService.getTransactionTypeIcon(transaction.transaction_type)}
                          </div>
                          <span className="text-sm font-medium text-text">
                            {transactionService.formatTransactionType(transaction.transaction_type)}
                          </span>
                        </div>
                      </td>
                      
                      {/* Description */}
                      <td className="py-3 px-2">
                        <div className="text-sm text-text max-w-xs">
                          {formatTransactionDescription(transaction.description)}
                        </div>
                        {transaction.payment_method && (
                          <div className="text-xs text-muted mt-1">
                            via {transaction.payment_method}
                          </div>
                        )}
                      </td>
                      
                      {/* Amount */}
                      <td className="py-3 px-2">
                        <div className={`text-sm font-semibold ${
                          transaction.amount >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {transaction.amount >= 0 ? '+' : ''}${formatCurrency(Math.abs(transaction.amount))}
                        </div>
                      </td>
                      
                      {/* Balance After */}
                      <td className="py-3 px-2">
                        <div className="text-sm text-text">
                          ${formatCurrency(transaction.balance_after)}
                        </div>
                      </td>
                      
                      {/* Date */}
                      <td className="py-3 px-2">
                        <div className="text-sm text-text">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      
                      {/* Status */}
                      <td className="py-3 px-2 text-right">
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                          transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                          transaction.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                          'bg-gray-500/20 text-gray-500'
                        }`}>
                          {transaction.status}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="bg-bg border border-border rounded-lg p-4 hover:bg-surface/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.transaction_type === 'deposit' ? 'bg-green-500/20 text-green-500' :
                        transaction.transaction_type === 'withdrawal' ? 'bg-red-500/20 text-red-500' :
                        transaction.transaction_type === 'bet_placed' ? 'bg-blue-500/20 text-blue-500' :
                        transaction.transaction_type === 'bet_won' ? 'bg-green-500/20 text-green-500' :
                        transaction.transaction_type === 'bet_lost' ? 'bg-red-500/20 text-red-500' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {transactionService.getTransactionTypeIcon(transaction.transaction_type)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text">
                          {transactionService.formatTransactionType(transaction.transaction_type)}
                        </div>
                        <div className="text-xs text-muted">
                          {formatTransactionDescription(transaction.description)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        transaction.amount >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {transaction.amount >= 0 ? '+' : ''}${formatCurrency(Math.abs(transaction.amount))}
                      </div>
                      <div className="text-xs text-muted">Amount</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted">Balance After:</span>
                      <span className="ml-1 font-medium text-text">${formatCurrency(transaction.balance_after)}</span>
                    </div>
                    <div>
                      <span className="text-muted">Status:</span>
                      <span className={`ml-1 font-medium ${
                        transaction.status === 'completed' ? 'text-green-500' :
                        transaction.status === 'pending' ? 'text-yellow-500' :
                        transaction.status === 'failed' ? 'text-red-500' :
                        'text-gray-500'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted">Date:</span>
                      <span className="ml-1 text-text">{new Date(transaction.created_at).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-muted">Time:</span>
                      <span className="ml-1 text-text">{new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  
                  {transaction.payment_method && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <div className="text-xs text-muted">
                        Payment Method: <span className="text-text">{transaction.payment_method}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom Call-to-Action */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to bet on today's matches?</h3>
            <p className="text-slate-300">Explore the best odds and place your winning bets!</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Explore Matches
          </button>
        </div>
      </div>
    </div>
  );
}
