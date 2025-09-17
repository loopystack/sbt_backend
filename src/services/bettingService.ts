import { api } from '../lib/api';

const BASE_URL = '/api/betting';

export interface BettingRecord {
  id: number;
  user_id: number;
  bet_amount: number;
  potential_win: number;
  actual_profit?: number;
  match_teams: string;
  match_date?: string;
  match_league?: string;
  match_status: string;
  selected_outcome: string;
  selected_team?: string;
  odds_value: string;
  odds_decimal: number;
  bet_status: string;
  is_settled: boolean;
  settlement_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface BettingRecordCreate {
  bet_amount: number;
  potential_win: number;
  match_teams: string;
  match_date?: string;
  match_league?: string;
  match_status: string;
  selected_outcome: string;
  selected_team?: string;
  odds_value: string;
  odds_decimal: number;
}

export interface BettingRecordResponse {
  records: BettingRecord[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface BettingStats {
  total_bets: number;
  total_amount_bet: number;
  total_potential_win: number;
  won_bets: number;
  lost_bets: number;
  pending_bets: number;
  total_profit: number;
  win_rate: number;
}

export const bettingService = {
  // Create a new betting record
  createBettingRecord: async (record: BettingRecordCreate): Promise<BettingRecord> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    return api<BettingRecord>(`${BASE_URL}/records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });
  },

  // Get betting records with pagination
  getBettingRecords: async (
    page: number = 1, 
    perPage: number = 10, 
    status?: string
  ): Promise<BettingRecordResponse> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (status) {
      params.append('status', status);
    }

    return api<BettingRecordResponse>(`${BASE_URL}/records?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get betting statistics
  getBettingStats: async (): Promise<BettingStats> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    return api<BettingStats>(`${BASE_URL}/records/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};
