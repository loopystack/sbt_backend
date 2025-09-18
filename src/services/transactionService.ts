import { api } from '../lib/api';

const BASE_URL = '/api/transactions';

export interface Transaction {
  id: number;
  user_id: number;
  transaction_type: string; // 'deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_lost'
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id?: string;
  reference_type?: string;
  status: string;
  payment_method?: string;
  external_reference?: string;
  extra_data?: string;
  created_at: string;
  updated_at?: string;
}

export interface TransactionResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface TransactionSummary {
  total_deposits: number;
  total_withdrawals: number;
  total_bets: number;
  total_winnings: number;
  net_balance: number;
  transaction_count: number;
}

export const transactionService = {
  // Get transactions with pagination and filters
  getTransactions: async (
    page: number = 1, 
    perPage: number = 20, 
    transactionType?: string,
    status?: string
  ): Promise<TransactionResponse> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (transactionType) {
      params.append('transaction_type', transactionType);
    }
    if (status) {
      params.append('status', status);
    }

    return api<TransactionResponse>(`${BASE_URL}/?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get transaction summary statistics
  getTransactionSummary: async (): Promise<TransactionSummary> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    return api<TransactionSummary>(`${BASE_URL}/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get a specific transaction by ID
  getTransaction: async (transactionId: number): Promise<Transaction> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    return api<Transaction>(`${BASE_URL}/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Helper function to format transaction type for display
  formatTransactionType: (type: string): string => {
    const typeMap: Record<string, string> = {
      'deposit': 'Deposit',
      'withdrawal': 'Withdrawal',
      'bet_placed': 'Bet Placed',
      'bet_won': 'Bet Won',
      'bet_lost': 'Bet Lost',
      'bet_deduction': 'Bet Deduction'
    };
    return typeMap[type] || type;
  },

  // Helper function to get transaction type color
  getTransactionTypeColor: (type: string): string => {
    const colorMap: Record<string, string> = {
      'deposit': 'text-green-500',
      'withdrawal': 'text-red-500',
      'bet_placed': 'text-blue-500',
      'bet_won': 'text-green-500',
      'bet_lost': 'text-red-500',
      'bet_deduction': 'text-orange-500'
    };
    return colorMap[type] || 'text-gray-500';
  },

  // Helper function to get transaction type icon
  getTransactionTypeIcon: (type: string): string => {
    const iconMap: Record<string, string> = {
      'deposit': '💰',
      'withdrawal': '💸',
      'bet_placed': '🎯',
      'bet_won': '🏆',
      'bet_lost': '❌',
      'bet_deduction': '⚡'
    };
    return iconMap[type] || '📋';
  },

  // Helper function to parse extra_data JSON
  parseExtraData: (extraDataString?: string): any => {
    if (!extraDataString) return {};
    try {
      return JSON.parse(extraDataString);
    } catch (error) {
      console.error('Error parsing transaction extra_data:', error);
      return {};
    }
  }
}
;
