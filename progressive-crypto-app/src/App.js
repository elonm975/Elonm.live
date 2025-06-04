
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate fetching crypto data
    const fetchCryptoData = () => {
      try {
        // Mock data for demonstration
        const mockData = [
          { id: 1, name: 'Bitcoin', symbol: 'BTC', price: 65432.10, change: 2.34 },
          { id: 2, name: 'Ethereum', symbol: 'ETH', price: 3456.78, change: -1.23 },
          { id: 3, name: 'Cardano', symbol: 'ADA', price: 0.98, change: 5.67 },
          { id: 4, name: 'Solana', symbol: 'SOL', price: 156.89, change: 3.45 },
        ];
        
        setTimeout(() => {
          setCryptoData(mockData);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Failed to fetch crypto data');
        setLoading(false);
      }
    };

    fetchCryptoData();
  }, []);

  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Crypto Tracker</h1>
          <p>Loading crypto data...</p>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Crypto Tracker</h1>
          <p style={{ color: 'red' }}>{error}</p>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Progressive Crypto Tracker</h1>
        <p>Real-time cryptocurrency prices</p>
      </header>
      
      <main className="crypto-list">
        {cryptoData.map(crypto => (
          <div key={crypto.id} className="crypto-card">
            <div className="crypto-info">
              <h3>{crypto.name} ({crypto.symbol})</h3>
              <p className="price">${crypto.price.toLocaleString()}</p>
              <p className={`change ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                {crypto.change >= 0 ? '+' : ''}{crypto.change}%
              </p>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

export default App;
