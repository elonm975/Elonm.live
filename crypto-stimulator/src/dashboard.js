import React, { useEffect, useState } from 'react';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const coins = ['bitcoin', 'ethereum', 'dogecoin'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [prices, setPrices] = useState({});

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(
            ','
          )}&vs_currencies=usd`
        );
        setPrices(res.data);
      } catch (err) {
        console.error('Error fetching prices:', err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-gray-800 shadow-md">
        <h1 className="text-2xl font-bold">ElonCrypto</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </nav>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        <div className="bg-gray-800 rounded-lg p-6 shadow-md">
          <h2 className="text-lg font-semibold mb-2">Total Balance</h2>
          <p className="text-2xl">$0.00</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-md">
          <h2 className="text-lg font-semibold mb-2">Total Profit</h2>
          <p className="text-2xl text-green-400">$0.00</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-md">
          <h2 className="text-lg font-semibold mb-2">Total Investment</h2>
          <p className="text-2xl text-yellow-400">$0.00</p>
        </div>
      </div>

      {/* Live Crypto Prices */}
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Live Market Prices</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {coins.map((coin) => (
            <div
              key={coin}
              className="bg-gray-800 p-4 rounded-lg shadow-md text-center"
            >
              <h3 className="capitalize text-lg font-semibold">{coin}</h3>
              <p className="text-green-400 text-xl">
                ${prices[coin]?.usd ?? '...'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Invest Now */}
      <div className="p-6">
        <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600">
          Invest Now
        </button>
      </div>
    </div>
  );
};

export default Dashboard;