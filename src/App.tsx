import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppShell from './app/layouts/AppShell';
import Home from './pages/Home';
import Matches from './pages/Matches';
import Bonuses from './pages/Bonuses';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-bg text-text">
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="matches" element={<Matches />} />
            <Route path="bonuses" element={<Bonuses />} />
            <Route path="dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
