import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AdminDashboard from "../components/admin/AdminDashboard";
import UserManagement from "../components/admin/UserManagement";
import BettingManagement from "../components/admin/BettingManagement";
import TransactionManagement from "../components/admin/TransactionManagement";

export default function AdminPanel() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Wait for authentication check to complete before making decisions
    if (isLoading) {
      return; // Still loading, don't redirect yet
    }

    // Check if user is authenticated and is admin
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }

    if (user?.email !== "hitech.proton@gmail.com" && !user?.is_superuser) {
      navigate("/");
      return;
    }
  }, [isAuthenticated, user, navigate, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-sm">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", name: "Dashboard", icon: "📊" },
    { id: "users", name: "Users", icon: "👥" },
    { id: "betting", name: "Betting Records", icon: "🎯" },
    { id: "transactions", name: "Transactions", icon: "💰" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white">Admin Panel</h1>
                  <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Sports Betting Management</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Desktop user info */}
              <div className="hidden lg:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user?.username}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <button
                  onClick={() => navigate("/")}
                  className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg transition-colors"
                >
                  Back to Main Site
                </button>
              </div>
              
              {/* Mobile user info */}
              <div className="lg:hidden">
                <div className="text-right">
                  <p className="text-xs font-medium text-white truncate max-w-20">{user?.username}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Desktop */}
      <div className="hidden lg:block bg-black/30 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-black/50 backdrop-blur-xl border-b border-gray-800">
          <div className="px-4 py-2">
            <div className="flex flex-col space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center px-3 py-3 rounded-lg font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "text-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
                  }`}
                >
                  <span className="mr-3 text-lg">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
              
              {/* Mobile user actions */}
              <div className="pt-2 mt-2 border-t border-gray-700">
                <div className="px-3 py-2">
                  <p className="text-xs text-gray-400">Logged in as</p>
                  <p className="text-sm font-medium text-white">{user?.username}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => navigate("/")}
                  className="w-full mt-2 px-3 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg transition-colors text-sm"
                >
                  Back to Main Site
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "betting" && <BettingManagement />}
        {activeTab === "transactions" && <TransactionManagement />}
      </div>
    </div>
  );
}
