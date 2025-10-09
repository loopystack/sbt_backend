export type ErrorResponse = {
    error?: string;
    message?: string;
    status?: number;
    data?: any;
    detail?: string | Array<{ msg?: string; message?: string; detail?: string }>;
};

export type ApiResponse<T = any> = {
    data: T;
    status: number;
    message?: string;
};

export type ApiRequestConfig = {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    params?: Record<string, any>;
    data?: any;
    timeout?: number;
    withCredentials?: boolean;
};

export type ApiError = {
    response?: {
        data: ErrorResponse;
        status: number;
    };
    message: string;
    status?: number;
};

export type ActionResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: ErrorResponse;
};

export type ApiEndpoint = string;

export type ApiHandler = {
    makeApiCall: <T = any>(
        endpoint: ApiEndpoint,
        method: ApiRequestConfig['method'],
        config?: Omit<ApiRequestConfig, 'method'>
    ) => Promise<ApiResponse<T>>;
    handleApiError: (error: ApiError) => ErrorResponse;
    handleActionResponse: <T = any>(response: ApiResponse<T>) => ActionResponse<T>;
    handleActionError: (error: ApiError) => ActionResponse;
};
