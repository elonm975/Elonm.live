
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [portfolio, setPortfolio] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [tradeAmount, setTradeAmount] = useState('');
  const [activeTab, setActiveTab] = useState('market');
  const [balance, setBalance] = useState(10000); // Starting balance

  // Fetch crypto prices from server
  useEffect(() => {
    fetch('/api/market')
      .then(res => res.json())
      .then(data => setCryptoPrices(data))
      .catch(err => console.log('Using demo data'));
    
    // Demo data fallback
    setCryptoPrices({
      'bitcoin': { price: 67234.50, change: 2.45, symbol: 'BTC', name: 'Bitcoin' },
      'ethereum': { price: 3567.89, change: -1.23, symbol: 'ETH', name: 'Ethereum' },
      'binancecoin': { price: 589.34, change: 4.56, symbol: 'BNB', name: 'BNB' },
      'solana': { price: 178.45, change: 5.67, symbol: 'SOL', name: 'Solana' }
    });
  }, []);

  const handleBuy = () => {
    const amount = parseFloat(tradeAmount);
    const crypto = cryptoPrices[selectedCrypto];
    const cost = amount * crypto.price;
    
    if (cost <= balance) {
      setBalance(balance - cost);
      setPortfolio([...portfolio, {
        crypto: selectedCrypto,
        amount: amount,
        price: crypto.price,
        symbol: crypto.symbol
      }]);
      setTradeAmount('');
      alert(`Successfully bought ${amount} ${crypto.symbol} for $${cost.toFixed(2)}`);
    } else {
      alert('Insufficient balance!');
    }
  };

  const handleSell = () => {
    const amount = parseFloat(tradeAmount);
    const crypto = cryptoPrices[selectedCrypto];
    const earnings = amount * crypto.price;
    
    const holding = portfolio.find(p => p.crypto === selectedCrypto);
    if (holding && holding.amount >= amount) {
      setBalance(balance + earnings);
      setPortfolio(portfolio.map(p => 
        p.crypto === selectedCrypto 
          ? {...p, amount: p.amount - amount}
          : p
      ).filter(p => p.amount > 0));
      setTradeAmount('');
      alert(`Successfully sold ${amount} ${crypto.symbol} for $${earnings.toFixed(2)}`);
    } else {
      alert('Insufficient holdings!');
    }
  };

  return (
    <div className="trust-wallet">
      <header className="wallet-header">
        <h1>🔐 Trust Crypto Wallet</h1>
        <div className="balance">Balance: ${balance.toFixed(2)}</div>
      </header>

      <nav className="wallet-nav">
        <button 
          className={activeTab === 'market' ? 'active' : ''}
          onClick={() => setActiveTab('market')}
        >
          📈 Market
        </button>
        <button 
          className={activeTab === 'portfolio' ? 'active' : ''}
          onClick={() => setActiveTab('portfolio')}
        >
          💼 Portfolio
        </button>
        <button 
          className={activeTab === 'trade' ? 'active' : ''}
          onClick={() => setActiveTab('trade')}
        >
          💱 Trade
        </button>
      </nav>

      <main className="wallet-content">
        {activeTab === 'market' && (
          <div className="market-view">
            <h2>Crypto Market Prices</h2>
            <div className="crypto-list">
              {Object.entries(cryptoPrices).map(([id, crypto]) => (
                <div key={id} className="crypto-item">
                  <div className="crypto-info">
                    <strong>{crypto.name} ({crypto.symbol})</strong>
                    <div className="crypto-price">${crypto.price.toLocaleString()}</div>
                  </div>
                  <div className={`crypto-change ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                    {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="portfolio-view">
            <h2>My Portfolio</h2>
            {portfolio.length === 0 ? (
              <p>No holdings yet. Start trading to build your portfolio!</p>
            ) : (
              <div className="portfolio-list">
                {portfolio.map((holding, index) => (
                  <div key={index} className="portfolio-item">
                    <div className="holding-info">
                      <strong>{holding.symbol}</strong>
                      <div>Amount: {holding.amount}</div>
                      <div>Avg Price: ${holding.price.toFixed(2)}</div>
                    </div>
                    <div className="holding-value">
                      Current Value: ${(holding.amount * cryptoPrices[holding.crypto]?.price || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'trade' && (
          <div className="trade-view">
            <h2>Buy / Sell Crypto</h2>
            <div className="trade-form">
              <select 
                value={selectedCrypto} 
                onChange={(e) => setSelectedCrypto(e.target.value)}
                className="crypto-select"
              >
                {Object.entries(cryptoPrices).map(([id, crypto]) => (
                  <option key={id} value={id}>
                    {crypto.name} ({crypto.symbol}) - ${crypto.price.toFixed(2)}
                  </option>
                ))}
              </select>
              
              <input
                type="number"
                placeholder="Amount"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className="amount-input"
                step="0.001"
                min="0"
              />
              
              <div className="trade-buttons">
                <button onClick={handleBuy} className="buy-btn">
                  Buy {cryptoPrices[selectedCrypto]?.symbol || ''}
                </button>
                <button onClick={handleSell} className="sell-btn">
                  Sell {cryptoPrices[selectedCrypto]?.symbol || ''}
                </button>
              </div>
              
              {tradeAmount && cryptoPrices[selectedCrypto] && (
                <div className="trade-summary">
                  Total Cost: ${(parseFloat(tradeAmount) * cryptoPrices[selectedCrypto].price).toFixed(2)}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
