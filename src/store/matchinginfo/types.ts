

export type MatchingInfo = {
    id: string;
    season: number;
    date: string;
    time: string;
    home_team: string;
    away_team: string;
    result: string;
    odd_1: number | null;
    odd_X: number | null;
    odd_2: number | null;
    bets: number;
    country: string;
    league: string;
    pre_odd_1?: number | null;
    pre_odd_x?: number | null;
    pre_odd_2?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

export type GetMatchingInfoResponse = {
    page: number;
    total: number;
    pages: number;
    size: number;
    odds: MatchingInfo[];
}
