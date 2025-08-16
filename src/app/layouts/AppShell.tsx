import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";

export default function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

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

  return (
    <div className="min-h-screen">
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
                <a href="/" className="block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors">🏠 Home</a>
                <a href="/matches" className="block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors">📅 Matches</a>
                <a href="/dropping-odds" className="block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors">📉 Dropping Odds</a>
                <a href="/sure-bets" className="block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors">🎯 Sure Bets</a>
                <a href="/in-play-odds" className="block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors">⚡ In Play</a>
                <a href="/all-events" className="block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors">📊 All Events</a>
                <a href="/betting" className="block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors">💰 Betting</a>
                <a href="/bookmakers" className="block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors">🏢 Bookmakers</a>
                <a href="/bonuses" className="block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors">🎁 Bonuses</a>
                <a href="/dashboard" className="block px-3 py-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors">📊 Dashboard</a>
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
    </div>
  );
}
