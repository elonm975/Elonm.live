
import React, { useState } from 'react';
import { FaUser, FaWallet, FaShieldAlt, FaSignOutAlt, FaCopy, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const Settings = ({ user, onLogout }) => {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('trustToken');
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(withdrawAmount) })
      });

      if (response.ok) {
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        alert('Withdrawal successful!');
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      console.error('Withdrawal failed:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account and wallet preferences</p>
      </div>

      {/* Profile Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <FaUser /> Profile Information
          </h3>
        </div>
        <div className="profile-info">
          <div className="info-row">
            <span className="info-label">Full Name</span>
            <span className="info-value">{user.firstName} {user.lastName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{user.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Member Since</span>
            <span className="info-value">
              {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <FaWallet /> Wallet Information
          </h3>
        </div>
        <div className="wallet-info">
          <div className="wallet-balance">
            <div className="balance-label">Current Balance</div>
            <div className="balance-value">
              ${user.balance?.toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
          </div>
          
          <div className="wallet-address">
            <div className="address-label">Your Wallet Address</div>
            <div className="address-value">
              <span className="address-text">{user.walletAddress}</span>
              <button 
                className="copy-btn"
                onClick={() => copyToClipboard(user.walletAddress)}
              >
                <FaCopy />
              </button>
            </div>
          </div>

          <div className="wallet-actions">
            <a href="/dashboard" className="btn btn-success">
              <FaArrowUp /> Deposit
            </a>
            <button 
              className="btn btn-danger"
              onClick={() => setShowWithdrawModal(true)}
              disabled={user.balance <= 0}
            >
              <FaArrowDown /> Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <FaShieldAlt /> Security
          </h3>
        </div>
        <div className="security-info">
          <div className="security-item">
            <div className="security-text">
              <div className="security-title">Two-Factor Authentication</div>
              <div className="security-description">Add an extra layer of security to your account</div>
            </div>
            <button className="btn btn-secondary">Enable</button>
          </div>
          
          <div className="security-item">
            <div className="security-text">
              <div className="security-title">Change Password</div>
              <div className="security-description">Update your account password</div>
            </div>
            <button className="btn btn-secondary">Change</button>
          </div>
          
          <div className="security-item">
            <div className="security-text">
              <div className="security-title">Login History</div>
              <div className="security-description">View recent login activity</div>
            </div>
            <button className="btn btn-secondary">View</button>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="card">
        <div className="account-actions">
          <button 
            className="btn btn-danger logout-btn"
            onClick={onLogout}
          >
            <FaSignOutAlt /> Sign Out
          </button>
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Withdraw Funds</h3>
            <div className="modal-balance">
              Available Balance: ${user.balance?.toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
            
            <form onSubmit={handleWithdraw}>
              <div className="form-group">
                <label>Withdrawal Amount</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="1"
                  max={user.balance}
                  step="0.01"
                  required
                />
              </div>

              <div className="modal-buttons">
                <button type="button" onClick={() => setShowWithdrawModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          color: #666;
          font-weight: 500;
        }

        .info-value {
          color: #333;
          font-weight: 600;
        }

        .wallet-info {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .wallet-balance {
          text-align: center;
          padding: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          color: white;
        }

        .balance-label {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .balance-value {
          font-size: 32px;
          font-weight: 700;
        }

        .wallet-address {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 12px;
        }

        .address-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .address-value {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .address-text {
          font-family: monospace;
          font-size: 14px;
          color: #333;
          flex: 1;
          word-break: break-all;
        }

        .copy-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .copy-btn:hover {
          background: #5a6fd8;
        }

        .wallet-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .security-info {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .security-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 12px;
        }

        .security-text {
          flex: 1;
        }

        .security-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .security-description {
          font-size: 14px;
          color: #666;
        }

        .account-actions {
          text-align: center;
          padding: 20px;
        }

        .logout-btn {
          min-width: 200px;
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
          margin-bottom: 16px;
          color: #333;
        }

        .modal-balance {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 500;
          color: #333;
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

        .modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        @media (max-width: 768px) {
          .wallet-actions {
            grid-template-columns: 1fr;
          }
          
          .security-item {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
          
          .address-value {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .copy-btn {
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;
