import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService, tokenManager } from "../services/authService";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userFunds, setUserFunds] = useState(0);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [recentBets, setRecentBets] = useState([
    { id: 1, match: "Arsenal vs Chelsea", amount: 0.001, odds: 2.5, status: "won", profit: 0.0015 },
    { id: 2, match: "Barcelona vs Real Madrid", amount: 0.002, odds: 1.8, status: "pending", profit: 0 },
    { id: 3, match: "Liverpool vs Manchester City", amount: 0.0015, odds: 3.2, status: "lost", profit: -0.0015 }
  ]);

  // Mock data for charts and statistics
  const weeklyStats = [
    { day: 'Mon', bets: 3, winnings: 0.002 },
    { day: 'Tue', bets: 5, winnings: 0.0035 },
    { day: 'Wed', bets: 2, winnings: -0.001 },
    { day: 'Thu', bets: 4, winnings: 0.0025 },
    { day: 'Fri', bets: 6, winnings: 0.004 },
    { day: 'Sat', bets: 8, winnings: 0.006 },
    { day: 'Sun', bets: 4, winnings: 0.003 }
  ];

  const totalBets = recentBets.length;
  const wonBets = recentBets.filter(bet => bet.status === 'won').length;
  const winRate = totalBets > 0 ? ((wonBets / totalBets) * 100).toFixed(1) : '0';
  const totalProfit = recentBets.reduce((sum, bet) => sum + bet.profit, 0);

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

  // Fetch user funds on component mount
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
  }, [isAuthenticated]);

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
          <div className="text-xl font-bold text-text mb-1">{totalBets}</div>
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
          <div className="text-xl font-bold text-green-500 mb-1">{winRate}%</div>
          <div className="text-xs text-muted">Win Rate</div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${totalProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} rounded-full flex items-center justify-center`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <span className="text-xl">{totalProfit >= 0 ? '💰' : '📉'}</span>
          </div>
          <div className={`text-xl font-bold mb-1 ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(4)}
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
          <div className="text-xl font-bold text-text mb-1">{recentBets.filter(bet => bet.status === 'pending').length}</div>
          <div className="text-xs text-muted">Active Bets</div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Performance Chart */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
            </svg>
            Weekly Performance
          </h3>
          <div className="space-y-4">
            {weeklyStats.map((stat, index) => (
              <div key={stat.day} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {stat.day.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-text">{stat.day}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-text">{stat.bets} bets</div>
                    <div className={`text-xs ${stat.winnings >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${stat.winnings >= 0 ? '+' : ''}{stat.winnings.toFixed(4)}
                    </div>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${stat.winnings >= 0 ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`}
                      style={{ width: `${Math.min(100, Math.abs(stat.winnings) * 1000)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black p-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex flex-col items-center gap-2"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span className="font-semibold text-sm">Place Bet</span>
            </button>
            
            <button 
              onClick={() => navigate('/profile')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white p-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex flex-col items-center gap-2"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <span className="font-semibold text-sm">Profile</span>
            </button>
            
            <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white p-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex flex-col items-center gap-2">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.08 2.76-.52 4.26-.44 1.5-1.68 2.74-3.18 3.18C11.44 16.92 10.26 16.99 8.68 17.14c-.46.04-.68-.61-.33-.96 2.94-2.94 4.95-6.34 8.29-9.68.35-.35 1-.13.96.33z"/>
              </svg>
              <span className="font-semibold text-sm">Add Funds</span>
            </button>
            
            <button 
              onClick={() => navigate('/bonuses')}
              className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white p-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex flex-col items-center gap-2"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="font-semibold text-sm">Bonuses</span>
            </button>
          </div>
        </div>
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
            <button className="text-sm text-yellow-500 hover:text-yellow-400 font-medium">View All</button>
          </div>
          <div className="space-y-3">
            {recentBets.map((bet) => (
              <div key={bet.id} className="flex items-center justify-between p-4 bg-bg rounded-lg border border-border/50 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    bet.status === 'won' ? 'bg-green-500/20 text-green-500' :
                    bet.status === 'lost' ? 'bg-red-500/20 text-red-500' :
                    'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {bet.status === 'won' ? '✓' : bet.status === 'lost' ? '✗' : '⏳'}
                  </div>
                  <div>
                    <div className="font-medium text-text">{bet.match}</div>
                    <div className="text-sm text-muted">Odds: {bet.odds} • Amount: ${bet.amount.toFixed(4)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${
                    bet.status === 'won' ? 'text-green-500' :
                    bet.status === 'lost' ? 'text-red-500' :
                    'text-yellow-500'
                  }`}>
                    {bet.status === 'pending' ? 'Pending' : 
                     bet.profit >= 0 ? `+$${bet.profit.toFixed(4)}` : `-$${Math.abs(bet.profit).toFixed(4)}`}
                  </div>
                  <div className="text-xs text-muted capitalize">{bet.status}</div>
                </div>
              </div>
            ))}
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
