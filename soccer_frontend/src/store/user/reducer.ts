import { createReducer } from '@reduxjs/toolkit';
import {
    signInAction,
    signUpAction,
    forgotPasswordAction,
    resetPasswordAction,
    verifyEmailAction,
    setup2FAAction,
    enable2FAAction,
    verify2FAAction,
    disable2FAAction,
    verifyBackupCodeAction,
    generateNewBackupCodesAction,
    updateProfileAction,
    changePasswordAction,
    getMeAction,
    logoutAction,
    setUserFromSocial,
    getAllUsersAction,
    updateUserAction,
    deleteUserAction,
    getManualSubscriptionUsersAction,
    addSubscriptionAction,
    removeSubscriptionAction
} from './actions';
import { UserState } from './types';

export const initialState: UserState = {
    isLoading: false,
    id: '',
    name: '',
    email: '',
    role: 'user',
    avatar: '',
    token: '',
    error: '',
    hasPassword: false,
    twoFAEnabled: false,
    subscriptionStatus: undefined,
    subscriptionPlan: undefined,
    subscriptionPrice: undefined,
    subscriptionCurrency: undefined,
    subscriptionInterval: undefined,
    trialExpiryDate: undefined,
    referralCode: '',
    referredBy: undefined,
    referrals: undefined,
    referralRewards: undefined,
    manualSubscription: {
        active: false,
        expiresAt: null,
        price: 0,
        activeBots: 0,
    }
};

export default createReducer(initialState, (builder) =>
    builder
        .addCase(signInAction.pending, (state) => {
            state.isLoading = true;
            state.error = '';
        })
        .addCase(signInAction.fulfilled, (state, { payload }) => {
            if ('requires2FA' in payload) {
                state.isLoading = false;
                state.error = '';
            } else {
                state.isLoading = false;
                state.id = payload.id;
                state.name = payload.name;
                state.email = payload.email;
                state.role = payload.role;
                state.avatar = payload.avatar;
                state.token = payload.token;
                state.subscriptionStatus = payload.subscriptionStatus;
                state.subscriptionPlan = payload.subscriptionPlan;
                state.subscriptionPrice = payload.subscriptionPrice;
                state.subscriptionCurrency = payload.subscriptionCurrency;
                state.subscriptionInterval = payload.subscriptionInterval;
                state.trialExpiryDate = payload.trialExpiryDate;
                state.hasPassword = payload.hasPassword;
                state.twoFAEnabled = payload.twoFAEnabled;
                state.referralCode = payload.referralCode;
                state.referredBy = payload.referredBy;
                state.referrals = payload.referrals;
                state.referralRewards = payload.referralRewards;
                state.manualSubscription = {
                    active: payload.manualSubscription.active,
                    expiresAt: payload.manualSubscription.expiresAt,
                    price: payload.manualSubscription.price,
                    activeBots: payload.manualSubscription.activeBots,
                };
                localStorage.setItem('token', payload.token || '');
                localStorage.setItem('access_token', payload.token || '');
            }
        })
        .addCase(signInAction.rejected, (state, action) => {
            state.isLoading = false;
            state.id = '';
            state.name = '';
            state.email = '';
            state.role = 'user';
            state.avatar = '';
            state.token = '';
            localStorage.removeItem('token');
            state.subscriptionStatus = undefined;
            state.subscriptionPlan = undefined;
            state.subscriptionPrice = undefined;
            state.subscriptionCurrency = undefined;
            state.subscriptionInterval = undefined;
            state.trialExpiryDate = undefined;
            state.hasPassword = false;
            state.twoFAEnabled = false;
            state.referralCode = '';
            state.referredBy = undefined;
            state.referrals = undefined;
            state.referralRewards = undefined;
            state.manualSubscription = {
                active: false,
                expiresAt: null,
                price: 0,
                activeBots: 0,
            };
            state.error = action.payload as string;
        })
        .addCase(signUpAction.pending, (state) => {
            state.isLoading = true;
            state.error = '';
        })
        .addCase(signUpAction.fulfilled, (state) => {
            state.isLoading = false;
        })
        .addCase(signUpAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(forgotPasswordAction.pending, (state) => {
            state.isLoading = true;
            state.error = '';
        })
        .addCase(forgotPasswordAction.fulfilled, (state) => {
            state.isLoading = false;
        })
        .addCase(forgotPasswordAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(resetPasswordAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(resetPasswordAction.fulfilled, (state) => {
            state.isLoading = false;
        })
        .addCase(resetPasswordAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(verifyEmailAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(verifyEmailAction.fulfilled, (state) => {
            state.isLoading = false;
        })
        .addCase(verifyEmailAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(setup2FAAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(setup2FAAction.fulfilled, (state) => {
            state.isLoading = false;
        })
        .addCase(setup2FAAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(enable2FAAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(enable2FAAction.fulfilled, (state) => {
            state.isLoading = false;
            state.twoFAEnabled = true;
        })
        .addCase(enable2FAAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(verify2FAAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(verify2FAAction.fulfilled, (state, { payload }) => {
            state.isLoading = false;
            state.id = payload.id;
            state.name = payload.name;
            state.email = payload.email;
            state.role = payload.role;
            state.avatar = payload.avatar;
            state.token = payload.token;
            state.referralCode = payload.referralCode;
            state.subscriptionStatus = payload.subscriptionStatus;
            state.subscriptionPlan = payload.subscriptionPlan;
            state.subscriptionPrice = payload.subscriptionPrice;
            state.subscriptionCurrency = payload.subscriptionCurrency;
            state.subscriptionInterval = payload.subscriptionInterval;
            state.trialExpiryDate = payload.trialExpiryDate;
            state.hasPassword = payload.hasPassword;
            state.twoFAEnabled = payload.twoFAEnabled;
            state.referredBy = payload.referredBy;
            state.referrals = payload.referrals;
            state.referralRewards = payload.referralRewards;
            state.manualSubscription = {
                active: payload.manualSubscription.active,
                expiresAt: payload.manualSubscription.expiresAt,
                price: payload.manualSubscription.price,
                activeBots: payload.manualSubscription.activeBots,
            };
            localStorage.setItem('token', payload.token || '');
        })
        .addCase(verify2FAAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(disable2FAAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(disable2FAAction.fulfilled, (state) => {
            state.isLoading = false;
            state.twoFAEnabled = false;
        })
        .addCase(disable2FAAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(verifyBackupCodeAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(verifyBackupCodeAction.fulfilled, (state, { payload }) => {
            state.isLoading = false;
            state.id = payload.id;
            state.name = payload.name;
            state.email = payload.email;
            state.role = payload.role;
            state.avatar = payload.avatar;
            state.token = payload.token;
            state.referralCode = payload.referralCode;
            state.subscriptionStatus = payload.subscriptionStatus;
            state.subscriptionPlan = payload.subscriptionPlan;
            state.subscriptionPrice = payload.subscriptionPrice;
            state.subscriptionCurrency = payload.subscriptionCurrency;
            state.subscriptionInterval = payload.subscriptionInterval;
            state.trialExpiryDate = payload.trialExpiryDate;
            state.hasPassword = payload.hasPassword;
            state.twoFAEnabled = payload.twoFAEnabled;
            state.referredBy = payload.referredBy;
            state.referrals = payload.referrals;
            state.referralRewards = payload.referralRewards;
            state.manualSubscription = {
                active: payload.manualSubscription.active,
                expiresAt: payload.manualSubscription.expiresAt,
                price: payload.manualSubscription.price,
                activeBots: payload.manualSubscription.activeBots,
            };
            localStorage.setItem('token', payload.token || '');
        })
        .addCase(verifyBackupCodeAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(generateNewBackupCodesAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(generateNewBackupCodesAction.fulfilled, (state) => {
            state.isLoading = false;
        })
        .addCase(generateNewBackupCodesAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(updateProfileAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(updateProfileAction.fulfilled, (state, { payload }) => {
            state.isLoading = false;
            state.name = payload.name || '';
            state.avatar = payload.avatar || '';
        })
        .addCase(updateProfileAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(changePasswordAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(changePasswordAction.fulfilled, (state, { payload }) => {
            state.isLoading = false;
            state.hasPassword = payload.hasPassword;
        })
        .addCase(changePasswordAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(getMeAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(getMeAction.fulfilled, (state, { payload }) => {
            state.isLoading = false;
            state.id = payload.id;
            state.name = payload.name;
            state.email = payload.email;
            state.role = payload.role;
            state.avatar = payload.avatar;
            state.token = payload.token;
            state.referralCode = payload.referralCode;
            state.subscriptionStatus = payload.subscriptionStatus;
            state.subscriptionPlan = payload.subscriptionPlan;
            state.subscriptionPrice = payload.subscriptionPrice;
            state.subscriptionCurrency = payload.subscriptionCurrency;
            state.subscriptionInterval = payload.subscriptionInterval;
            state.trialExpiryDate = payload.trialExpiryDate;
            state.hasPassword = payload.hasPassword;
            state.twoFAEnabled = payload.twoFAEnabled;
            state.referredBy = payload.referredBy;
            state.referrals = payload.referrals;
            state.referralRewards = payload.referralRewards;
            state.manualSubscription = {
                active: payload.manualSubscription.active,
                expiresAt: payload.manualSubscription.expiresAt,
                price: payload.manualSubscription.price,
                activeBots: payload.manualSubscription.activeBots,
            };
            // Sync token with AuthContext system
            if (payload.token) {
                localStorage.setItem('token', payload.token);
                localStorage.setItem('access_token', payload.token);
            }
        })
        .addCase(getMeAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(logoutAction, (state) => {
            localStorage.removeItem('token');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            return initialState;
        })
        .addCase(setUserFromSocial, (state, { payload }) => {
            state.id = payload.id;
            state.name = payload.name;
            state.email = payload.email;
            state.avatar = payload.avatar;
            state.role = payload.role;
            state.token = payload.token;
            state.referralCode = payload.referralCode;
            state.subscriptionStatus = payload.subscriptionStatus;
            state.subscriptionPlan = payload.subscriptionPlan;
            state.subscriptionPrice = payload.subscriptionPrice;
            state.subscriptionCurrency = payload.subscriptionCurrency;
            state.subscriptionInterval = payload.subscriptionInterval;
            state.trialExpiryDate = payload.trialExpiryDate;
            state.hasPassword = payload.hasPassword;
            state.twoFAEnabled = payload.twoFAEnabled;
            state.referredBy = payload.referredBy;
            state.referrals = payload.referrals;
            state.referralRewards = payload.referralRewards;
            state.manualSubscription = {
                active: payload.manualSubscription.active,
                expiresAt: payload.manualSubscription.expiresAt,
                price: payload.manualSubscription.price,
                activeBots: payload.manualSubscription.activeBots,
            };
            localStorage.setItem('token', payload.token || '');
        })
        .addCase(getAllUsersAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(getAllUsersAction.fulfilled, (state) => {
            state.isLoading = false;
        })
        .addCase(getAllUsersAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(updateUserAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(updateUserAction.fulfilled, (state, { payload }) => {
            state.isLoading = false;
            if (payload.isCurrentUser) {
                state.name = payload.user.name;
                state.email = payload.user.email;
                state.role = payload.user.role;
                state.referralCode = payload.user.referralCode;
                state.subscriptionStatus = payload.user.subscriptionStatus;
                state.subscriptionPlan = payload.user.subscriptionPlan;
                state.subscriptionPrice = payload.user.subscriptionPrice;
                state.subscriptionCurrency = payload.user.subscriptionCurrency;
                state.subscriptionInterval = payload.user.subscriptionInterval;
                state.trialExpiryDate = payload.user.trialExpiryDate;
                state.hasPassword = payload.user.hasPassword;
                state.twoFAEnabled = payload.user.twoFAEnabled;
                state.referredBy = payload.user.referredBy;
                state.referrals = payload.user.referrals;
                state.referralRewards = payload.user.referralRewards;
                state.manualSubscription = {
                    active: payload.user.manualSubscription.active,
                    expiresAt: payload.user.manualSubscription.expiresAt,
                    price: payload.user.manualSubscription.price,
                    activeBots: payload.user.manualSubscription.activeBots,
                };
            }
        })
        .addCase(updateUserAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(deleteUserAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(deleteUserAction.fulfilled, (state) => {
            state.isLoading = false;
        })
        .addCase(deleteUserAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(getManualSubscriptionUsersAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(getManualSubscriptionUsersAction.fulfilled, (state) => {
            state.isLoading = false;
        })
        .addCase(getManualSubscriptionUsersAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(addSubscriptionAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(addSubscriptionAction.fulfilled, (state, { payload }) => {
            state.isLoading = false;
            // Only update current user state if the subscription change affects the current user
            if (payload.isCurrentUser) {
                state.manualSubscription = {
                    active: payload.user.manualSubscription.active,
                    expiresAt: payload.user.manualSubscription.expiresAt,
                    price: payload.user.manualSubscription.price,
                    activeBots: payload.user.manualSubscription.activeBots,
                };
            }
        })
        .addCase(addSubscriptionAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
        .addCase(removeSubscriptionAction.pending, (state) => {
            state.isLoading = true;
            state.error = undefined;
        })
        .addCase(removeSubscriptionAction.fulfilled, (state, { payload }) => {
            state.isLoading = false;
            // Only update current user state if the subscription change affects the current user
            if (payload.isCurrentUser) {
                state.manualSubscription = {
                    active: payload.user.manualSubscription.active,
                    expiresAt: payload.user.manualSubscription.expiresAt,
                    price: payload.user.manualSubscription.price,
                    activeBots: payload.user.manualSubscription.activeBots,
                };
            }
        })
        .addCase(removeSubscriptionAction.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        })
);
