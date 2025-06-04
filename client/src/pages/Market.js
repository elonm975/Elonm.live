
import React, { useState, useEffect } from 'react';
import { FaSearch, FaShoppingCart } from 'react-icons/fa';

const Market = ({ user, prices }) => {
  const [marketData, setMarketData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market');
      if (response.ok) {
        const data = await response.json();
        setMarketData(data);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  };

  const handleBuy = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('trustToken');
      const response = await fetch('/api/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          cryptoId: selectedCrypto.id,
          amount: parseFloat(buyAmount),
          price: selectedCrypto.price
        })
      });

      if (response.ok) {
        setShowBuyModal(false);
        setBuyAmount('');
        setSelectedCrypto(null);
        alert('Purchase successful!');
        // Refresh user data
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      console.error('Buy failed:', error);
      alert('Purchase failed. Please try again.');
    }
  };

  const openBuyModal = (crypto) => {
    setSelectedCrypto(crypto);
    setShowBuyModal(true);
  };

  const filteredMarketData = marketData.filter(crypto =>
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Crypto Market</h1>
        <p>Explore and invest in top cryptocurrencies</p>
      </div>

      {/* Search */}
      <div className="card">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search cryptocurrencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Available Balance */}
      <div className="card">
        <div className="balance-info">
          <div className="balance-label">Available Balance</div>
          <div className="balance-amount">
            ${user.balance?.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}
          </div>
        </div>
      </div>

      {/* Market List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Available Cryptocurrencies</h3>
        </div>
        <div className="market-list">
          {filteredMarketData.map((crypto) => (
            <div key={crypto.id} className="market-item">
              <div className="crypto-info">
                <div className="crypto-main">
                  <div className="crypto-symbol">{crypto.symbol}</div>
                  <div className="crypto-name">{crypto.name}</div>
                </div>
                <div className="crypto-details">
                  <div className="crypto-price">
                    ${crypto.price.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                  <div className={`crypto-change ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                    {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                  </div>
                </div>
              </div>
              
              <div className="market-stats">
                <div className="stat">
                  <span className="stat-label">Market Cap</span>
                  <span className="stat-value">${parseInt(crypto.marketCap).toLocaleString()}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">24h Volume</span>
                  <span className="stat-value">${parseInt(crypto.volume24h).toLocaleString()}</span>
                </div>
              </div>

              <button 
                className="btn btn-primary buy-btn"
                onClick={() => openBuyModal(crypto)}
                disabled={user.balance <= 0}
              >
                <FaShoppingCart /> Buy
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Buy Modal */}
      {showBuyModal && selectedCrypto && (
        <div className="modal-overlay" onClick={() => setShowBuyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Buy {selectedCrypto.name}</h3>
            <div className="modal-crypto-info">
              <div className="modal-crypto-price">
                Current Price: ${selectedCrypto.price.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </div>
              <div className="modal-balance">
                Available Balance: ${user.balance.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </div>
            </div>
            
            <form onSubmit={handleBuy}>
              <div className="form-group">
                <label>Amount ({selectedCrypto.symbol})</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  min="0.000001"
                  step="0.000001"
                  required
                />
                <div className="input-help">
                  Total Cost: ${buyAmount ? (parseFloat(buyAmount) * selectedCrypto.price).toFixed(2) : '0.00'}
                </div>
              </div>
              
              <div className="quick-amounts">
                <span>Quick amounts:</span>
                <div className="quick-buttons">
                  {[25, 50, 100, 250].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      className="quick-btn"
                      onClick={() => setBuyAmount((amount / selectedCrypto.price).toFixed(6))}
                      disabled={amount > user.balance}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-buttons">
                <button type="button" onClick={() => setShowBuyModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!buyAmount || (parseFloat(buyAmount) * selectedCrypto.price) > user.balance}
                >
                  Buy {selectedCrypto.symbol}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .search-container {
          position: relative;
          max-width: 400px;
          margin: 0 auto;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
          font-size: 16px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          border: 2px solid #f0f0f0;
          border-radius: 12px;
          font-size: 16px;
          background: white;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .balance-info {
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          color: white;
        }

        .balance-label {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .balance-amount {
          font-size: 32px;
          font-weight: 700;
        }

        .market-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .market-item {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 20px;
          align-items: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .market-item:hover {
          background: #f0f0f0;
          transform: translateY(-2px);
        }

        .crypto-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex: 1;
        }

        .crypto-main {
          display: flex;
          flex-direction: column;
        }

        .crypto-symbol {
          font-size: 18px;
          font-weight: 700;
          color: #333;
        }

        .crypto-name {
          font-size: 14px;
          color: #666;
          margin-top: 4px;
        }

        .crypto-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .crypto-price {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .crypto-change {
          font-size: 14px;
          font-weight: 500;
          margin-top: 4px;
        }

        .crypto-change.positive {
          color: #4CAF50;
        }

        .crypto-change.negative {
          color: #f44336;
        }

        .market-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 120px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .stat-label {
          font-size: 12px;
          color: #666;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .buy-btn {
          min-width: 80px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 24px;
          width: 100%;
          max-width: 400px;
        }

        .modal-content h3 {
          margin-bottom: 20px;
          color: #333;
          text-align: center;
        }

        .modal-crypto-info {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          text-align: center;
        }

        .modal-crypto-price {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }

        .modal-balance {
          font-size: 14px;
          color: #666;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #f0f0f0;
          border-radius: 8px;
          font-size: 16px;
        }

        .input-help {
          margin-top: 8px;
          font-size: 14px;
          color: #667eea;
          font-weight: 500;
        }

        .quick-amounts {
          margin-bottom: 20px;
        }

        .quick-amounts span {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: #666;
        }

        .quick-buttons {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .quick-btn {
          padding: 8px 12px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .quick-btn:hover:not(:disabled) {
          background: #f8f9fa;
        }

        .quick-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        @media (max-width: 768px) {
          .market-item {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .crypto-info {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
          
          .crypto-details {
            align-items: flex-start;
          }
          
          .market-stats {
            flex-direction: row;
            justify-content: space-between;
          }
          
          .stat {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default Market;
