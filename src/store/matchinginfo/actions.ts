import { createAsyncThunk } from '@reduxjs/toolkit';
import { getMatchingInfoService } from './services';
import { MatchingInfo, GetMatchingInfoResponse } from './types';
import { handleActionResponse } from '../global/actions';
import { toast } from 'react-toastify';

export const getMatchingInfoAction = createAsyncThunk<
    GetMatchingInfoResponse,
    { page?: string, size?: string, season?: string, country?: string } | undefined,
    { rejectValue: string }
>(
    'matchinginfo/getMatchingInfo',
    async (queries, { rejectWithValue }) => {
        try {
            const response = await getMatchingInfoService(queries);
            const result = handleActionResponse<GetMatchingInfoResponse>(
                response,
                'Get matching info successful',
                'Get matching info failed'
            );
            
            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Get matching info failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);
