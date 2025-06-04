
import React, { useState, useEffect } from 'react';
import { FaArrowUp, FaArrowDown, FaPlus, FaMinus } from 'react-icons/fa';

const Transactions = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('trustToken');
      const response = await fetch('/api/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'buy': return <FaArrowUp className="text-success" />;
      case 'sell': return <FaArrowDown className="text-danger" />;
      case 'deposit': return <FaPlus className="text-success" />;
      case 'withdraw': return <FaMinus className="text-danger" />;
      default: return <FaArrowUp />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'buy': return 'buy';
      case 'sell': return 'sell';
      case 'deposit': return 'deposit';
      case 'withdraw': return 'withdraw';
      default: return 'buy';
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
        <h1>Transaction History</h1>
        <p>View all your trading activity and transfers</p>
      </div>

      {transactions.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Transactions</h3>
          </div>
          <div className="transactions-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className={`transaction-item ${getTransactionColor(transaction.type)}`}>
                <div className="transaction-icon">
                  {getTransactionIcon(transaction.type)}
                </div>
                
                <div className="transaction-details">
                  <div className="transaction-main">
                    <div className="transaction-type">
                      {transaction.type === 'buy' && `Bought ${transaction.cryptoId?.toUpperCase()}`}
                      {transaction.type === 'sell' && `Sold ${transaction.cryptoId?.toUpperCase()}`}
                      {transaction.type === 'deposit' && 'Deposit'}
                      {transaction.type === 'withdraw' && 'Withdrawal'}
                    </div>
                    <div className="transaction-date">
                      {formatDate(transaction.timestamp)}
                    </div>
                  </div>
                  
                  {(transaction.type === 'buy' || transaction.type === 'sell') && (
                    <div className="transaction-crypto">
                      <div className="crypto-amount">
                        {transaction.amount?.toFixed(6)} {transaction.cryptoId?.toUpperCase()}
                      </div>
                      <div className="crypto-price">
                        @ ${transaction.price?.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="transaction-amount">
                  <div className={`amount-value ${
                    transaction.type === 'buy' || transaction.type === 'withdraw' ? 'negative' : 'positive'
                  }`}>
                    {transaction.type === 'buy' || transaction.type === 'withdraw' ? '-' : '+'}
                    ${(transaction.total || transaction.amount)?.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                  <div className="transaction-status">
                    Completed
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-transactions">
            <div className="empty-icon">📝</div>
            <h3>No Transactions Yet</h3>
            <p>Your transaction history will appear here once you start trading.</p>
            <a href="/market" className="btn btn-primary">
              Start Trading
            </a>
          </div>
        </div>
      )}

      <style jsx>{`
        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .transaction-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 16px;
          align-items: center;
          padding: 20px;
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .transaction-item.buy {
          background: rgba(76, 175, 80, 0.05);
          border: 1px solid rgba(76, 175, 80, 0.1);
        }

        .transaction-item.sell {
          background: rgba(244, 67, 54, 0.05);
          border: 1px solid rgba(244, 67, 54, 0.1);
        }

        .transaction-item.deposit {
          background: rgba(33, 150, 243, 0.05);
          border: 1px solid rgba(33, 150, 243, 0.1);
        }

        .transaction-item.withdraw {
          background: rgba(255, 152, 0, 0.05);
          border: 1px solid rgba(255, 152, 0, 0.1);
        }

        .transaction-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .transaction-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .transaction-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .transaction-main {
          display: flex;
          flex-direction: column;
        }

        .transaction-type {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .transaction-date {
          font-size: 14px;
          color: #666;
        }

        .transaction-crypto {
          display: flex;
          flex-direction: column;
        }

        .crypto-amount {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .crypto-price {
          font-size: 12px;
          color: #666;
        }

        .transaction-amount {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .amount-value {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .amount-value.positive {
          color: #4CAF50;
        }

        .amount-value.negative {
          color: #f44336;
        }

        .transaction-status {
          font-size: 12px;
          color: #4CAF50;
          background: rgba(76, 175, 80, 0.1);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .empty-transactions {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .empty-transactions h3 {
          color: #333;
          margin-bottom: 12px;
        }

        .empty-transactions p {
          color: #666;
          margin-bottom: 24px;
        }

        @media (max-width: 768px) {
          .transaction-item {
            grid-template-columns: 1fr;
            gap: 12px;
            text-align: center;
          }
          
          .transaction-details {
            order: 1;
          }
          
          .transaction-icon {
            order: 0;
            margin: 0 auto;
          }
          
          .transaction-amount {
            order: 2;
            align-items: center;
          }
          
          .transaction-main {
            align-items: center;
          }
          
          .transaction-crypto {
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Transactions;
