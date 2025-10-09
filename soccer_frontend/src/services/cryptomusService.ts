// Cryptomus Payment Gateway Service
// This service handles integration with Cryptomus payment gateway

import CryptoJS from 'crypto-js';

interface CryptomusPaymentRequest {
  amount: number;
  currency: string;
  network?: string;
  order_id?: string;
  url_return?: string;
  url_callback?: string;
  lifetime?: number;
  to_currency?: string;
  subtract?: number;
  accuracy?: number;
  additional_data?: string;
  currencies?: string[];
  except_currencies?: string[];
}

interface CryptomusPaymentResponse {
  state: number;
  result: {
    uuid: string;
    order_id: string;
    amount: string;
    payment_amount: string;
    payment_amount_usd: string;
    currency: string;
    merchant_amount: string;
    commission: string;
    commission_percent: string;
    network: string;
    address: string;
    from: string;
    txid: string;
    payment_status: string;
    url: string;
    expired_at: number;
    status: string;
    is_final: boolean;
    additional_data: string;
    created_at: number;
    updated_at: number;
  };
}

interface CryptomusConfig {
  merchantId: string;
  apiKey: string;
  baseUrl: string;
}

class CryptomusService {
  private config: CryptomusConfig;

  constructor() {
    this.config = {
      merchantId: '323420be-657e-49b8-b061-128344a29bd6', // Your actual Cryptomus merchant ID
      apiKey: 'Qbrsscrs0n3TXxb66HdluJNGKa3dslIXn8tFjzjrxBGIJ4MO4epbuKq6nXFhyHgbYiZd3R1PPO9Jp4pdPUREG68DEgByxB8rDRlIfYEslxpCkvpmNNf62WKEK1vjuO7E',
      baseUrl: 'https://api.cryptomus.com/v1'
    };
  }

  /**
   * Create a payment invoice via backend proxy
   */
  async createPayment(request: CryptomusPaymentRequest): Promise<CryptomusPaymentResponse> {
    try {
      const payload = {
        amount: request.amount.toString(),
        currency: request.currency,
        order_id: request.order_id || `order_${Date.now()}`,
        url_return: request.url_return || `${window.location.origin}/profile`,
        url_callback: request.url_callback || `${window.location.origin}/api/cryptomus/callback`,
        lifetime: request.lifetime || 3600, // 1 hour
        to_currency: request.to_currency,
        subtract: request.subtract || 0,
        accuracy: request.accuracy || 6,
        additional_data: request.additional_data || '',
        currencies: request.currencies || [],
        except_currencies: request.except_currencies || []
      };

      console.log('Creating Cryptomus payment with payload:', payload);

      // Use backend proxy to avoid CORS issues
      const response = await fetch(`http://localhost:5001/api/deposits/cryptomus/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Add auth token
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
      console.log('Cryptomus API success response:', data);
      return data;
    } catch (error) {
      console.error('Cryptomus payment creation error:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(uuid: string): Promise<CryptomusPaymentResponse> {
    try {
      const payload = { uuid };
      
      const response = await fetch(`${this.config.baseUrl}/payment/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'merchant': this.config.merchantId,
          'sign': this.generateSignature(payload)
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Cryptomus API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Cryptomus payment status error:', error);
      throw error;
    }
  }

  /**
   * Generate signature for API requests using Cryptomus method
   * Cryptomus uses MD5 hash of (base64_encoded_data + api_key)
   */
  private generateSignature(payload: any): string {
    try {
      // Convert payload to JSON string with no spaces (compact)
      const jsonData = JSON.stringify(payload);
      
      // Encode to base64
      const encodedData = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(jsonData));
      
      // Create MD5 hash of (encoded_data + api_key)
      const dataToHash = encodedData + this.config.apiKey;
      const signature = CryptoJS.MD5(dataToHash).toString();
      
      console.log('Signature generation details:');
      console.log('- JSON data:', jsonData);
      console.log('- Base64 encoded:', encodedData);
      console.log('- Data to hash:', dataToHash.substring(0, 50) + '...');
      console.log('- Final signature:', signature);
      
      return signature;
    } catch (error) {
      console.error('Signature generation error:', error);
      // Fallback to simple hash
      return this.simpleHash(JSON.stringify(payload) + this.config.apiKey);
    }
  }

  /**
   * Simple hash function fallback (not cryptographically secure, but works for testing)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Redirect to Cryptomus payment page
   */
  redirectToPayment(paymentUrl: string): void {
    window.location.href = paymentUrl;
  }

  /**
   * Map our crypto currencies to Cryptomus supported currencies
   */
  mapCurrencyToCryptomus(currency: string, network: string): string {
    const currencyMap: { [key: string]: { [key: string]: string } } = {
      'USDT': {
        'Ethereum': 'USDT',
        'TRON': 'USDT_TRC20',
        'Polygon': 'USDT_MATIC',
        'BSC': 'USDT_BSC'
      },
      'USDC': {
        'Ethereum': 'USDC',
        'Polygon': 'USDC_MATIC',
        'Base': 'USDC_BASE',
        'BSC': 'USDC_BSC'
      },
      'BNB': {
        'BSC': 'BNB'
      },
      'TRX': {
        'TRON': 'TRX'
      },
      'BTC': {
        'Bitcoin': 'BTC'
      }
    };

    return currencyMap[currency]?.[network] || currency;
  }

  /**
   * Set merchant ID (call this with your actual merchant ID from Cryptomus dashboard)
   */
  setMerchantId(merchantId: string): void {
    this.config.merchantId = merchantId;
    console.log('Merchant ID updated to:', merchantId);
  }
}

export const cryptomusService = new CryptomusService();
export default cryptomusService;
