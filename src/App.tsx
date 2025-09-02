import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { CountryProvider } from './contexts/CountryContext';
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
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <CountryProvider>
        <Router>
          <div className="min-h-screen bg-bg text-text">
            <Routes>
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
                <Route path="signin" element={<SignInSignUp />} />
              </Route>
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Routes>
          </div>
        </Router>
      </CountryProvider>
    </ThemeProvider>
  );
}

export default App;
