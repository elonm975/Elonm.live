
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Mock crypto data - replace with real API call
    const mockData = [
      { id: 1, name: 'Bitcoin', symbol: 'BTC', price: 45000, change: 2.5 },
      { id: 2, name: 'Ethereum', symbol: 'ETH', price: 3200, change: -1.2 },
      { id: 3, name: 'Cardano', symbol: 'ADA', price: 1.25, change: 5.8 },
      { id: 4, name: 'Solana', symbol: 'SOL', price: 140, change: 3.4 },
    ];
    
    setTimeout(() => {
      setCryptoData(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  const handleLogout = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Crypto Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Cryptocurrency Prices</h2>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {cryptoData.map((crypto) => (
                <li key={crypto.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{crypto.name}</h3>
                        <p className="text-sm text-gray-500">{crypto.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium text-gray-900">${crypto.price.toLocaleString()}</p>
                      <p className={`text-sm ${crypto.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {crypto.change >= 0 ? '+' : ''}{crypto.change}%
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
