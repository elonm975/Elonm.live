import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword } from 'firebase/auth';
import axios from 'axios';
import './App.css';

function MainApp() {
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
  const [userBalance, setUserBalance] = useState(1000);
  const [userPortfolio, setUserPortfolio] = useState({});
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('markets');
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [showCoinChart, setShowCoinChart] = useState(false);

  // Profile settings state
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    username: '',
    email: '',
    profilePicture: null
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationStep, setVerificationStep] = useState(''); // 'email' or 'password'
  const [pendingChanges, setPendingChanges] = useState({});

  // Password reset state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Admin settings
  const [bitcoinAddress, setBitcoinAddress] = useState("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh");
  const [bankDetails, setBankDetails] = useState({
    accountName: "Elon Crypto Exchange",
    accountNumber: "1234567890",
    bankName: "First National Bank",
    routingNumber: "021000021"
  });

  const RECEIVING_WALLET = bitcoinAddress;

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
      fetchProfileData();
      if (adminMode) {
        fetchAllUsers();
      }
      const priceInterval = setInterval(fetchLivePrices, 30000);
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

      const newBalance = userBalance - amount;
      const newPortfolio = { ...userPortfolio };
      if (newPortfolio[selectedCrypto.id]) {
        newPortfolio[selectedCrypto.id] += cryptoAmount;
      } else {
        newPortfolio[selectedCrypto.id] = cryptoAmount;
      }

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
      // Show user-friendly error message for authentication failures
      if (error.code === 'auth/user-not-found' || 
          error.code === 'auth/wrong-password' || 
          error.code === 'auth/invalid-credential' ||
          error.code === 'auth/invalid-email') {
        setError('Incorrect username or password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError('Login failed. Please try again.');
      }
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const updateUserBalance = async (userId, newBalance) => {
    try {
      const q = query(collection(db, 'userPortfolios'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = doc(db, 'userPortfolios', querySnapshot.docs[0].id);
        await updateDoc(docRef, { balance: newBalance });
        fetchAllUsers();
      }
    } catch (error) {
      console.error('Error updating user balance:', error);
    }
  };

  const fetchProfileData = async () => {
    try {
      const q = query(collection(db, 'users'), where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setProfileData({
          name: userData.name || '',
          username: userData.username || '',
          email: userData.email || user.email,
          profilePicture: userData.profilePicture || null
        });
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  };

  const sendVerificationEmail = async (type, newData) => {
    try {
      // Generate a 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store verification code in Firestore
      await addDoc(collection(db, 'verificationCodes'), {
        userId: user.uid,
        code: code,
        type: type,
        newData: newData,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      // In a real app, you would send this via email service
      // For demo purposes, we'll show the code in console
      console.log(`Verification code for ${type}: ${code}`);
      alert(`Verification code sent! For demo purposes, your code is: ${code}`);

      setVerificationStep(type);
      setPendingChanges(newData);
      setShowVerificationModal(true);
    } catch (error) {
      setError('Failed to send verification email: ' + error.message);
    }
  };

  const verifyCodeAndUpdate = async () => {
    try {
      const q = query(
        collection(db, 'verificationCodes'),
        where('userId', '==', user.uid),
        where('code', '==', verificationCode),
        where('type', '==', verificationStep)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Invalid verification code');
        return;
      }

      const codeDoc = querySnapshot.docs[0];
      const codeData = codeDoc.data();

      if (new Date() > codeData.expiresAt.toDate()) {
        setError('Verification code has expired');
        return;
      }

      // Update the user data
      if (verificationStep === 'email') {
        // Update email in Firebase Auth and Firestore
        const userDocQuery = query(collection(db, 'users'), where('uid', '==', user.uid));
        const userQuerySnapshot = await getDocs(userDocQuery);
        if (!userQuerySnapshot.empty) {
          const userDocRef = doc(db, 'users', userQuerySnapshot.docs[0].id);
          await updateDoc(userDocRef, pendingChanges);
        }
      } else if (verificationStep === 'password') {
        // In a real app, you would update the password in Firebase Auth
        console.log('Password would be updated here');
      }

      // Delete used verification code
      await updateDoc(doc(db, 'verificationCodes', codeDoc.id), {
        used: true
      });

      setShowVerificationModal(false);
      setVerificationCode('');
      setVerificationStep('');
      setPendingChanges({});
      fetchProfileData();
      alert('Profile updated successfully!');
    } catch (error) {
      setError('Verification failed: ' + error.message);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const userDocQuery = query(collection(db, 'users'), where('uid', '==', user.uid));
      const userQuerySnapshot = await getDocs(userDocQuery);

      if (!userQuerySnapshot.empty) {
        const userDocRef = doc(db, 'users', userQuerySnapshot.docs[0].id);

        // Check if email is being changed
        if (profileData.email !== user.email) {
          await sendVerificationEmail('email', {
            name: profileData.name,
            username: profileData.username,
            email: profileData.email,
            profilePicture: profileData.profilePicture
          });
          return;
        }

        // Update profile without email verification
        await updateDoc(userDocRef, {
          name: profileData.name,
          username: profileData.username,
          profilePicture: profileData.profilePicture,
          updatedAt: new Date()
        });

        alert('Profile updated successfully!');
        setShowProfileSettings(false);
      }
    } catch (error) {
      setError('Failed to update profile: ' + error.message);
    }
  };

  const handlePasswordChange = async (e) => {
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

    await sendVerificationEmail('password', { newPassword });
  };

  const handleProfilePictureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData({ ...profileData, profilePicture: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Generate a reset token (in a real app, this would be more secure)
      const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Store the reset token with expiration (1 hour)
      const resetData = {
        email: resetEmail,
        token: resetToken,
        expires: Date.now() + 3600000 // 1 hour
      };

      // Store this securely
      localStorage.setItem('passwordReset', JSON.stringify(resetData));

      // Send email via backend service
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(''); // Clear error when user starts typing
                      }}
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
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(''); // Clear error when user starts typing
                      }}
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
                    <>
                      <p>
                        New to Elon Crypto?{' '}
                        <button type="button" onClick={() => setIsSignUp(true)} className="link-btn">
                          Create Account
                        </button>
                      </p>
                      <p className="forgot-password">
                        <button 
                          type="button" 
                          onClick={() => setShowPasswordReset(true)} 
                          className="link-btn forgot-link"
                        >
                          Trouble logging in?
                        </button>
                      </p>
                    </>
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

        {/* Password Reset Modal */}
        {showPasswordReset && (
          <div className="modal-overlay">
            <div className="modal password-reset-modal">
              <div className="modal-header">
                <h3>Reset Your Password</h3>
                <button 
                  className="close-btn"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setResetEmail('');
                    setResetEmailSent(false);
                    setError('');
                  }}
                >
                  ×
                </button>
              </div>

              {!resetEmailSent ? (
                <form onSubmit={handlePasswordReset} className="reset-form">
                  <p className="reset-description">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="elon@example.com"
                      required
                      className="reset-email-input"
                    />
                  </div>

                  <div className="modal-actions">
                    <button type="submit" className="reset-btn">
                      Send Reset Link
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowPasswordReset(false);
                        setResetEmail('');
                        setError('');
                      }}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>

                  {error && <div className="error-message">{error}</div>}
                </form>
              ) : (
                <div className="reset-success">
                  <div className="success-icon">✓</div>
                  <h4>Reset Link Sent!</h4>
                  <p>
                    We've sent a password reset link to <strong>{resetEmail}</strong>.
                    Check your email and follow the instructions to reset your password.
                  </p>
                  <p className="reset-note">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                  <div className="modal-actions">
                    <button 
                      onClick={() => {
                        setShowPasswordReset(false);
                        setResetEmail('');
                        setResetEmailSent(false);
                      }}
                      className="done-btn"
                    >
                      Done
                    </button>
                    <button 
                      onClick={() => {
                        setResetEmailSent(false);
                        setError('');
                      }}
                      className="resend-btn"
                    >
                      Send Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const renderMarketsTab = () => (
    <div className="markets-tab">
      <div className="markets-header">
        <h2>Markets</h2>
        <div className="market-controls">
          <div className="market-tabs">
            <button className="market-tab-btn active">Spot</button>
            <button className="market-tab-btn">Futures</button>
            <button className="market-tab-btn">Options</button>
          </div>
          <div className="market-stats">
            <div className="stat-item">
              <span className="stat-label">24h Vol</span>
              <span className="stat-value">$2.8T</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Coins</span>
              <span className="stat-value">{livePrices.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="market-filters">
        <div className="filter-buttons">
          <button className="filter-btn active">All</button>
          <button className="filter-btn">Gainers</button>
          <button className="filter-btn">Losers</button>
          <button className="filter-btn">24h Vol</button>
        </div>
        <div className="search-container">
          <input type="text" placeholder="Search coins..." className="market-search" />
        </div>
      </div>

      {showCoinChart && selectedCoin ? (
        <div className="coin-chart-view">
          <div className="chart-header">
            <button className="back-btn" onClick={() => setShowCoinChart(false)}>
              ← Back
            </button>
            <div className="coin-info">
              <img src={selectedCoin.image} alt={selectedCoin.name} className="coin-image" />
              <div>
                <h3>{selectedCoin.name}</h3>
                <span className="coin-symbol">{selectedCoin.symbol.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="price-section">
            <div className="current-price">
              <span className="price">${selectedCoin.current_price.toLocaleString()}</span>
              <span className={`change ${selectedCoin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                {selectedCoin.price_change_percentage_24h >= 0 ? '+' : ''}
                {selectedCoin.price_change_percentage_24h?.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="chart-placeholder">
            <div className="chart-container">
              <p>Chart visualization would be here</p>
              <p>Price: ${selectedCoin.current_price.toLocaleString()}</p>
              <p>24h High: ${selectedCoin.high_24h?.toLocaleString()}</p>
              <p>24h Low: ${selectedCoin.low_24h?.toLocaleString()}</p>
              <p>Market Cap: ${(selectedCoin.market_cap / 1000000000).toFixed(1)}B</p>
            </div>
          </div>

          <div className="trade-actions">
            <button 
              className="buy-btn"
              onClick={() => {
                setSelectedCrypto(selectedCoin);
                setShowInvestModal(true);
              }}
            >
              Buy {selectedCoin.symbol.toUpperCase()}
            </button>
            <button className="sell-btn">Sell {selectedCoin.symbol.toUpperCase()}</button>
          </div>
        </div>
      ) : (
        <div className="crypto-list">
          {livePrices.slice(0, 50).map((crypto, index) => (
            <div 
              key={crypto.id} 
              className="crypto-item"
              onClick={() => {
                setSelectedCoin(crypto);
                setShowCoinChart(true);
              }}
            >
              <div className="crypto-rank">{index + 1}</div>
              <img src={crypto.image} alt={crypto.name} className="crypto-icon" />
              <div className="crypto-details">
                <div className="crypto-name">{crypto.name}</div>
                <div className="crypto-symbol">{crypto.symbol.toUpperCase()}</div>
              </div>
              <div className="crypto-price-info">
                <div className="price">${crypto.current_price.toLocaleString()}</div>
                <div className={`change ${crypto.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                  {crypto.price_change_percentage_24h >= 0 ? '+' : ''}
                  {crypto.price_change_percentage_24h?.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAssetsTab = () => (
    <div className="assets-tab">
      <div className="assets-header">
        <div className="balance-overview">
          <div className="total-balance-card">
            <div className="balance-header">
              <span className="balance-label">Total Balance (USD)</span>
              <button className="eye-btn">👁</button>
            </div>
            <span className="balance-amount">${(userBalance + getPortfolioValue()).toFixed(2)}</span>
            <div className="balance-change">
              <span className="change-amount">+$0.00</span>
              <span className="change-percent">(+0.00%)</span>
            </div>
          </div>

          <div className="quick-stats">
            <div className="stat-card">
              <span className="stat-label">Available</span>
              <span className="stat-value">${userBalance.toFixed(2)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">In Orders</span>
              <span className="stat-value">$0.00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="balance-breakdown">
        <div className="balance-item">
          <span className="balance-type">Available Balance</span>
          <span className="balance-value">${userBalance.toFixed(2)}</span>
        </div>
        <div className="balance-item">
          <span className="balance-type">Portfolio Value</span>
          <span className="balance-value">${getPortfolioValue().toFixed(2)}</span>
        </div>
      </div>

      <div className="asset-actions">
        <button 
          className="action-btn deposit-btn"
          onClick={() => setShowDepositModal(true)}
        >
          <span className="btn-icon">💰</span>
          <span>Deposit</span>
        </button>
        <button 
          className="action-btn withdraw-btn"
          onClick={() => setShowWithdrawModal(true)}
        >
          <span className="btn-icon">📤</span>
          <span>Withdraw</span>
        </button>
        <button className="action-btn transfer-btn">
          <span className="btn-icon">🔄</span>
          <span>Transfer</span>
        </button>
        <button className="action-btn buy-btn">
          <span className="btn-icon">🛒</span>
          <span>Buy Crypto</span>
        </button>
      </div>

      <div className="asset-tabs">
        <button className="asset-tab-btn active">Spot</button>
        <button className="asset-tab-btn">Funding</button>
        <button className="asset-tab-btn">Trading Bot</button>
        <button className="asset-tab-btn">Copy Trading</button>
      </div>

      <div className="portfolio-section">
        <h3>My Portfolio</h3>
        <div className="portfolio-list">
          {Object.keys(userPortfolio).length === 0 ? (
            <div className="empty-portfolio">
              <p>No assets yet. Start investing!</p>
            </div>
          ) : (
            Object.keys(userPortfolio).map(cryptoId => {
              const crypto = livePrices.find(c => c.id === cryptoId);
              if (!crypto) return null;
              const value = userPortfolio[cryptoId] * crypto.current_price;
              return (
                <div key={cryptoId} className="portfolio-item">
                  <img src={crypto.image} alt={crypto.name} className="crypto-icon" />
                  <div className="portfolio-details">
                    <div className="crypto-name">{crypto.name}</div>
                    <div className="crypto-amount">{userPortfolio[cryptoId].toFixed(6)} {crypto.symbol.toUpperCase()}</div>
                  </div>
                  <div className="portfolio-value">
                    <div className="value">${value.toFixed(2)}</div>
                    <div className={`change ${crypto.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                      {crypto.price_change_percentage_24h >= 0 ? '+' : ''}
                      {crypto.price_change_percentage_24h?.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="recent-transactions">
        <h3>Recent Transactions</h3>
        <div className="transactions-list">
          {cryptoData.length === 0 ? (
            <p>No transactions yet</p>
          ) : (
            cryptoData.slice(0, 10).map(transaction => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-type">
                  <span className={`type-badge ${transaction.type}`}>
                    {transaction.type.toUpperCase()}
                  </span>
                </div>
                <div className="transaction-details">
                  <span className="crypto-name">{transaction.cryptocurrency || 'Cash'}</span>
                  <span className="amount">${transaction.amount}</span>
                </div>
                <span className="timestamp">
                  {transaction.timestamp?.toDate?.()?.toLocaleDateString() || 'Just now'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderMenuTab = () => (
    <div className="menu-tab">
      <div className="menu-header">
        <div className="user-profile">
          <div className="profile-avatar">
            <span>{user.email.charAt(0).toUpperCase()}</span>
          </div>
          <div className="profile-info">
            <h3>{user.email}</h3>
            <p>Verified Account</p>
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
              <span className="arrow">→</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">🔒</span>
              <span>Security</span>
              <span className="arrow">→</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">🔔</span>
              <span>Notifications</span>
              <span className="arrow">→</span>
            </div>
          </div>
        </div>

        <div className="menu-section">
          <h4>Trading</h4>
          <div className="menu-items">
            <div className="menu-item">
              <span className="menu-icon">📊</span>
              <span>Trading History</span>
              <span className="arrow">→</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">⚙️</span>
              <span>Trading Preferences</span>
              <span className="arrow">→</span>
            </div>
          </div>
        </div>

        <div className="menu-section">
          <h4>Support</h4>
          <div className="menu-items">
            <div className="menu-item">
              <span className="menu-icon">❓</span>
              <span>Help Center</span>
              <span className="arrow">→</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">💬</span>
              <span>Contact Support</span>
              <span className="arrow">→</span>
            </div>
          </div>
        </div>

        {user && user.email === 'admin@example.com' && (
          <div className="menu-section">
            <h4>Admin</h4>
            <div className="menu-items">
              <div className="menu-item" onClick={() => setAdminMode(!adminMode)}>
                <span className="menu-icon">🛠️</span>
                <span>Admin Panel</span>
                <span className={`toggle ${adminMode ? 'active' : ''}`}></span>
              </div>
            </div>
          </div>
        )}

        <div className="menu-section">
          <div className="menu-items">
            <div className="menu-item logout" onClick={handleSignOut}>
              <span className="menu-icon">🚪</span>
              <span>Sign Out</span>
            </div>
          </div>
        </div>
      </div>

      {adminMode && (
        <div className="admin-panel">
          <h3>Admin Settings</h3>

          <div className="admin-section">
            <h4>Payment Settings</h4>
            <div className="settings-form">
              <input
                type="text"
                placeholder="Bitcoin Address"
                value={bitcoinAddress}
                onChange={(e) => setBitcoinAddress(e.target.value)}
              />
              <input
                type="text"
                placeholder="Bank Account Name"
                value={bankDetails.accountName}
                onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
              />
              <input
                type="text"
                placeholder="Account Number"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
              />
              <input
                type="text"
                placeholder="Bank Name"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
              />
              <button>Save Settings</button>
            </div>
          </div>

          <div className="admin-section">
            <h4>User Management</h4>
            <div className="users-list">
              {allUsers.map(user => (
                <div key={user.id} className="user-item">
                  <span>{user.name} ({user.email})</span>
                  <input
                    type="number"
                    placeholder="New Balance"
                    onBlur={(e) => {
                      if (e.target.value) {
                        updateUserBalance(user.uid, parseFloat(e.target.value));
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="App bybit-style">
      <header className="app-header">
        <div className="header-content">
          <h1>Elon Crypto</h1>
          <div className="header-actions">
            <span className="balance-display">${userBalance.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'markets' && renderMarketsTab()}
        {activeTab === 'assets' && renderAssetsTab()}
        {activeTab === 'menu' && renderMenuTab()}
      </main>

      <nav className="bottom-navigation">
        <div 
          className={`nav-item ${activeTab === 'markets' ? 'active' : ''}`}
          onClick={() => setActiveTab('markets')}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Markets</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          <span className="nav-icon">💼</span>
          <span className="nav-label">Assets</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          <span className="nav-icon">☰</span>
          <span className="nav-label">Menu</span>
        </div>
      </nav>

      {/* Investment Modal */}
      {showInvestModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Buy {selectedCrypto?.name}</h3>
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
                Buy Now
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

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="modal-overlay">
          <div className="modal deposit-modal">
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
                  <p className="instruction">⚠️ Only send Bitcoin to this address. Sending other cryptocurrencies may result in permanent loss.</p>
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
                  <p className="instruction">💡 Please include your user ID in the transfer memo for faster processing.</p>
                </div>
              </div>
            </div>

            <div className="deposit-amount-section">
              <input
                type="number"
                placeholder="Expected deposit amount ($)"
                min="1"
              />
              <p className="deposit-note">Enter the amount you're planning to deposit for tracking purposes.</p>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowDepositModal(false)} className="cancel-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Support Button */}
      <div className="whatsapp-support">
        <a 
          href="https://wa.me/4915210305922" 
          target="_blank" 
          rel="noopener noreferrer"
          className="whatsapp-btn"
        >
          <span className="whatsapp-icon">💬</span>
        </a>
      </div>

      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <div className="modal-overlay">
          <div className="modal profile-modal">
            <div className="modal-header">
              <h3>Profile Settings</h3>
              <button 
                className="close-btn"
                onClick={() => setShowProfileSettings(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="profile-picture-section">
                <div className="profile-picture-preview">
                  {profileData.profilePicture ? (
                    <img src={profileData.profilePicture} alt="Profile" />
                  ) : (
                    <div className="default-avatar">
                      {profileData.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="file-input"
                  id="profile-picture"
                />
                <label htmlFor="profile-picture" className="upload-btn">
                  Change Picture
                </label>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  required
                />
                <small>Changing email requires verification</small>
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowProfileSettings(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>

            <div className="password-section">
              <h4>Change Password</h4>
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength="6"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength="6"
                    required
                  />
                </div>

                <button type="submit" className="change-password-btn">
                  Change Password
                </button>
              </form>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      )}

      {/* Email Verification Modal */}
      {showVerificationModal && (
        <div className="modal-overlay">
          <div className="modal verification-modal">
            <h3>Email Verification</h3>
            <p>
              We've sent a verification code to your email. 
              Please enter it below to confirm your {verificationStep} change.
            </p>

            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength="6"
                className="verification-input"
              />
            </div>

            <div className="modal-actions">
              <button 
                onClick={verifyCodeAndUpdate}
                className="verify-btn"
                disabled={verificationCode.length !== 6}
              >
                Verify & Update
              </button>
              <button 
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationCode('');
                  setVerificationStep('');
                  setPendingChanges({});
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="modal-overlay">
          <div className="modal password-reset-modal">
            <div className="modal-header">
              <h3>Reset Your Password</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowPasswordReset(false);
                  setResetEmail('');
                  setResetEmailSent(false);
                  setError('');
                }}
              >
                ×
              </button>
            </div>

            {!resetEmailSent ? (
              <form onSubmit={handlePasswordReset} className="reset-form">
                <p className="reset-description">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="elon@example.com"
                    required
                    className="reset-email-input"
                  />
                </div>

                <div className="modal-actions">
                  <button type="submit" className="reset-btn">
                    Send Reset Link
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowPasswordReset(false);
                      setResetEmail('');
                      setError('');
                    }}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>

                {error && <div className="error-message">{error}</div>}
              </form>
            ) : (
              <div className="reset-success">
                <div className="success-icon">✓</div>
                <h4>Reset Link Sent!</h4>
                <p>
                  We've sent a password reset link to <strong>{resetEmail}</strong>.
                  Check your email and follow the instructions to reset your password.
                </p>
                <p className="reset-note">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <div className="modal-actions">
                  <button 
                    onClick={() => {
                      setShowPasswordReset(false);
                      setResetEmail('');
                      setResetEmailSent(false);
                    }}
                    className="done-btn"
                  >
                    Done
                  </button>
                  <button 
                    onClick={() => {
                      setResetEmailSent(false);
                      setError('');
                    }}
                    className="resend-btn"
                  >
                    Send Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const resetToken = searchParams.get('token');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!resetToken) {
      setError('Invalid reset token.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      // Send the reset token and new password to your backend
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resetToken: resetToken,
          newPassword: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password.');
      }

      setSuccess(true);
      // Redirect to login page after a delay
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <h2>Reset Your Password</h2>
        {error && <div className="error-message">{error}</div>}
        {success ? (
          <div className="success-message">
            Password reset successfully! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="reset-password-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password:</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password:</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="reset-password-button">
              Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </Router>
  );
}

export default App;