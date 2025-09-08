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
  getAccessToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  isAuthenticated: () => !!localStorage.getItem('access_token'),
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

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${BASE_URL}/login`, {
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

    return api<{ message: string }>(`${BASE_URL}/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        current_password: currentPassword, 
        new_password: newPassword 
      }),
    });
  },

  // Logout (client-side only)
  logout: () => {
    tokenManager.clearTokens();
  },
};
