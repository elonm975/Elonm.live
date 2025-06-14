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
  const [balance, setBalance] = useState(0);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [fingerprintEnabled, setFingerprintEnabled] = useState(false);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);

  // Deposit/Withdraw info
  const bitcoinAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
  const bankDetails = {
    accountName: "Eloncrypto Exchange",
    accountNumber: "1234567890",
    bankName: "Crypto Bank",
    routingNumber: "021000021"
  };

  // Language data
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'uk', name: 'Українська', flag: '🇺🇦' }
  ];

  // Enhanced notification system
  const showNotification = (title, message, type = 'info') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico'
      });
    } else {
      // Fallback to alert for now, can be replaced with custom toast
      alert(`${title}: ${message}`);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  // Enhanced biometric authentication functions
  const enableFingerprint = async () => {
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        showNotification('Fingerprint Authentication', 'WebAuthn is not supported on this device. Please use a modern browser or device.', 'error');
        return;
      }

      // Check if platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        showNotification('Fingerprint Authentication', 'No biometric authenticator available on this device.', 'error');
        return;
      }

      // Generate random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: { 
            name: "Eloncrypto Exchange",
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(user.uid),
            name: user.email,
            displayName: userName || user.email
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: "direct"
        }
      });

      if (credential) {
        setFingerprintEnabled(true);
        localStorage.setItem('fingerprintEnabled', 'true');
        showNotification('Success', 'Fingerprint authentication enabled successfully!', 'success');
      }
    } catch (error) {
      console.error('Fingerprint setup failed:', error);
      let errorMessage = 'Failed to set up fingerprint authentication.';

      if (error.name === 'NotSupportedError') {
        errorMessage = 'Fingerprint authentication is not supported on this device.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error: Please ensure you are using HTTPS.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Permission denied. Please allow biometric access.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Authentication was cancelled.';
      }

      showNotification('Fingerprint Authentication Failed', errorMessage, 'error');
    }
  };

  const enableFaceId = async () => {
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        showNotification('Face ID Authentication', 'WebAuthn is not supported on this device. Please use a modern browser or device.', 'error');
        return;
      }

      // Check if platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        showNotification('Face ID Authentication', 'No biometric authenticator available on this device.', 'error');
        return;
      }

      // Generate random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: { 
            name: "Eloncrypto Exchange",
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(user.uid),
            name: user.email,
            displayName: userName || user.email
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: "direct"
        }
      });

      if (credential) {
        setFaceIdEnabled(true);
        localStorage.setItem('faceIdEnabled', 'true');
        showNotification('Success', 'Face ID authentication enabled successfully!', 'success');
      }
    } catch (error) {
      console.error('Face ID setup failed:', error);
      let errorMessage = 'Failed to set up Face ID authentication.';

      if (error.name === 'NotSupportedError') {
        errorMessage = 'Face ID authentication is not supported on this device.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error: Please ensure you are using HTTPS.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Permission denied. Please allow biometric access.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Authentication was cancelled.';
      }

      showNotification('Face ID Authentication Failed', errorMessage, 'error');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        await loadUserData(user.uid);

        // Load saved biometric settings
        const savedFingerprint = localStorage.getItem('fingerprintEnabled') === 'true';
        const savedFaceId = localStorage.getItem('faceIdEnabled') === 'true';
        setFingerprintEnabled(savedFingerprint);
        setFaceIdEnabled(savedFaceId);

        // Request notification permission
        requestNotificationPermission();
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
      const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h');
      const data = response.data.map(coin => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        price: coin.current_price,
        change: coin.price_change_percentage_24h || 0,
        market_cap: coin.market_cap,
        volume: coin.total_volume,
        rank: coin.market_cap_rank,
        image: coin.image
      }));
      setCryptoData(data);
    } catch (error) {
      console.error('Failed to fetch crypto data:', error);
      setCryptoData([
        { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 45000, change: 2.5, rank: 1 },
        { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 3000, change: -1.2, rank: 2 },
        { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.5, change: 3.1, rank: 3 }
      ]);
    }
  };

  const loadUserData = async (userId) => {
    try {
      // Initialize user data if it doesn't exist
      const userQuery = query(collection(db, 'users'), where('userId', '==', userId));
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        // Create user document if it doesn't exist
        await addDoc(collection(db, 'users'), {
          userId: userId,
          email: user?.email || '',
          balance: 0,
          createdAt: new Date()
        });
        setBalance(0);
      } else {
        const userData = userSnapshot.docs[0].data();
        setBalance(userData.balance || 0);
      }

      // Load portfolio with error handling
      try {
        const portfolioQuery = query(collection(db, 'portfolios'), where('userId', '==', userId));
        const portfolioSnapshot = await getDocs(portfolioQuery);
        const portfolioData = portfolioSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPortfolio(portfolioData);
      } catch (portfolioError) {
        console.warn('Portfolio data not accessible, using empty portfolio:', portfolioError);
        setPortfolio([]);
      }

      // Load transactions with error handling
      try {
        const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const transactionsData = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTransactions(transactionsData);
      } catch (transactionError) {
        console.warn('Transaction data not accessible, using empty transactions:', transactionError);
        setTransactions([]);
      }

    } catch (error) {
      console.warn('Error loading user data, using defaults:', error);
      setBalance(0);
      setPortfolio([]);
      setTransactions([]);
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
        balance: 0,
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

      
        <h3>Portfolio</h3>
        {portfolio.length > 0 ? (
          
            {portfolio.map(asset => {
              const currentPrice = cryptoData.find(c => c.id === asset.cryptoId)?.price || asset.purchasePrice;
              const currentValue = asset.amount * currentPrice;
              const profit = currentValue - (asset.amount * asset.purchasePrice);
              return (
                
                  <img src={`https://cryptoicons.org/api/icon/${asset.cryptoId}/32`} alt={asset.cryptoName} className="crypto-icon" />
                  
                    
                      {asset.cryptoName}
                    
                    
                      {asset.amount.toFixed(6)}
                    
                  
                  
                    
                      ${currentValue.toLocaleString()}
                    
                    
                      {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                    
                  
                
              );
            })}
          
        ) : (
          
            <p>No assets in your portfolio yet</p>
          
        )}
      

      
        <h3>Recent Transactions</h3>
        
          {transactions.slice(0, 5).map(tx => (
            
              
                {tx.type}
              
              
                
                  {tx.cryptoName}
                
                
                  {tx.amount.toFixed(6)}
                
              
              {new Date(tx.timestamp?.seconds * 1000).toLocaleDateString()}
            
          ))}
        
      
    
  );

  const renderMarkets = () => {
    const filteredCryptos = cryptoData.filter(crypto =>
      crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crypto.id.toLowerCase().includes(searchQuery.toLowerCase())y.toLowerCase())
    );

    const totalVolume = cryptoData.reduce((total, crypto) => total + (crypto.volume || 0), 0);
    const totalMarketCap = cryptoData.reduce((total, crypto) => total + (crypto.market_cap || 0), 0);

    return (
      
        
          
            <h2>Markets</h2>
            
              
                
                  24h Vol
                  ${(totalVolume / 1000000000).toFixed(1)}B
                
                
                  Market Cap
                  ${(totalMarketCap / 1000000000000).toFixed(1)}T
                
                
                  Coins
                  {filteredCryptos.length}
                
              
            
          
        

        
          
            
              
                Spot
                Futures
                Options
              
            
            
              
                
                  All
                  Favorites
                  Innovation
                  DeFi
                
              
              
                
                  
                  {searchQuery && (
                    
                      ×
                    
                  )}
                
              
            
          
        

        
          {filteredCryptos.length > 0 ? (
            filteredCryptos.map((crypto) => (
              
                {crypto.rank || 'N/A'}
                
                  
                  onError={(e) => {
                    e.target.src = `https://cryptoicons.org/api/icon/${crypto.id}/32`;
                  }}
                  
                
                
                  
                    {crypto.name}
                  
                  
                    {crypto.symbol}
                  
                
                
                  
                    ${crypto.price < 1 ? crypto.price.toFixed(6) : crypto.price.toLocaleString()}
                  
                  
                    {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                  
                
                
                  Trade
                
              
            ))
          ) : (
            
              
                No cryptocurrencies found matching "{searchQuery}"
                
                  Clear Search
                
              
            
          )}
        
      
    );
  };

  const renderTrade = () => (
    
      
        
          <h2>Trade</h2>
          <p>Select a cryptocurrency to start trading</p>
        
      

      
        
          <h3>Featured Pairs</h3>
          
            {cryptoData.slice(0, 4).map(crypto => (
              
                
                  
                  
                    {crypto.name}
                  
                  
                    ${crypto.price.toLocaleString()}
                  
                  
                    {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                  
                
                
                  Trade
                
              
            ))}
          
        
      
    
  );

  const renderMenu = () => (
    
      
        
          
            
              {(userName || user.email?.charAt(0) || 'U').toUpperCase()}
            
            
              
                {userName || user.email?.split('@')[0]}
                Verified User
              
            
          
        
      

      
        
          
            
              
                Account
                
                  
                    👤
                    Profile Settings
                    ›
                  
                  
                    🔒
                    Security
                    ›
                  
                  
                    📊
                    Trading History
                    ›
                  
                
              
            

            
              
                Support
                
                  
                    💬
                    Customer Support
                    ›
                  
                  
                    ❓
                    Help Center
                    ›
                  
                  
                    📞
                    Contact Us
                    ›
                  
                
              
            

            
              
                Settings
                
                  
                    🌙
                    Dark Mode
                    
                  
                  
                    🔔
                    Notifications
                    
                  
                  
                    🌍
                    Language
                    {languages.find(lang => lang.code === selectedLanguage)?.flag} {languages.find(lang => lang.code === selectedLanguage)?.name}
                    ›
                  
                
              
            

            
              
                Biometric Security
                
                  
                    👆
                    Fingerprint Login
                    
                  
                  
                    👤
                    Face ID Login
                    
                  
                  
                    🔐
                    2FA Authentication
                    
                  
                
              
            

            
              
                
                  
                    🚪
                    Logout
                    ›
                  
                
              
            
          
        
      
    
  );

  return (
    
      
        
          
            <h1>Eloncrypto</h1>
            
              ${balance.toLocaleString()}
            
          
        
      

      
        {activeTab === 'home' && renderHome()}
        {activeTab === 'assets' && renderAssets()}
        {activeTab === 'markets' && renderMarkets()}
        {activeTab === 'trade' && renderTrade()}
        {activeTab === 'menu' && renderMenu()}
      

      
        
          
            
              🏠
              Home
            
          
          
            
              💰
              Assets
            
          
          
            
              📈
              Markets
            
          
          
            
              ⚡
              Trade
            
          
          
            
              ☰
              Menu
            
          
        
      

      {showTrade && selectedCrypto && (
        
          
            
              <h3>Trade {selectedCrypto.name}</h3>
              <p>Current Price: ${selectedCrypto.price.toLocaleString()}</p>
              
              {tradeAmount && (
                
              )}
              {error && }
              
                
                  Buy
                
                
                  Sell
                
              
              
                Cancel
              
            
          
        
      )}

      {showDeposit && (
        
          
            
              <h3>Deposit Funds</h3>
              
                
                  
                    Bitcoin Deposit
                    
                      Send Bitcoin to this address:
                      
                        
                          {bitcoinAddress}
                          Copy
                        
                        ⚠️ Only send Bitcoin to this address.
                      
                    
                  
                  
                    Bank Transfer
                    
                      
                        
                          <strong>Account Name:</strong> {bankDetails.accountName}
                        
                        
                          <strong>Account Number:</strong> {bankDetails.accountNumber}
                        
                        
                          <strong>Bank Name:</strong> {bankDetails.bankName}
                        
                        
                          <strong>Routing Number:</strong> {bankDetails.routingNumber}
                        
                      
                    
                  
                
              
              
                Close
              
            
          
        
      )}

      {showWithdraw && (
        
          
            
              <h3>Withdraw Funds</h3>
              <p>Available Balance: ${balance.toLocaleString()}</p>
              <p>Contact support to process withdrawals to your registered bank account.</p>
              
                Close
              
            
          
        
      )}

      {showProfileSettings && (
        
          
            
              
                
                  
                    Profile Settings
                    
                      ×
                    
                  
                

                
                  
                    
                      
                        
                          {(userName || user.email?.charAt(0) || 'U').toUpperCase()}
                        
                      
                      
                        Choose Photo
                        
                      
                    
                    
                      Full Name
                      
                    
                    
                      Email Address
                      
                      Email cannot be changed
                    
                    
                      Phone Number
                      
                    
                    
                      Save Changes
                      Cancel
                    
                    
                      <h4>Security Settings</h4>
                      Change Password
                    
                  
                
              
            
          
        
      )}

      {showLanguageModal && (
        
          
            
              
                
                  Select Language
                  
                    ×
                  
                
              

              
                {languages.map((language) => (
                  
                    
                      {language.flag}
                      {language.name}
                      {selectedLanguage === language.code && (
                        ✓
                      )}
                    
                  
                ))}
              
            
          
        
      )}

      
        
          
            💬
          
        
      
    
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
      
        
          
            
            
            
            
            
            
            
            
          
        

        
          
            
              
                
                  
                    ₿
                  
                  <h1>Eloncrypto</h1>
                  
                
              
            

            
              
                
                  
                    ✅
                  
                  <h2>Password Changed Successfully!</h2>
                  <p>Your password has been updated successfully.</p>
                  <p className="form-subtitle">You can now login with your new password.</p>
                  
                    
                      Back to Login
                    
                  
                
              
            
          
        
      
    );
  }

  return (
    
      
        
          
            
            
            
            
            
            
            
            
          
        

        
          
            
              
                
                  
                    ₿
                  
                  <h1>Eloncrypto</h1>
                  
                
              
            

            
              
                
                  
                    <h2>Create New Password</h2>
                    Enter your new password below
                    
                      
                        
                          
                          
                          required
                          
                        
                      
                      
                        
                          
                          
                          required
                          
                        
                      
                    
                    {error && }
                    
                      Reset Password
                    
                    
                      
                        ← Back to Login
                      
                    
                  
                
              
            
          
        
      
    
  );
}

function App() {
  return (
    
      
        
          
          
        
      
    
  );
}

export default App;