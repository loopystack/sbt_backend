import { combineReducers } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import userReducer from './user/reducer';

const userPersistConfig = {
    key: 'user-root',
    storage,
};

const rootReducer = combineReducers({
    user: persistReducer(userPersistConfig, userReducer),
});

export default rootReducer;
