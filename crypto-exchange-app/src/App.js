import React, { useState, useEffect, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import './App.css';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'white', background: '#1a1a2e' }}>
          <h2>Loading Application...</h2>
          <p>Please wait while we set up your crypto exchange.</p>
          <button 
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{ 
              padding: '10px 20px', 
              background: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Refresh Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Portfolio state
  const [balance, setBalance] = useState(10000);
  const [portfolio, setPortfolio] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  // Crypto data
  const [cryptoData, setCryptoData] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [showTrade, setShowTrade] = useState(false);

  // Navigation and UI state - moved before early returns
  const [activeTab, setActiveTab] = useState('home');
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Deposit/Withdraw info
  const bitcoinAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
  const bankDetails = {
    accountName: "Eloncrypto Exchange",
    accountNumber: "1234567890",
    bankName: "Crypto Bank",
    routingNumber: "021000021"
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        await loadUserData(user.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCryptoData = async () => {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,polkadot,chainlink&vs_currencies=usd&include_24hr_change=true');
      const data = Object.entries(response.data).map(([id, info]) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        price: info.usd,
        change: info.usd_24h_change || 0
      }));
      setCryptoData(data);
    } catch (error) {
      console.error('Failed to fetch crypto data:', error);
      setCryptoData([
        { id: 'bitcoin', name: 'Bitcoin', price: 45000, change: 2.5 },
        { id: 'ethereum', name: 'Ethereum', price: 3000, change: -1.2 },
        { id: 'cardano', name: 'Cardano', price: 0.5, change: 3.1 }
      ]);
    }
  };

  const loadUserData = async (userId) => {
    try {
      const portfolioQuery = query(collection(db, 'portfolios'), where('userId', '==', userId));
      const portfolioSnapshot = await getDocs(portfolioQuery);
      const portfolioData = portfolioSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPortfolio(portfolioData);

      const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(transactionsData);

      const userQuery = query(collection(db, 'users'), where('userId', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        setBalance(userData.balance || 10000);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowLogin(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      setError('Invalid email or password');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await addDoc(collection(db, 'users'), {
        userId: userCredential.user.uid,
        email: email,
        balance: 10000,
        createdAt: new Date()
      });
      setShowSignup(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError(error.message);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');

    // Validate email format on frontend - matches server validation
    const emailRegex = /^[a-zA-Z0-9._-]{1,1000}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const trimmedEmail = resetEmail?.trim();
    
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const resetData = {
        email: trimmedEmail,
        token: resetToken,
        expires: Date.now() + 3600000
      };

      localStorage.setItem('passwordReset', JSON.stringify(resetData));

      console.log('Sending reset email request for:', trimmedEmail);

      const response = await fetch('/api/send-reset-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          resetToken: resetToken
        })
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Server returned non-JSON response:', await response.text());
        throw new Error('Server error - invalid response format');
      }

      const responseData = await response.json();
      console.log('Server response:', responseData);

      if (!response.ok) {
        console.error('Server error response:', responseData);
        throw new Error(responseData.error || responseData.message || `Server error: ${response.status}`);
      }

      if (responseData.success) {
        setResetEmailSent(true);
        setError('');
      } else {
        throw new Error(responseData.error || responseData.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (error.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Please try again.');
      } else {
        setError(error.message || 'Failed to send reset email. Please try again.');
      }
    }
  };

  const handleTrade = async (type) => {
    if (!selectedCrypto || !tradeAmount || parseFloat(tradeAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(tradeAmount);
    const totalCost = amount * selectedCrypto.price;

    if (type === 'buy' && totalCost > balance) {
      setError('Insufficient balance');
      return;
    }

    try {
      if (type === 'buy') {
        setBalance(prev => prev - totalCost);

        const existingAsset = portfolio.find(p => p.cryptoId === selectedCrypto.id);
        if (existingAsset) {
          await updateDoc(doc(db, 'portfolios', existingAsset.id), {
            amount: existingAsset.amount + amount
          });
        } else {
          await addDoc(collection(db, 'portfolios'), {
            userId: user.uid,
            cryptoId: selectedCrypto.id,
            cryptoName: selectedCrypto.name,
            amount: amount,
            purchasePrice: selectedCrypto.price
          });
        }
      } else {
        const existingAsset = portfolio.find(p => p.cryptoId === selectedCrypto.id);
        if (!existingAsset || existingAsset.amount < amount) {
          setError('Insufficient crypto balance');
          return;
        }

        setBalance(prev => prev + totalCost);

        if (existingAsset.amount === amount) {
          await updateDoc(doc(db, 'portfolios', existingAsset.id), {
            amount: 0
          });
        } else {
          await updateDoc(doc(db, 'portfolios', existingAsset.id), {
            amount: existingAsset.amount - amount
          });
        }
      }

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: type,
        cryptoId: selectedCrypto.id,
        cryptoName: selectedCrypto.name,
        amount: amount,
        price: selectedCrypto.price,
        total: totalCost,
        timestamp: new Date()
      });

      await loadUserData(user.uid);
      setShowTrade(false);
      setTradeAmount('');
      setSelectedCrypto(null);
      setError('');
    } catch (error) {
      setError('Transaction failed: ' + error.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bybit-login-page">
        <div className="animated-background">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
          <div className="floating-shape shape-4"></div>
          <div className="floating-shape shape-5"></div>
          <div className="floating-shape shape-6"></div>
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <div className="logo-container">
                <div className="crypto-logo">
                  <span className="logo-icon">₿</span>
                </div>
                <h1>Eloncrypto</h1>
                <p className="tagline">Advanced Crypto Trading Platform</p>
              </div>
            </div>

            {!showLogin && !showSignup && !showForgotPassword && (
              <div className="auth-form-container">
                <div className="welcome-section">
                  <div className="welcome-floating-elements">
                    <div className="welcome-floating-box welcome-box-1"></div>
                    <div className="welcome-floating-box welcome-box-2"></div>
                    <div className="welcome-floating-box welcome-box-3"></div>
                    <div className="welcome-floating-box welcome-box-4"></div>
                  </div>
                  <h2>Welcome Back</h2>
                  <p className="form-subtitle">Sign in to access your trading dashboard</p>
                </div>
                <div className="auth-buttons-modern">
                  <button className="primary-btn" onClick={() => setShowLogin(true)}>
                    Sign In
                  </button>
                  <button className="secondary-btn" onClick={() => setShowSignup(true)}>
                    Create Account
                  </button>
                </div>
                <div className="trust-indicators">
                  <div className="indicator">
                    <span className="indicator-icon">🔒</span>
                    <span>Bank-level Security</span>
                  </div>
                  <div className="indicator">
                    <span className="indicator-icon">⚡</span>
                    <span>Lightning Fast</span>
                  </div>
                  <div className="indicator">
                    <span className="indicator-icon">🌍</span>
                    <span>Global Access</span>
                  </div>
                </div>
              </div>
            )}

            {showLogin && (
              <div className="auth-form-container">
                <div className="auth-form modern">
                  <h2>Sign In</h2>
                  <p className="form-subtitle">Enter your credentials to access your account</p>
                  <form onSubmit={handleLogin} className="modern-form">
                    <div className="form-fields">
                      <div className="input-group">
                        <input
                          type="email"
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="modern-input"
                        />
                      </div>
                      <div className="input-group">
                        <input
                          type="password"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="modern-input"
                        />
                      </div>
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    <button type="submit" className="submit-btn">Sign In</button>
                    <div className="form-links">
                      <button type="button" className="link-btn" onClick={() => { setShowLogin(false); setShowForgotPassword(true); setError(''); }}>
                        Forgot Password?
                      </button>
                    </div>
                    <div className="form-footer">
                      <p>Don't have an account? 
                        <button type="button" className="link-btn" onClick={() => { setShowLogin(false); setShowSignup(true); setError(''); }}>
                          Create one
                        </button>
                      </p>
                      <button type="button" className="back-btn" onClick={() => { setShowLogin(false); setError(''); }}>
                        ← Back
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showSignup && (
              <div className="auth-form-container">
                <div className="auth-form modern">
                  <h2>Create Account</h2>
                  <p className="form-subtitle">Join thousands of traders worldwide</p>
                  <form onSubmit={handleSignup} className="modern-form">
                    <div className="form-fields">
                      <div className="input-group">
                        <input
                          type="email"
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="modern-input"
                        />
                      </div>
                      <div className="input-group">
                        <input
                          type="password"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="modern-input"
                        />
                      </div>
                      <div className="input-group">
                        <input
                          type="password"
                          placeholder="Confirm Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="modern-input"
                        />
                      </div>
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    <button type="submit" className="submit-btn">Create Account</button>
                    <div className="form-footer">
                      <p>Already have an account? 
                        <button type="button" className="link-btn" onClick={() => { setShowSignup(false); setShowLogin(true); setError(''); }}>
                          Sign in
                        </button>
                      </p>
                      <button type="button" className="back-btn" onClick={() => { setShowSignup(false); setError(''); }}>
                        ← Back
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showForgotPassword && (
              <div className="auth-form-container">
                <div className="auth-form modern">
                  <h2>Reset Password</h2>
                  {!resetEmailSent ? (
                    <form onSubmit={handlePasswordReset} className="modern-form">
                      <p className="form-subtitle">Enter your email to receive reset instructions</p>
                      <div className="form-fields">
                        <div className="input-group">
                          <input
                            type="email"
                            placeholder="Email address"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            className="modern-input"
                          />
                        </div>
                      </div>
                      {error && <div className="error-message">{error}</div>}
                      <button type="submit" className="submit-btn">Send Reset Email</button>
                      <div className="form-footer">
                        <button type="button" className="back-btn" onClick={() => { setShowForgotPassword(false); setError(''); }}>
                          ← Back to Sign In
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="reset-success">
                      <div className="success-icon">✉️</div>
                      <h3>Check Your Email</h3>
                      <p>We've sent password reset instructions to</p>
                      <p className="email-highlight">{resetEmail}</p>
                      <div className="form-actions">
                        <button 
                          className="submit-btn"
                          onClick={() => {
                            setShowForgotPassword(false);
                            setResetEmailSent(false);
                            setResetEmail('');
                            setError('');
                          }}
                        >
                          Done
                        </button>
                        <button 
                          className="secondary-btn"
                          onClick={() => {
                            setResetEmailSent(false);
                            setError('');
                          }}
                        >
                          Resend Email
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const totalPortfolioValue = portfolio.reduce((total, asset) => {
    const currentPrice = cryptoData.find(c => c.id === asset.cryptoId)?.price || asset.purchasePrice;
    return total + (asset.amount * currentPrice);
  }, 0);

  const renderHome = () => (
    <div className="home-tab">
      <div className="welcome-section">
        <h2>Welcome back, {userName || user.email?.split('@')[0]}</h2>
        <div className="balance-overview">
          <div className="total-balance-card">
            <div className="balance-header">
              <span className="balance-label">Total Balance</span>
              <button className="eye-btn">👁</button>
            </div>
            <div className="balance-amount">${(balance + totalPortfolioValue).toLocaleString()}</div>
            <div className="balance-change">
              <span className="change-amount">+${(totalPortfolioValue * 0.024).toFixed(2)}</span>
              <span className="change-percent">(+2.4% today)</span>
            </div>
          </div>
          <div className="quick-stats">
            <div className="stat-card">
              <span className="stat-label">Available Balance</span>
              <span className="stat-value">${balance.toLocaleString()}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Portfolio Value</span>
              <span className="stat-value">${totalPortfolioValue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="transactions-list">
          {transactions.slice(0, 3).map(tx => (
            <div key={tx.id} className="transaction-item">
              <span className={`type-badge ${tx.type}`}>{tx.type.toUpperCase()}</span>
              <div className="transaction-details">
                <div className="crypto-name">{tx.cryptoName}</div>
                <div className="amount">{tx.amount.toFixed(6)} • ${tx.total.toFixed(2)}</div>
              </div>
              <div className="timestamp">{new Date(tx.timestamp?.seconds * 1000).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAssets = () => (
    <div className="assets-tab">
      <div className="assets-header">
        <h2>My Assets</h2>
        <div className="balance-overview">
          <div className="total-balance-card">
            <div className="balance-header">
              <span className="balance-label">Total Assets</span>
              <button className="eye-btn">👁</button>
            </div>
            <div className="balance-amount">${(balance + totalPortfolioValue).toLocaleString()}</div>
            <div className="balance-breakdown">
              <div className="balance-item">
                <span className="balance-type">Available</span>
                <span className="balance-value">${balance.toLocaleString()}</span>
              </div>
              <div className="balance-item">
                <span className="balance-type">In Orders</span>
                <span className="balance-value">${totalPortfolioValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="asset-actions">
        <button className="action-btn deposit-btn" onClick={() => setShowDeposit(true)}>
          <span className="btn-icon">💳</span>
          Deposit
        </button>
        <button className="action-btn withdraw-btn" onClick={() => setShowWithdraw(true)}>
          <span className="btn-icon">💸</span>
          Withdraw
        </button>
        <button className="action-btn transfer-btn">
          <span className="btn-icon">🔄</span>
          Transfer
        </button>
        <button className="action-btn buy-btn">
          <span className="btn-icon">💰</span>
          Buy
        </button>
      </div>

      <div className="asset-tabs">
        <button className="asset-tab-btn active">Spot</button>
        <button className="asset-tab-btn">Futures</button>
        <button className="asset-tab-btn">Funding</button>
      </div>

      <div className="portfolio-section">
        <h3>Portfolio</h3>
        {portfolio.length > 0 ? (
          <div className="portfolio-list">
            {portfolio.map(asset => {
              const currentPrice = cryptoData.find(c => c.id === asset.cryptoId)?.price || asset.purchasePrice;
              const currentValue = asset.amount * currentPrice;
              const profit = currentValue - (asset.amount * asset.purchasePrice);
              return (
                <div key={asset.id} className="portfolio-item">
                  <img src={`https://cryptoicons.org/api/icon/${asset.cryptoId}/32`} alt={asset.cryptoName} className="crypto-icon" />
                  <div className="portfolio-details">
                    <div className="crypto-name">{asset.cryptoName}</div>
                    <div className="crypto-amount">{asset.amount.toFixed(6)}</div>
                  </div>
                  <div className="portfolio-value">
                    <div className="value">${currentValue.toLocaleString()}</div>
                    <div className={`change ${profit >= 0 ? 'positive' : 'negative'}`}>
                      {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-portfolio">
            <p>No assets in your portfolio yet</p>
          </div>
        )}
      </div>

      <div className="recent-transactions">
        <h3>Recent Transactions</h3>
        <div className="transactions-list">
          {transactions.slice(0, 5).map(tx => (
            <div key={tx.id} className="transaction-item">
              <span className={`type-badge ${tx.type}`}>{tx.type}</span>
              <div className="transaction-details">
                <div className="crypto-name">{tx.cryptoName}</div>
                <div className="amount">{tx.amount.toFixed(6)}</div>
              </div>
              <div className="timestamp">{new Date(tx.timestamp?.seconds * 1000).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMarkets = () => (
    <div className="markets-tab">
      <div className="markets-header">
        <h2>Markets</h2>
        <div className="market-stats">
          <div className="stat-item">
            <span className="stat-label">24h Vol</span>
            <span className="stat-value">$2.1B</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Market Cap</span>
            <span className="stat-value">$1.2T</span>
          </div>
        </div>
      </div>

      <div className="market-controls">
        <div className="market-tabs">
          <button className="market-tab-btn active">Spot</button>
          <button className="market-tab-btn">Futures</button>
          <button className="market-tab-btn">Options</button>
        </div>
        <div className="market-filters">
          <div className="filter-buttons">
            <button className="filter-btn active">All</button>
            <button className="filter-btn">Favorites</button>
            <button className="filter-btn">Innovation</button>
            <button className="filter-btn">DeFi</button>
          </div>
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search coins..." 
              className="market-search"
            />
          </div>
        </div>
      </div>

      <div className="crypto-list">
        {cryptoData.map((crypto, index) => (
          <div key={crypto.id} className="crypto-item">
            <span className="crypto-rank">{index + 1}</span>
            <img src={`https://cryptoicons.org/api/icon/${crypto.id}/32`} alt={crypto.name} className="crypto-icon" />
            <div className="crypto-details">
              <div className="crypto-name">{crypto.name}</div>
              <div className="crypto-symbol">{crypto.id.toUpperCase()}</div>
            </div>
            <div className="crypto-price-info">
              <div className="price">${crypto.price.toLocaleString()}</div>
              <div className={`change ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTrade = () => (
    <div className="trade-tab">
      <div className="trade-header">
        <h2>Trade</h2>
        <p>Select a cryptocurrency to start trading</p>
      </div>
      
      <div className="featured-cryptos">
        <h3>Featured Pairs</h3>
        <div className="crypto-grid">
          {cryptoData.slice(0, 4).map(crypto => (
            <div key={crypto.id} className="crypto-item">
              <img src={`https://cryptoicons.org/api/icon/${crypto.id}/32`} alt={crypto.name} className="crypto-icon" />
              <div className="crypto-details">
                <div className="crypto-name">{crypto.name}</div>
                <div className="price">${crypto.price.toLocaleString()}</div>
                <div className={`change ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                  {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                </div>
              </div>
              <button 
                className="trade-btn"
                onClick={() => {
                  setSelectedCrypto(crypto);
                  setShowTrade(true);
                }}
              >
                Trade
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMenu = () => (
    <div className="menu-tab">
      <div className="menu-header">
        <div className="user-profile">
          <div className="profile-avatar">
            {(userName || user.email?.charAt(0) || 'U').toUpperCase()}
          </div>
          <div className="profile-info">
            <h3>{userName || user.email?.split('@')[0]}</h3>
            <p>Verified User</p>
          </div>
        </div>
      </div>

      <div className="menu-sections">
        <div className="menu-section">
          <h4>Account</h4>
          <div className="menu-items">
            <div className="menu-item" onClick={() => setShowProfileSettings(true)}>
              <span className="menu-icon">👤</span>
              <span>Profile Settings</span>
              <span className="arrow">›</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">🔒</span>
              <span>Security</span>
              <span className="arrow">›</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">📊</span>
              <span>Trading History</span>
              <span className="arrow">›</span>
            </div>
          </div>
        </div>

        <div className="menu-section">
          <h4>Support</h4>
          <div className="menu-items">
            <div className="menu-item">
              <span className="menu-icon">💬</span>
              <span>Customer Support</span>
              <span className="arrow">›</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">❓</span>
              <span>Help Center</span>
              <span className="arrow">›</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">📞</span>
              <span>Contact Us</span>
              <span className="arrow">›</span>
            </div>
          </div>
        </div>

        <div className="menu-section">
          <h4>Settings</h4>
          <div className="menu-items">
            <div className="menu-item">
              <span className="menu-icon">🌙</span>
              <span>Dark Mode</span>
              <div className="toggle active"></div>
            </div>
            <div className="menu-item">
              <span className="menu-icon">🔔</span>
              <span>Notifications</span>
              <div className="toggle"></div>
            </div>
            <div className="menu-item">
              <span className="menu-icon">🌍</span>
              <span>Language</span>
              <span className="arrow">›</span>
            </div>
          </div>
        </div>

        <div className="menu-section">
          <div className="menu-items">
            <div className="menu-item logout" onClick={() => signOut(auth)}>
              <span className="menu-icon">🚪</span>
              <span>Logout</span>
              <span className="arrow">›</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="App bybit-style">
      <header className="app-header">
        <div className="header-content">
          <h1>Eloncrypto</h1>
          <div className="balance-display">
            ${balance.toLocaleString()}
          </div>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'assets' && renderAssets()}
        {activeTab === 'markets' && renderMarkets()}
        {activeTab === 'trade' && renderTrade()}
        {activeTab === 'menu' && renderMenu()}
      </main>

      <nav className="bottom-navigation">
        <div 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          <span className="nav-icon">💰</span>
          <span className="nav-label">Assets</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'markets' ? 'active' : ''}`}
          onClick={() => setActiveTab('markets')}
        >
          <span className="nav-icon">📈</span>
          <span className="nav-label">Markets</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'trade' ? 'active' : ''}`}
          onClick={() => setActiveTab('trade')}
        >
          <span className="nav-icon">⚡</span>
          <span className="nav-label">Trade</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          <span className="nav-icon">☰</span>
          <span className="nav-label">Menu</span>
        </div>
      </nav>

      {showTrade && selectedCrypto && (
        <div className="modal">
          <div className="modal-content">
            <h3>Trade {selectedCrypto.name}</h3>
            <p>Current Price: ${selectedCrypto.price.toLocaleString()}</p>
            <input
              type="number"
              placeholder="Amount to trade"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
              step="0.000001"
            />
            {tradeAmount && (
              <p>Total: ${(parseFloat(tradeAmount) * selectedCrypto.price).toFixed(2)}</p>
            )}
            {error && <div className="error">{error}</div>}
            <div className="trade-buttons">
              <button 
                className="buy-btn"
                onClick={() => handleTrade('buy')}
              >
                Buy
              </button>
              <button 
                className="sell-btn"
                onClick={() => handleTrade('sell')}
              >
                Sell
              </button>
            </div>
            <button onClick={() => {
              setShowTrade(false);
              setSelectedCrypto(null);
              setTradeAmount('');
              setError('');
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showDeposit && (
        <div className="modal">
          <div className="modal-content">
            <h3>Deposit Funds</h3>
            <div className="deposit-methods">
              <div className="deposit-method">
                <h4>Bitcoin Deposit</h4>
                <div className="payment-info">
                  <p>Send Bitcoin to this address:</p>
                  <div className="address-container">
                    <span className="address">{bitcoinAddress}</span>
                    <button onClick={() => copyToClipboard(bitcoinAddress)}>Copy</button>
                  </div>
                  <p className="instruction">⚠️ Only send Bitcoin to this address.</p>
                </div>
              </div>

              <div className="deposit-method">
                <h4>Bank Transfer</h4>
                <div className="payment-info">
                  <div className="bank-details">
                    <p><strong>Account Name:</strong> {bankDetails.accountName}</p>
                    <p><strong>Account Number:</strong> {bankDetails.accountNumber}</p>
                    <p><strong>Bank Name:</strong> {bankDetails.bankName}</p>
                    <p><strong>Routing Number:</strong> {bankDetails.routingNumber}</p>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => setShowDeposit(false)}>Close</button>
          </div>
        </div>
      )}

      {showWithdraw && (
        <div className="modal">
          <div className="modal-content">
            <h3>Withdraw Funds</h3>
            <p>Available Balance: ${balance.toLocaleString()}</p>
            <p>Contact support to process withdrawals to your registered bank account.</p>
            <button onClick={() => setShowWithdraw(false)}>Close</button>
          </div>
        </div>
      )}

      {showProfileSettings && (
        <div className="modal-overlay">
          <div className="modal profile-modal">
            <div className="modal-header">
              <h3>Profile Settings</h3>
              <button className="close-btn" onClick={() => setShowProfileSettings(false)}>×</button>
            </div>
            
            <div className="profile-modal-content">
              <div className="profile-picture-section">
                <div className="profile-picture-preview">
                  <div className="default-avatar">
                    {(userName || user.email?.charAt(0) || 'U').toUpperCase()}
                  </div>
                </div>
                <label className="upload-btn">
                  Choose Photo
                  <input type="file" className="file-input" accept="image/*" />
                </label>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                />
                <small>Email cannot be changed</small>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="form-actions">
                <button className="save-btn">Save Changes</button>
                <button className="cancel-btn" onClick={() => setShowProfileSettings(false)}>Cancel</button>
              </div>

              <div className="password-section">
                <h4>Security Settings</h4>
                <button className="change-password-btn">Change Password</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="whatsapp-support">
        <a 
          href="https://wa.me/1234567890?text=Hello, I need support with my Eloncrypto account" 
          target="_blank" 
          rel="noopener noreferrer"
          className="whatsapp-btn"
        >
          <span className="whatsapp-icon">💬</span>
        </a>
      </div>
    </div>
  );
}

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const token = searchParams.get('token');
    const resetData = JSON.parse(localStorage.getItem('passwordReset') || '{}');

    if (!token || token !== resetData.token || Date.now() > resetData.expires) {
      setError('Invalid or expired reset token');
      return;
    }

    try {
      setSuccess(true);
      localStorage.removeItem('passwordReset');
    } catch (error) {
      setError('Failed to reset password');
    }
  };

  if (success) {
    return (
      <div className="bybit-login-page">
        <div className="animated-background">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
          <div className="floating-shape shape-4"></div>
          <div className="floating-shape shape-5"></div>
          <div className="floating-shape shape-6"></div>
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <div className="logo-container">
                <div className="crypto-logo">
                  <span className="logo-icon">₿</span>
                </div>
                <h1>Eloncrypto</h1>
                <p className="tagline">Advanced Crypto Trading Platform</p>
              </div>
            </div>

            <div className="auth-form-container">
              <div className="reset-success">
                <div className="success-icon">✅</div>
                <h2>Password Changed Successfully!</h2>
                <p>Your password has been updated successfully.</p>
                <p className="form-subtitle">You can now login with your new password.</p>
                <div className="form-actions">
                  <button 
                    className="submit-btn floating-reset-btn"
                    onClick={() => navigate('/')}
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bybit-login-page">
      <div className="animated-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
        <div className="floating-shape shape-5"></div>
        <div className="floating-shape shape-6"></div>
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <div className="crypto-logo">
                <span className="logo-icon">₿</span>
              </div>
              <h1>Eloncrypto</h1>
              <p className="tagline">Reset Your Password</p>
            </div>
          </div>

          <div className="auth-form-container">
            <div className="auth-form modern">
              <h2>Create New Password</h2>
              <p className="form-subtitle">Enter your new password below</p>
              <form onSubmit={handleResetPassword} className="modern-form">
                <div className="form-fields">
                  <div className="input-group">
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="modern-input"
                    />
                  </div>
                  <div className="input-group">
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="modern-input"
                    />
                  </div>
                </div>
                {error && <div className="error-message">{error}</div>}
                <button type="submit" className="submit-btn floating-reset-btn">
                  Reset Password
                </button>
                <div className="form-footer">
                  <button type="button" className="back-btn" onClick={() => navigate('/')}>
                    ← Back to Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;