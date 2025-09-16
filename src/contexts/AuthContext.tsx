import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, tokenManager, User } from '../services/authService';
import { useDispatch } from 'react-redux';
import { logoutAction } from '../store/user/actions';
import { AppDispatch } from '../store';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    const token = tokenManager.getAccessToken();
    const reduxToken = localStorage.getItem('token');
    const authToken = token || reduxToken;
    
    if (authToken) {
      try {
        // Sync tokens between systems
        if (token && !reduxToken) {
          localStorage.setItem('token', token);
        } else if (reduxToken && !token) {
          localStorage.setItem('access_token', reduxToken);
        }
        
        const userData = await authService.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error: any) {
        console.error("Failed to get user data:", error);
        
        // Check if it's an authentication error (token expired/invalid)
        if (error?.status === 401 || error?.message?.includes('401') || 
            error?.message?.includes('Unauthorized') || error?.message?.includes('Invalid token')) {
          console.log("Token expired or invalid - logging out user");
          
          // Clear all tokens and state
          tokenManager.clearTokens();
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
          
          // Dispatch Redux logout action
          dispatch(logoutAction());
          
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { isAuthenticated: false, user: null } 
          }));
          
          // Show a brief message that session expired
          const currentPath = window.location.pathname;
          if (currentPath !== '/signin' && currentPath !== '/') {
            console.log("Session expired - redirecting to sign in");
            setTimeout(() => {
              window.location.href = '/signin?message=session_expired';
            }, 500);
          }
        } else {
          // For other errors, just clear the state but don't redirect
          tokenManager.clearTokens();
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      tokenManager.setTokens(response.access_token, response.refresh_token);
      
      // Get user data
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: true, user: userData } 
      }));
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    tokenManager.clearTokens();
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setIsAuthenticated(false);
    
    // Dispatch Redux logout action to clear Redux state
    dispatch(logoutAction());
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('authStateChanged', { 
      detail: { isAuthenticated: false, user: null } 
    }));
    
    // Refresh the page to ensure all components get the updated state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const refreshUser = async () => {
    if (isAuthenticated) {
      await checkAuth();
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === 'refresh_token' || e.key === 'token') {
        checkAuth();
      }
    };

    // Listen for custom auth state changes
    const handleAuthStateChange = (event: CustomEvent) => {
      if (event.detail.isAuthenticated) {
        setTimeout(checkAuth, 100);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    // Periodic token validation (check every 5 minutes)
    const tokenValidationInterval = setInterval(() => {
      if (isAuthenticated && !tokenManager.isAuthenticated()) {
        console.log('Token expired during periodic check - logging out');
        // Token is expired, trigger logout
        const currentPath = window.location.pathname;
        if (currentPath !== '/signin' && currentPath !== '/') {
          window.location.href = '/signin?message=session_expired';
        } else {
          // Clear state without redirect if already on signin page
          tokenManager.clearTokens();
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
          dispatch(logoutAction());
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
      clearInterval(tokenValidationInterval);
    };
  }, [isAuthenticated, dispatch]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
