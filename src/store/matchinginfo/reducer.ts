import { createReducer } from '@reduxjs/toolkit';
import { getMatchingInfoAction } from './actions';
import { MatchingInfo } from './types';

export interface MatchingInfoState {
    odds: MatchingInfo[];
    isLoading: boolean;
    error: string | null;
    page: number;
    total: number;
    pages: number;
    size: number;
}

const initialState: MatchingInfoState = {
    odds: [],
    isLoading: false,
    error: null,
    page: 1,
    total: 0,
    pages: 0,
    size: 10,
};

export default createReducer(initialState, (builder) =>
    builder
        .addCase(getMatchingInfoAction.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
        .addCase(getMatchingInfoAction.fulfilled, (state, { payload }) => {
            state.isLoading = false;
            state.odds = payload.odds;
            state.page = payload.page;
            state.total = payload.total;
            state.pages = payload.pages;
            state.size = payload.size;
            state.error = null;
        })
        .addCase(getMatchingInfoAction.rejected, (state, { payload }) => {
            state.isLoading = false;
            state.error = payload || 'Failed to fetch matching info';
        })
);
