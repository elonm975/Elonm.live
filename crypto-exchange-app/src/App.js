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

      const responseData = await response.json();
      console.log('Server response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to send reset email');
      }

      setResetEmailSent(true);
      setError('');
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to send reset email. Please try again.');
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

  return (
    <div className="App">
      <header className="app-nav">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1>⚡ Eloncrypto Exchange</h1>
          <div className="nav-info">
            <span>💰 ${balance.toLocaleString()}</span>
            <span>👤 {user.email}</span>
            <button onClick={() => signOut(auth)}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="dashboard">
          <div className="portfolio-section">
            <h2>📊 Your Portfolio</h2>
            <div className="portfolio-grid">
              {portfolio.length > 0 ? (
                portfolio.map(asset => {
                  const currentPrice = cryptoData.find(c => c.id === asset.cryptoId)?.price || asset.purchasePrice;
                  const currentValue = asset.amount * currentPrice;
                  const profit = currentValue - (asset.amount * asset.purchasePrice);
                  const profitPercentage = ((profit / (asset.amount * asset.purchasePrice)) * 100).toFixed(2);
                  return (
                    <div key={asset.id} className="portfolio-item">
                      <h3>{asset.cryptoName}</h3>
                      <p>Holdings: {asset.amount.toFixed(6)} coins</p>
                      <p>Current Value: ${currentValue.toLocaleString()}</p>
                      <p className={profit >= 0 ? 'profit' : 'loss'}>
                        {profit >= 0 ? '+' : ''}${profit.toFixed(2)} ({profit >= 0 ? '+' : ''}{profitPercentage}%)
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="empty-portfolio">
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
                  <h3 style={{ color: 'white', marginBottom: '12px' }}>Start Your Crypto Journey</h3>
                  <p>Your portfolio is empty. Begin trading to build your cryptocurrency portfolio!</p>
                </div>
              )}
            </div>
          </div>

          <div className="crypto-section">
            <h2>🌍 Live Market</h2>
            <div className="crypto-grid">
              {cryptoData.map(crypto => (
                <div key={crypto.id} className="crypto-item">
                  <h3>
                    {crypto.name === 'Bitcoin' && '₿'} 
                    {crypto.name === 'Ethereum' && 'Ξ'} 
                    {crypto.name === 'Cardano' && '₳'} 
                    {crypto.name === 'Polkadot' && '●'} 
                    {crypto.name === 'Chainlink' && '🔗'} 
                    {crypto.name}
                  </h3>
                  <p className="price">${crypto.price.toLocaleString()}</p>
                  <p className={crypto.change >= 0 ? 'positive' : 'negative'}>
                    {crypto.change >= 0 ? '📈 +' : '📉 '}{Math.abs(crypto.change).toFixed(2)}% (24h)
                  </p>
                  <button 
                    className="trade-btn"
                    onClick={() => {
                      setSelectedCrypto(crypto);
                      setShowTrade(true);
                    }}
                  >
                    🚀 Trade Now
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="transactions-section">
            <h2>📋 Transaction History</h2>
            <div className="transactions-list">
              {transactions.length > 0 ? (
                transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="transaction-item">
                    <span className={`transaction-type ${tx.type}`}>
                      {tx.type === 'buy' ? '🟢 BUY' : '🔴 SELL'}
                    </span>
                    <span style={{ fontWeight: '600', color: 'white' }}>{tx.cryptoName}</span>
                    <span style={{ color: '#94a3b8' }}>{tx.amount.toFixed(6)}</span>
                    <span style={{ fontWeight: '700', color: 'white' }}>${tx.total.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <p>No transactions yet. Start trading to see your history!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button className="action-btn deposit" onClick={() => setShowDeposit(true)}>
            💳 Add Funds
          </button>
          <button className="action-btn withdraw" onClick={() => setShowWithdraw(true)}>
            💸 Withdraw
          </button>
        </div>
      </main>

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
      <div className="App">
        <div className="auth-form">
          <h2>✅ Password Reset Successful!</h2>
          <p>Your password has been updated successfully.</p>
          <button onClick={() => navigate('/')}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="auth-form">
        <h2>Reset Your Password</h2>
        <form onSubmit={handleResetPassword}>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <div className="error">{error}</div>}
          <button type="submit">Reset Password</button>
          <button type="button" onClick={() => navigate('/')}>
            Back to Login
          </button>
        </form>
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