export type SignInResponse = {
    token: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: 'user' | 'admin';
        avatar?: string;
        subscriptionStatus?: 'active' | 'inactive' | 'trialing' | 'past_due';
        subscriptionPlan?: 'Free' | 'Basic' | 'Premium';
        subscriptionPrice?: number;
        subscriptionCurrency?: string;
        subscriptionInterval?: string;
        trialExpiryDate?: string;
        hasPassword: boolean;
        twoFAEnabled: boolean;
        referralCode: string;
        referredBy?: string | null;
        referrals?: Array<{ _id: string; name: string; email: string }>;
        referralRewards?: number;
        manualSubscription: {
            active: boolean;
            expiresAt: string | null;
            price: number;
            activeBots: number;
        };
    };
};

export type SignInRequest = {
    email: string;
    password: string;
    twoFAToken?: string;
};

export type SignUpRequest = {
    name: string;
    email: string;
    password: string;
    referralCode?: string;
};

export type ForgotPasswordRequest = {
    email: string;
};

export type ResetPasswordRequest = {
    token: string;
    password: string;
};

export type VerifyEmailRequest = {
    token: string;
};

export type Setup2FAResponse = {
    qrcode: string;
    secret: string;
};

export type Enable2FARequest = {
    token: string;
};

export type Verify2FARequest = {
    email: string;
    token: string;
};

export type Disable2FARequest = {
    token: string;
};

export type VerifyBackupCodeRequest = {
    email: string;
    code: string;
};

export type ChangePasswordRequest = {
    currentPassword: string;
    newPassword: string;
};

export type UserTypes = {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    avatar: string;
    token: string;
    subscriptionStatus?: 'active' | 'inactive' | 'trialing' | 'past_due';
    subscriptionPlan?: 'Free' | 'Basic' | 'Premium';
    subscriptionPrice?: number;
    subscriptionCurrency?: string;
    subscriptionInterval?: string;
    trialExpiryDate?: string;
    hasPassword: boolean;
    twoFAEnabled: boolean;
    referralCode: string
    referredBy?: string | null;
    referrals?: Array<{ _id: string; name: string; email: string }>;
    referralRewards?: number;
    manualSubscription: {
        active: boolean;
        expiresAt: string | null;
        price: number;
        activeBots: number;
    };
};

export type ListUserTypes = {
    _id: string;
} & UserTypes;


export type GetUsersResponse = {
    page: number;
    users: ListUserTypes[];
    total: number;
    totalPages: number;
};

export type UpdateUserRequest = {
    name?: string;
    email?: string;
    role?: 'user' | 'admin';
    trialExpiryDate?: string;
    manualSubscription?: {
        price?: number;
        activeBots?: number;
        expiresAt?: string | null;
    };
};

export type UserState = {
    isLoading: boolean;
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    avatar: string;
    token: string;
    subscriptionStatus?: 'active' | 'inactive' | 'trialing' | 'past_due';
    subscriptionPlan?: 'Free' | 'Basic' | 'Premium';
    subscriptionPrice?: number;
    subscriptionCurrency?: string;
    subscriptionInterval?: string;
    trialExpiryDate?: string;
    hasPassword: boolean;
    twoFAEnabled: boolean;
    referralCode: string;
    referredBy?: string | null;
    referrals?: Array<{ _id: string; name: string; email: string }>;
    referralRewards?: number;
    error?: string;
    manualSubscription: {
        active: boolean;
        expiresAt: string | null;
        price: number;
        activeBots: number;
    };
};
