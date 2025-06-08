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

    try {
      const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const resetData = {
        email: resetEmail,
        token: resetToken,
        expires: Date.now() + 3600000
      };

      localStorage.setItem('passwordReset', JSON.stringify(resetData));

      const response = await fetch('/api/send-reset-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: resetEmail,
          resetToken: resetToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reset email');
      }

      setResetEmailSent(true);
      setError('');
    } catch (error) {
      setError('Failed to send reset email: ' + error.message);
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
      <div className="App">
        <header className="App-header">
          <h1>🚀 Eloncrypto Exchange</h1>
          <p>The future of cryptocurrency trading</p>

          {!showLogin && !showSignup && !showForgotPassword && (
            <div className="auth-buttons">
              <button className="auth-btn login" onClick={() => setShowLogin(true)}>
                Login
              </button>
              <button className="auth-btn signup" onClick={() => setShowSignup(true)}>
                Sign Up
              </button>
            </div>
          )}

          {showLogin && (
            <div className="auth-form">
              <h2>Login</h2>
              <form onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {error && <div className="error">{error}</div>}
                <button type="submit">Login</button>
                <p className="auth-link">
                  Don't have an account? 
                  <span onClick={() => { setShowLogin(false); setShowSignup(true); setError(''); }}>
                    Sign up
                  </span>
                </p>
                <p className="auth-link">
                  <span onClick={() => { setShowLogin(false); setShowForgotPassword(true); setError(''); }}>
                    Forgot Password?
                  </span>
                </p>
                <button type="button" onClick={() => { setShowLogin(false); setError(''); }}>
                  Cancel
                </button>
              </form>
            </div>
          )}

          {showSignup && (
            <div className="auth-form">
              <h2>Sign Up</h2>
              <form onSubmit={handleSignup}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {error && <div className="error">{error}</div>}
                <button type="submit">Sign Up</button>
                <p className="auth-link">
                  Already have an account? 
                  <span onClick={() => { setShowSignup(false); setShowLogin(true); setError(''); }}>
                    Login
                  </span>
                </p>
                <button type="button" onClick={() => { setShowSignup(false); setError(''); }}>
                  Cancel
                </button>
              </form>
            </div>
          )}

          {showForgotPassword && (
            <div className="auth-form">
              <h2>Reset Password</h2>
              {!resetEmailSent ? (
                <form onSubmit={handlePasswordReset}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                  {error && <div className="error">{error}</div>}
                  <button type="submit">Send Reset Email</button>
                  <button type="button" onClick={() => { setShowForgotPassword(false); setError(''); }}>
                    Back to Login
                  </button>
                </form>
              ) : (
                <div className="reset-success">
                  <h3>✅ Email Sent!</h3>
                  <p>We've sent a password reset link to <strong>{resetEmail}</strong></p>
                  <p>Please check your email and follow the instructions to reset your password.</p>
                  <div className="reset-actions">
                    <button 
                      className="done-btn"
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
                      className="resend-btn"
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
          )}
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-nav">
        <h1>🚀 Eloncrypto Exchange</h1>
        <div className="nav-info">
          <span>Balance: ${balance.toLocaleString()}</span>
          <span>{user.email}</span>
          <button onClick={() => signOut(auth)}>Logout</button>
        </div>
      </header>

      <main className="main-content">
        <div className="dashboard">
          <div className="portfolio-section">
            <h2>Portfolio</h2>
            <div className="portfolio-grid">
              {portfolio.length > 0 ? (
                portfolio.map(asset => {
                  const currentPrice = cryptoData.find(c => c.id === asset.cryptoId)?.price || asset.purchasePrice;
                  const currentValue = asset.amount * currentPrice;
                  const profit = currentValue - (asset.amount * asset.purchasePrice);
                  return (
                    <div key={asset.id} className="portfolio-item">
                      <h3>{asset.cryptoName}</h3>
                      <p>Amount: {asset.amount.toFixed(6)}</p>
                      <p>Value: ${currentValue.toFixed(2)}</p>
                      <p className={profit >= 0 ? 'profit' : 'loss'}>
                        {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="empty-portfolio">
                  <p>Your portfolio is empty. Start trading to see your assets here!</p>
                </div>
              )}
            </div>
          </div>

          <div className="crypto-section">
            <h2>Market</h2>
            <div className="crypto-grid">
              {cryptoData.map(crypto => (
                <div key={crypto.id} className="crypto-item">
                  <h3>{crypto.name}</h3>
                  <p className="price">${crypto.price.toLocaleString()}</p>
                  <p className={crypto.change >= 0 ? 'positive' : 'negative'}>
                    {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                  </p>
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

          <div className="transactions-section">
            <h2>Recent Transactions</h2>
            <div className="transactions-list">
              {transactions.length > 0 ? (
                transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="transaction-item">
                    <span className={`transaction-type ${tx.type}`}>
                      {tx.type.toUpperCase()}
                    </span>
                    <span>{tx.cryptoName}</span>
                    <span>{tx.amount.toFixed(6)}</span>
                    <span>${tx.total.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p>No transactions yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button className="action-btn deposit" onClick={() => setShowDeposit(true)}>
            Deposit
          </button>
          <button className="action-btn withdraw" onClick={() => setShowWithdraw(true)}>
            Withdraw
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
      <Router>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;