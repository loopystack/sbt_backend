import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import LeftSidebar from "../../components/LeftSidebar";
import RightSidebar from "../../components/RightSidebar";
import Footer from "../../components/Footer";
import ScrollToFooter from "../../components/ScrollToFooter";
import { useTheme } from "../../contexts/ThemeContext";


export default function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Close mobile menu when screen size changes
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
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Beautiful Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Dark mode circles */}
        {theme === 'dark' && (
          <>
            <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-3000"></div>
            
            {/* Additional circles for main content area */}
            <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-pink-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1000"></div>
            <div className="absolute top-3/4 right-1/4 w-64 h-64 bg-cyan-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2500"></div>
            <div className="absolute bottom-1/3 right-1/3 w-88 h-88 bg-green-500/6 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1500"></div>
            <div className="absolute top-1/3 right-1/2 w-56 h-56 bg-indigo-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-3500"></div>
            
            {/* More circles for the center main content area */}
            <div className="absolute top-1/6 left-1/2 w-96 h-96 bg-emerald-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-500"></div>
            <div className="absolute top-2/3 left-1/2 w-80 h-80 bg-teal-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1800"></div>
            <div className="absolute top-1/2 left-2/3 w-72 h-72 bg-rose-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2200"></div>
            <div className="absolute top-1/4 right-1/3 w-88 h-88 bg-violet-500/6 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1200"></div>
            <div className="absolute top-3/5 left-2/5 w-64 h-64 bg-amber-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2800"></div>
          </>
        )}
        
        {/* Light mode circles */}
        {theme === 'light' && (
          <>
            <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-3000"></div>
            
            {/* Additional circles for main content area */}
            <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-pink-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1000"></div>
            <div className="absolute top-3/4 right-1/4 w-64 h-64 bg-cyan-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2500"></div>
            <div className="absolute bottom-1/3 right-1/3 w-88 h-88 bg-green-400/12 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1500"></div>
            <div className="absolute top-1/3 right-1/2 w-56 h-56 bg-indigo-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-3500"></div>
            
            {/* More circles for the center main content area */}
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
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      {/* Mobile Menu */}
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
        {/* Left Sidebar - Hidden on mobile, collapsible on tablet */}
        <div className={`${
          isLeftSidebarOpen ? 'fixed inset-0 z-40 lg:hidden' : 'hidden'
        }`}>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsLeftSidebarOpen(false)} />
          <div className="fixed top-16 left-0 w-72 sm:w-80 h-full bg-surface border-r border-border z-50">
            <LeftSidebar />
          </div>
        </div>
        
        {/* Left Sidebar - Desktop */}
        <div className="hidden lg:block">
          <LeftSidebar />
        </div>
        
        {/* Main Content */}
        <main className={`flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 transition-all duration-300 ${
          isLeftSidebarOpen || isRightSidebarOpen ? 'lg:ml-0' : ''
        }`}>
          <Outlet />
        </main>
        
        {/* Right Sidebar - Hidden on mobile, collapsible on tablet */}
        <div className={`${
          isRightSidebarOpen ? 'fixed inset-0 z-40 lg:hidden' : 'hidden'
        }`}>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsRightSidebarOpen(false)} />
          <div className="fixed top-16 right-0 w-72 sm:w-80 h-full bg-surface border-l border-border z-50">
            <RightSidebar />
          </div>
        </div>
        
        {/* Right Sidebar - Desktop */}
        <div className="hidden lg:block">
          <RightSidebar />
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
      
      {/* Floating Scroll to Footer Button */}
      <ScrollToFooter />
      

    </div>
  );
}
