import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCountry } from "../contexts/CountryContext";

interface MobileBottomNavProps {
  onLeftSidebarToggle: () => void;
  onRightSidebarToggle: () => void;
}

export default function MobileBottomNav({ onLeftSidebarToggle, onRightSidebarToggle }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelectedLeague } = useCountry();

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 px-4 py-2 z-50">
      <div className="flex items-center justify-between">
        {/* Sports - Left Sidebar (Countries/Leagues) */}
        <button
          onClick={onLeftSidebarToggle}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs">Sports</span>
        </button>

        {/* Dashboard */}
        <button
          onClick={() => {
            console.log('Mobile Dashboard clicked - clearing selectedLeague and navigating');
            setSelectedLeague(null);
            navigate("/dashboard");
          }}
          className={`flex flex-col items-center gap-1 transition-colors relative ${
            isActive("/dashboard") ? "text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-xs">Dashboard</span>
          {isActive("/dashboard") && (
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-yellow-400 rounded-full"></div>
          )}
        </button>

        {/* Home - Primary CTA */}
        <button
          onClick={() => {
            setSelectedLeague(null);
            navigate("/");
          }}
          className="flex flex-col items-center gap-1 bg-green-500 hover:bg-green-600 text-white rounded-full p-3 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-medium">Home</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => {
            console.log('Mobile Profile clicked - clearing selectedLeague and navigating');
            setSelectedLeague(null);
            navigate("/profile");
          }}
          className={`flex flex-col items-center gap-1 transition-colors relative ${
            isActive("/profile") ? "text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs">Profile</span>
          {isActive("/profile") && (
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-yellow-400 rounded-full"></div>
          )}
        </button>

        {/* Bets - Right Sidebar (Value Bets) */}
        <button
          onClick={onRightSidebarToggle}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span className="text-xs">Bets</span>
        </button>
      </div>
    </nav>
  );
}
