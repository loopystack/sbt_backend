import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import LeftSidebar from "../../components/LeftSidebar";
import RightSidebar from "../../components/RightSidebar";
import Footer from "../../components/Footer";
import ScrollToFooter from "../../components/ScrollToFooter";
import MobileBottomNav from "../../components/MobileBottomNav";
import MobileSportsCategories from "../../components/MobileSportsCategories";
import MobilePromoBanner from "../../components/MobilePromoBanner";
import { useTheme } from "../../contexts/ThemeContext";


import { useCountry } from "../../contexts/CountryContext";

export default function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { setSelectedLeague } = useCountry();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
        setIsLeftSidebarOpen(false);
        setIsRightSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigation = (path: string) => {
    // Clear selected league when navigating to any page
    setSelectedLeague(null);
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden pb-16 lg:pb-0">
      <div className="fixed inset-0 pointer-events-none">
        {theme === 'dark' && (
          <>
            <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-3000"></div>
            
            <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-pink-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1000"></div>
            <div className="absolute top-3/4 right-1/4 w-64 h-64 bg-cyan-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2500"></div>
            <div className="absolute bottom-1/3 right-1/3 w-88 h-88 bg-green-500/6 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1500"></div>
            <div className="absolute top-1/3 right-1/2 w-56 h-56 bg-indigo-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-3500"></div>
            
            <div className="absolute top-1/6 left-1/2 w-96 h-96 bg-emerald-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-500"></div>
            <div className="absolute top-2/3 left-1/2 w-80 h-80 bg-teal-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1800"></div>
            <div className="absolute top-1/2 left-2/3 w-72 h-72 bg-rose-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2200"></div>
            <div className="absolute top-1/4 right-1/3 w-88 h-88 bg-violet-500/6 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1200"></div>
            <div className="absolute top-3/5 left-2/5 w-64 h-64 bg-amber-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2800"></div>
          </>
        )}
        
        {theme === 'light' && (
          <>
            <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-3000"></div>
            
            <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-pink-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1000"></div>
            <div className="absolute top-3/4 right-1/4 w-64 h-64 bg-cyan-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2500"></div>
            <div className="absolute bottom-1/3 right-1/3 w-88 h-88 bg-green-400/12 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1500"></div>
            <div className="absolute top-1/3 right-1/2 w-56 h-56 bg-indigo-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-3500"></div>
            
            <div className="absolute top-1/6 left-1/2 w-96 h-96 bg-emerald-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-500"></div>
            <div className="absolute top-2/3 left-1/2 w-80 h-80 bg-teal-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1800"></div>
            <div className="absolute top-1/2 left-2/3 w-72 h-72 bg-rose-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2200"></div>
            <div className="absolute top-1/4 right-1/3 w-88 h-88 bg-violet-400/12 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1200"></div>
            <div className="absolute top-3/5 left-2/5 w-64 h-64 bg-amber-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2800"></div>
          </>
        )}
      </div>

      <Header 
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onLeftSidebarToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        onRightSidebarToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <div className={`fixed top-16 left-0 w-72 sm:w-80 h-full bg-surface border-r border-border z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4">
          <div className="space-y-4">
            <div className="border-b border-border pb-4">
              <h3 className="text-lg font-semibold text-text mb-3">Navigation</h3>
              <nav className="space-y-2">
                <button 
                  onClick={() => handleNavigation("/")}
                  className="w-full text-left block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  🏠 Home
                </button>
                <button 
                  onClick={() => handleNavigation("/matches")}
                  className="w-full text-left block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  📅 Matches
                </button>
                <button 
                  onClick={() => handleNavigation("/dropping-odds")}
                  className="w-full text-left block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  📉 Dropping Odds
                </button>
                <button 
                  onClick={() => handleNavigation("/sure-bets")}
                  className="w-full text-left block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  🎯 Sure Bets
                </button>
                <button 
                  onClick={() => handleNavigation("/in-play-odds")}
                  className="w-full text-left block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  ⚡ In Play
                </button>
                <button 
                  onClick={() => handleNavigation("/all-events")}
                  className="w-full text-left block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  📊 All Events
                </button>
                <button 
                  onClick={() => handleNavigation("/betting")}
                  className="w-full text-left block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  💰 Betting
                </button>
                <button 
                  onClick={() => handleNavigation("/bookmakers")}
                  className="w-full text-left block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  🏢 Bookmakers
                </button>
                {/* <button 
                  onClick={() => handleNavigation("/bonuses")}
                  className="w-full text-left block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  🎁 Bonuses
                </button>
                <button 
                  onClick={() => handleNavigation("/dashboard")}
                  className="w-full text-left block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  📊 Dashboard
                </button> */}
              </nav>
            </div>
            
            <div className="border-b border-border pb-4">
              <h3 className="text-lg font-semibold text-text mb-3">Sports</h3>
              <div className="grid grid-cols-2 gap-2">
                {['⚽ Football', '🏀 Basketball', '🎾 Tennis', '🏒 Hockey', '⛳ Golf', '🏐 Volleyball', '⚾ Baseball', '🎱 Snooker'].map((sport) => (
                  <button key={sport} className="px-3 py-2 text-sm text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors text-left">
                    {sport}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar */}
        <div className={`fixed top-16 left-0 w-72 sm:w-80 h-[calc(100vh-8rem)] bg-surface z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* Sidebar Header */}
          <div className="bg-black/90 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">⚽</span>
              <span className="font-bold text-white">Sports</span>
            </div>
            <button
              onClick={() => setIsLeftSidebarOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="h-[calc(100vh-12rem)] overflow-y-auto scrollbar-hide">
            <LeftSidebar onClose={() => setIsLeftSidebarOpen(false)} />
          </div>
        </div>
        
        {/* Left Sidebar Overlay */}
        {isLeftSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsLeftSidebarOpen(false)} />
        )}
        
        <div className="hidden lg:block">
          <LeftSidebar />
        </div>
        
        <main className={`flex-1 transition-all duration-300 ${
          isLeftSidebarOpen || isRightSidebarOpen ? 'lg:ml-0' : ''
        }`}>
          {/* Mobile Components - Only show on mobile */}
          <div className="lg:hidden">
            <MobileSportsCategories />
          </div>
          
          {/* Main Content */}
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <Outlet />
          </div>
        </main>
        
        {/* Right Sidebar */}
        <div className={`fixed top-16 right-0 w-72 sm:w-80 h-[calc(100vh-8rem)] bg-surface z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {/* Sidebar Header */}
          <div className="bg-black/90 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">📋</span>
              <span className="font-bold text-white">Value Bets</span>
            </div>
            <button
              onClick={() => setIsRightSidebarOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="h-[calc(100vh-12rem)] overflow-y-auto scrollbar-hide">
            <RightSidebar onClose={() => setIsRightSidebarOpen(false)} />
          </div>
        </div>
        
        {/* Right Sidebar Overlay */}
        {isRightSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsRightSidebarOpen(false)} />
        )}
        
        <div className="hidden lg:block">
          <RightSidebar />
        </div>
      </div>
      
      <Footer />
      
      <ScrollToFooter />
      
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav 
          onLeftSidebarToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          onRightSidebarToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        />

    </div>
  );
}
