import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import newlogo from "../images/newlogo.png";
import { useTheme } from "../contexts/ThemeContext";
import { useCountry } from "../contexts/CountryContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { authService, tokenManager } from "../services/authService";
import OddsFormatSelector from "./OddsFormatSelector";

// Hook to determine which sports should be visible and if text should be shown
const useVisibleSports = () => {
  const [visibleCount, setVisibleCount] = useState(8); // Start with all sports visible
  const [showText, setShowText] = useState(true); // Start with text visible
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkVisibility = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      
      // Check if we should show text for top navigation
      const shouldShowText = containerWidth > 1400; // Much larger breakpoint for earlier text hiding
      setShowText(shouldShowText);
      
      // Calculate how many sports can fit
      // Each sport button is approximately 120px wide, plus gaps
      const buttonWidth = 120;
      const gap = 8;
      const favoritesWidth = 120; // Favorites button
      const moreButtonWidth = 80; // More button
      
      // Reduce the available width to make sports collapse sooner
      let availableWidth = containerWidth - favoritesWidth - moreButtonWidth - 32 - 200; // 200px extra buffer
      let canFit = 0;
      
      while (canFit * (buttonWidth + gap) <= availableWidth && canFit < 8) {
        canFit++;
      }
      
      setVisibleCount(Math.max(1, canFit)); // At least show 1 sport
    };

    checkVisibility();
    window.addEventListener('resize', checkVisibility);
    
    return () => window.removeEventListener('resize', checkVisibility);
  }, []);

  return { visibleCount, showText, containerRef };
};

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { selectedLeague, setSelectedLeague } = useCountry();
  const { user, isAuthenticated, logout } = useAuth();
  const { betNotificationsCount, clearNotifications } = useNotifications();
  
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
  const [activeTab, setActiveTab] = useState("home");
  const [activeSport, setActiveSport] = useState("Football");
  const [showMoreSports, setShowMoreSports] = useState(false);
  const moreSportsRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  
  const { visibleCount, showText, containerRef } = useVisibleSports();

  // Calculate dropdown position for More Sports
  const getMoreSportsDropdownStyle = () => {
    if (!moreButtonRef.current) return {};
    
    const buttonRect = moreButtonRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      top: `${buttonRect.bottom + 8}px`,
      left: `${buttonRect.left + (buttonRect.width / 2)}px`,
      transform: 'translateX(-50%)',
      zIndex: 100000
    };
  };

  // Click outside handler for more sports panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsidePanel = moreSportsRef.current && !moreSportsRef.current.contains(target);
      const isOutsideButton = moreButtonRef.current && !moreButtonRef.current.contains(target);

      if (isOutsidePanel && isOutsideButton) {
        setShowMoreSports(false);
      }
    };

    if (showMoreSports) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreSports]);

  useEffect(() => {
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    
    if (path === "/") {
      setActiveTab("home");
    } else if (path === "/matches") {
      setActiveTab("next-matches");
    } else if (path === "/dropping-odds") {
      setActiveTab("dropping-odds");
    } else if (path === "/sure-bets") {
      setActiveTab("sure-bets");
    } else if (path === "/in-play-odds") {
      setActiveTab("in-play-odds");
    } else if (path === "/all-events") {
      // Never auto-activate all-events tab to prevent unwanted redirects
      // Only activate when user explicitly clicks the All Events tab
      setActiveTab("");
    } else if (path === "/betting") {
      setActiveTab("betting");
    } else if (path === "/bookmakers") {
      setActiveTab("bookmakers");
    } else if (path === "/bonuses") {
      setActiveTab("bonuses");
    } else if (path === "/dashboard") {
      setActiveTab("dashboard");
    }
  }, [location.pathname, location.search]);

  // 🎯 Clear active tab when league is selected (mutual exclusion)
  useEffect(() => {
    if (selectedLeague && location.pathname === "/") {
      console.log(`🏆 League selected: ${selectedLeague.name}, clearing active tab`);
      setActiveTab(""); // Clear active tab when league is selected on homepage
    }
  }, [selectedLeague, location.pathname]);

  const handleTabClick = (tabId: string) => {
    console.log('Desktop Navigation clicked:', tabId, '- clearing selectedLeague and navigating');
    
    // Scroll to top immediately (especially important for mobile)
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    switch (tabId) {
      case "home":
        console.log('Navigation Home clicked - clearing selectedLeague and navigating to home');
        // Use the same logic as logo - clear selectedLeague first, then navigate
        setSelectedLeague(null); 
        navigate("/");
        setActiveTab(tabId);
        break;
      case "next-matches":
        setSelectedLeague(null); // Clear league selection
        navigate("/matches");
        setActiveTab(tabId);
        break;
      case "dropping-odds":
        setSelectedLeague(null); // Clear league selection
        navigate("/dropping-odds");
        setActiveTab(tabId);
        break;
      case "sure-bets":
        setSelectedLeague(null); // Clear league selection
        navigate("/sure-bets");
        setActiveTab(tabId);
        break;
      case "in-play-odds":
        setSelectedLeague(null); // Clear league selection
        navigate("/in-play-odds");
        setActiveTab(tabId);
        break;
      case "all-events":
        setSelectedLeague(null); // Clear league selection
        navigate("/all-events");
        setActiveTab(tabId);
        break;
      case "betting":
        setSelectedLeague(null); // Clear league selection
        navigate("/betting");
        setActiveTab(tabId);
        break;
      case "bookmakers":
        setSelectedLeague(null); // Clear league selection
        navigate("/bookmakers");
        setActiveTab(tabId);
        break;
      case "bonuses":
        setSelectedLeague(null); // Clear league selection
        navigate("/bonuses");
        setActiveTab(tabId);
        break;
      case "dashboard":
        setSelectedLeague(null); // Clear league selection
        navigate("/dashboard");
        setActiveTab(tabId);
        break;
      default:
        navigate("/");
        setActiveTab(tabId);
    }
  };

  const sports = [
    { name: "Football", icon: "/assets/sports_icons/football.png", count: 156, color: "from-green-500 to-emerald-600" },
    { name: "Tennis", icon: "/assets/sports_icons/tennis.png", count: 67, color: "from-yellow-500 to-orange-500" },
    { name: "Basketball", icon: "/assets/sports_icons/basketball.png", count: 89, color: "from-orange-500 to-red-500" },
    { name: "Hockey", icon: "/assets/sports_icons/hockey.png", count: 23, color: "from-blue-500 to-indigo-600" },
    { name: "Golf", icon: "/assets/sports_icons/golf.png", count: 34, color: "from-emerald-500 to-green-600" },
    { name: "Volleyball", icon: "/assets/sports_icons/volleyball.png", count: 45, color: "from-purple-500 to-pink-500" },
    { name: "Baseball", icon: "/assets/sports_icons/player.png", count: 56, color: "from-red-500 to-pink-600" },
    { name: "Snooker", icon: "/assets/sports_icons/snooker.png", count: 12, color: "from-gray-600 to-gray-800" }
  ];

  const moreSports = [
    { name: "American Football", icon: "🏈", count: 1 },
    { name: "Australian Rules", icon: "🏉", count: 2 },
    { name: "Badminton", icon: "🏸", count: 0 },
    { name: "Bandy", icon: "/assets/sports_icons/hockey.png", count: 0 },
    { name: "Beach Soccer", icon: "/assets/sports_icons/football.png", count: 0 },
    { name: "Beach Volleyball", icon: "/assets/sports_icons/volleyball.png", count: 14 },
    { name: "Boxing", icon: "🥊", count: 0 },
    { name: "Cricket", icon: "🏏", count: 8 },
    { name: "Cycling", icon: "🚴", count: 3 },
    { name: "Darts", icon: "🎯", count: 10 },
    { name: "Esports", icon: "🎮", count: 9 },
    { name: "Field Hockey", icon: "/assets/sports_icons/hockey.png", count: 4 },
    { name: "Floorball", icon: "/assets/sports_icons/hockey.png", count: 0 },
    { name: "Futsal", icon: "/assets/sports_icons/football.png", count: 2 },
    { name: "Handball", icon: "🤾", count: 24 },
    { name: "Horse Racing", icon: "🏇", count: 148 },
    { name: "Kabaddi", icon: "🤼", count: 0 },
    { name: "MMA", icon: "🥋", count: 0 },
    { name: "Motorsport", icon: "🏁", count: 1 },
    { name: "Netball", icon: "/assets/sports_icons/volleyball.png", count: 0 },
    { name: "Pesäpallo", icon: "🏏", count: 9 },
    { name: "Rugby League", icon: "🏉", count: 1 },
    { name: "Rugby Union", icon: "🏉", count: 0 },
    { name: "Table Tennis", icon: "🏓", count: 64 },
    { name: "Water Polo", icon: "🤽", count: 7 },
    { name: "Winter Sports", icon: "⛷️", count: 0 }
  ];

  const navigationTabs = [
    { id: "home", name: "Home", icon: "/assets/tab_icons/Home.png", gradient: "from-blue-500 to-cyan-500" },
    { id: "next-matches", name: "Next Matches", icon: "/assets/tab_icons/Next_Matches.png", gradient: "from-green-500 to-emerald-500" },
    { id: "dropping-odds", name: "Dropping Odds", icon: "/assets/tab_icons/Dropping_Odds.png", gradient: "from-red-500 to-pink-500" },
    { id: "sure-bets", name: "Sure Bets", icon: "/assets/tab_icons/Sure_Bets.png", gradient: "from-purple-500 to-indigo-500" },
    { id: "in-play-odds", name: "In Play Odds", icon: "/assets/tab_icons/In_Play_Odds.png", gradient: "from-yellow-500 to-orange-500" },
    { id: "all-events", name: "All Events", icon: "/assets/tab_icons/All_Events.png", gradient: "from-indigo-500 to-blue-500" },
    { id: "betting", name: "Betting", icon: "/assets/tab_icons/Betting.png", gradient: "from-emerald-500 to-green-500" },
    { id: "bookmakers", name: "BookMakers", icon: "/assets/tab_icons/Bookmakers.png", gradient: "from-gray-600 to-gray-700" }
  ];

  return (
    <nav className="bg-gradient-to-r from-surface via-surface/95 to-surface border-b border-border/50 w-full relative shadow-lg">
      <div className="w-full px-4">
        <div className="flex items-center h-16 py-3">
          <div className="flex items-center gap-3 mr-8">
            <button
              onClick={() => {
                setSelectedLeague(null);
                navigate("/");
              }}
              className="flex items-center hover:scale-105 transition-transform duration-300"
            >
              <img
                src={newlogo}
                alt="SportsBetting Logo"
                className="p-1 h-25 w-20 drop-shadow-lg"
              />
            </button>
          </div>

          <div className="ml-10 flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 backdrop-blur-sm rounded-2xl p-2 overflow-x-auto scrollbar-hide">
              {navigationTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  title={tab.name}
                  className={`flex items-center gap-1 md:gap-2 lg:gap-3 px-2 md:px-3 lg:px-5 py-2 md:py-3 lg:py-3.5 rounded-xl transition-all duration-300 font-medium text-sm relative overflow-hidden group ${activeTab === tab.id
                      ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg transform scale-105`
                      : "text-muted hover:text-text hover:bg-white/10"
                    }`}
                >
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50"></div>
                  )}
                  {tab.icon.startsWith('/') ? (
                    <img 
                      src={tab.icon} 
                      alt={tab.name}
                      className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform duration-200 icon-yellow"
                    />
                  ) : (
                    <span className="text-lg relative z-10 group-hover:scale-110 transition-transform duration-200 text-accent">{tab.icon}</span>
                  )}
                  <span className="relative z-10 font-bold tracking-wide text-sm xl:text-base">{showText ? tab.name : ''}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/50 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 ml-8">
            <button
              onClick={toggleTheme}
              className="p-3 text-black dark:text-white hover:text-black/80 dark:hover:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? (
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    {/* Notification Badge */}
                    {betNotificationsCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        <span className="text-xs font-bold text-white">
                          {betNotificationsCount > 9 ? '9+' : betNotificationsCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-black dark:text-white hidden sm:block">{user?.username || 'User'}</span>
                  <svg 
                    className={`w-4 h-4 text-muted transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Dropdown Menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-lg shadow-xl z-50">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/20">
                          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-text">{user?.username || 'User'}</p>
                          <p className="text-sm text-muted">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          navigate("/profile");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-text">Profile</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          navigate("/dashboard");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <div className="relative">
                          <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          {/* Notification Badge on Dashboard Icon */}
                          {betNotificationsCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-lg border border-white">
                              <span className="text-xs font-bold text-white">
                                {betNotificationsCount > 9 ? '9+' : betNotificationsCount}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-text">Dashboard</span>
                      </button>
                      
                      {/* Admin Panel Link - Only show for admin users */}
                      {(user?.email === "hitech.proton@gmail.com" || user?.is_superuser) && (
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            navigate("/admin");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span className="text-text font-medium">Admin Panel</span>
                          <span className="ml-auto text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-1 rounded-full font-bold">ADMIN</span>
                        </button>
                      )}
                      
                      <div className="border-t border-border my-2"></div>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-red-400">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="px-6 py-3 text-white hover:text-white/80 font-semibold hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/signin")}
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-border/30 from-bg/50 to-surface/50">
          <div ref={containerRef} className="flex items-center justify-center gap-1 md:gap-2 overflow-x-auto scrollbar-hide py-4 px-2">
          
            {/* Odds Format Selector */}
            <div className="mr-2">
              <OddsFormatSelector />
            </div>
            
            <button
              title="Favorites"
              className="flex items-center gap-1 md:gap-2 lg:gap-3 px-2 md:px-3 lg:px-5 py-2 md:py-3 lg:py-3.5 rounded-xl transition-all duration-300 text-muted hover:text-text hover:bg-gradient-to-r hover:from-yellow-400/20 hover:to-orange-400/20 hover:scale-105 group border border-transparent hover:border-yellow-400/30"
            >
              <span className="text-lg group-hover:scale-110 transition-transform duration-200">⭐</span>
              <span className="font-bold tracking-wide text-sm xl:text-base hidden md:block">Favorites</span>
              <span className="text-xs bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-2.5 py-1.5 rounded-full font-bold tracking-wide shadow-sm">0</span>
            </button>

            {sports.slice(0, visibleCount).map((sport) => (
              <button
                key={sport.name}
                onClick={() => setActiveSport(sport.name)}
                title={sport.name}
                className={`flex items-center gap-1 md:gap-2 lg:gap-3 px-2 md:px-3 lg:px-5 py-2 md:py-3 lg:py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden group ${activeSport === sport.name
                    ? `bg-gradient-to-r ${sport.color} text-white shadow-lg transform scale-105 border-2 border-white/20`
                    : "text-muted hover:text-text hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 hover:scale-105 border border-transparent hover:border-border/50"
                  }`}
              >
                {activeSport === sport.name && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-30"></div>
                )}
                {sport.icon.startsWith('/') ? (
                  <img 
                    src={sport.icon} 
                    alt={sport.name}
                    className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform duration-200 icon-yellow"
                  />
                ) : (
                  <span className="text-lg relative z-10 group-hover:scale-110 transition-transform duration-200 text-accent">{sport.icon}</span>
                )}
                <span className="font-bold tracking-wide text-sm xl:text-base relative z-10 hidden md:block">{sport.name}</span>
                {activeSport === sport.name && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/50 rounded-full"></div>
                )}
              </button>
            ))}

            <div className="relative">
              <button
                ref={moreButtonRef}
                onClick={() => setShowMoreSports(!showMoreSports)}
                title="More Sports"
                className="flex items-center gap-1 md:gap-2 lg:gap-3 px-2 md:px-3 lg:px-5 py-2 md:py-3 lg:py-3.5 rounded-xl transition-all duration-300 text-muted hover:text-text hover:bg-gradient-to-r hover:from-purple-400/20 hover:to-indigo-400/20 hover:scale-105 group border border-transparent hover:border-purple-400/30"
              >

                <span className="font-bold tracking-wide text-sm xl:text-base hidden md:block">More</span>
                {visibleCount < sports.length && (
                  <span className="text-xs bg-gradient-to-r from-purple-400 to-indigo-400 text-white px-2.5 py-1.5 rounded-full font-bold tracking-wide shadow-sm">
                    {sports.length - visibleCount}
                  </span>
                )}
                <span className={`text-lg transition-transform duration-300 group-hover:scale-110 ${showMoreSports ? 'rotate-180' : ''}`}>⌄</span>
              </button>

              {showMoreSports && (
                <div ref={moreSportsRef} style={getMoreSportsDropdownStyle()}>
                  <div className="bg-gradient-to-br from-surface to-bg border border-border/50 rounded-2xl shadow-2xl min-w-96 max-h-96 overflow-y-auto backdrop-blur-sm">
                    <div className="p-1">
                      {visibleCount < sports.length && (
                        <div className="mb-3 pb-3 border-b border-border/30">
                          <div className="text-xs text-muted font-semibold mb-2 px-2">Hidden Sports</div>
                          <div className="grid grid-cols-2 gap-2">
                            {sports.slice(visibleCount).map((sport) => (
                              <button
                                key={sport.name}
                                onClick={() => {
                                  setActiveSport(sport.name);
                                  setShowMoreSports(false);
                                }}
                                className="flex items-center gap-3 p-2 rounded-xl text-left hover:bg-gradient-to-r hover:from-accent/10 hover:to-accent/5 transition-all duration-300 hover:scale-105 group border border-transparent hover:border-accent/20"
                              >
                                {sport.icon.startsWith('/') ? (
                                  <img 
                                    src={sport.icon} 
                                    alt={sport.name}
                                    className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 icon-yellow"
                                  />
                                ) : (
                                  <span className="text-lg group-hover:scale-110 transition-transform duration-200 text-accent">{sport.icon}</span>
                                )}
                                <div className="flex-1">
                                  <span className="font-bold tracking-wide text-sm text-text group-hover:text-accent transition-colors duration-200">{sport.name}</span>
                                  <span className="text-xs text-muted ml-2 bg-muted/50 px-2.5 py-1.5 rounded-full font-bold tracking-wide">({sport.count})</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        {moreSports.map((sport) => (
                          <button
                            key={sport.name}
                            onClick={() => {
                              setActiveSport(sport.name);
                              setShowMoreSports(false);
                            }}
                            className="flex items-center gap-3 p-2 rounded-xl text-left hover:bg-gradient-to-r hover:from-accent/10 hover:to-accent/5 transition-all duration-300 hover:scale-105 group border border-transparent hover:border-accent/20"
                          >
                            {sport.icon.startsWith('/') ? (
                              <img 
                                src={sport.icon} 
                                alt={sport.name}
                                className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 icon-yellow"
                              />
                            ) : (
                              <span className="text-lg group-hover:scale-110 transition-transform duration-200 text-accent">{sport.icon}</span>
                            )}
                            <div className="flex-1">
                              <span className="font-bold tracking-wide text-sm text-text group-hover:text-accent transition-colors duration-200">{sport.name}</span>
                              {sport.count > 0 && (
                                <span className="text-xs text-muted ml-2 bg-muted/50 px-2.5 py-1.5 rounded-full font-bold tracking-wide">({sport.count})</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
