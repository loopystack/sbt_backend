import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getMeAction } from '../store/user/actions';
import { AppDispatch } from '../store';

export const useAuthInitialization = () => {
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        // Check if there's a token in localStorage and initialize user state
        const token = localStorage.getItem('token');
        const accessToken = localStorage.getItem('access_token');
        
        // If we have either token, try to get user data
        if (token || accessToken) {
            // Sync tokens between the two systems
            if (token && !accessToken) {
                localStorage.setItem('access_token', token);
            } else if (accessToken && !token) {
                localStorage.setItem('token', accessToken);
            }
            
            // Dispatch getMeAction to restore user state
            dispatch(getMeAction());
        }
    }, [dispatch]);
};
