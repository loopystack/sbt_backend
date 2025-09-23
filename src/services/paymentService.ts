import { api } from '../lib/api';

const BASE_URL = '/api/payments';

export interface CardPaymentRequest {
  card_type: 'visa' | 'mastercard';
  card_number: string;
  expiry_month: number;
  expiry_year: number;
  cvv: string;
  cardholder_name: string;
  amount: number;
}

export interface BankTransferRequest {
  account_number: string;
  routing_number: string;
  account_holder_name: string;
  amount: number;
}

export interface PayPalPaymentRequest {
  email: string;
  amount: number;
}

export interface PaymentResponse {
  transaction_id: string;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  amount: number;
  currency: string;
  message: string;
  new_balance: number;
  processing_time?: number;
  gateway?: string;
}

export interface PaymentMethodInfo {
  type: string;
  name: string;
  min_amount: number;
  max_amount: number;
  currency: string;
  processing_time: string;
  fees: string;
  available: boolean;
}

export interface PaymentMethodsResponse {
  payment_methods: PaymentMethodInfo[];
}

export interface WithdrawalRequest {
  amount: number;
  method: 'crypto' | 'cash';
  // Crypto fields
  crypto_address?: string;
  crypto_currency?: string;
  crypto_network?: string;
  // Cash fields
  card_number?: string;
  cardholder_name?: string;
  expiry_month?: number;
  expiry_year?: number;
  cvv?: string;
  bank_account?: string;
  routing_number?: string;
  account_holder_name?: string;
  paypal_email?: string;
}

export interface WithdrawalResponse {
  transaction_id: string;
  status: 'success' | 'failed' | 'pending' | 'processing';
  amount: number;
  currency: string;
  message: string;
  new_balance: number;
  processing_time?: string;
  estimated_arrival?: string;
}

// Payment service
export const paymentService = {
  // Process Visa payment
  processVisaPayment: async (paymentData: CardPaymentRequest): Promise<PaymentResponse> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001'}${BASE_URL}/process-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({
        ...paymentData,
        card_type: 'visa'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Payment API error response:', errorData);
      
      // Handle different error formats
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Validation errors - show first error
          const firstError = errorData.detail[0];
          throw new Error(firstError.msg || firstError.message || 'Validation error');
        } else {
          // Single error message
          throw new Error(errorData.detail);
        }
      } else if (errorData.message) {
        throw new Error(errorData.message);
      } else {
        throw new Error('Visa payment failed');
      }
    }

    return response.json();
  },

  // Process Mastercard payment
  processMastercardPayment: async (paymentData: CardPaymentRequest): Promise<PaymentResponse> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001'}${BASE_URL}/process-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({
        ...paymentData,
        card_type: 'mastercard'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Payment API error response:', errorData);
      
      // Handle different error formats
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Validation errors - show first error
          const firstError = errorData.detail[0];
          throw new Error(firstError.msg || firstError.message || 'Validation error');
        } else {
          // Single error message
          throw new Error(errorData.detail);
        }
      } else if (errorData.message) {
        throw new Error(errorData.message);
      } else {
        throw new Error('Mastercard payment failed');
      }
    }

    return response.json();
  },

  // Process Bank Transfer payment
  processBankTransfer: async (paymentData: BankTransferRequest): Promise<PaymentResponse> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001'}${BASE_URL}/process-bank-transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Payment API error response:', errorData);
      
      // Handle different error formats
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Validation errors - show first error
          const firstError = errorData.detail[0];
          throw new Error(firstError.msg || firstError.message || 'Validation error');
        } else {
          // Single error message
          throw new Error(errorData.detail);
        }
      } else if (errorData.message) {
        throw new Error(errorData.message);
      } else {
        throw new Error('Bank transfer failed');
      }
    }

    return response.json();
  },

  // Process PayPal payment
  processPayPalPayment: async (paymentData: PayPalPaymentRequest): Promise<PaymentResponse> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001'}${BASE_URL}/process-paypal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Payment API error response:', errorData);
      
      // Handle different error formats
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Validation errors - show first error
          const firstError = errorData.detail[0];
          throw new Error(firstError.msg || firstError.message || 'Validation error');
        } else {
          // Single error message
          throw new Error(errorData.detail);
        }
      } else if (errorData.message) {
        throw new Error(errorData.message);
      } else {
        throw new Error('PayPal payment failed');
      }
    }

    return response.json();
  },

  // Get available payment methods
  getPaymentMethods: async (): Promise<PaymentMethodsResponse> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001'}${BASE_URL}/payment-methods`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get payment methods');
    }

    return response.json();
  },

  // Confirm crypto deposit manually
  confirmCryptoDeposit: async (depositData: {
    amount: number;
    currency?: string;
    transaction_hash?: string;
    deposit_address?: string;
    network?: string;
    memo?: string;
  }): Promise<{
    success: boolean;
    message: string;
    new_balance: number;
    transaction_hash?: string;
    verification_details?: any;
  }> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001'}${BASE_URL}/confirm-crypto-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify(depositData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Confirm deposit API error response:', errorData);

      // Handle different error formats
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Validation errors - show first error
          const firstError = errorData.detail[0];
          throw new Error(firstError.msg || firstError.message || 'Validation error');
        } else {
          // Single error message
          throw new Error(errorData.detail);
        }
      } else if (errorData.message) {
        throw new Error(errorData.message);
      } else {
        throw new Error('Deposit confirmation failed');
      }
    }

    return response.json();
  },

  // Process withdrawal
  processWithdrawal: async (withdrawalData: WithdrawalRequest): Promise<WithdrawalResponse> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001'}${BASE_URL}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify(withdrawalData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Withdrawal API error response:', errorData);
      
      // Handle different error formats
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Validation errors - show first error
          const firstError = errorData.detail[0];
          throw new Error(firstError.msg || firstError.message || 'Validation error');
        } else {
          // Single error message
          throw new Error(errorData.detail);
        }
      } else if (errorData.message) {
        throw new Error(errorData.message);
      } else {
        throw new Error('Withdrawal failed');
      }
    }

    return response.json();
  },

  // Get withdrawal methods
  getWithdrawalMethods: async (): Promise<PaymentMethodsResponse> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001'}${BASE_URL}/withdrawal-methods`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get withdrawal methods');
    }

    return response.json();
  },
};
