
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [investments, setInvestments] = useState({ totalInvested: 0, totalProfits: 0, profitPercentage: 0, investments: [] });
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(!token);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [isRegister, setIsRegister] = useState(false);
  const [depositInfo, setDepositInfo] = useState(null);
  const [investmentData, setInvestmentData] = useState({ amount: '', method: 'bitcoin', reference: '' });
  const [withdrawData, setWithdrawData] = useState({ amount: '', method: 'bitcoin', address: '' });
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  
  // Admin states
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminConfig, setAdminConfig] = useState({});
  const [adminTransactions, setAdminTransactions] = useState([]);
  const [adminInvestments, setAdminInvestments] = useState([]);

  // Fetch data on component mount
  useEffect(() => {
    if (token) {
      fetchUserData();
      fetchMarketData();
      fetchInvestments();
      fetchTransactions();
      fetchWithdrawals();
      fetchDepositInfo();
      
      if (user?.isAdmin) {
        fetchAdminData();
      }
    } else {
      fetchMarketData();
    }
  }, [token, user?.isAdmin]);

  const apiCall = async (endpoint, options = {}) => {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    });
    
    if (response.status === 401) {
      logout();
      return null;
    }
    
    return response.json();
  };

  const fetchUserData = async () => {
    // User data is included in login response
  };

  const fetchMarketData = async () => {
    try {
      const data = await apiCall('/market');
      setCryptoPrices(data || {
        'bitcoin': { price: 67234.50, change: 2.45, symbol: 'BTC', name: 'Bitcoin' },
        'ethereum': { price: 3567.89, change: -1.23, symbol: 'ETH', name: 'Ethereum' },
        'binancecoin': { price: 589.34, change: 4.56, symbol: 'BNB', name: 'BNB' },
        'solana': { price: 178.45, change: 5.67, symbol: 'SOL', name: 'Solana' }
      });
    } catch (error) {
      console.log('Using demo data');
    }
  };

  const fetchInvestments = async () => {
    const data = await apiCall('/investments');
    if (data) setInvestments(data);
  };

  const fetchTransactions = async () => {
    const data = await apiCall('/transactions');
    if (data) setTransactions(data);
  };

  const fetchWithdrawals = async () => {
    const data = await apiCall('/withdrawals');
    if (data) setWithdrawals(data);
  };

  const fetchDepositInfo = async () => {
    const data = await apiCall('/deposit/info');
    if (data) setDepositInfo(data);
  };

  const fetchAdminData = async () => {
    const [users, config, transactions, investments] = await Promise.all([
      apiCall('/admin/users'),
      apiCall('/admin/config'),
      apiCall('/admin/transactions'),
      apiCall('/admin/deposits')
    ]);
    
    if (users) setAdminUsers(users);
    if (config) setAdminConfig(config);
    if (transactions) setAdminTransactions(transactions);
    if (investments) setAdminInvestments(investments);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });
    
    if (data?.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setShowLogin(false);
      alert('Login successful!');
    } else {
      alert(data?.message || 'Login failed');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registerData)
    });
    
    if (data?.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setShowLogin(false);
      alert('Account created successfully!');
    } else {
      alert(data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setShowLogin(true);
    setActiveTab('market');
  };

  const handleInvestment = async (e) => {
    e.preventDefault();
    const data = await apiCall('/invest', {
      method: 'POST',
      body: JSON.stringify(investmentData)
    });
    
    if (data?.message) {
      setInvestmentData({ amount: '', method: 'bitcoin', reference: '' });
      fetchInvestments();
      alert(data.message);
    } else {
      alert(data?.message || 'Investment failed');
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const data = await apiCall('/withdraw', {
      method: 'POST',
      body: JSON.stringify(withdrawData)
    });
    
    if (data?.message) {
      setWithdrawData({ amount: '', method: 'bitcoin', address: '' });
      fetchWithdrawals();
      alert(data.message);
    } else {
      alert(data?.message || 'Withdrawal failed');
    }
  };

  const updateUserProfits = async (userId, totalProfits, profitPercentage, action = 'set') => {
    const data = await apiCall(`/admin/users/${userId}/profits`, {
      method: 'PUT',
      body: JSON.stringify({ 
        totalProfits: parseFloat(totalProfits), 
        profitPercentage: parseFloat(profitPercentage),
        action 
      })
    });
    
    if (data?.message) {
      fetchAdminData();
      alert(data.message);
    }
  };

  const updateInvestmentStatus = async (investmentId, status) => {
    const data = await apiCall(`/admin/investments/${investmentId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    
    if (data?.message) {
      fetchAdminData();
      alert(data.message);
    }
  };

  const updateAdminConfig = async (newConfig) => {
    const data = await apiCall('/admin/config', {
      method: 'PUT',
      body: JSON.stringify(newConfig)
    });
    
    if (data?.message) {
      setAdminConfig(data.config);
      alert(data.message);
    }
  };

  if (showLogin) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>🚀 Elon Trust Wallet</h1>
          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            {isRegister && (
              <>
                <input
                  type="text"
                  placeholder="First Name"
                  value={registerData.firstName}
                  onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={registerData.lastName}
                  onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})}
                  required
                />
              </>
            )}
            <input
              type="email"
              placeholder="Email"
              value={isRegister ? registerData.email : loginData.email}
              onChange={(e) => isRegister 
                ? setRegisterData({...registerData, email: e.target.value})
                : setLoginData({...loginData, email: e.target.value})
              }
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={isRegister ? registerData.password : loginData.password}
              onChange={(e) => isRegister 
                ? setRegisterData({...registerData, password: e.target.value})
                : setLoginData({...loginData, password: e.target.value})
              }
              required
            />
            <button type="submit">{isRegister ? 'Create Account' : 'Login'}</button>
          </form>
          <p>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              type="button" 
              onClick={() => setIsRegister(!isRegister)}
              className="link-button"
            >
              {isRegister ? 'Login' : 'Register'}
            </button>
          </p>
          <div className="demo-credentials">
            <p><strong>Demo Admin:</strong> admin@elontrustwall.com / admin123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="crypto-exchange">
      <header className="exchange-header">
        <h1>🚀 Elon Trust Wallet</h1>
        <div className="user-info">
          <span>Welcome, {user?.firstName}!</span>
          <div className="investment-info">
            <div>Total Invested: ${user?.totalInvested?.toFixed(2) || '0.00'}</div>
            <div className="profits">Profits: ${user?.totalProfits?.toFixed(2) || '0.00'} ({user?.profitPercentage?.toFixed(2) || '0.00'}%)</div>
          </div>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      <nav className="exchange-nav">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          🏠 Dashboard
        </button>
        <button 
          className={activeTab === 'market' ? 'active' : ''}
          onClick={() => setActiveTab('market')}
        >
          📈 Market
        </button>
        <button 
          className={activeTab === 'invest' ? 'active' : ''}
          onClick={() => setActiveTab('invest')}
        >
          💎 Invest
        </button>
        <button 
          className={activeTab === 'withdraw' ? 'active' : ''}
          onClick={() => setActiveTab('withdraw')}
        >
          🏦 Withdraw
        </button>
        <button 
          className={activeTab === 'transactions' ? 'active' : ''}
          onClick={() => setActiveTab('transactions')}
        >
          📋 History
        </button>
        {user?.isAdmin && (
          <button 
            className={activeTab === 'admin' ? 'active' : ''}
            onClick={() => setActiveTab('admin')}
          >
            👑 Admin
          </button>
        )}
      </nav>

      <main className="exchange-content">
        {activeTab === 'market' && (
          <div className="market-view">
            <h2>Crypto Market Prices</h2>
            <div className="crypto-list">
              {Object.entries(cryptoPrices).map(([id, crypto]) => (
                <div key={id} className="crypto-item">
                  <div className="crypto-info">
                    <strong>{crypto.name} ({crypto.symbol})</strong>
                    <div className="crypto-price">${crypto.price?.toLocaleString()}</div>
                  </div>
                  <div className={`crypto-change ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                    {crypto.change >= 0 ? '+' : ''}{crypto.change?.toFixed(2)}%
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
                      <div>Avg Price: ${holding.avgPrice?.toFixed(2)}</div>
                      <div>Invested: ${holding.invested?.toFixed(2)}</div>
                    </div>
                    <div className="holding-value">
                      <div>Current Value: ${holding.currentValue?.toFixed(2) || 0}</div>
                      <div className={`profit ${holding.profit >= 0 ? 'positive' : 'negative'}`}>
                        Profit: ${holding.profit?.toFixed(2) || 0} ({holding.profitPercentage?.toFixed(2) || 0}%)
                      </div>
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
                    {crypto.name} ({crypto.symbol}) - ${crypto.price?.toFixed(2)}
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
                  <div>Total Cost: ${(parseFloat(tradeAmount) * cryptoPrices[selectedCrypto].price).toFixed(2)}</div>
                  <div>Commission (2%): ${(parseFloat(tradeAmount) * cryptoPrices[selectedCrypto].price * 0.02).toFixed(2)}</div>
                  <div><strong>Final Cost: ${(parseFloat(tradeAmount) * cryptoPrices[selectedCrypto].price * 1.02).toFixed(2)}</strong></div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="deposit-view">
            <h2>Deposit Funds</h2>
            
            {depositInfo && (
              <div className="deposit-info">
                <div className="deposit-methods">
                  <div className="deposit-method">
                    <h3>💰 Bitcoin Deposit</h3>
                    <p><strong>Bitcoin Address:</strong></p>
                    <div className="address-box">{depositInfo.bitcoinAddress}</div>
                    <p>Send Bitcoin to this address and enter the transaction reference below.</p>
                  </div>
                  
                  <div className="deposit-method">
                    <h3>🏦 Bank Transfer</h3>
                    <div className="bank-details">
                      <p><strong>Bank:</strong> {depositInfo.bankAccount?.bankName}</p>
                      <p><strong>Account Name:</strong> {depositInfo.bankAccount?.accountName}</p>
                      <p><strong>Account Number:</strong> {depositInfo.bankAccount?.accountNumber}</p>
                      <p><strong>Routing Number:</strong> {depositInfo.bankAccount?.routingNumber}</p>
                    </div>
                  </div>
                </div>
                
                <form onSubmit={handleDeposit} className="deposit-form">
                  <select
                    value={depositData.method}
                    onChange={(e) => setDepositData({...depositData, method: e.target.value})}
                    required
                  >
                    <option value="bitcoin">Bitcoin</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                  
                  <input
                    type="number"
                    placeholder={`Amount (Min: $${depositInfo.minDeposit})`}
                    value={depositData.amount}
                    onChange={(e) => setDepositData({...depositData, amount: e.target.value})}
                    min={depositInfo.minDeposit}
                    required
                  />
                  
                  <input
                    type="text"
                    placeholder={depositData.method === 'bitcoin' ? 'Bitcoin Transaction ID' : 'Bank Reference/Transfer ID'}
                    value={depositData.reference}
                    onChange={(e) => setDepositData({...depositData, reference: e.target.value})}
                    required
                  />
                  
                  <button type="submit" className="deposit-btn">Submit Deposit</button>
                </form>
              </div>
            )}
            
            <div className="deposit-history">
              <h3>Deposit History</h3>
              {deposits.map(deposit => (
                <div key={deposit.id} className="transaction-item">
                  <div>
                    <strong>${deposit.amount}</strong> via {deposit.method}
                    <div className="transaction-meta">
                      {deposit.reference} - {new Date(deposit.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className={`status ${deposit.status}`}>{deposit.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div className="withdraw-view">
            <h2>Withdraw Funds</h2>
            
            <form onSubmit={handleWithdraw} className="withdraw-form">
              <select
                value={withdrawData.method}
                onChange={(e) => setWithdrawData({...withdrawData, method: e.target.value})}
                required
              >
                <option value="bitcoin">Bitcoin</option>
                <option value="bank">Bank Transfer</option>
              </select>
              
              <input
                type="number"
                placeholder="Amount"
                value={withdrawData.amount}
                onChange={(e) => setWithdrawData({...withdrawData, amount: e.target.value})}
                max={user?.balance}
                required
              />
              
              <input
                type="text"
                placeholder={withdrawData.method === 'bitcoin' ? 'Your Bitcoin Address' : 'Your Bank Account Details'}
                value={withdrawData.address}
                onChange={(e) => setWithdrawData({...withdrawData, address: e.target.value})}
                required
              />
              
              <button type="submit" className="withdraw-btn">Submit Withdrawal</button>
            </form>
            
            <div className="withdraw-history">
              <h3>Withdrawal History</h3>
              {withdrawals.map(withdrawal => (
                <div key={withdrawal.id} className="transaction-item">
                  <div>
                    <strong>${withdrawal.amount}</strong> via {withdrawal.method}
                    <div className="transaction-meta">
                      To: {withdrawal.address} - {new Date(withdrawal.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className={`status ${withdrawal.status}`}>{withdrawal.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-view">
            <h2>Transaction History</h2>
            <div className="transactions-list">
              {transactions.map(transaction => (
                <div key={transaction.id} className="transaction-item">
                  <div>
                    <strong>{transaction.type.toUpperCase()}</strong>
                    {transaction.amount && (
                      <span> - {transaction.amount} {cryptoPrices[transaction.cryptoId]?.symbol}</span>
                    )}
                    <div className="transaction-meta">
                      ${transaction.total?.toFixed(2)} - {new Date(transaction.timestamp).toLocaleString()}
                      {transaction.commission && (
                        <span> (Commission: ${transaction.commission.toFixed(2)})</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'admin' && user?.isAdmin && (
          <div className="admin-view">
            <h2>Admin Dashboard</h2>
            
            <div className="admin-tabs">
              <div className="admin-section">
                <h3>Platform Configuration</h3>
                <div className="config-form">
                  <label>
                    Bitcoin Address:
                    <input
                      type="text"
                      value={adminConfig.bitcoinAddress || ''}
                      onChange={(e) => setAdminConfig({...adminConfig, bitcoinAddress: e.target.value})}
                    />
                  </label>
                  
                  <label>
                    Commission Rate (%):
                    <input
                      type="number"
                      step="0.01"
                      value={adminConfig.commissionRate * 100 || 0}
                      onChange={(e) => setAdminConfig({...adminConfig, commissionRate: parseFloat(e.target.value) / 100})}
                    />
                  </label>
                  
                  <button onClick={() => updateAdminConfig(adminConfig)}>
                    Update Configuration
                  </button>
                </div>
              </div>
              
              <div className="admin-section">
                <h3>User Management</h3>
                <div className="users-list">
                  {adminUsers.map(user => (
                    <div key={user.id} className="admin-user-item">
                      <div>
                        <strong>{user.firstName} {user.lastName}</strong>
                        <div>{user.email}</div>
                        <div>Balance: ${user.balance?.toFixed(2)}</div>
                      </div>
                      <div className="admin-actions">
                        <input
                          type="number"
                          placeholder="Amount"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateUserBalance(user.id, 'add', e.target.value);
                              e.target.value = '';
                            }
                          }}
                        />
                        <button onClick={(e) => {
                          const amount = e.target.previousElementSibling.value;
                          if (amount) {
                            updateUserBalance(user.id, 'add', amount);
                            e.target.previousElementSibling.value = '';
                          }
                        }}>
                          Add Funds
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="admin-section">
                <h3>Pending Deposits</h3>
                <div className="deposits-list">
                  {adminDeposits.filter(d => d.status === 'pending').map(deposit => (
                    <div key={deposit.id} className="admin-deposit-item">
                      <div>
                        <strong>{deposit.userName}</strong>
                        <div>${deposit.amount} via {deposit.method}</div>
                        <div>Reference: {deposit.reference}</div>
                        <div>{new Date(deposit.timestamp).toLocaleString()}</div>
                      </div>
                      <div className="admin-actions">
                        <button onClick={() => updateDepositStatus(deposit.id, 'approved')}>
                          Approve
                        </button>
                        <button onClick={() => updateDepositStatus(deposit.id, 'rejected')}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
