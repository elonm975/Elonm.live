
import React, { useState, useEffect } from 'react';
import { FaWallet, FaArrowUp, FaArrowDown, FaPlus } from 'react-icons/fa';

const Dashboard = ({ user, prices }) => {
  const [portfolio, setPortfolio] = useState(null);
  const [marketData, setMarketData] = useState([]);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    fetchPortfolio();
    fetchMarketData();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const token = localStorage.getItem('trustToken');
      const response = await fetch('/api/portfolio', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPortfolio(data);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    }
  };

  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market');
      if (response.ok) {
        const data = await response.json();
        setMarketData(data.slice(0, 4)); // Top 4 for dashboard
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('trustToken');
      const response = await fetch('/api/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(depositAmount) })
      });

      if (response.ok) {
        setShowDepositModal(false);
        setDepositAmount('');
        // Refresh user data
        window.location.reload();
      }
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  const totalProfit = portfolio?.holdings.reduce((sum, holding) => sum + (holding.profit || 0), 0) || 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome back, {user.firstName}!</h1>
        <p>Here's what's happening with your portfolio today</p>
      </div>

      {/* Balance Card */}
      <div className="card">
        <div className="balance-header">
          <div>
            <h2 className="balance-title">Total Balance</h2>
            <div className="balance-amount">
              ${(user.balance + (portfolio?.totalValue || 0)).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowDepositModal(true)}
          >
            <FaPlus /> Add Funds
          </button>
        </div>
        
        <div className="balance-breakdown">
          <div className="balance-item">
            <FaWallet className="balance-icon" />
            <div>
              <div className="balance-label">Available</div>
              <div className="balance-value">${user.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
          <div className="balance-item">
            <FaArrowUp className={`balance-icon ${totalProfit >= 0 ? 'text-success' : 'text-danger'}`} />
            <div>
              <div className="balance-label">P&L Today</div>
              <div className={`balance-value ${totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                {totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Holdings */}
      {portfolio?.holdings && portfolio.holdings.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Holdings</h3>
            <a href="/portfolio" className="btn btn-secondary">View All</a>
          </div>
          <div className="holdings-list">
            {portfolio.holdings.slice(0, 3).map((holding) => (
              <div key={holding.id} className="holding-item">
                <div className="holding-info">
                  <div className="crypto-symbol">{holding.symbol}</div>
                  <div className="crypto-name">{holding.name}</div>
                </div>
                <div className="holding-amounts">
                  <div className="holding-value">
                    ${holding.currentValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`holding-change ${holding.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {holding.profit >= 0 ? '+' : ''}${holding.profit?.toFixed(2)} ({holding.profitPercentage?.toFixed(2)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Overview */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Market Overview</h3>
          <a href="/market" className="btn btn-secondary">View All</a>
        </div>
        <div className="market-grid">
          {marketData.map((crypto) => (
            <div key={crypto.id} className="market-item">
              <div className="market-info">
                <div className="crypto-symbol">{crypto.symbol}</div>
                <div className="crypto-price">${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className={`market-change ${crypto.change >= 0 ? 'text-success' : 'text-danger'}`}>
                {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Funds</h3>
            <form onSubmit={handleDeposit}>
              <div className="form-group">
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  required
                />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowDepositModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .balance-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .balance-title {
          color: #666;
          font-size: 16px;
          margin: 0 0 8px 0;
        }

        .balance-amount {
          font-size: 36px;
          font-weight: 700;
          color: #333;
        }

        .balance-breakdown {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .balance-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 12px;
        }

        .balance-icon {
          font-size: 20px;
          color: #667eea;
        }

        .balance-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }

        .balance-value {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .holdings-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .holding-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 12px;
        }

        .holding-info {
          display: flex;
          flex-direction: column;
        }

        .crypto-symbol {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .crypto-name {
          font-size: 14px;
          color: #666;
        }

        .holding-amounts {
          text-align: right;
        }

        .holding-value {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .holding-change {
          font-size: 14px;
          font-weight: 500;
        }

        .market-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .market-item {
          padding: 16px;
          background: #f8f9fa;
          border-radius: 12px;
          text-align: center;
        }

        .market-info {
          margin-bottom: 8px;
        }

        .crypto-price {
          font-size: 14px;
          color: #666;
          margin-top: 4px;
        }

        .market-change {
          font-size: 14px;
          font-weight: 600;
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
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #f0f0f0;
          border-radius: 8px;
          font-size: 16px;
        }

        .modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        @media (max-width: 768px) {
          .balance-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }

          .balance-amount {
            font-size: 28px;
          }

          .balance-breakdown {
            grid-template-columns: 1fr;
          }

          .market-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
