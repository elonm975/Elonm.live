
import React, { useState, useEffect } from 'react';
import './App.css';
import Auth from './components/Auth';
import InvestmentModal from './components/InvestmentModal';

function App() {
  const [user, setUser] = useState(null);
  const [cryptoData, setCryptoData] = useState([]);
  const [userInvestments, setUserInvestments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('market');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);

  const mockCryptoData = [
    { id: 1, name: 'Bitcoin', symbol: 'BTC', price: 65432.10, change: 2.34, marketCap: '1.2T', volume: '28.5B' },
    { id: 2, name: 'Ethereum', symbol: 'ETH', price: 3456.78, change: -1.23, marketCap: '415.8B', volume: '15.2B' },
    { id: 3, name: 'Cardano', symbol: 'ADA', price: 0.98, change: 5.67, marketCap: '34.3B', volume: '1.8B' },
    { id: 4, name: 'Solana', symbol: 'SOL', price: 156.89, change: 3.45, marketCap: '73.2B', volume: '3.1B' },
    { id: 5, name: 'Polkadot', symbol: 'DOT', price: 23.45, change: -2.87, marketCap: '25.4B', volume: '1.2B' },
    { id: 6, name: 'Chainlink', symbol: 'LINK', price: 28.91, change: 4.12, marketCap: '17.8B', volume: '890M' },
    { id: 7, name: 'Ripple', symbol: 'XRP', price: 1.15, change: 3.21, marketCap: '62.1B', volume: '2.3B' },
    { id: 8, name: 'Litecoin', symbol: 'LTC', price: 185.67, change: -0.89, marketCap: '13.8B', volume: '1.1B' },
  ];

  useEffect(() => {
    // Check for existing user session
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      fetchUserInvestments();
    }

    const fetchCryptoData = () => {
      try {
        setTimeout(() => {
          setCryptoData(mockCryptoData);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Failed to fetch crypto data');
        setLoading(false);
      }
    };

    fetchCryptoData();
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      setCryptoData(prev => prev.map(crypto => ({
        ...crypto,
        price: crypto.price * (1 + (Math.random() - 0.5) * 0.02),
        change: crypto.change + (Math.random() - 0.5) * 2
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchUserInvestments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/investments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserInvestments(data.investments);
        
        // Update user data with latest investment info
        const updatedUser = {
          ...user,
          totalInvested: data.totalInvested,
          totalProfit: data.totalProfit,
          walletBalance: data.walletBalance
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to fetch investments:', error);
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    fetchUserInvestments();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setUserInvestments([]);
    setActiveTab('market');
  };

  const handleInvestClick = (crypto) => {
    setSelectedCrypto(crypto);
    setShowInvestmentModal(true);
  };

  const handleInvestmentSuccess = (investment) => {
    setUserInvestments(prev => [...prev, investment]);
    fetchUserInvestments(); // Refresh user data
  };

  const filteredCrypto = cryptoData.filter(crypto =>
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show authentication if user is not logged in
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Crypto Exchange</h1>
          <div className="loading-spinner"></div>
          <p>Loading crypto data...</p>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Crypto Exchange</h1>
          <p style={{ color: 'red' }}>{error}</p>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-top">
          <h1>Crypto Exchange</h1>
          <div className="user-info">
            <span>Welcome, {user.username}!</span>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        </div>
        
        <div className="wallet-summary">
          <div className="wallet-item">
            <span>Total Invested</span>
            <strong>${user.totalInvested?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</strong>
          </div>
          <div className="wallet-item">
            <span>Current Profit</span>
            <strong className={user.totalProfit >= 0 ? 'positive' : 'negative'}>
              ${user.totalProfit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </strong>
          </div>
          <div className="wallet-item">
            <span>Wallet Balance</span>
            <strong>${user.walletBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</strong>
          </div>
        </div>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search cryptocurrencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="tab-navigation">
          <button 
            className={`tab ${activeTab === 'market' ? 'active' : ''}`}
            onClick={() => setActiveTab('market')}
          >
            Market
          </button>
          <button 
            className={`tab ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveTab('portfolio')}
          >
            My Investments ({userInvestments.length})
          </button>
        </div>
      </header>

      {activeTab === 'market' && (
        <main className="crypto-list">
          {filteredCrypto.map(crypto => (
            <div key={crypto.id} className="crypto-card">
              <div className="crypto-info">
                <h3>{crypto.name} ({crypto.symbol})</h3>
                <p className="price">${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className={`change ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                  {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                </p>
                <div className="crypto-details">
                  <small>Market Cap: {crypto.marketCap}</small>
                  <small>Volume: {crypto.volume}</small>
                </div>
                <button 
                  className="invest-button"
                  onClick={() => handleInvestClick(crypto)}
                >
                  Invest Now
                </button>
              </div>
            </div>
          ))}
        </main>
      )}

      {activeTab === 'portfolio' && (
        <main className="portfolio-section">
          {userInvestments.length === 0 ? (
            <div className="empty-portfolio">
              <p>You haven't made any investments yet. Start investing from the Market tab!</p>
            </div>
          ) : (
            <div className="crypto-list">
              {userInvestments.map(investment => {
                const currentValue = investment.amount * investment.currentPrice;
                const profitLoss = investment.profit || 0;
                const profitPercentage = investment.profitPercentage || 0;

                return (
                  <div key={investment.id} className="crypto-card portfolio-card">
                    <div className="crypto-info">
                      <h3>{investment.cryptoName} ({investment.cryptoSymbol})</h3>
                      <p className="amount">Amount: {investment.amount.toFixed(6)} {investment.cryptoSymbol}</p>
                      <p className="price">Entry: ${investment.investmentPrice.toFixed(2)}</p>
                      <p className="price">Current: ${investment.currentPrice.toFixed(2)}</p>
                      <p className="value">Value: ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className={`profit ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
                        P&L: {profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)} ({profitPercentage.toFixed(2)}%)
                      </p>
                      <small>Invested: {new Date(investment.createdAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {showInvestmentModal && selectedCrypto && (
        <InvestmentModal
          crypto={selectedCrypto}
          isOpen={showInvestmentModal}
          onClose={() => setShowInvestmentModal(false)}
          onInvest={handleInvestmentSuccess}
        />
      )}
    </div>
  );
}

export default App;
