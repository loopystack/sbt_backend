/**
 * Generic API utility function for making HTTP requests
 * Handles authentication, error handling, and response parsing
 */

interface ApiRequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

/**
 * Generic API function for making HTTP requests
 * @param url - The endpoint URL (relative or absolute)
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Promise with parsed JSON response
 */
export async function api<T = any>(
  url: string, 
  options: ApiRequestOptions = {}
): Promise<T> {
  // Get base URL from environment or default to localhost
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001';
  
  // Ensure URL is absolute
  const absoluteUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  
  // Get access token for authentication
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Prepare request options
  const requestOptions: RequestInit = {
    ...options,
    headers,
  };
  
  try {
    console.log(`Making API request to: ${absoluteUrl}`);
    console.log('Request options:', requestOptions);
    console.log('Environment check:', {
      viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
      baseUrl,
      absoluteUrl,
      originalUrl: url
    });
    
    const response = await fetch(absoluteUrl, requestOptions);
    
    console.log(`Response status: ${response.status}`);
    
    // Handle non-JSON responses (like file downloads)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (response.ok) {
        return response as unknown as T;
      } else {
        throw new ApiError(`Request failed with status ${response.status}`, response.status);
      }
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('API Error Response:', data);
      
      // Handle different error response formats
      let errorMessage = 'An error occurred';
      
      if (data.detail) {
        if (Array.isArray(data.detail)) {
          // Validation errors - show first error
          const firstError = data.detail[0];
          errorMessage = firstError.msg || firstError.message || firstError.detail || 'Validation error';
        } else {
          // Single error message
          errorMessage = data.detail;
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.error) {
        errorMessage = data.error;
      }
      
      throw new ApiError(errorMessage, response.status, data);
    }
    
    console.log('API Response:', data);
    return data;
    
  } catch (error) {
    console.error('API Request failed:', error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('Network error - please check your connection', 0);
    }
    
    // Handle other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'An unknown error occurred',
      0
    );
  }
}

/**
 * Custom Error class for API errors
 */
class ApiError extends Error {
  status?: number;
  details?: any;
  
  constructor(message: string, status?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Convenience methods for common HTTP methods
 */
export const apiMethods = {
  get: <T = any>(url: string, options: ApiRequestOptions = {}) =>
    api<T>(url, { ...options, method: 'GET' }),
    
  post: <T = any>(url: string, data?: any, options: ApiRequestOptions = {}) =>
    api<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  put: <T = any>(url: string, data?: any, options: ApiRequestOptions = {}) =>
    api<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  patch: <T = any>(url: string, data?: any, options: ApiRequestOptions = {}) =>
    api<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  delete: <T = any>(url: string, options: ApiRequestOptions = {}) =>
    api<T>(url, { ...options, method: 'DELETE' }),
};

/**
 * Export the main api function as default and named export
 */
export default api;
