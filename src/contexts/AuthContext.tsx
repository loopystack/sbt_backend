import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User, tokenManager } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName?: string) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simple authentication check - if user exists, you're authenticated
  const isAuthenticated = !!user;

  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔐 AuthContext: Initializing authentication...');
        
        // Check if we have tokens in localStorage
        const hasToken = tokenManager.isAuthenticated();
        console.log('🔐 AuthContext: Has token?', hasToken);
        
        if (hasToken) {
          console.log('🔐 AuthContext: Token found, fetching user data...');
          try {
            const userData = await authService.getCurrentUser();
            console.log('🔐 AuthContext: User data received:', userData.email);
            setUser(userData);
            console.log('🔐 AuthContext: User set successfully');
          } catch (error) {
            console.error('🔐 AuthContext: Failed to fetch user data:', error);
            // Token is invalid, clear it
            tokenManager.clearTokens();
            setUser(null);
          }
        } else {
          console.log('🔐 AuthContext: No token found');
          setUser(null);
        }
      } catch (error) {
        console.error('🔐 AuthContext: Initialization error:', error);
        tokenManager.clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
        console.log('🔐 AuthContext: Initialization complete. User:', user?.email || 'null');
      }
    };

    initializeAuth();
  }, []); // Only run once on mount

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Starting login for:', email);
      setIsLoading(true);
      
      // Clear any existing state first
      setUser(null);
      
      // Call login API
      const response = await authService.login({ email, password });
      console.log('🔐 AuthContext: Login API successful');
      
      // Store tokens
      tokenManager.setTokens(response.access_token, response.refresh_token);
      console.log('🔐 AuthContext: Tokens stored');
      
      // Get user data
      const userData = await authService.getCurrentUser();
      console.log('🔐 AuthContext: User data received:', userData.email);
      
      // Set user state
      setUser(userData);
      console.log('🔐 AuthContext: Login complete! User set:', userData.email);
      
    } catch (error) {
      console.error('🔐 AuthContext: Login failed:', error);
      tokenManager.clearTokens();
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, username: string, password: string, fullName?: string) => {
    try {
      console.log('🔐 AuthContext: Starting registration for:', email);
      setIsLoading(true);
      
      await authService.register({ email, username, password, full_name: fullName });
      console.log('🔐 AuthContext: Registration successful, auto-login...');
      
      // Auto-login after registration
      await login(email, password);
      
    } catch (error) {
      console.error('🔐 AuthContext: Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('🔐 AuthContext: Logging out...');
    tokenManager.clearTokens();
    setUser(null);
    console.log('🔐 AuthContext: Logout complete! User cleared');
  };

  const refreshUser = async () => {
    try {
      console.log('🔐 AuthContext: Refreshing user data...');
      if (tokenManager.isAuthenticated()) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        console.log('🔐 AuthContext: User refreshed:', userData.email);
      }
    } catch (error) {
      console.error('🔐 AuthContext: Failed to refresh user:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  console.log('🔐 AuthContext: Rendering with user:', user?.email || 'null', 'isAuthenticated:', isAuthenticated);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};