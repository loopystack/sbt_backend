

export type MatchingInfo = {
    id: string;
    season: string;
    date: string;
    time: string;
    home_team: string;
    away_team: string;
    result: string;
    odd_1: number;
    odd_X: number;
    odd_2: number;
    bets: number;
    country: string;
    createdAt: string;
    updatedAt: string;
}

export type GetMatchingInfoResponse = {
    page: number;
    total: number;
    pages: number;
    size: number;
    odds: MatchingInfo[];
}