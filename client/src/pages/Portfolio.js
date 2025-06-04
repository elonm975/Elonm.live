
import React, { useState, useEffect } from 'react';
import { FaArrowUp, FaArrowDown, FaPlus } from 'react-icons/fa';

const Portfolio = ({ user, prices }) => {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolio();
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
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async (cryptoId, amount) => {
    try {
      const token = localStorage.getItem('trustToken');
      const response = await fetch('/api/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cryptoId, amount })
      });

      if (response.ok) {
        fetchPortfolio();
        // You might want to show a success message here
      }
    } catch (error) {
      console.error('Sell failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Portfolio</h1>
        <p>Track your crypto investments and performance</p>
      </div>

      {/* Portfolio Summary */}
      <div className="card">
        <div className="portfolio-summary">
          <div className="summary-item">
            <div className="summary-label">Total Value</div>
            <div className="summary-value">
              ${(portfolio?.totalValue || 0).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Available Balance</div>
            <div className="summary-value">
              ${user.balance?.toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Total P&L</div>
            <div className={`summary-value ${(portfolio?.totalProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
              {(portfolio?.totalProfit || 0) >= 0 ? '+' : ''}${(portfolio?.totalProfit || 0).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Holdings */}
      {portfolio?.holdings && portfolio.holdings.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Holdings</h3>
            <a href="/market" className="btn btn-primary">
              <FaPlus /> Buy More
            </a>
          </div>
          <div className="holdings-grid">
            {portfolio.holdings.map((holding) => (
              <div key={holding.id} className="holding-card">
                <div className="holding-header">
                  <div className="crypto-info">
                    <div className="crypto-symbol">{holding.symbol}</div>
                    <div className="crypto-name">{holding.name}</div>
                  </div>
                  <div className={`profit-badge ${holding.profit >= 0 ? 'positive' : 'negative'}`}>
                    {holding.profit >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                    {holding.profitPercentage?.toFixed(2)}%
                  </div>
                </div>
                
                <div className="holding-details">
                  <div className="detail-row">
                    <span>Amount</span>
                    <span>{holding.amount?.toFixed(6)} {holding.symbol}</span>
                  </div>
                  <div className="detail-row">
                    <span>Current Price</span>
                    <span>${holding.currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="detail-row">
                    <span>Avg Buy Price</span>
                    <span>${holding.avgPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="detail-row">
                    <span>Current Value</span>
                    <span className="value-highlight">
                      ${holding.currentValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>P&L</span>
                    <span className={holding.profit >= 0 ? 'text-success' : 'text-danger'}>
                      {holding.profit >= 0 ? '+' : ''}${holding.profit?.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="holding-actions">
                  <button 
                    className="btn btn-success"
                    onClick={() => window.location.href = '/market'}
                  >
                    Buy More
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => {
                      const amount = prompt(`How much ${holding.symbol} would you like to sell? (Max: ${holding.amount})`);
                      if (amount && parseFloat(amount) > 0 && parseFloat(amount) <= holding.amount) {
                        handleSell(holding.cryptoId, parseFloat(amount));
                      }
                    }}
                  >
                    Sell
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-portfolio">
            <div className="empty-icon">📊</div>
            <h3>No Holdings Yet</h3>
            <p>Start your crypto journey by buying your first cryptocurrency!</p>
            <a href="/market" className="btn btn-primary">
              <FaPlus /> Start Trading
            </a>
          </div>
        </div>
      )}

      <style jsx>{`
        .portfolio-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .summary-item {
          text-align: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 12px;
        }

        .summary-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .summary-value {
          font-size: 24px;
          font-weight: 700;
          color: #333;
        }

        .holdings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
        }

        .holding-card {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 20px;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .holding-card:hover {
          border-color: #667eea;
          transform: translateY(-2px);
        }

        .holding-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .crypto-info {
          display: flex;
          flex-direction: column;
        }

        .crypto-symbol {
          font-size: 20px;
          font-weight: 700;
          color: #333;
        }

        .crypto-name {
          font-size: 14px;
          color: #666;
          margin-top: 4px;
        }

        .profit-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .profit-badge.positive {
          background: rgba(76, 175, 80, 0.1);
          color: #4CAF50;
        }

        .profit-badge.negative {
          background: rgba(244, 67, 54, 0.1);
          color: #f44336;
        }

        .holding-details {
          margin-bottom: 20px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row span:first-child {
          color: #666;
          font-size: 14px;
        }

        .detail-row span:last-child {
          color: #333;
          font-weight: 500;
        }

        .value-highlight {
          font-weight: 700 !important;
          color: #667eea !important;
        }

        .holding-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .empty-portfolio {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .empty-portfolio h3 {
          color: #333;
          margin-bottom: 12px;
        }

        .empty-portfolio p {
          color: #666;
          margin-bottom: 24px;
        }

        @media (max-width: 768px) {
          .portfolio-summary {
            grid-template-columns: 1fr;
          }
          
          .holdings-grid {
            grid-template-columns: 1fr;
          }
          
          .holding-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default Portfolio;
