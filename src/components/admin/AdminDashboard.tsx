import React, { useState, useEffect } from "react";
import { apiMethods } from "../../lib/api";

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

  useEffect(() => {
    fetchStats();
  }, []);

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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.total_users || 0,
      icon: "👥",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      title: "Active Users",
      value: stats?.active_users || 0,
      icon: "🟢",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20"
    },
    {
      title: "Total Bets",
      value: stats?.total_bets || 0,
      icon: "🎯",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    },
    {
      title: "Bet Amount",
      value: `$${(stats?.total_bet_amount || 0).toLocaleString()}`,
      icon: "💰",
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20"
    },
    {
      title: "Transactions",
      value: stats?.total_transactions || 0,
      icon: "📊",
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20"
    },
    {
      title: "Transaction Volume",
      value: `$${(stats?.total_transaction_volume || 0).toLocaleString()}`,
      icon: "💳",
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/20"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <span className="text-2xl">👋</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Welcome to Admin Panel</h2>
            <p className="text-gray-400">Manage your sports betting platform with powerful tools and insights</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} ${card.borderColor} border rounded-xl p-6 hover:scale-105 transition-transform duration-300`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-white">{card.value}</p>
              </div>
              <div className={`w-12 h-12 bg-gradient-to-r ${card.color} rounded-xl flex items-center justify-center`}>
                <span className="text-2xl">{card.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg hover:scale-105 transition-transform duration-300">
            <div className="text-center">
              <span className="text-2xl mb-2 block">👤</span>
              <p className="text-sm font-medium text-white">Add User</p>
            </div>
          </button>
          <button className="p-4 bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg hover:scale-105 transition-transform duration-300">
            <div className="text-center">
              <span className="text-2xl mb-2 block">💰</span>
              <p className="text-sm font-medium text-white">Adjust Funds</p>
            </div>
          </button>
          <button className="p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg hover:scale-105 transition-transform duration-300">
            <div className="text-center">
              <span className="text-2xl mb-2 block">📊</span>
              <p className="text-sm font-medium text-white">View Reports</p>
            </div>
          </button>
          <button className="p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-lg hover:scale-105 transition-transform duration-300">
            <div className="text-center">
              <span className="text-2xl mb-2 block">⚙️</span>
              <p className="text-sm font-medium text-white">Settings</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <span className="text-green-400 text-sm">✓</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white">New user registered</p>
              <p className="text-xs text-gray-400">2 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
              <span className="text-blue-400 text-sm">💰</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white">Bet placed: $50</p>
              <p className="text-xs text-gray-400">5 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
            <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
              <span className="text-purple-400 text-sm">📊</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white">Transaction completed</p>
              <p className="text-xs text-gray-400">10 minutes ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
