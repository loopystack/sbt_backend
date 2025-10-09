import { combineReducers } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import userReducer from './user/reducer';
import matchingInfoReducer from './matchinginfo/reducer';

const userPersistConfig = {
    key: 'user-root',
    storage,
};

const matchingInfoPersistConfig = {
    key: 'matchinginfo-root',
    storage,
    whitelist: [], // Don't persist matching info as it changes frequently
};

const rootReducer = combineReducers({
    user: persistReducer(userPersistConfig, userReducer),
    matchinginfo: persistReducer(matchingInfoPersistConfig, matchingInfoReducer),
});

export default rootReducer;
