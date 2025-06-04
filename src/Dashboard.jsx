
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState(45687.32);
  const [totalPnL, setTotalPnL] = useState(2456.78);
  const navigate = useNavigate();

  useEffect(() => {
    const mockData = [
      { id: 1, name: 'Bitcoin', symbol: 'BTC', price: 45000, change: 2.5, volume: '24.5B', marketCap: '874.2B' },
      { id: 2, name: 'Ethereum', symbol: 'ETH', price: 3200, change: -1.2, volume: '12.8B', marketCap: '385.6B' },
      { id: 3, name: 'Cardano', symbol: 'ADA', price: 1.25, change: 5.8, volume: '1.2B', marketCap: '42.1B' },
      { id: 4, name: 'Solana', symbol: 'SOL', price: 140, change: 3.4, volume: '2.8B', marketCap: '63.4B' },
      { id: 5, name: 'Polygon', symbol: 'MATIC', price: 0.89, change: -2.1, volume: '456M', marketCap: '8.2B' },
      { id: 6, name: 'Chainlink', symbol: 'LINK', price: 14.56, change: 1.8, volume: '891M', marketCap: '8.1B' },
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading Markets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                CryptoTrade
              </h1>
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-gray-300 hover:text-white transition-colors">Markets</a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">Trading</a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">Portfolio</a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">Earn</a>
              </nav>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Portfolio Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Balance</h3>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
            <p className="text-3xl font-bold text-white">${portfolioValue.toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-1">≈ ₿1.025</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">24h P&L</h3>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
            <p className="text-3xl font-bold text-green-400">+${totalPnL.toLocaleString()}</p>
            <p className="text-sm text-green-400 mt-1">+5.67%</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Available</h3>
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            </div>
            <p className="text-3xl font-bold text-white">$12,450.00</p>
            <p className="text-sm text-gray-400 mt-1">For trading</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-4 mb-8">
          <button className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105">
            Buy Crypto
          </button>
          <button className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105">
            Sell Crypto
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all">
            Trade
          </button>
        </div>

        {/* Market Data */}
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Market Overview</h2>
            <p className="text-gray-400 text-sm mt-1">Real-time cryptocurrency prices</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-300">Asset</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-300">Price</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-300">24h Change</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-300">Volume</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-300">Market Cap</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {cryptoData.map((crypto) => (
                  <tr key={crypto.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-black font-bold text-sm">{crypto.symbol.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-medium text-white">{crypto.name}</div>
                          <div className="text-sm text-gray-400">{crypto.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="text-white font-medium">${crypto.price.toLocaleString()}</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className={`font-medium ${crypto.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {crypto.change >= 0 ? '+' : ''}{crypto.change}%
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="text-gray-300">{crypto.volume}</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="text-gray-300">${crypto.marketCap}</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-medium transition-colors">
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
