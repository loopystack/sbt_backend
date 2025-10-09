import { useEffect } from 'react';
import { tokenManager } from '../services/authService';

/**
 * Hook to initialize authentication state when the app starts
 * This hook runs once when the component mounts to check for existing tokens
 * and prepare the authentication system for use
 * 
 * Note: This hook runs outside of AuthProvider, so it only handles token preparation
 * The actual auth state management is handled by AuthProvider
 */
export const useAuthInitialization = () => {
  useEffect(() => {
    // Initialize auth state on app start
    const initializeAuth = () => {
      try {
        // Check for existing tokens and prepare the system
        const accessToken = tokenManager.getAccessToken();
        const refreshToken = tokenManager.getRefreshToken();
        
        if (accessToken || refreshToken) {
          console.log('Auth tokens found, AuthProvider will handle validation');
        } else {
          console.log('No auth tokens found');
        }
        
        // Dispatch a custom event to notify that auth initialization is complete
        window.dispatchEvent(new CustomEvent('authInitializationComplete'));
        
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear any invalid tokens
        tokenManager.clearTokens();
      }
    };

    initializeAuth();
  }, []); // Run only once on mount

  // Return initialization status
  return {
    isInitialized: true, // This hook completes initialization immediately
  };
};
