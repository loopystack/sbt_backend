import React, { useState, useEffect } from "react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when user scrolls near the footer
  useEffect(() => {
    const toggleVisibility = () => {
      const scrollPosition = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Show button when user is in the last 30% of the page
      if (scrollPosition + windowHeight > documentHeight * 0.7) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-surface hover:bg-surface/80 text-accent border-2 border-accent rounded-full shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 group animate-float"
      aria-label="Scroll to top"
    >
      {/* Main button content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Arrow up icon */}
        <svg 
          className="w-6 h-6 animate-bounce" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2.5} 
            d="M5 10l7-7m0 0l7 7m-7-7v18" 
          />
        </svg>
        
        {/* Pulse animation ring */}
        <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping"></div>
        
        {/* Glowing effect */}
        <div className="absolute inset-0 rounded-full bg-accent/10 animate-pulse"></div>
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-0 mb-3 px-4 py-2 bg-surface border border-border rounded-xl text-sm font-medium text-text opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-2xl transform scale-95 group-hover:scale-100">
        <span className="flex items-center space-x-2">
          <span>⬆️</span>
          <span>Back to Top</span>
        </span>
        <div className="absolute top-full left-5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-surface"></div>
      </div>
    </button>
  );
}
