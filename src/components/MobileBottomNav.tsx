import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 px-4 py-2 z-50">
      <div className="flex items-center justify-between">
        {/* Menu */}
        <button
          onClick={() => navigate("/menu")}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-xs">Menu</span>
        </button>

        {/* Casino */}
        <button
          onClick={() => navigate("/casino")}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-xs">Casino</span>
        </button>

        {/* Deposit - Primary CTA */}
        <button
          onClick={() => navigate("/deposit")}
          className="flex flex-col items-center gap-1 bg-green-500 hover:bg-green-600 text-white rounded-full p-3 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-xs font-medium">Deposit</span>
        </button>

        {/* Sports - Active */}
        <button
          onClick={() => navigate("/")}
          className="flex flex-col items-center gap-1 text-white transition-colors relative"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs">Sports</span>
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-yellow-400 rounded-full"></div>
        </button>

        {/* Search */}
        <button
          onClick={() => navigate("/search")}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs">Search</span>
        </button>
      </div>
    </nav>
  );
}
