import { api } from '../lib/api';

const BASE_URL = '/api/auth';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  google_id?: string;
  avatar_url?: string;
  funds_usd: number;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface GoogleAuthRequest {
  id_token: string;
}

export interface GoogleAuthResponse extends AuthResponse {
  user: User;
}

// Token management
export const tokenManager = {
  getAccessToken: () => {
    const token = localStorage.getItem('access_token');
    return token;
  },
  getRefreshToken: () => {
    const token = localStorage.getItem('refresh_token');
    return token;
  },
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    
    // Dispatch storage events to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'access_token',
      newValue: accessToken,
      oldValue: null,
      storageArea: localStorage
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'refresh_token',
      newValue: refreshToken,
      oldValue: null,
      storageArea: localStorage
    }));
  },
  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Dispatch storage events to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'access_token',
      newValue: null,
      oldValue: localStorage.getItem('access_token'),
      storageArea: localStorage
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'refresh_token',
      newValue: null,
      oldValue: localStorage.getItem('refresh_token'),
      storageArea: localStorage
    }));
  },
  isAuthenticated: () => {
    const token = localStorage.getItem('access_token');
    if (!token || token.trim() === '') {
      return false;
    }
    
    // Basic JWT token validation (check if it's not expired)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check if token is expired
      if (payload.exp && payload.exp < currentTime) {
        console.log('Token is expired');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Invalid token format:', error);
      return false;
    }
  },
};

// Authentication API functions
export const authService = {
  // Register new user
  register: async (userData: RegisterRequest): Promise<User> => {
    return api<User>(`${BASE_URL}/register`, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Login user
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const formData = new FormData();
    formData.append('username', credentials.email); // FastAPI OAuth2PasswordRequestForm expects 'username' field
    formData.append('password', credentials.password);

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001'}${BASE_URL}/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }

    return response.json();
  },

  // Refresh access token
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    return api<AuthResponse>(`${BASE_URL}/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  // Get current user info
  getCurrentUser: async (): Promise<User> => {
    const token = tokenManager.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    return api<User>(`${BASE_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Google OAuth
  googleAuth: async (idToken: string): Promise<GoogleAuthResponse> => {
    return api<GoogleAuthResponse>(`${BASE_URL}/google`, {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
  },

  // Verify email
  verifyEmail: async (token: string): Promise<{ message: string }> => {
    return api<{ message: string }>(`${BASE_URL}/verify-email`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  // Resend verification email
  resendVerification: async (email: string): Promise<{ message: string }> => {
    return api<{ message: string }>(`${BASE_URL}/resend-verification`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return api<{ message: string }>(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Reset password
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    return api<{ message: string }>(`${BASE_URL}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const token = tokenManager.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    console.log('Making change password request...');
    console.log('Token available:', !!token);
    console.log('Current password provided:', !!currentPassword);
    console.log('New password provided:', !!newPassword);

    try {
      const response = await api<{ message: string }>(`${BASE_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          current_password: currentPassword, 
          new_password: newPassword 
        }),
      });
      console.log('Password change successful');
      return response;
    } catch (error: any) {
      console.error('Change password API error:', error);
      throw error;
    }
  },

  // Logout (client-side only)
  logout: () => {
    tokenManager.clearTokens();
  },

  // Funds management
  getUserFunds: async (): Promise<{ funds_usd: number; formatted_funds: string }> => {
    const token = tokenManager.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    return api<{ funds_usd: number; formatted_funds: string }>(`${BASE_URL}/funds`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  addFunds: async (amount: number): Promise<{ message: string; new_balance: number; formatted_balance: string }> => {
    const token = tokenManager.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    return api<{ message: string; new_balance: number; formatted_balance: string }>(`${BASE_URL}/funds/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });
  },

  deductFunds: async (amount: number): Promise<{ message: string; new_balance: number; formatted_balance: string }> => {
    const token = tokenManager.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    return api<{ message: string; new_balance: number; formatted_balance: string }>(`${BASE_URL}/funds/deduct`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });
  },
};
