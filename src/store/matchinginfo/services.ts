import {
    MatchingInfo,
    GetMatchingInfoQueries
} from './types';
import { makeApiCall, handleActionResponse, handleActionError } from '../global/api';
import { ApiError, ActionResponse } from '../global/types';

export const getMatchingInfoService = async (queries: { page?: number, limit?: string } | undefined): Promise<ActionResponse<GetMatchingInfoQueries>> => {
    try {
        const response = await makeApiCall('/api/matchinginfo', 'GET', { params: queries });
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};