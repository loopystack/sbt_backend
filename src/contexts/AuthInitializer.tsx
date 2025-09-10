import { ReactNode } from 'react';
import { useAuthInitialization } from '../hooks/useAuthInitialization';

interface AuthInitializerProps {
    children: ReactNode;
}

export const AuthInitializer = ({ children }: AuthInitializerProps) => {
    useAuthInitialization();
    return <>{children}</>;
};
