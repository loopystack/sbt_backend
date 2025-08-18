import React, { useState, useEffect } from "react";

export default function ScrollToFooter() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when user scrolls down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToFooter = () => {
    const footer = document.querySelector('footer');
    if (footer) {
      footer.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToFooter}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-accent hover:bg-accent/80 text-black rounded-full shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 group animate-float animate-glow"
      aria-label="Scroll to footer"
    >
      {/* Main button content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Arrow down icon */}
        <svg 
          className="w-7 h-7 animate-bounce" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2.5} 
            d="M19 14l-7 7m0 0l-7-7m7 7V3" 
          />
        </svg>
        
        {/* Multiple pulse animation rings */}
        <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping"></div>
        <div className="absolute inset-0 rounded-full bg-accent/10 animate-ping" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute inset-0 rounded-full bg-accent/5 animate-ping" style={{ animationDelay: '1s' }}></div>
        
        {/* Custom pulse ring */}
        <div className="absolute inset-0 rounded-full bg-accent/15 animate-pulse-ring"></div>
        
        {/* Glowing effect */}
        <div className="absolute inset-0 rounded-full bg-accent/30 animate-pulse"></div>
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-3 px-4 py-2 bg-surface border border-border rounded-xl text-sm font-medium text-text opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-2xl transform scale-95 group-hover:scale-100">
        <span className="flex items-center space-x-2">
          <span>🚀</span>
          <span>Go to Footer</span>
        </span>
        <div className="absolute top-full right-5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-surface"></div>
      </div>
    </button>
  );
}
