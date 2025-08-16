import React from "react";
import { Link } from "react-router-dom";
import newlogo from "@/images/newlogo.png";
import Navigation from "./Navigation";

interface HeaderProps {
  onMobileMenuToggle: () => void;
  onLeftSidebarToggle: () => void;
  onRightSidebarToggle: () => void;
  isMobileMenuOpen: boolean;
}

export default function Header({ onMobileMenuToggle, onLeftSidebarToggle, onRightSidebarToggle, isMobileMenuOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[9999] border-b border-border bg-bg/95 backdrop-blur">
      <div className="w-full">
        {/* Mobile Header Controls */}
        <div className="lg:hidden flex items-center justify-between px-3 sm:px-4 py-2 border-b border-border/30">
          <button
            onClick={onLeftSidebarToggle}
            className="p-1.5 sm:p-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Toggle left sidebar"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <Link to="/" className="flex items-center hover:scale-105 transition-transform duration-300">
            <img
              src={newlogo}
              alt="SportsBetting Logo"
              className="h-6 sm:h-8 w-auto drop-shadow-lg"
            />
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={onRightSidebarToggle}
              className="p-1.5 sm:p-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Toggle right sidebar"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            
            <button
              onClick={onMobileMenuToggle}
              className={`p-1.5 sm:p-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors ${
                isMobileMenuOpen ? 'bg-white/10' : ''
              }`}
              aria-label="Toggle mobile menu"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:block">
          <Navigation />
        </div>
      </div>
    </header>
  );
}
