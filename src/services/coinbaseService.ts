// Coinbase Commerce Service
export interface CoinbasePaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  description?: string;
  redirectUrl?: string;
  webhookUrl?: string;
}

export interface CoinbasePaymentResponse {
  id: string;
  url: string;
  hosted_url: string;
  status: string;
  amount: number;
  currency: string;
  orderId: string;
  createdTime: number;
  expirationTime: number;
}

export interface CoinbaseConfig {
  apiKey: string;
  baseUrl: string;
  isTestMode: boolean;
}

class CoinbaseService {
  private config: CoinbaseConfig;

  constructor() {
    this.config = {
      apiKey: '2c840e42-be66-4f1f-9d75-ea9861a56bdd',
      baseUrl: 'https://api.commerce.coinbase.com',
      isTestMode: true // Test mode for safe development
    };
  }

  // Update API key (for when you get your keys)
  updateApiKey(apiKey: string, isTestMode: boolean = true) {
    this.config.apiKey = apiKey;
    this.config.isTestMode = isTestMode;
  }

  async createPayment(request: CoinbasePaymentRequest): Promise<CoinbasePaymentResponse> {
    try {
      const payload = {
        name: request.description || `Deposit ${request.amount} ${request.currency}`,
        description: request.description || `Deposit ${request.amount} ${request.currency}`,
        local_price: {
          amount: request.amount.toString(),
          currency: request.currency
        },
        pricing_type: 'fixed_price',
        metadata: {
          order_id: request.orderId,
          customer_id: 'user_' + Date.now()
        },
        redirect_url: request.redirectUrl || `${window.location.origin}/profile`,
        cancel_url: `${window.location.origin}/profile`
      };

      console.log('Creating Coinbase Commerce payment with payload:', payload);

      // Use backend proxy to avoid CORS issues
      const response = await fetch(`http://localhost:5001/api/deposits/coinbase/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      console.log('Backend proxy response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend proxy error response:', errorText);
        throw new Error(`Backend proxy error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Coinbase Commerce API success response:', data);
      return data;
    } catch (error) {
      console.error('Coinbase Commerce payment creation error:', error);
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<CoinbasePaymentResponse> {
    try {
      const response = await fetch(`http://localhost:5001/api/deposits/coinbase/payment-status/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get payment status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Coinbase Commerce payment status error:', error);
      throw error;
    }
  }

  redirectToPayment(paymentUrl: string): void {
    console.log('Redirecting to Coinbase Commerce payment:', paymentUrl);
    window.location.href = paymentUrl;
  }

  mapCurrencyToCoinbase(currency: string, network: string): string {
    // Map our currency and network to Coinbase Commerce format
    const currencyMap: { [key: string]: string } = {
      'USDT': 'USDT',
      'USDC': 'USDC', 
      'BNB': 'BNB',
      'TRX': 'TRX',
      'BTC': 'BTC',
      'ETH': 'ETH'
    };

    return currencyMap[currency] || currency;
  }

  // Get the checkout URL for a payment
  getCheckoutUrl(paymentId: string): string {
    return `https://commerce.coinbase.com/checkout/${paymentId}`;
  }
}

export const coinbaseService = new CoinbaseService();
