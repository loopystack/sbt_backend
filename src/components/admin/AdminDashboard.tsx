import React, { useState, useEffect } from "react";
import { apiMethods } from "../../lib/api";
import IncomeOutcomeCharts from "./IncomeOutcomeCharts";

interface AdminStats {
  total_users: number;
  active_users: number;
  total_bets: number;
  total_bet_amount: number;
  total_transactions: number;
  total_transaction_volume: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProgressBars, setShowProgressBars] = useState(false);
  const [animatedStats, setAnimatedStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (stats && !isLoading) {
      setAnimatedStats(stats);
      // Trigger all progress bars together after data loads
      setTimeout(() => {
        setShowProgressBars(true);
      }, 300);
    }
  }, [stats, isLoading]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await apiMethods.get("/api/admin/stats");
      setStats(response);
    } catch (err: any) {
      setError(err.message || "Failed to fetch stats");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          {/* Creative Loading Animation */}
          <div className="relative mb-8">
            {/* Central Hub */}
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse mx-auto"></div>
            
            {/* Orbiting Elements */}
            <div className="absolute inset-0 w-32 h-32 mx-auto">
              {/* First Ring */}
              <div className="absolute w-4 h-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full animate-ping"></div>
              <div className="absolute top-12 w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute top-6 right-6 w-4 h-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
              <div className="absolute top-6 left-6 w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
            </div>
            
            {/* Second Ring */}
            <div className="absolute inset-0 w-40 h-40 mx-auto">
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-emerald-500/60 rounded-full animate-bounce"></div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500/60 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-500/60 rounded-full animate-bounce" style={{animationDelay: '0.6s'}}></div>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-yellow-500/60 rounded-full animate-bounce" style={{animationDelay: '0.9s'}}></div>
            </div>
            
            {/* Connecting Lines */}
            <div className="absolute inset-0 w-40 h-40 mx-auto">
              <div className="absolute top-2 left-1/2 w-0.5 h-3 bg-gradient-to-b from-emerald-500/40 to-transparent transform -translate-x-1/2"></div>
              <div className="absolute bottom-2 left-1/2 w-0.5 h-3 bg-gradient-to-t from-blue-500/40 to-transparent transform -translate-x-1/2"></div>
              <div className="absolute left-2 top-1/2 w-3 h-0.5 bg-gradient-to-r from-purple-500/40 to-transparent transform -translate-y-1/2"></div>
              <div className="absolute right-2 top-1/2 w-3 h-0.5 bg-gradient-to-l from-yellow-500/40 to-transparent transform -translate-y-1/2"></div>
            </div>
          </div>
          
          {/* Loading text */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Initiating Command Center
            </h3>
            <p className="text-gray-400 text-sm">Syncing with financial networks...</p>
            
            {/* Creative Progress Indicator */}
            <div className="flex justify-center space-x-1 mt-6">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i}
                  className="w-2 h-6 bg-gradient-to-t from-purple-500/20 to-blue-500/20 rounded-full animate-pulse"
                  style={{animationDelay: `${i * 0.2}s`}}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ); 
  }

  if (error) {
    return (
      <div className="bg-gradient-to-r from-red-500/10 via-pink-500/10 to-orange-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xl animate-pulse">⚠️</span>
          </div>
          <div>
            <h3 className="text-red-400 font-bold text-lg">Connection Error</h3>
            <p className="text-red-300/80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: animatedStats?.total_users || 0,
      icon: "👥",
      color: "from-blue-500 via-cyan-500 to-teal-500",
      bgColor: "bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-teal-500/20",
      borderColor: "border-blue-500/30",
      shadowColor: "shadow-blue-500/20",
      trend: "+12%",
      trendColor: "text-emerald-400",
      progressPercent: 85
    },
    {
      title: "Active Users",
      value: animatedStats?.active_users || 0,
      icon: "🟢",
      color: "from-emerald-500 via-green-500 to-lime-500",
      bgColor: "bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-lime-500/20",
      borderColor: "border-emerald-500/30",
      shadowColor: "shadow-emerald-500/20",
      trend: "+8%",
      trendColor: "text-emerald-400",
      progressPercent: 72
    },
    {
      title: "Total Bets",
      value: animatedStats?.total_bets || 0,
      icon: "🎯",
      color: "from-purple-500 via-violet-500 to-fuchsia-500",
      bgColor: "bg-gradient-to-br from-purple-500/20 via-violet-500/10 to-fuchsia-500/20",
      borderColor: "border-purple-500/30",
      shadowColor: "shadow-purple-500/20",
      trend: "+24%",
      trendColor: "text-emerald-400",
      progressPercent: 95
    },
    {
      title: "Bet Amount",
      value: `$${(animatedStats?.total_bet_amount || 0).toLocaleString()}`,
      icon: "💰",
      color: "from-amber-500 via-yellow-500 to-orange-500",
      bgColor: "bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20",
      borderColor: "border-amber-500/30",
      shadowColor: "shadow-amber-500/20",
      trend: "+18%",
      trendColor: "text-emerald-400",
      progressPercent: 88
    },
    {
      title: "Transactions",
      value: animatedStats?.total_transactions || 0,
      icon: "📊",
      color: "from-indigo-500 via-blue-500 to-purple-500",
      bgColor: "bg-gradient-to-br from-indigo-500/20 via-blue-500/10 to-purple-500/20",
      borderColor: "border-indigo-500/30",
      shadowColor: "shadow-indigo-500/20",
      trend: "+15%",
      trendColor: "text-emerald-400",
      progressPercent: 76
    },
    {
      title: "Transaction Volume",
      value: `$${(animatedStats?.total_transaction_volume || 0).toLocaleString()}`,
      icon: "💳",
      color: "from-pink-500 via-rose-500 to-red-500",
      bgColor: "bg-gradient-to-br from-pink-500/20 via-rose-500/10 to-red-500/20",
      borderColor: "border-pink-500/30",
      shadowColor: "shadow-pink-500/20",
      trend: "+22%",
      trendColor: "text-emerald-400",
      progressPercent: 92
    }
  ];

  const quickActions = [
    {
      title: "Add User",
      description: "Create new user account",
      icon: "👤",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-blue-500/30",
      borderColor: "border-blue-500/30",
      action: () => console.log("Add User")
    },
    {
      title: "Adjust Funds",
      description: "Manage user balances",
      icon: "💰",
      color: "from-emerald-500 to-green-500",
      bgColor: "bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-emerald-500/30",
      borderColor: "border-emerald-500/30",
      action: () => console.log("Adjust Funds")
    },
    {
      title: "View Reports",
      description: "Generate analytics",
      icon: "📊",
      color: "from-purple-500 to-violet-500",
      bgColor: "bg-gradient-to-br from-purple-500/20 via-violet-500/10 to-purple-500/30",
      borderColor: "border-purple-500/30",
      action: () => console.log("View Reports")
    },
    {
      title: "Settings",
      description: "System configuration",
      icon: "⚙️",
      color: "from-red-500 to-pink-500",
      bgColor: "bg-gradient-to-br from-red-500/20 via-pink-500/10 to-red-500/30",
      borderColor: "border-red-500/30",
      action: () => console.log("Settings")
    }
  ];

  const recentActivities = [
    {
      type: "user",
      title: "New user registered",
      subtitle: "john_doe@gmail.com",
      time: "2 minutes ago",
      icon: "✓",
      color: "from-emerald-500 to-green-500",
      bgColor: "bg-gradient-to-r from-emerald-500/20 to-green-500/20"
    },
    {
      type: "bet",
      title: "High-value bet placed",
      subtitle: "$500 on Premier League",
      time: "5 minutes ago",
      icon: "💰",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-gradient-to-r from-blue-500/20 to-cyan-500/20"
    },
    {
      type: "transaction",
      title: "Payment processed",
      subtitle: "Stripe transaction #1234",
      time: "8 minutes ago",
      icon: "💳",
      color: "from-purple-500 to-violet-500",
      bgColor: "bg-gradient-to-r from-purple-500/20 to-violet-500/20"
    },
    {
      type: "system",
      title: "System backup completed",
      subtitle: "Database snapshot saved",
      time: "12 minutes ago",
      icon: "🛠️",
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-gradient-to-r from-amber-500/20 to-orange-500/20"
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Premium Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-emerald-500/20 backdrop-blur-xl border border-purple-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10"></div>
        <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-500/30 to-transparent rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-blue-500/30 to-transparent rounded-full blur-xl"></div>
        
        <div className="relative flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="relative">
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-xl sm:text-2xl lg:text-3xl">🎮</span>
            </div>
            <div className="absolute inset-0 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 rounded-xl sm:rounded-2xl blur opacity-75"></div>
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
              Admin Control Center
            </h1>
            <p className="text-gray-300/90 text-sm sm:text-base lg:text-lg">Command your sports betting empire with advanced insights and powerful management tools</p>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`group relative overflow-hidden ${card.bgColor} ${card.borderColor} ${card.shadowColor} border-2 rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:border-opacity-50`}
          >
            {/* Animated background glow */}
            <div className={`absolute inset-0 bg-gradient-to-r ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl`}></div>
            
            {/* Card content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-300 mb-1 uppercase tracking-wide">{card.title}</p>
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">{card.value}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium ${card.trendColor}`}>{card.trend}</span>
                    <span className="text-xs text-gray-400 hidden sm:inline">vs last month</span>
                  </div>
                </div>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-r ${card.color} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300`}>
                  <span className="text-xl sm:text-2xl lg:text-3xl">{card.icon}</span>
                </div>
              </div>
              
              {/* Animated Progress bar - Very Slow Animation */}
              <div className="mt-4">
                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${card.color} rounded-full transition-all ease-out`}
                    style={{ 
                      width: showProgressBars ? `${card.progressPercent}%` : '0%',
                      transitionDuration: '5s',
                      transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Premium Quick Actions */}
      <div className="bg-black/40 backdrop-blur-2xl border border-gray-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
        <div className="flex items-center space-x-3 mb-4 sm:mb-6">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm sm:text-lg">⚡</span>
          </div>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Quick Actions</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`group relative overflow-hidden ${action.bgColor} ${action.borderColor} border-2 rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:border-opacity-50`}
            >
              {/* Animated background */}
              <div className={`absolute inset-0 bg-gradient-to-r ${action.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-2xl`}></div>
              
              <div className="relative z-10 text-center">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${action.color} rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg group-hover:rotate-12 transition-transform duration-300`}>
                  <span className="text-lg sm:text-xl lg:text-2xl">{action.icon}</span>
                </div>
                <h4 className="font-bold text-white mb-2 text-sm sm:text-base lg:text-lg">{action.title}</h4>
                <p className="text-gray-300/80 text-xs sm:text-sm">{action.description}</p>
              </div>
              
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
            </button>
          ))}
        </div>
      </div>

      {/* Financial Charts */}
      <IncomeOutcomeCharts />

      {/* Enhanced Recent Activity */}
      <div className="bg-black/40 backdrop-blur-2xl border border-gray-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm sm:text-lg">📈</span>
            </div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Live Activity Feed</h3>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-emerald-400 text-sm font-medium">Live</span>
          </div>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {recentActivities.map((activity, index) => (
            <div
              key={index}
              className={`group flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 ${activity.bgColor} border border-white/10 rounded-lg sm:rounded-xl hover:bg-white/5 transition-all duration-300`}
            >
              {/* Timeline connector */}
              {index < recentActivities.length - 1 && (
                <div className="absolute left-5 sm:left-6 mt-10 sm:mt-12 w-0.5 h-6 sm:h-8 bg-gradient-to-b from-white/20 to-transparent"></div>
              )}
              
              <div className={`relative w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${activity.color} rounded-full flex items-center justify-center shadow-lg`}>
                <span className="text-white text-sm sm:text-lg">{activity.icon}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold truncate text-sm sm:text-base">{activity.title}</p>
                  <span className="text-gray-400 text-xs flex-shrink-0 ml-2">{activity.time}</span>
                </div>
                <p className="text-gray-300/80 text-xs sm:text-sm truncate">{activity.subtitle}</p>
              </div>
              
              {/* Hover indicator */}
              <div className="w-1 h-1 bg-gray-400 rounded-full group-hover:bg-emerald-400 transition-colors duration-300"></div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 sm:mt-6 text-center">
          <button className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm sm:text-base">
            View All Activities
          </button>
        </div>
      </div>
    </div>
  );
}