
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [cryptoData, setCryptoData] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('market');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);

  const mockCryptoData = [
    { id: 1, name: 'Bitcoin', symbol: 'BTC', price: 65432.10, change: 2.34, marketCap: '1.2T', volume: '28.5B' },
    { id: 2, name: 'Ethereum', symbol: 'ETH', price: 3456.78, change: -1.23, marketCap: '415.8B', volume: '15.2B' },
    { id: 3, name: 'Cardano', symbol: 'ADA', price: 0.98, change: 5.67, marketCap: '34.3B', volume: '1.8B' },
    { id: 4, name: 'Solana', symbol: 'SOL', price: 156.89, change: 3.45, marketCap: '73.2B', volume: '3.1B' },
    { id: 5, name: 'Polkadot', symbol: 'DOT', price: 23.45, change: -2.87, marketCap: '25.4B', volume: '1.2B' },
    { id: 6, name: 'Chainlink', symbol: 'LINK', price: 28.91, change: 4.12, marketCap: '17.8B', volume: '890M' },
  ];

  useEffect(() => {
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

  useEffect(() => {
    const total = portfolio.reduce((sum, item) => sum + (item.amount * item.price), 0);
    setTotalPortfolioValue(total);
  }, [portfolio]);

  const addToPortfolio = (crypto) => {
    const amount = prompt(`How much ${crypto.symbol} do you want to add?`);
    if (amount && !isNaN(amount)) {
      const existing = portfolio.find(item => item.id === crypto.id);
      if (existing) {
        setPortfolio(prev => prev.map(item => 
          item.id === crypto.id 
            ? { ...item, amount: item.amount + parseFloat(amount) }
            : item
        ));
      } else {
        setPortfolio(prev => [...prev, {
          ...crypto,
          amount: parseFloat(amount),
          buyPrice: crypto.price
        }]);
      }
    }
  };

  const removeFromPortfolio = (cryptoId) => {
    setPortfolio(prev => prev.filter(item => item.id !== cryptoId));
  };

  const filteredCrypto = cryptoData.filter(crypto =>
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Progressive Crypto Tracker</h1>
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
          <h1>Progressive Crypto Tracker</h1>
          <p style={{ color: 'red' }}>{error}</p>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Progressive Crypto Tracker</h1>
        <p>Real-time cryptocurrency prices & portfolio management</p>
        
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
            Portfolio ({portfolio.length})
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
                  className="add-to-portfolio-btn"
                  onClick={() => addToPortfolio(crypto)}
                >
                  Add to Portfolio
                </button>
              </div>
            </div>
          ))}
        </main>
      )}

      {activeTab === 'portfolio' && (
        <main className="portfolio-section">
          <div className="portfolio-summary">
            <h2>Portfolio Value: ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          </div>
          
          {portfolio.length === 0 ? (
            <div className="empty-portfolio">
              <p>Your portfolio is empty. Add some cryptocurrencies from the Market tab!</p>
            </div>
          ) : (
            <div className="crypto-list">
              {portfolio.map(item => {
                const currentValue = item.amount * item.price;
                const buyValue = item.amount * item.buyPrice;
                const profit = currentValue - buyValue;
                const profitPercentage = ((profit / buyValue) * 100);

                return (
                  <div key={item.id} className="crypto-card portfolio-card">
                    <div className="crypto-info">
                      <h3>{item.name} ({item.symbol})</h3>
                      <p className="amount">Amount: {item.amount}</p>
                      <p className="price">Current: ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="value">Value: ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className={`profit ${profit >= 0 ? 'positive' : 'negative'}`}>
                        P&L: {profit >= 0 ? '+' : ''}${profit.toFixed(2)} ({profitPercentage.toFixed(2)}%)
                      </p>
                      <button 
                        className="remove-btn"
                        onClick={() => removeFromPortfolio(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
