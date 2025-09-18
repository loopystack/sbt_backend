import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService, tokenManager } from "../services/authService";
import { bettingService, BettingRecord, BettingStats } from "../services/bettingService";
import { transactionService, Transaction, TransactionSummary } from "../services/transactionService";
import { getTeamLogo } from "../utils/teamLogos";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userFunds, setUserFunds] = useState(0);
  const [fundsLoading, setFundsLoading] = useState(true);
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
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.username}! 👋</h1>
            <p className="text-green-100">Ready to make some winning bets today?</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-green-100">Account Balance</div>
            {fundsLoading ? (
              <div className="text-3xl font-bold">
                <div className="animate-pulse bg-green-300 h-8 w-24 rounded"></div>
              </div>
            ) : (
              <div className="text-3xl font-bold">${userFunds.toFixed(2)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
              </svg>
            </div>
            <span className="text-xl">📊</span>
          </div>
          <div className="text-xl font-bold text-text mb-1">{bettingStats?.total_bets || 0}</div>
          <div className="text-xs text-muted">Total Bets</div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xl">🏆</span>
          </div>
          <div className="text-xl font-bold text-green-500 mb-1">{bettingStats?.win_rate || 0}%</div>
          <div className="text-xs text-muted">Win Rate</div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${(bettingStats?.total_profit || 0) >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} rounded-full flex items-center justify-center`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <span className="text-xl">{(bettingStats?.total_profit || 0) >= 0 ? '💰' : '📉'}</span>
          </div>
          <div className={`text-xl font-bold mb-1 ${(bettingStats?.total_profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${(bettingStats?.total_profit || 0) >= 0 ? '+' : ''}{(bettingStats?.total_profit || 0).toFixed(2)}
          </div>
          <div className="text-xs text-muted">Total Profit</div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl">⚡</span>
          </div>
          <div className="text-xl font-bold text-text mb-1">{bettingStats?.pending_bets || 0}</div>
          <div className="text-xs text-muted">Active Bets</div>
        </div>
      </div>

      {/* Betting Records */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Your Betting History
            <button
              onClick={fetchBettingData}
              className="ml-2 px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white text-xs rounded-lg transition-colors"
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
                  <tr key={i} className="border-b border-border/10 animate-pulse">
                    <td className="py-3 px-2"><div className="w-8 h-8 bg-gray-300 rounded-full"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300 rounded w-32"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300 rounded w-20"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300 rounded w-16"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300 rounded w-16"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300 rounded w-20"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300 rounded w-20"></div></td>
                    <td className="py-3 px-2 text-right"><div className="h-4 bg-gray-300 rounded w-16 ml-auto"></div></td>
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
          <div className="overflow-x-auto">
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
                      }`}>
                        {record.bet_status === 'won' ? '✓' : record.bet_status === 'lost' ? '✗' : '⏳'}
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
                      <div className="text-sm font-medium text-text">{record.odds_value}</div>
                    </td>
                    
                    {/* Amount */}
                    <td className="py-3 px-2">
                      <div className="text-sm text-text">${record.bet_amount.toFixed(2)}</div>
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
                            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span>${record.potential_win.toFixed(2)}</span>
                          </div>
                        ) : record.actual_profit !== undefined ? (
                          `${record.actual_profit >= 0 ? '+' : ''}$${record.actual_profit.toFixed(2)}`
                        ) : (
                          record.bet_status === 'won' ? `+$${(record.potential_win - record.bet_amount).toFixed(2)}` : 
                          `-$${record.bet_amount.toFixed(2)}`
                        )}
                      </div>
                      <div className="text-xs text-muted capitalize">{record.bet_status}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Transaction History
            <button
              onClick={fetchTransactionData}
              className="ml-2 px-3 py-1 bg-purple-500 hover:bg-purple-400 text-white text-xs rounded-lg transition-colors"
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
                  <tr key={i} className="border-b border-border/10 animate-pulse">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                        <div className="h-4 bg-gray-300 rounded w-20"></div>
                      </div>
                    </td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300 rounded w-40"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300 rounded w-16"></div></td>
                    <td className="py-3 px-2"><div className="h-4 bg-gray-300 rounded w-16"></div></td>
                    <td className="py-3 px-2">
                      <div className="h-4 bg-gray-300 rounded w-20 mb-1"></div>
                      <div className="h-3 bg-gray-300 rounded w-16"></div>
                    </td>
                    <td className="py-3 px-2 text-right"><div className="h-4 bg-gray-300 rounded w-16 ml-auto"></div></td>
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
                        {transaction.description}
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
                        {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                      </div>
                    </td>
                    
                    {/* Balance After */}
                    <td className="py-3 px-2">
                      <div className="text-sm text-text">
                        ${transaction.balance_after.toFixed(2)}
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
