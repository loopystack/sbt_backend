import React, { useState, useEffect } from "react";

export default function ScrollToFooter() {
  const [isVisible, setIsVisible] = useState(false);
  const [isPastMiddle, setIsPastMiddle] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Enhanced mobile scroll detection
      const scrollPosition = Math.max(
        window.pageYOffset || 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0
      );
      
      const documentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        document.documentElement.offsetHeight,
        document.body.offsetHeight
      );
      
      const windowHeight = window.innerHeight;
      const scrollableHeight = documentHeight - windowHeight;
      
      // Show button only after scrolling down (100px threshold)
      const shouldShow = scrollPosition > 100;
      setIsVisible(shouldShow);
      
      // Calculate if we've passed the middle (50%) of the page
      // Use a more reliable calculation for mobile
      const scrollPercentage = scrollableHeight > 0 ? scrollPosition / scrollableHeight : 0;
      const isPastHalf = scrollPercentage > 0.5;
      
      console.log('Enhanced Mobile Scroll Debug:', {
        scrollPosition,
        documentHeight,
        windowHeight,
        scrollableHeight,
        scrollPercentage: scrollPercentage.toFixed(2),
        shouldShow,
        isPastHalf,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      });
      
      setIsPastMiddle(isPastHalf);
    };

    // Enhanced event listeners for mobile compatibility
    const options = { passive: true, capture: false };
    
    // Window scroll events
    window.addEventListener('scroll', toggleVisibility, options);
    window.addEventListener('touchmove', toggleVisibility, options);
    window.addEventListener('touchend', toggleVisibility, options);
    
    // Document scroll events
    document.addEventListener('scroll', toggleVisibility, options);
    document.addEventListener('touchmove', toggleVisibility, options);
    
    // Body scroll events (for some mobile browsers)
    document.body.addEventListener('scroll', toggleVisibility, options);
    
    // Resize events to recalculate on orientation change
    window.addEventListener('resize', toggleVisibility, options);
    window.addEventListener('orientationchange', toggleVisibility, options);
    
    // Initial calls with delays for mobile initialization
    toggleVisibility();
    setTimeout(toggleVisibility, 100);
    setTimeout(toggleVisibility, 300);
    setTimeout(toggleVisibility, 600);
    
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
      window.removeEventListener('touchmove', toggleVisibility);
      window.removeEventListener('touchend', toggleVisibility);
      document.removeEventListener('scroll', toggleVisibility);
      document.removeEventListener('touchmove', toggleVisibility);
      document.body.removeEventListener('scroll', toggleVisibility);
      window.removeEventListener('resize', toggleVisibility);
      window.removeEventListener('orientationchange', toggleVisibility);
    };
  }, []);

  const handleScroll = () => {
    if (isPastMiddle) {
      // Smooth scroll to top with mobile compatibility
      console.log('Smooth scrolling to top...');
      
      // Check if smooth scrolling is supported
      if ('scrollBehavior' in document.documentElement.style) {
        // Use native smooth scrolling for modern browsers
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
      } else {
        // Custom smooth scroll animation for mobile/older browsers
        const smoothScrollToTop = () => {
          const currentPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
          
          if (currentPosition > 0) {
            // Calculate step size for smooth animation
            const step = Math.max(currentPosition / 12, 1); // Adjust speed by changing divisor
            const newPosition = Math.max(currentPosition - step, 0);
            
            // Scroll to new position
            window.scrollTo(0, newPosition);
            
            // Continue animation if not at top
            if (newPosition > 0) {
              requestAnimationFrame(smoothScrollToTop);
            } else {
              // Ensure we're exactly at the top
              window.scrollTo(0, 0);
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
            }
          }
        };
        
        // Start the smooth scroll animation
        smoothScrollToTop();
      }
      
    } else {
      // Scroll to footer
      console.log('Scrolling to footer...');
      const footer = document.querySelector('footer');
      if (footer) {
        // Check if smooth scrolling is supported for footer
        if ('scrollBehavior' in document.documentElement.style) {
          footer.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        } else {
          // Custom smooth scroll to footer for mobile
          const smoothScrollToFooter = () => {
            const footerRect = footer.getBoundingClientRect();
            const currentPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
            const targetPosition = currentPosition + footerRect.top;
            
            const step = Math.max(Math.abs(footerRect.top) / 12, 1);
            const newPosition = footerRect.top > 0 
              ? Math.min(currentPosition + step, targetPosition)
              : Math.max(currentPosition - step, targetPosition);
            
            window.scrollTo(0, newPosition);
            
            // Continue animation if not at target
            if (Math.abs(footerRect.top) > 5) {
              requestAnimationFrame(smoothScrollToFooter);
            }
          };
          
          smoothScrollToFooter();
        }
      } else {
        // Fallback: scroll to bottom
        if ('scrollBehavior' in document.documentElement.style) {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
          });
        } else {
          // Custom smooth scroll to bottom for mobile
          const smoothScrollToBottom = () => {
            const currentPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            
            if (currentPosition < maxScroll) {
              const step = Math.max((maxScroll - currentPosition) / 12, 1);
              const newPosition = Math.min(currentPosition + step, maxScroll);
              
              window.scrollTo(0, newPosition);
              
              if (newPosition < maxScroll) {
                requestAnimationFrame(smoothScrollToBottom);
              }
            }
          };
          
          smoothScrollToBottom();
        }
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={handleScroll}
      onTouchEnd={(e) => {
        // Prevent default touch behavior and handle scroll
        e.preventDefault();
        handleScroll();
      }}
      className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-[9999] w-12 h-12 sm:w-14 sm:h-14 bg-yellow-300 hover:bg-yellow-400 text-black rounded-full shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 group touch-manipulation"
      aria-label={isPastMiddle ? "Scroll to top" : "Scroll to footer"}
      style={{ WebkitTapHighlightColor: 'transparent' }}
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
