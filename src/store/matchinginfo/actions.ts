import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../lib/api';
import { GetMatchingInfoResponse } from './types';

export interface GetMatchingInfoParams {
    page: number;
    size: number;
}

export const getMatchingInfoAction = createAsyncThunk<
    GetMatchingInfoResponse,
    GetMatchingInfoParams,
    { rejectValue: string }
>('matchinginfo/getMatchingInfo', async (params, { rejectWithValue }) => {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append('page', params.page);
        queryParams.append('size', params.size);
        
        return await api<GetMatchingInfoResponse>(`/api/odds/?${queryParams}`);
    } catch (error) {
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch matching info');
    }
});
