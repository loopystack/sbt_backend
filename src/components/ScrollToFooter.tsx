import React, { useState, useEffect } from "react";

export default function ScrollToFooter() {
  const [isVisible, setIsVisible] = useState(false);
  const [isPastMiddle, setIsPastMiddle] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Use multiple methods to get scroll position for mobile compatibility
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      
      // Show button only after scrolling down (100px threshold)
      const shouldShow = scrollPosition > 100;
      setIsVisible(shouldShow);
      
      // Calculate if we've passed the middle (50%) of the page
      const scrollPercentage = scrollPosition / (documentHeight - windowHeight);
      const isPastHalf = scrollPercentage > 0.5;
      
      console.log('Mobile Scroll Debug:', {
        scrollPosition,
        documentHeight,
        windowHeight,
        scrollPercentage: scrollPercentage.toFixed(2),
        shouldShow,
        isPastHalf,
        userAgent: navigator.userAgent.includes('Mobile')
      });
      
      setIsPastMiddle(isPastHalf);
    };

    // Multiple event listeners for mobile compatibility
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    window.addEventListener('touchmove', toggleVisibility, { passive: true });
    document.addEventListener('scroll', toggleVisibility, { passive: true });
    
    // Trigger immediately and also after a delay for mobile
    toggleVisibility();
    setTimeout(toggleVisibility, 200);
    setTimeout(toggleVisibility, 500);
    
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
      window.removeEventListener('touchmove', toggleVisibility);
      document.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const handleScroll = () => {
    if (isPastMiddle) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      const footer = document.querySelector('footer');
      if (footer) {
        footer.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={handleScroll}
      className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-[9999] w-12 h-12 sm:w-14 sm:h-14 bg-yellow-300 hover:bg-yellow-400 text-black rounded-full shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 group"
      aria-label={isPastMiddle ? "Scroll to top" : "Scroll to footer"}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <svg 
          className="w-6 h-6 sm:w-7 sm:h-7 animate-bounce" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isPastMiddle ? (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M5 10l7-7m0 0l7 7m-7-7v18" 
            />
          ) : (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M19 14l-7 7m0 0l-7-7m7 7V3" 
            />
          )}
        </svg>
        
        <div className="absolute inset-0 rounded-full bg-yellow-300/20 animate-ping"></div>
        <div className="absolute inset-0 rounded-full bg-yellow-300/10 animate-ping" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute inset-0 rounded-full bg-yellow-300/5 animate-ping" style={{ animationDelay: '1s' }}></div>
        
        <div className="absolute inset-0 rounded-full bg-yellow-300/15 animate-pulse-ring"></div>
        
        <div className="absolute inset-0 rounded-full bg-yellow-300/30 animate-pulse"></div>
      </div>
      
      <div className="absolute bottom-full right-0 mb-3 px-3 sm:px-4 py-2 bg-surface border border-border rounded-xl text-xs sm:text-sm font-medium text-text opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-2xl transform scale-95 group-hover:scale-100">
        <span className="flex items-center space-x-2">
          <span>{isPastMiddle ? "⬆️" : "🚀"}</span>
          <span>{isPastMiddle ? "Go to Top" : "Go to Footer"}</span>
        </span>
        <div className="absolute top-full right-3 sm:right-5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-surface"></div>
      </div>
    </button>
  );
}
