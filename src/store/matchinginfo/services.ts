import {
    GetMatchingInfoResponse
} from './types';
import { makeApiCall, handleActionResponse, handleActionError } from '../global/api';
import { ApiError, ActionResponse } from '../global/types';

export const getMatchingInfoService = async (
    queries?: { page?: string; size?: string; season?: string; country?: string; }
): Promise<ActionResponse<GetMatchingInfoResponse>> => {
    try {
        const response = await makeApiCall<GetMatchingInfoResponse>(
            '/api/odds',
            'GET',
            { params: queries }
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};