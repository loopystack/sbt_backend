import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../lib/api';
import { GetMatchingInfoResponse } from './types';

export interface GetMatchingInfoParams {
    page?: number;
    size?: number;
    season?: number;
    country?: string;
    league?: string;
    home_team?: string;
    away_team?: string;
    date_from?: string;
    date_to?: string;
}

export const getMatchingInfoAction = createAsyncThunk<
    GetMatchingInfoResponse,
    GetMatchingInfoParams,
    { rejectValue: string }
>('matchinginfo/getMatchingInfo', async (params, { rejectWithValue }) => {
    try {
        const queryParams = new URLSearchParams();
        
        // Add pagination parameters
        if (params.page !== undefined) queryParams.append('page', params.page.toString());
        if (params.size !== undefined) queryParams.append('size', params.size.toString());
        
        // Add filter parameters
        if (params.season !== undefined) queryParams.append('season', params.season.toString());
        if (params.country) queryParams.append('country', params.country);
        if (params.league) queryParams.append('league', params.league);
        if (params.home_team) queryParams.append('home_team', params.home_team);
        if (params.away_team) queryParams.append('away_team', params.away_team);
        if (params.date_from) queryParams.append('date_from', params.date_from);
        if (params.date_to) queryParams.append('date_to', params.date_to);
        
        return await api<GetMatchingInfoResponse>(`/api/odds/?${queryParams}`);
    } catch (error) {
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch matching info');
    }
});
