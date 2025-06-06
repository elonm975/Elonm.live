import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cryptoData, setCryptoData] = useState([]);
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [livePrices, setLivePrices] = useState([]);
  const [userBalance, setUserBalance] = useState(1000); // Starting balance
  const [userPortfolio, setUserPortfolio] = useState({});
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  // Your receiving wallet address
  const RECEIVING_WALLET = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchCryptoData();
      fetchLivePrices();
      fetchUserData();
      if (adminMode) {
        fetchAllUsers();
      }
      const priceInterval = setInterval(fetchLivePrices, 30000); // Update every 30 seconds
      return () => clearInterval(priceInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, adminMode]);

  const fetchAllUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  const fetchLivePrices = async () => {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
      );
      setLivePrices(response.data);
    } catch (error) {
      console.error('Error fetching live prices:', error);
    }
  };

  const fetchCryptoData = async () => {
    try {
      const q = query(
        collection(db, 'cryptoTransactions'), 
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCryptoData(data);
    } catch (error) {
      console.error('Error fetching crypto data:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      const q = query(collection(db, 'userPortfolios'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setUserBalance(userData.balance || 1000);
        setUserPortfolio(userData.portfolio || {});
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const updateUserPortfolio = async (newBalance, newPortfolio) => {
    try {
      const q = query(collection(db, 'userPortfolios'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = doc(db, 'userPortfolios', querySnapshot.docs[0].id);
        await updateDoc(docRef, {
          balance: newBalance,
          portfolio: newPortfolio,
          lastUpdated: new Date()
        });
      } else {
        await addDoc(collection(db, 'userPortfolios'), {
          userId: user.uid,
          balance: newBalance,
          portfolio: newPortfolio,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating portfolio:', error);
    }
  };

  const handleInvestment = async () => {
    if (!selectedCrypto || !investmentAmount || parseFloat(investmentAmount) <= 0) {
      setError('Please enter a valid investment amount');
      return;
    }

    const amount = parseFloat(investmentAmount);
    if (amount > userBalance) {
      setError('Insufficient balance');
      return;
    }

    try {
      const cryptoPrice = selectedCrypto.current_price;
      const cryptoAmount = amount / cryptoPrice;

      // Update user balance
      const newBalance = userBalance - amount;

      // Update portfolio
      const newPortfolio = { ...userPortfolio };
      if (newPortfolio[selectedCrypto.id]) {
        newPortfolio[selectedCrypto.id] += cryptoAmount;
      } else {
        newPortfolio[selectedCrypto.id] = cryptoAmount;
      }

      // Record transaction
      await addDoc(collection(db, 'cryptoTransactions'), {
        userId: user.uid,
        type: 'investment',
        cryptocurrency: selectedCrypto.name,
        cryptoId: selectedCrypto.id,
        amount: amount,
        cryptoAmount: cryptoAmount,
        price: cryptoPrice,
        timestamp: new Date(),
        receivingWallet: RECEIVING_WALLET
      });

      await updateUserPortfolio(newBalance, newPortfolio);

      setUserBalance(newBalance);
      setUserPortfolio(newPortfolio);
      setShowInvestModal(false);
      setInvestmentAmount('');
      setError('');
      fetchCryptoData();
    } catch (error) {
      setError('Investment failed: ' + error.message);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (amount > userBalance) {
      setError('Insufficient balance');
      return;
    }

    try {
      const newBalance = userBalance - amount;

      await addDoc(collection(db, 'cryptoTransactions'), {
        userId: user.uid,
        type: 'withdrawal',
        amount: amount,
        timestamp: new Date(),
        status: 'pending'
      });

      await updateUserPortfolio(newBalance, userPortfolio);

      setUserBalance(newBalance);
      setShowWithdrawModal(false);
      setWithdrawalAmount('');
      setError('');
      fetchCryptoData();
    } catch (error) {
      setError('Withdrawal failed: ' + error.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);

      await addDoc(collection(db, 'users'), {
        uid: userCredential.user.uid,
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        createdAt: new Date()
      });

      // Initialize user portfolio
      await addDoc(collection(db, 'userPortfolios'), {
        userId: userCredential.user.uid,
        balance: 1000,
        portfolio: {},
        createdAt: new Date()
      });

      setEmail('');
      setPassword('');
      setUsername('');
      setName('');
      setIsSignUp(false);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      setError(error.message);
    }
  };

  const getPortfolioValue = () => {
    let totalValue = 0;
    Object.keys(userPortfolio).forEach(cryptoId => {
      const crypto = livePrices.find(c => c.id === cryptoId);
      if (crypto) {
        totalValue += userPortfolio[cryptoId] * crypto.current_price;
      }
    });
    return totalValue;
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
      <div className="App login-page">
        {/* Animated Background Elements */}
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
                  <div className="logo-icon">₿</div>
                </div>
                <h1>Elon Crypto</h1>
                <p className="tagline">Your gateway to digital assets</p>
              </div>
            </div>

            <div className="auth-form-container">
              <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="auth-form">
                <h2>{isSignUp ? 'Create Your Account' : 'Welcome Back'}</h2>
                <p className="form-subtitle">
                  {isSignUp ? 'Join millions of users worldwide' : 'Sign in to continue your journey'}
                </p>

                {error && <div className="error-message">{error}</div>}

                <div className="form-fields">
                  {isSignUp && (
                    <>
                      <div className="input-group">
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="form-input"
                        />
                        <span className="input-icon">👤</span>
                      </div>
                      <div className="input-group">
                        <input
                          type="text"
                          placeholder="Username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          className="form-input"
                        />
                        <span className="input-icon">@</span>
                      </div>
                    </>
                  )}

                  <div className="input-group">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="form-input"
                    />
                    <span className="input-icon">✉️</span>
                  </div>

                  <div className="input-group">
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="form-input"
                    />
                    <span className="input-icon">🔒</span>
                  </div>
                </div>

                <button type="submit" className="submit-btn">
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <div className="btn-glow"></div>
                </button>

                <div className="form-footer">
                  {isSignUp ? (
                    <p>
                      Already have an account?{' '}
                      <button type="button" onClick={() => setIsSignUp(false)} className="link-btn">
                        Sign In
                      </button>
                    </p>
                  ) : (
                    <p>
                      New to Elon Crypto?{' '}
                      <button type="button" onClick={() => setIsSignUp(true)} className="link-btn">
                        Create Account
                      </button>
                    </p>
                  )}
                </div>
              </form>
            </div>

            <div className="trust-indicators">
              <div className="indicator">
                <span className="indicator-icon">🔐</span>
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
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Elon Crypto Exchange</h1>
        <div className="user-info">
          <div className="balance-info">
            <span>Balance: ${userBalance.toFixed(2)}</span>
            <span>Portfolio Value: ${getPortfolioValue().toFixed(2)}</span>
          </div>
          <div className="user-actions">
            <span>Welcome, {user.email}!</span>
            <button onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>
        {/* Admin Mode Toggle */}
        {user && user.email === 'admin@example.com' && (
          <div className="admin-toggle">
            <label>
              Admin Mode:
              <input
                type="checkbox"
                checked={adminMode}
                onChange={() => setAdminMode(!adminMode)}
              />
            </label>
          </div>
        )}
      </header>

      <main className="main-content">
      {/* Display all users in admin mode */}
      {adminMode && (
          <section className="admin-section">
            <h2>All Users</h2>
            <div className="users-list">
              {allUsers.map(user => (
                <div key={user.id} className="user-item">
                  <span>{user.name} ({user.email})</span>
                  {/* Add functionality to edit user balance here */}
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="dashboard-actions">
          <button 
            className="action-btn withdraw-btn"
            onClick={() => setShowWithdrawModal(true)}
          >
            Withdraw Funds
          </button>
          <button 
            className="action-btn deposit-btn"
            onClick={() => {
              // Navigate to deposit page or show deposit modal
            }}
          >
            Deposit Funds
          </button>
        </section>

        <section className="live-prices-section">
          <h2>Live Crypto Prices</h2>
          <div className="crypto-grid">
            {livePrices.slice(0, 20).map(crypto => (
              <div key={crypto.id} className="crypto-card">
                <div className="crypto-info">
                  <img src={crypto.image} alt={crypto.name} className="crypto-icon" />
                  <div className="crypto-details">
                    <h3>{crypto.name}</h3>
                    <span className="crypto-symbol">{crypto.symbol.toUpperCase()}</span>
                  </div>
                </div>
                <div className="crypto-price">
                  <span className="price">${crypto.current_price.toLocaleString()}</span>
                  <span className={`change ${crypto.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                    {crypto.price_change_percentage_24h >= 0 ? '+' : ''}
                    {crypto.price_change_percentage_24h?.toFixed(2)}%
                  </span>
                </div>
                <button 
                  className="invest-btn"
                  onClick={() => {
                    setSelectedCrypto(crypto);
                    setShowInvestModal(true);
                  }}
                >
                  Invest
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="portfolio-section">
          <h2>My Portfolio</h2>
          <div className="portfolio-grid">
            {Object.keys(userPortfolio).map(cryptoId => {
              const crypto = livePrices.find(c => c.id === cryptoId);
              if (!crypto) return null;
              const value = userPortfolio[cryptoId] * crypto.current_price;
              return (
                <div key={cryptoId} className="portfolio-item">
                  <img src={crypto.image} alt={crypto.name} className="crypto-icon" />
                  <div className="portfolio-details">
                    <h4>{crypto.name}</h4>
                    <p>Amount: {userPortfolio[cryptoId].toFixed(6)}</p>
                    <p>Value: ${value.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="transactions-section">
          <h2>Recent Transactions</h2>
          <div className="transactions-list">
            {cryptoData.length === 0 ? (
              <p>No transactions yet. Start investing!</p>
            ) : (
              cryptoData.map(transaction => (
                <div key={transaction.id} className="transaction-item">
                  <span className={`transaction-type ${transaction.type}`}>
                    {transaction.type.toUpperCase()}
                  </span>
                  <span className="crypto-name">
                    {transaction.cryptocurrency || 'Cash'}
                  </span>
                  <span className="amount">${transaction.amount}</span>
                  <span className="timestamp">
                    {transaction.timestamp?.toDate?.()?.toLocaleString() || 'Just now'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Investment Modal */}
      {showInvestModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Invest in {selectedCrypto?.name}</h3>
            <p>Current Price: ${selectedCrypto?.current_price.toLocaleString()}</p>
            <input
              type="number"
              placeholder="Amount to invest ($)"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              min="1"
              max={userBalance}
            />
            <div className="modal-actions">
              <button onClick={handleInvestment} className="confirm-btn">
                Invest
              </button>
              <button onClick={() => setShowInvestModal(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
            {error && <div className="error">{error}</div>}
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Withdraw Funds</h3>
            <p>Available Balance: ${userBalance.toFixed(2)}</p>
            <input
              type="number"
              placeholder="Amount to withdraw ($)"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              min="1"
              max={userBalance}
            />
            <div className="modal-actions">
              <button onClick={handleWithdrawal} className="confirm-btn">
                Withdraw
              </button>
              <button onClick={() => setShowWithdrawModal(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
            {error && <div className="error">{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;