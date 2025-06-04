
import React, { useState } from 'react';
import './InvestmentModal.css';

const InvestmentModal = ({ crypto, isOpen, onClose, onInvest }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInvest = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cryptoId: crypto.id,
          cryptoName: crypto.name,
          cryptoSymbol: crypto.symbol,
          amount: parseFloat(amount),
          currentPrice: crypto.price
        })
      });

      const data = await response.json();

      if (response.ok) {
        onInvest(data.investment);
        setAmount('');
        onClose();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalValue = amount ? parseFloat(amount) * crypto.price : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Invest in {crypto.name}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="crypto-info">
            <p><strong>{crypto.symbol}</strong> - ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className={`change ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
              {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
            </p>
          </div>

          <div className="investment-form">
            <label>Amount to Invest (Units)</label>
            <input
              type="number"
              step="0.000001"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
            />

            {amount && (
              <div className="investment-summary">
                <p>Total Investment: <strong>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                <p>Units: <strong>{amount} {crypto.symbol}</strong></p>
              </div>
            )}

            <div className="wallet-info">
              <h4>Payment Instructions:</h4>
              <p>Send your payment to our wallet address:</p>
              <div className="wallet-address">
                <code>1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa</code>
              </div>
              <small>Your investment will be confirmed once payment is received.</small>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button onClick={onClose} className="cancel-button">Cancel</button>
              <button 
                onClick={handleInvest} 
                disabled={loading || !amount}
                className="invest-button"
              >
                {loading ? 'Processing...' : 'Confirm Investment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentModal;
