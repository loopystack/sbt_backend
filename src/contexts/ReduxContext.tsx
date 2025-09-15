import { useRef, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { makeStore, makePersistor, AppStore } from '../store';
import { AuthInitializer } from './AuthInitializer';

const ReduxContext = ({
    children
}: {
    children: ReactNode
}) => {
    const storeRef = useRef<AppStore | null>(null);
    const persistorRef = useRef<any>(null);

    if (!storeRef.current) {
        storeRef.current = makeStore();
        persistorRef.current = makePersistor(storeRef.current);
    }

    return (
        <Provider store={storeRef.current}>
            <PersistGate loading={null} persistor={persistorRef.current}>
                <AuthInitializer>
                    {children}
                </AuthInitializer>
            </PersistGate>
        </Provider>
    );
}

export default ReduxContext;
