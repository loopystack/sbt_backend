import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { CountryProvider } from './contexts/CountryContext';
import { AuthProvider } from './contexts/AuthContext';
import AppShell from './app/layouts/AppShell';
import Home from './pages/Home';
import Matches from './pages/Matches';
import Bonuses from './pages/Bonuses';
import Dashboard from './pages/Dashboard';
import Betting from './pages/Betting';
import AllEvents from './pages/AllEvents';
import InPlayOdds from './pages/InPlayOdds';
import SureBets from './pages/SureBets';
import Bookmakers from './pages/Bookmakers';
import DroppingOdds from './pages/DroppingOdds';
import SignInSignUp from './pages/SignInSignUp';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import WalletManagement from './pages/WalletManagement';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <CountryProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/signin" element={<SignInSignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/wallet-management" element={<WalletManagement />} />
              <Route path="/" element={<AppShell />}>
                <Route index element={<Home />} />
                <Route path="matches" element={<Matches />} />
                <Route path="bonuses" element={<Bonuses />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="betting" element={<Betting />} />
                <Route path="all-events" element={<AllEvents />} />
                <Route path="in-play-odds" element={<InPlayOdds />} />
                <Route path="sure-bets" element={<SureBets />} />
                <Route path="bookmakers" element={<Bookmakers />} />
                <Route path="dropping-odds" element={<DroppingOdds />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </CountryProvider>
    </ThemeProvider>
  );
}

export default App;
