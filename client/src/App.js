
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import Auth from './components/Auth';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Market from './pages/Market';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';
import './App.css';

const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('trustToken');
    const userData = localStorage.getItem('trustUser');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);

    // Initialize socket connection
    const newSocket = io(API_BASE);
    setSocket(newSocket);

    newSocket.on('priceUpdate', (newPrices) => {
      setPrices(newPrices);
    });

    return () => newSocket.close();
  }, []);

  const handleAuthSuccess = (userData, token) => {
    localStorage.setItem('trustToken', token);
    localStorage.setItem('trustUser', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('trustToken');
    localStorage.removeItem('trustUser');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <h2>Trust Crypto Wallet</h2>
        <p>Loading your secure wallet...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/dashboard" element={<Dashboard user={user} prices={prices} />} />
          <Route path="/portfolio" element={<Portfolio user={user} prices={prices} />} />
          <Route path="/market" element={<Market user={user} prices={prices} />} />
          <Route path="/transactions" element={<Transactions user={user} />} />
          <Route path="/settings" element={<Settings user={user} onLogout={handleLogout} />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
        <Navbar />
      </div>
    </Router>
  );
}

export default App;
