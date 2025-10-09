
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import newlogo from "../images/newlogo.png";
import Navigation from "./Navigation";
import OddsFormatSelector from "./OddsFormatSelector";
import { useCountry } from "../contexts/CountryContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";

interface HeaderProps {
  onMobileMenuToggle: () => void;
  onLeftSidebarToggle: () => void;
  onRightSidebarToggle: () => void;
  isMobileMenuOpen: boolean;
}

export default function Header({ onMobileMenuToggle, onLeftSidebarToggle, onRightSidebarToggle, isMobileMenuOpen }: HeaderProps) {
  const navigate = useNavigate();
  const { setSelectedLeague } = useCountry();
  const { user, isAuthenticated, logout } = useAuth();
  const { betNotificationsCount } = useNotifications();
  
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
    navigate("/");
  };

  const handleLogoClick = () => {
    console.log('Logo clicked - clearing selectedLeague and navigating to home');
    setSelectedLeague(null);
    
    // Scroll to top immediately (especially important for mobile)
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    navigate("/");
  };

  const handleMobileNavClick = (path: string) => {
    console.log(`Mobile nav clicked - clearing selectedLeague and navigating to ${path}`);
    setSelectedLeague(null);
    
    // Scroll to top immediately (especially important for mobile)
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-[9999] bg-black border-b border-gray-800">
      <div className="w-full">
        {/* Mobile Header - FortuneJack Style */}
        <div className="lg:hidden">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black">
            {/* Left - Logo */}
            <button
              onClick={handleLogoClick}
              className="flex items-center hover:scale-105 transition-transform duration-300"
            >
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-300">
                <img
                  src={newlogo}
                  alt="SportsBetting Logo"
                  className="h-6 w-6 object-contain"
                />
              </div>
            </button>
            
            {/* Center - Odds Format Selector */}
            <div className="flex-1 flex justify-center">
              <OddsFormatSelector />
            </div>
            
            {/* Right - User Profile Only */}
            <div className="flex items-center">
              {/* User Profile */}
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="p-2 text-gray-400 hover:text-white transition-colors relative"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    {/* Notification Badge */}
                    {betNotificationsCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-lg border border-white">
                        <span className="text-xs font-bold text-white">
                          {betNotificationsCount > 9 ? '9+' : betNotificationsCount}
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Mobile User Dropdown Menu */}
                  {showUserDropdown && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        onClick={() => setShowUserDropdown(false)}
                      />
                      
                      {/* Dropdown */}
                      <div className="fixed top-16 right-3 w-56 max-w-[calc(100vw-24px)] bg-surface/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-top-2 duration-200">
                        <div className="p-3 border-b border-border/30">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/20">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-text text-lg">{user?.username || 'User'}</p>
                              <p className="text-sm text-muted truncate">{user?.email}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-3">
                          <button
                            onClick={() => {
                              setShowUserDropdown(false);
                              navigate("/profile");
                            }}
                            className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                          >
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-text font-semibold text-lg">Profile</span>
                              <p className="text-muted text-sm">Manage your account</p>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => {
                              setShowUserDropdown(false);
                              navigate("/dashboard");
                            }}
                            className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                          >
                            <div className="relative w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              {/* Notification Badge on Dashboard Icon */}
                              {betNotificationsCount > 0 && (
                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg border border-white">
                                  <span className="text-xs font-bold text-white">
                                    {betNotificationsCount > 9 ? '9+' : betNotificationsCount}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="text-text font-semibold text-lg">Dashboard</span>
                              <p className="text-muted text-sm">View your betting stats</p>
                            </div>
                          </button>
                          
                          {/* Admin Panel - Only show for superusers */}
                          {user?.is_superuser && (
                            <button
                              onClick={() => {
                                setShowUserDropdown(false);
                                navigate("/admin");
                              }}
                              className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                            >
                              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                              <div>
                                <span className="text-text font-semibold text-lg">Admin Panel</span>
                                <p className="text-muted text-sm">Manage system settings</p>
                              </div>
                            </button>
                          )}
                          
                          <hr className="my-3 border-border/30" />
                          
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-red-500/10 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                          >
                            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-red-400 font-semibold text-lg">Sign Out</span>
                              <p className="text-muted text-sm">Log out of your account</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => navigate("/signin")}
                  className="text-white text-sm font-medium hover:text-yellow-400 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
          
          {/* Secondary Navigation Bar - 8 Icons Only */}
          <div className="flex items-center justify-between px-1 sm:px-2 py-3 bg-gray-900 border-b border-gray-800">
            <div className="flex items-center gap-0.5 sm:gap-1 flex-1 justify-between">
              {/* Home */}
              <button
                onClick={handleLogoClick}
                className="flex-1 p-1 sm:p-1.5 text-white hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10 min-w-0"
                title="Home"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              
              {/* Next Matches */}
              <button
                onClick={() => handleMobileNavClick("/matches")}
                className="flex-1 p-1 sm:p-1.5 text-white hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10 min-w-0"
                title="Next Matches"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              
              {/* Dropping Odds */}
              <button
                onClick={() => handleMobileNavClick("/dropping-odds")}
                className="flex-1 p-1 sm:p-1.5 text-white hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10 min-w-0"
                title="Dropping Odds"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </button>
              
              {/* Sure Bets */}
              <button
                onClick={() => handleMobileNavClick("/sure-bets")}
                className="flex-1 p-1 sm:p-1.5 text-white hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10 min-w-0"
                title="Sure Bets"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {/* In Play Odds */}
              <button
                onClick={() => handleMobileNavClick("/in-play-odds")}
                className="flex-1 p-1 sm:p-1.5 text-white hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10 min-w-0"
                title="In Play Odds"
              >
                <div className="relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              </button>
              
              {/* All Events */}
              <button
                onClick={() => handleMobileNavClick("/all-events")}
                className="flex-1 p-1 sm:p-1.5 text-white hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10 min-w-0"
                title="All Events"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
              
              {/* Betting */}
              <button
                onClick={() => handleMobileNavClick("/betting")}
                className="flex-1 p-1 sm:p-1.5 text-white hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10 min-w-0"
                title="Betting"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </button>
              
              {/* Bookmakers */}
              <button
                onClick={() => handleMobileNavClick("/bookmakers")}
                className="flex-1 p-1 sm:p-1.5 text-white hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10 min-w-0"
                title="Bookmakers"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="hidden lg:block">
          <Navigation />
        </div>
      </div>
    </header>
  );
}
