import { toast } from 'react-toastify';
import type { ErrorResponse } from './types';

export const handleActionResponse = <T>(
    response: { success: boolean; data?: T; error?: ErrorResponse },
    successMessage: string,
    errorMessage: string
): T | string => {
    if (response.success && response.data) {
        return response.data;
    }

    const error: string =
        response.error?.message ||
        response.error?.error ||
        errorMessage;
    toast.error(error, { autoClose: 2000 });
    return error;
};
