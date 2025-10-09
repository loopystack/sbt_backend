import {
    UserTypes,
    SignInRequest, 
    SignInResponse, 
    SignUpRequest, 
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    Setup2FAResponse,
    Enable2FARequest,
    Verify2FARequest,
    Disable2FARequest,
    VerifyBackupCodeRequest,
    ChangePasswordRequest,
    GetUsersResponse,
    UpdateUserRequest,
    ListUserTypes
} from './types';
import { makeApiCall, handleActionResponse, handleActionError } from '../global/api';
import { ApiError, ActionResponse } from '../global/types';

export const signInService = async (data: SignInRequest): Promise<ActionResponse<SignInResponse | { requires2FA: true }>> => {
    try {
        const response = await makeApiCall('/api/auth/login', 'POST', { data });
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const signUpService = async (data: SignUpRequest): Promise<ActionResponse<{ success: boolean }>> => {
    try {
        const response = await makeApiCall('/api/auth/register', 'POST', { data });
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const forgotPasswordService = async (data: ForgotPasswordRequest): Promise<ActionResponse<{ success: boolean }>> => {
    try {
        const response = await makeApiCall('/api/auth/forgot-password', 'POST', { data });
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const resetPasswordService = async (data: ResetPasswordRequest): Promise<ActionResponse<{ success: boolean }>> => {
    try {
        const response = await makeApiCall('/api/auth/reset-password', 'POST', { data });
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const verifyEmailService = async (data: VerifyEmailRequest): Promise<ActionResponse<{ success: boolean }>> => {
    try {
        const response = await makeApiCall('/api/auth/verify-email', 'POST', { data });
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const setup2FAService = async (): Promise<ActionResponse<Setup2FAResponse>> => {
    try {
        const response = await makeApiCall<Setup2FAResponse>(
            '/api/auth/2fa/setup',
            'POST',
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const enable2FAService = async (data: Enable2FARequest): Promise<ActionResponse<{ backupCodes: string[] }>> => {
    try {
        const response = await makeApiCall<{ backupCodes: string[] }>(
            '/api/auth/2fa/enable',
            'POST',
            { data }
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const verify2FAService = async (data: Verify2FARequest): Promise<ActionResponse<SignInResponse>> => {
    try {
        const response = await makeApiCall<SignInResponse>(
            `/api/auth/2fa/verify`,
            'POST',
            { data }
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const disable2FAService = async (data: Disable2FARequest): Promise<ActionResponse<{ success: boolean }>> => {
    try {
        const response = await makeApiCall<{ success: boolean }>(
            `/api/auth/2fa/disable`,
            'POST',
            { data }
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const verifyBackupCodeService = async (data: VerifyBackupCodeRequest): Promise<ActionResponse<SignInResponse>> => {
    try {
        const response = await makeApiCall<SignInResponse>(
            `/api/auth/2fa/backup/verify`,
            'POST',
            { data }
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const generateNewBackupCodesService = async (): Promise<ActionResponse<{ success: boolean }>> => {
    try {
        const response = await makeApiCall<{ success: boolean }>(
            `/api/auth/2fa/backup/generate`,
            'POST',
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const updateProfileService = async (data: FormData) => {
    try {
        const response = await makeApiCall<Partial<UserTypes>>(
            `/api/auth/profile`,
            'PUT',
            {
                data,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const changePasswordService = async (data: ChangePasswordRequest) => {
    try {
        const response = await makeApiCall<UserTypes>(
            `/api/auth/change-password`,
            'PUT',
            { data }
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const getMeService = async () => {
    try {
        const response = await makeApiCall<UserTypes>(
            `/api/auth/me`,
            'GET',
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const getReferralRewardHistoryService = async () => {
    try {
        const response = await makeApiCall<{ history: any[] }>(
            `/api/auth/referrals/history`,
            'GET',
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const getAllUsersService = async (
    queries?: { page?: string; limit?: string; }
): Promise<ActionResponse<GetUsersResponse>> => {
    try {
        const response = await makeApiCall<GetUsersResponse>(
            '/api/users',
            'GET',
            { params: queries }
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const updateUserService = async (
    id: string, data: UpdateUserRequest
): Promise<ActionResponse<ListUserTypes>> => {
    try {
        const response = await makeApiCall<ListUserTypes>(
            `/api/users/user/${id}`,
            'PUT',
            { data }
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const deleteUserService = async (
    id: string
): Promise<ActionResponse<{ success: boolean }>> => {
    try {
        const response = await makeApiCall<{ success: boolean }>(
            `/api/users/user/${id}`,
            'DELETE',
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const addSubscriptionService = async (
    id: string
): Promise<ActionResponse<ListUserTypes>> => {
    try {
        const response = await makeApiCall<ListUserTypes>(
            `/api/users/user/${id}/subscription`,
            'POST',
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const removeSubscriptionService = async (
    id: string
): Promise<ActionResponse<ListUserTypes>> => {
    try {
        const response = await makeApiCall<ListUserTypes>(
            `/api/users/user/${id}/subscription`,
            'DELETE',
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};

export const getManualSubscriptionUsersService = async (
    queries?: { page?: string; limit?: string; }
): Promise<ActionResponse<GetUsersResponse>> => {
    try {
        const response = await makeApiCall<GetUsersResponse>(
            '/api/users/manual-subscription-users',
            'GET',
            { params: queries }
        );
        return handleActionResponse(response);
    } catch (error) {
        return handleActionError(error as ApiError);
    }
};
