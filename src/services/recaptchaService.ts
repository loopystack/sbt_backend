import { api } from '../lib/api';

export interface RecaptchaVerificationRequest {
  recaptcha_token: string;
}

export interface RecaptchaVerificationResponse {
  success: boolean;
  message: string;
  score?: number;
  hostname?: string;
}

class RecaptchaService {
  private baseUrl = '/api/auth';

  /**
   * Verify reCAPTCHA token with the backend
   */
  async verifyToken(token: string): Promise<RecaptchaVerificationResponse> {
    try {
      const response = await api<RecaptchaVerificationResponse>(`${this.baseUrl}/verify-recaptcha`, {
        method: 'POST',
        body: JSON.stringify({
          recaptcha_token: token
        })
      });
      
      return response;
    } catch (error: any) {
      throw new Error(`reCAPTCHA verification failed: ${error.message}`);
    }
  }

  /**
   * Get reCAPTCHA site key from environment
   */
  getSiteKey(): string {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    
    if (!siteKey) {
      console.warn('reCAPTCHA site key not configured. Please set VITE_RECAPTCHA_SITE_KEY in your environment.');
      // For development/testing purposes, you can use Google's test keys
      return '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Google's test key
    }
    
    return siteKey;
  }

  /**
   * Check if reCAPTCHA is configured
   */
  isConfigured(): boolean {
    return !!(import.meta.env.VITE_RECAPTCHA_SITE_KEY);
  }

  /**
   * Get error message for display
   */
  getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      'missing-input-secret': 'reCAPTCHA secret key is missing',
      'invalid-input-secret': 'reCAPTCHA secret key is invalid',
      'missing-input-response': 'Please complete the reCAPTCHA verification',
      'invalid-input-response': 'reCAPTCHA verification failed or expired',
      'bad-request': 'Invalid request to reCAPTCHA service',
      'timeout-or-duplicate': 'reCAPTCHA verification has expired, please try again'
    };
    
    return errorMessages[error] || `reCAPTCHA error: ${error}`;
  }
}

// Export singleton instance
export const recaptchaService = new RecaptchaService();
