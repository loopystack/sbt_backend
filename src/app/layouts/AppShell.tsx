import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const { theme } = useTheme();
  const { setSelectedLeague } = useCountry();
  
  // Refs for touch/swipe detection
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwipeGesture = useRef<boolean>(false);
  
  // State for iPad detection
  const [isIPad, setIsIPad] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Use 1025px to ensure iPad Pro (1024px) gets desktop layout
      if (window.innerWidth >= 1025) {
        setIsMobileMenuOpen(false);
        setIsLeftSidebarOpen(false);
        setIsRightSidebarOpen(false);
      }
      
      // Detect iPad Pro (1024px width)
      setIsIPad(window.innerWidth === 1024);
    };

    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to top when route changes (especially important for mobile)
  useEffect(() => {
    // Scroll to top immediately when route changes
    window.scrollTo(0, 0);
    
    // Also ensure document body scroll position is reset (for mobile compatibility)
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    console.log('🔄 Route changed, scrolling to top:', location.pathname);
  }, [location.pathname]);

  // iPad swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only handle on iPad
    if (!isIPad) return;
    
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwipeGesture.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Only handle on iPad
    if (!isIPad) return;
    
    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;
    const deltaX = touchCurrentX - touchStartX.current;
    const deltaY = touchCurrentY - touchStartY.current;
    
    // Check if this is a horizontal swipe (more horizontal than vertical movement)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      isSwipeGesture.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Only handle on iPad
    if (!isIPad) return;
    
    if (!isSwipeGesture.current) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    
    // Swipe right to open left sidebar
    if (deltaX > 100) {
      setIsLeftSidebarOpen(true);
      setIsRightSidebarOpen(false);
    }
    // Swipe left to open right sidebar
    else if (deltaX < -100) {
      setIsRightSidebarOpen(true);
      setIsLeftSidebarOpen(false);
    }
    
    isSwipeGesture.current = false;
  };

  const handleNavigation = (path: string) => {
    // Clear selected league when navigating to any page
    setSelectedLeague(null);
    
    // Scroll to top immediately before navigation (especially important for mobile)
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    navigate(path);
    setIsMobileMenuOpen(false);
    
    console.log('🔄 Navigating to:', path, '- scrolled to top');
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden pb-16 lg:pb-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
        <div className="fixed inset-0 bg-black/50 z-40 xl:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <div className={`fixed top-16 left-0 w-72 sm:w-80 h-full bg-surface border-r border-border z-50 transform transition-transform duration-300 ease-in-out xl:hidden ${
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
        <div className={`fixed top-0 left-0 w-72 sm:w-80 h-screen bg-surface z-[10000] transform transition-transform duration-300 ease-in-out xl:hidden ${
          isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* Sidebar Header */}
          <div className="bg-black/90 backdrop-blur-sm border-b border-border/50 px-4 py-8 flex items-center justify-between h-20">
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
          
          <div className="h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide">
            <LeftSidebar onClose={() => setIsLeftSidebarOpen(false)} />
          </div>
        </div>
        
        {/* Left Sidebar Overlay */}
        {isLeftSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-[9999] xl:hidden" onClick={() => setIsLeftSidebarOpen(false)} />
        )}
        
        <div className="hidden xl:block">
          <LeftSidebar />
        </div>
        
        <main className={`flex-1 transition-all duration-300 ${
          isLeftSidebarOpen || isRightSidebarOpen ? 'xl:ml-0' : ''
        }`}>
          {/* Mobile Components - Only show on mobile */}
          <div className="xl:hidden">
            <MobileSportsCategories />
          </div>
          
          {/* Main Content */}
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <Outlet />
          </div>
        </main>
        
        {/* Right Sidebar */}
        <div className={`fixed top-0 right-0 w-72 sm:w-80 h-screen bg-surface z-[10000] transform transition-transform duration-300 ease-in-out xl:hidden ${
          isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {/* Sidebar Header */}
          <div className="bg-black/90 backdrop-blur-sm border-b border-border/50 px-4 py-8 flex items-center justify-between h-20">
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
          
          <div className="h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide">
            <RightSidebar onClose={() => setIsRightSidebarOpen(false)} />
          </div>
        </div>
        
        {/* Right Sidebar Overlay */}
        {isRightSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-[9999] xl:hidden" onClick={() => setIsRightSidebarOpen(false)} />
        )}
        
        <div className="hidden xl:block">
          <RightSidebar />
        </div>
      </div>
      
      {/* iPad-only Sidebar Toggle Buttons - Only show on iPad Pro (1024px) */}
      {isIPad && (
        <div>
        {/* Left Sidebar Toggle Button - Right Arrow with Flow Effect */}
        <button
          onClick={() => {
            setIsLeftSidebarOpen(!isLeftSidebarOpen);
            setIsRightSidebarOpen(false);
          }}
          className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50 w-12 h-12 bg-black/80 backdrop-blur-sm border border-gray-600 rounded-full flex items-center justify-center text-white hover:bg-black/90 hover:border-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl group"
          title="Swipe right to open left sidebar"
        >
          <div className="relative overflow-hidden">
            {/* Main Arrow */}
            <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* Flowing Arrow Effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-6 h-6 text-white/60 animate-flow-right" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            {/* Moving Arrow Trail */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-move-right"></div>
                </div>
              </div>
            </div>
          </div>
        </button>
        
        {/* Right Sidebar Toggle Button - Left Arrow with Flow Effect */}
        <button
          onClick={() => {
            setIsRightSidebarOpen(!isRightSidebarOpen);
            setIsLeftSidebarOpen(false);
          }}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 w-12 h-12 bg-black/80 backdrop-blur-sm border border-gray-600 rounded-full flex items-center justify-center text-white hover:bg-black/90 hover:border-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl group"
          title="Swipe left to open right sidebar"
        >
          <div className="relative overflow-hidden">
            {/* Main Arrow */}
            <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {/* Flowing Arrow Effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-6 h-6 text-white/60 animate-flow-left" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            {/* Moving Arrow Trail */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-move-left"></div>
                </div>
              </div>
            </div>
          </div>
        </button>
        </div>
      )}
      
      <Footer />
      
      <ScrollToFooter />
      
        {/* Mobile Bottom Navigation - Hidden on iPad Pro and larger */}
        <div className="xl:hidden">
          <MobileBottomNav 
            onLeftSidebarToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            onRightSidebarToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          />
        </div>

    </div>
  );
}
