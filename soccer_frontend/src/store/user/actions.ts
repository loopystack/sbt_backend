import { createAsyncThunk, createAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { handleActionResponse } from '../global/actions';
import {
    signInService,
    signUpService,
    forgotPasswordService,
    resetPasswordService,
    verifyEmailService,
    setup2FAService,
    enable2FAService,
    verify2FAService,
    disable2FAService,
    verifyBackupCodeService,
    generateNewBackupCodesService,
    updateProfileService,
    changePasswordService,
    getMeService,
    getAllUsersService,
    updateUserService,
    deleteUserService,
    addSubscriptionService,
    removeSubscriptionService,
    getManualSubscriptionUsersService
} from './services';
import { 
    SignInRequest,
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
    UserTypes,
    SignInResponse,
    GetUsersResponse,
    UpdateUserRequest,
    ListUserTypes
} from './types';

export const signInAction = createAsyncThunk<
    UserTypes | { requires2FA: boolean },
    SignInRequest,
    { rejectValue: string }
>(
    'user/signin',
    async (data, { rejectWithValue }) => {
        try {
            const response = await signInService(data);
            const result = handleActionResponse<SignInResponse | { requires2FA: true }>(
                response,
                'Login successful',
                'Login failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            if ('requires2FA' in result) {
                return result;
            }
            toast.success('Login successful', { autoClose: 2000 });
            return {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                role: result.user.role,
                avatar: result.user.avatar || '',
                token: result.token,
                referralCode: result.user.referralCode,
                referredBy: result?.user?.referredBy || undefined,
                referrals: result?.user?.referrals || undefined,
                referralRewards: result?.user?.referralRewards || undefined,
                subscriptionStatus: result.user.subscriptionStatus,
                subscriptionPlan: result.user.subscriptionPlan,
                hasPassword: result.user.hasPassword,
                twoFAEnabled: result.user.twoFAEnabled,
                trialExpiryDate: result.user.trialExpiryDate,
                manualSubscription: {
                    active: result.user.manualSubscription.active,
                    expiresAt: result.user.manualSubscription.expiresAt,
                    price: result.user.manualSubscription.price,
                    activeBots: result.user.manualSubscription.activeBots,
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const signUpAction = createAsyncThunk<
    { success: boolean },
    SignUpRequest,
    { rejectValue: string }
>(
    'user/signup',
    async (data, { rejectWithValue }) => {
        try {
            const response = await signUpService(data);
            const result = handleActionResponse<{ success: boolean }>(
                response,
                'Register successful',
                'Register failed'
            );
            
            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            toast.success('A verification email has been sent to your email address. Please check your inbox.', { autoClose: 2000 });
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Register failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const forgotPasswordAction = createAsyncThunk<
    { success: boolean },
    ForgotPasswordRequest,
    { rejectValue: string }
>(
    'user/forgotpassword',
    async (data, { rejectWithValue }) => {
        try {
            const response = await forgotPasswordService(data);
            const result = handleActionResponse<{ success: boolean }>(
                response,
                'Forgot password successful',
                'Forgot password failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            toast.success('If an account with that email exists, a password reset link has been sent', { autoClose: 2000 });
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Forgot password failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const resetPasswordAction = createAsyncThunk<
    { success: boolean },
    ResetPasswordRequest,
    { rejectValue: string }
>(
    'user/resetpassword',
    async (data, { rejectWithValue }) => {
        try {
            const response = await resetPasswordService(data);
            const result = handleActionResponse<{ success: boolean }>(
                response,
                'Password reset successful',
                'Password reset failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            toast.success('Password reset successful', { autoClose: 2000 });
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const verifyEmailAction = createAsyncThunk<
    { success: boolean },
    VerifyEmailRequest,
    { rejectValue: string }
>(
    'user/verifyemail',
    async (data, { rejectWithValue }) => {
        try {
            const response = await verifyEmailService(data);
            const result = handleActionResponse<{ success: boolean }>(
                response,
                'Email verification successful',
                'Email verification failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            toast.success('Email verification successful', { autoClose: 2000 });
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const setup2FAAction = createAsyncThunk<
    Setup2FAResponse,
    void,
    { rejectValue: string }
>(
    'user/setup2FA',
    async (_, { rejectWithValue }) => {
        try {
            const response = await setup2FAService();
            const result = handleActionResponse<Setup2FAResponse>(
                response,
                'Setup 2FA successful',
                'Setup 2FA failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            return {
                qrcode: result.qrcode,
                secret: result.secret
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Setup 2FA failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const enable2FAAction = createAsyncThunk<
    { backupCodes: string[] },
    Enable2FARequest,
    { rejectValue: string }
>(
    'user/enable2FA',
    async (data, { rejectWithValue }) => {
        try {
            const response = await enable2FAService(data);
            const result = handleActionResponse<{ backupCodes: string[] }>(
                response,
                'Enable 2FA successful',
                'Enable 2FA failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            toast.success('Enable 2FA successful', { autoClose: 2000 });
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Enable 2FA failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const verify2FAAction = createAsyncThunk<
    UserTypes,
    Verify2FARequest,
    { rejectValue: string }
>(
    'user/verify2FA',
    async (data, { rejectWithValue }) => {
        try {
            const response = await verify2FAService(data);
            const result = handleActionResponse<SignInResponse>(
                response,
                'Verify 2FA successful',
                'Verify 2FA failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            toast.success('Login successful', { autoClose: 2000 });
            return {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                role: result.user.role,
                avatar: result.user.avatar || '',
                token: result.token,
                referralCode: result.user.referralCode,
                referredBy: result?.user?.referredBy || undefined,
                referrals: result?.user?.referrals || undefined,
                referralRewards: result?.user?.referralRewards || undefined,
                subscriptionStatus: result.user.subscriptionStatus,
                subscriptionPlan: result.user.subscriptionPlan,
                hasPassword: result.user.hasPassword,
                twoFAEnabled: result.user.twoFAEnabled,
                trialExpiryDate: result.user.trialExpiryDate,
                manualSubscription: {
                    active: result.user.manualSubscription.active,
                    expiresAt: result.user.manualSubscription.expiresAt,
                    price: result.user.manualSubscription.price,
                    activeBots: result.user.manualSubscription.activeBots,
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Verify 2FA failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const disable2FAAction = createAsyncThunk<
    { success: boolean },
    Disable2FARequest,
    { rejectValue: string }
>(
    'user/disable2FA',
    async (data, { rejectWithValue }) => {
        try {
            const response = await disable2FAService(data);
            const result = handleActionResponse<{ success: boolean }>(
                response,
                'Disable 2FA successful',
                'Disable 2FA failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            toast.success('Disable 2FA successful', { autoClose: 2000 });
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Disable 2FA failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const verifyBackupCodeAction = createAsyncThunk<
    UserTypes,
    VerifyBackupCodeRequest,
    { rejectValue: string }
>(
    'user/verifyBackupCode',
    async (data, { rejectWithValue }) => {
        try {
            const response = await verifyBackupCodeService(data);
            const result = handleActionResponse<SignInResponse>(
                response,
                'Verify Backup Code successful',
                'Verify Backup Code failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            toast.success('Login successful', { autoClose: 2000 });
            return {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                role: result.user.role,
                avatar: result.user.avatar || '',
                token: result.token,
                referralCode: result.user.referralCode,
                referredBy: result?.user?.referredBy || undefined,
                referrals: result?.user?.referrals || undefined,
                referralRewards: result?.user?.referralRewards || undefined,
                subscriptionStatus: result.user.subscriptionStatus,
                subscriptionPlan: result.user.subscriptionPlan,
                hasPassword: result.user.hasPassword,
                twoFAEnabled: result.user.twoFAEnabled,
                trialExpiryDate: result.user.trialExpiryDate,
                manualSubscription: {
                    active: result.user.manualSubscription.active,
                    expiresAt: result.user.manualSubscription.expiresAt,
                    price: result.user.manualSubscription.price,
                    activeBots: result.user.manualSubscription.activeBots,
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Verify Backup Code failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const generateNewBackupCodesAction = createAsyncThunk<
    { success: boolean },
    void,
    { rejectValue: string }
>(
    'user/generateNewBackupCodes',
    async (_, { rejectWithValue }) => {
        try {
            const response = await generateNewBackupCodesService();
            const result = handleActionResponse<{ success: boolean }>(
                response,
                'Generate New Backup Codes successful',
                'Generate New Backup Codes failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            toast.success('Generate New Backup Codes successful', { autoClose: 2000 });
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Generate New Backup Codes failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const updateProfileAction = createAsyncThunk<
    Partial<UserTypes>,
    FormData,
    { rejectValue: string }
>(
    'user/updateProfile',
    async (data, { rejectWithValue }) => {
        try {
            const response = await updateProfileService(data);
            const result = handleActionResponse<Partial<UserTypes>>(
                response,
                'Update profile successful',
                'Update profile failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            toast.success('Update profile successful', { autoClose: 2000 });
            return {
                name: result.name,
                avatar: result.avatar || '',
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Update profile failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const changePasswordAction = createAsyncThunk<
    { hasPassword: boolean },
    ChangePasswordRequest,
    { rejectValue: string }
>(
    'user/changePassword',
    async (data, { rejectWithValue }) => {
        try {
            const response = await changePasswordService(data);
            const result = handleActionResponse<{ success: boolean }>(
                response,
                'Change password successful',
                'Change password failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }

            toast.success('Change password successful', { autoClose: 2000 });
            return {
                hasPassword: true
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Change password failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const getMeAction = createAsyncThunk<
    UserTypes,
    void,
    { rejectValue: string }
>(
    'user/getMe',
    async (_, { rejectWithValue }) => {
        try {
            const response = await getMeService();
            const result = handleActionResponse<UserTypes>(
                response,
                'Fetch user successful',
                'Fetch user failed'
            );

            if (typeof result === 'string') {
                return rejectWithValue(result);
            }
            return {
                id: result.id,
                name: result.name,
                email: result.email,
                role: result.role,
                avatar: result.avatar || '',
                token: result.token || '',
                referralCode: result.referralCode,
                referredBy: result.referredBy || undefined,
                referrals: result.referrals || undefined,
                referralRewards: result.referralRewards || undefined,
                subscriptionStatus: result.subscriptionStatus,
                subscriptionPlan: result.subscriptionPlan,
                subscriptionPrice: result.subscriptionPrice,
                subscriptionCurrency: result.subscriptionCurrency,
                subscriptionInterval: result.subscriptionInterval,
                trialExpiryDate: result.trialExpiryDate,
                hasPassword: result.hasPassword,
                twoFAEnabled: result.twoFAEnabled,
                manualSubscription: {
                    active: result.manualSubscription.active,
                    expiresAt: result.manualSubscription.expiresAt,
                    price: result.manualSubscription.price,
                    activeBots: result.manualSubscription.activeBots,
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Fetch user failed';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const logoutAction = createAction('user/logout');

export const setUserFromSocial = createAction<UserTypes>('user/setUserFromSocial');

export const getAllUsersAction = createAsyncThunk<
    GetUsersResponse,
    { page?: string; limit?: string } | undefined,
    { rejectValue: string }
>(
    'users/getAll',
    async (queries, { rejectWithValue }) => {
        try {
            const response = await getAllUsersService(queries);
            const result = handleActionResponse<GetUsersResponse>(
                response,
                'Get all users successfully',
                'Failed to get all users'
            );
            if (typeof result === 'string') {
                return rejectWithValue(result);
            }
            return result;
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to get users';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const updateUserAction = createAsyncThunk<
    { user: ListUserTypes; isCurrentUser: boolean },
    { id: string, data: UpdateUserRequest; currentUserId?: string },
    { rejectValue: string }
>(
    'users/update',
    async ({ id, data, currentUserId }, { rejectWithValue }) => {
        try {
            const response = await updateUserService(id, data);
            const result = handleActionResponse<ListUserTypes>(
                response,
                'User updated successfully',
                'Failed to update user'
            );
            if (typeof result === 'string') {
                return rejectWithValue(result);
            }
            return {
                user: result,
                isCurrentUser: currentUserId === id
            };
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to update user';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const deleteUserAction = createAsyncThunk<
    { success: boolean },
    string,
    { rejectValue: string }
>(
    'users/delete',
    async (id, { rejectWithValue }) => {
        try {
            const response = await deleteUserService(id);
            const result = handleActionResponse<{ success: boolean }>(
                response,
                'User deleted successfully',
                'Failed to delete user'
            );
            if (typeof result === 'string') {
                return rejectWithValue(result);
            }
            return result;
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to delete user';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const addSubscriptionAction = createAsyncThunk<
    { user: ListUserTypes; isCurrentUser: boolean },
    { id: string; currentUserId?: string },
    { rejectValue: string }
>(
    'users/addSubscription',
    async ({ id, currentUserId }, { rejectWithValue }) => {
        try {
            const response = await addSubscriptionService(id);
            const result = handleActionResponse<ListUserTypes>(
                response,
                'Subscription added successfully',
                'Failed to add subscription'
            );
            if (typeof result === 'string') {
                return rejectWithValue(result);
            }
            return {
                user: result,
                isCurrentUser: currentUserId === id
            };
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to add subscription';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const removeSubscriptionAction = createAsyncThunk<
    { user: ListUserTypes; isCurrentUser: boolean },
    { id: string; currentUserId?: string },
    { rejectValue: string }
>(
    'users/removeSubscription',
    async ({ id, currentUserId }, { rejectWithValue }) => {
        try {
            const response = await removeSubscriptionService(id);
            const result = handleActionResponse<ListUserTypes>(
                response,
                'Subscription removed successfully',
                'Failed to remove subscription'
            );
            if (typeof result === 'string') {
                return rejectWithValue(result);
            }
            return {
                user: result,
                isCurrentUser: currentUserId === id
            };
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to remove subscription';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);

export const getManualSubscriptionUsersAction = createAsyncThunk<
    GetUsersResponse,
    { page?: string; limit?: string } | undefined,
    { rejectValue: string }
>(
    'users/getManualSubscriptionUsers',
    async (queries, { rejectWithValue }) => {
        try {
            const response = await getManualSubscriptionUsersService(queries);
            const result = handleActionResponse<GetUsersResponse>(
                response,
                'Get manual subscription users successfully',
                'Failed to get manual subscription users'
            );
            if (typeof result === 'string') {
                return rejectWithValue(result);
            }
            return result;
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to get manual subscription users';
            toast.error(errorMessage, { autoClose: 2000 });
            return rejectWithValue(errorMessage);
        }
    }
);
