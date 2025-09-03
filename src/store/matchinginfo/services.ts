import {
    MatchingInfo,
    GetMatchingInfoQueries
} from './types';
import { makeApiCall, handleActionResponse, handleActionError } from '../global/api';
import { ApiError, ActionResponse } from '../global/types';
import { databaseService } from '../../services/databaseService';

export const getMatchingInfoService = async (queries: { page?: number, limit?: string } | undefined): Promise<ActionResponse<GetMatchingInfoQueries>> => {
    try {

        const data = await databaseService.getMatchingInfo(queries || {});
        return {
            success: true,
            data: data
        };
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};