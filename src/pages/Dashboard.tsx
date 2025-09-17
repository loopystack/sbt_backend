import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService, tokenManager } from "../services/authService";
import { bettingService, BettingRecord, BettingStats } from "../services/bettingService";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userFunds, setUserFunds] = useState(0);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [bettingRecords, setBettingRecords] = useState<BettingRecord[]>([]);
  const [bettingStats, setBettingStats] = useState<BettingStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // Fetch betting records and stats
  const fetchBettingData = async () => {
    if (!isAuthenticated) return;
    
    try {
      setRecordsLoading(true);
      const [recordsResponse, statsResponse] = await Promise.all([
        bettingService.getBettingRecords(currentPage, 5), // 5 records per page for dashboard
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
  }, [isAuthenticated, currentPage]);

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
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 bg-bg rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-40"></div>
                      <div className="h-3 bg-gray-300 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                    <div className="h-3 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
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
          <div className="space-y-4">
            {bettingRecords.map((record) => (
              <div key={record.id} className="bg-gradient-to-r from-bg to-bg/50 border border-border/50 rounded-xl p-4 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      record.bet_status === 'won' ? 'bg-green-500/20 text-green-500' :
                      record.bet_status === 'lost' ? 'bg-red-500/20 text-red-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {record.bet_status === 'won' ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : record.bet_status === 'lost' ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    {/* Bet Details */}
                    <div>
                      <div className="font-semibold text-text mb-1">{record.match_teams}</div>
                      <div className="flex items-center gap-4 text-sm text-muted">
                        <span>🎯 {record.selected_team || record.selected_outcome}</span>
                        <span>📊 {record.odds_value}</span>
                        <span>💰 ${record.bet_amount.toFixed(2)}</span>
                        <span>📅 {new Date(record.created_at).toLocaleDateString()}</span>
                        <span>🕐 {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {record.match_league && (
                        <div className="text-xs text-muted mt-1">🏆 {record.match_league}</div>
                      )}
                    </div>
                  </div>

                  {/* Profit/Status */}
                  <div className="text-right">
                    <div className={`font-bold text-lg ${
                      record.bet_status === 'won' ? 'text-green-500' :
                      record.bet_status === 'lost' ? 'text-red-500' :
                      'text-yellow-500'
                    }`}>
                      {record.bet_status === 'pending' ? (
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                          ${record.potential_win.toFixed(2)}
                        </span>
                      ) : record.actual_profit !== undefined ? (
                        `${record.actual_profit >= 0 ? '+' : ''}$${record.actual_profit.toFixed(2)}`
                      ) : (
                        record.bet_status === 'won' ? `+$${(record.potential_win - record.bet_amount).toFixed(2)}` : 
                        `-$${record.bet_amount.toFixed(2)}`
                      )}
                    </div>
                    <div className="text-xs text-muted capitalize mt-1">
                      {record.match_status} • {record.bet_status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity & Live Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bets */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Bets
            </h3>
          </div>
          <div className="space-y-3">
            {bettingRecords.slice(0, 3).map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-bg rounded-lg border border-border/50 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    record.bet_status === 'won' ? 'bg-green-500/20 text-green-500' :
                    record.bet_status === 'lost' ? 'bg-red-500/20 text-red-500' :
                    'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {record.bet_status === 'won' ? '✓' : record.bet_status === 'lost' ? '✗' : '⏳'}
                  </div>
                  <div>
                    <div className="font-medium text-text">{record.match_teams}</div>
                    <div className="text-sm text-muted">
                      {record.selected_team || record.selected_outcome} • {record.odds_value} • ${record.bet_amount.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${
                    record.bet_status === 'won' ? 'text-green-500' :
                    record.bet_status === 'lost' ? 'text-red-500' :
                    'text-yellow-500'
                  }`}>
                    {record.bet_status === 'pending' ? 'Pending' : 
                     record.actual_profit !== undefined ? 
                       `${record.actual_profit >= 0 ? '+' : ''}$${record.actual_profit.toFixed(2)}` :
                       record.bet_status === 'won' ? `+$${(record.potential_win - record.bet_amount).toFixed(2)}` :
                       `-$${record.bet_amount.toFixed(2)}`}
                  </div>
                  <div className="text-xs text-muted capitalize">{record.bet_status}</div>
                </div>
              </div>
            ))}
            {bettingRecords.length === 0 && (
              <div className="text-center py-8 text-muted">
                <p className="text-sm">No recent bets to show</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Matches */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Live Now
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-bg rounded-lg border border-red-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-red-500">LIVE</span>
                </div>
                <span className="text-xs text-muted">45'</span>
              </div>
              <div className="text-sm font-medium text-text mb-1">Arsenal vs Chelsea</div>
              <div className="text-xs text-muted">Premier League</div>
              <div className="flex justify-between mt-2 text-xs">
                <span>1.8</span>
                <span>3.2</span>
                <span>2.1</span>
              </div>
            </div>
            
            <div className="p-3 bg-bg rounded-lg border border-red-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-red-500">LIVE</span>
                </div>
                <span className="text-xs text-muted">67'</span>
              </div>
              <div className="text-sm font-medium text-text mb-1">Barcelona vs Real Madrid</div>
              <div className="text-xs text-muted">La Liga</div>
              <div className="flex justify-between mt-2 text-xs">
                <span>2.1</span>
                <span>3.5</span>
                <span>1.9</span>
              </div>
            </div>
          </div>
        </div>
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
