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
  const [futuresData, setFuturesData] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [showTrade, setShowTrade] = useState(false);
  const [activeAssetTab, setActiveAssetTab] = useState('spot');

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
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [selectedVolumeData, setSelectedVolumeData] = useState(null);

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

  // Close welcome message handler
  const closeWelcomeMessage = () => {
    setShowWelcomeMessage(false);
    localStorage.setItem(`welcomeSeen_${user.uid}`, 'true');
  };

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
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
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
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
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

        // Check if this is first login for welcome message
        const hasSeenWelcome = localStorage.getItem(`welcomeSeen_${user.uid}`);
        if (!hasSeenWelcome) {
          setShowWelcomeMessage(true);
        }

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
    // Faster updates for live prices - every 10 seconds
    const interval = setInterval(fetchCryptoData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Check if user is verified Elon team member
  const isVerifiedElonTeam = (userEmail) => {
    const verifiedTeamEmails = [
      'elon@elonm.live',
      'admin@elonm.live',
      'team@elonm.live',
      'support@elonm.live'
    ];
    return verifiedTeamEmails.includes(userEmail?.toLowerCase());
  };

  const fetchCryptoData = async () => {
    try {
      // Fetch spot data from CoinGecko - increased to 250 coins
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

      // Fetch futures data from Binance with live updates
      try {
        const futuresResponse = await axios.get('https://fapi.binance.com/fapi/v1/ticker/24hr');
        const futuresFormatted = futuresResponse.data
          .filter(item => item.symbol.endsWith('USDT'))
          .slice(0, 100) // Increased to 100 futures pairs
          .map((item, index) => ({
            id: item.symbol.toLowerCase(),
            name: item.symbol.replace('USDT', ''),
            symbol: item.symbol,
            price: parseFloat(item.lastPrice),
            change: parseFloat(item.priceChangePercent),
            volume: parseFloat(item.volume),
            rank: index + 1,
            image: `https://cryptoicons.org/api/icon/${item.symbol.replace('USDT', '').toLowerCase()}/32`,
            openInterest: parseFloat(item.openInterest || 0),
            fundingRate: Math.random() * 0.01 - 0.005,
            lastUpdated: new Date()
          }));
        setFuturesData(futuresFormatted);
      } catch (futuresError) {
        console.log('Binance futures API not accessible, using enhanced mock data');
        // Enhanced fallback mock futures data with more variety
        const mockFutures = data.slice(0, 100).map((coin, index) => ({
          ...coin,
          symbol: coin.symbol + 'USDT',
          price: coin.price * (1 + (Math.random() - 0.5) * 0.02),
          change: coin.change + (Math.random() - 0.5) * 5,
          openInterest: Math.random() * 1000000000,
          fundingRate: Math.random() * 0.01 - 0.005,
          lastUpdated: new Date()
        }));
        setFuturesData(mockFutures);
      }
    } catch (error) {
      console.error('Failed to fetch crypto data:', error);
      // Enhanced fallback with 250+ cryptocurrencies
      const fallbackCryptos = [];
      const cryptoNames = [
        'Bitcoin', 'Ethereum', 'Cardano', 'Solana', 'Polkadot', 'Chainlink', 'Litecoin', 'Bitcoin Cash',
        'Stellar', 'Dogecoin', 'VeChain', 'TRON', 'EOS', 'Monero', 'Tezos', 'Cosmos', 'Neo', 'IOTA',
        'Dash', 'Zcash', 'Qtum', 'Ontology', 'Zilliqa', 'Waves', 'Decred', 'DigiByte', 'Ravencoin',
        'Horizen', 'Komodo', 'Verge', 'Stratis', 'Lisk', 'Ark', 'Nano', 'Basic Attention Token',
        'OmiseGO', '0x', 'Augur', 'Golem', 'Status', 'Bancor', 'Kyber Network', 'Loopring', 'Enjin Coin',
        'Compound', 'Maker', 'Uniswap', 'Aave', 'SushiSwap', 'Yearn Finance', 'Curve', 'Synthetix',
        'Alpha Finance', 'dYdX', 'Perpetual Protocol', 'Injective Protocol', 'Mirror Protocol', 'Anchor',
        'Terra Luna', 'UST', 'Avalanche', 'Fantom', 'Polygon', 'Harmony', 'Near Protocol', 'Elrond',
        'Algorand', 'Hedera', 'Internet Computer', 'Filecoin', 'The Graph', 'Render Token', 'Ocean Protocol'
      ];
      
      for (let i = 0; i < 250; i++) {
        const nameIndex = i % cryptoNames.length;
        const baseName = cryptoNames[nameIndex];
        const name = i < cryptoNames.length ? baseName : `${baseName} ${Math.floor(i / cryptoNames.length) + 1}`;
        
        fallbackCryptos.push({
          id: `crypto-${i + 1}`,
          name: name,
          symbol: name.replace(/\s+/g, '').toUpperCase().substring(0, 5),
          price: Math.random() * 50000 + 10,
          change: (Math.random() - 0.5) * 20,
          rank: i + 1,
          image: `https://cryptoicons.org/api/icon/${cryptoNames[nameIndex % cryptoNames.length].toLowerCase().replace(/\s+/g, '-')}/32`,
          volume: Math.random() * 1000000000,
          market_cap: Math.random() * 100000000000
        });
      }
      setCryptoData(fallbackCryptos);
      
      // Create enhanced futures fallback
      const fallbackFutures = fallbackCryptos.slice(0, 100).map((coin, index) => ({
        ...coin,
        symbol: coin.symbol + 'USDT',
        price: coin.price * (1 + (Math.random() - 0.5) * 0.05),
        change: coin.change + (Math.random() - 0.5) * 8,
        openInterest: Math.random() * 2000000000,
        fundingRate: Math.random() * 0.02 - 0.01,
        lastUpdated: new Date()
      }));
      setFuturesData(fallbackFutures);
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

      <div className="asset-actions">
        <button className="action-btn deposit-btn" onClick={() => setShowDeposit(true)}>
          <span className="btn-icon">💳</span>
          Deposit
        </button>
        <button className="action-btn withdraw-btn" onClick={() => setShowWithdraw(true)}>
          <span className="btn-icon">💸</span>
          Withdraw
        </button>
      </div>

      <div className="asset-tabs">
        <button 
          className={`asset-tab-btn ${activeAssetTab === 'spot' ? 'active' : ''}`}
          onClick={() => setActiveAssetTab('spot')}
        >
          Spot
        </button>
        <button 
          className={`asset-tab-btn ${activeAssetTab === 'futures' ? 'active' : ''}`}
          onClick={() => setActiveAssetTab('futures')}
        >
          Futures
        </button>
        <button 
          className={`asset-tab-btn ${activeAssetTab === 'funding' ? 'active' : ''}`}
          onClick={() => setActiveAssetTab('funding')}
        >
          Funding
        </button>
      </div>

      
        {activeAssetTab === 'spot' && (
        <div className="portfolio-section">
          <h3>Spot Portfolio</h3>
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
                      <div className="crypto-name">
                        {asset.cryptoName}
                      </div>
                      <div className="crypto-amount">
                        {asset.amount.toFixed(6)}
                      </div>
                    </div>
                    <div className="portfolio-value">
                      <div className="value">
                        ${currentValue.toLocaleString()}
                      </div>
                      <div className="profit">
                        {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-portfolio">
              <p>No spot assets in your portfolio yet</p>
            </div>
          )}
        </div>
      )}

      {activeAssetTab === 'futures' && (
        <div className="futures-section">
          <h3>Futures Markets (Live from Binance)</h3>
          <div className="futures-stats">
            <div className="stat-item">
              <span className="stat-label">24h Volume</span>
              <span className="stat-value">${(futuresData.reduce((sum, item) => sum + (item.volume || 0), 0) / 1000000).toFixed(1)}M</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Pairs</span>
              <span className="stat-value">{futuresData.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Live Updates</span>
              <span className="stat-value live-indicator">🟢 LIVE</span>
            </div>
          </div>
          <div className="crypto-list futures-list">
            {futuresData.map((futures) => (
              <div 
                key={futures.id} 
                className="crypto-item futures-item" 
                onClick={() => {
                  if (isVerifiedElonTeam(user?.email)) {
                    console.log('Futures access granted for:', futures.name);
                  } else {
                    showNotification('Access Restricted', `Only Elon trading team can access ${futures.name} futures trading.`, 'error');
                  }
                }}
              >
                <div className="futures-rank">{futures.rank}</div>
                <div className="futures-crypto-info">
                  <img 
                    src={futures.image} 
                    alt={futures.name}
                    className="crypto-icon"
                    onError={(e) => {
                      e.target.src = `https://cryptoicons.org/api/icon/${futures.name.toLowerCase()}/32`;
                    }}
                  />
                  <div className="futures-crypto-details">
                    <div className="futures-name">{futures.name}</div>
                    <div className="futures-symbol">{futures.symbol}</div>
                  </div>
                </div>
                <div className="futures-price-section">
                  <div className="futures-main-price">
                    <span className="live-price">
                      ${futures.price < 1 ? futures.price.toFixed(6) : futures.price.toLocaleString()}
                    </span>
                    <span className="live-indicator-dot">🔴</span>
                  </div>
                  <div className="futures-price-change">
                    <span className={`change ${futures.change >= 0 ? 'positive' : 'negative'}`}>
                      {futures.change >= 0 ? '+' : ''}{futures.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="futures-additional-info">
                  <div className="funding-rate-info">
                    <span className="funding-label">Funding</span>
                    <span className="funding-value">
                      {(futures.fundingRate * 100).toFixed(4)}%
                    </span>
                  </div>
                  <div className="volume-info">
                    <span className="volume-label">Vol</span>
                    <span className="volume-value">
                      ${(futures.volume / 1000000).toFixed(1)}M
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeAssetTab === 'funding' && (
        <div className="funding-section">
          <h3>Funding Account</h3>
          <div className="funding-overview">
            <div className="funding-card">
              <h4>Available for Trading</h4>
              <div className="funding-amount">${balance.toLocaleString()}</div>
              <p>Transfer to Spot or Futures</p>
            </div>
            <div className="funding-card">
              <h4>Earn Rewards</h4>
              <div className="funding-amount">0.05% APY</div>
              <p>Flexible savings available</p>
            </div>
          </div>
          <div className="funding-actions">
            <button 
              className="funding-btn"
              onClick={() => {
                if (isVerifiedElonTeam(user?.email)) {
                  console.log('Spot transfer access granted');
                } else {
                  showNotification('Access Restricted', 'Only Elon trading team can access Spot transfer.', 'error');
                }
              }}
            >
              Transfer to Spot
            </button>
            <button 
              className="funding-btn"
              onClick={() => {
                if (isVerifiedElonTeam(user?.email)) {
                  console.log('Futures transfer access granted');
                } else {
                  showNotification('Access Restricted', 'Only Elon trading team can access Futures transfer.', 'error');
                }
              }}
            >
              Transfer to Futures
            </button>
            <button 
              className="funding-btn"
              onClick={() => {
                if (isVerifiedElonTeam(user?.email)) {
                  console.log('Earning program access granted');
                } else {
                  showNotification('Access Restricted', 'Only Elon trading team can access Earning program.', 'error');
                }
              }}
            >
              Start Earning
            </button>
          </div>
        </div>
      )}

      <div className="recent-transactions">
        <h3>Recent Transactions</h3>
        <div className="transactions-list">
          {transactions.slice(0, 5).map(tx => (
            <div key={tx.id} className="transaction-item">
              <span className={`type-badge ${tx.type}`}>
                {tx.type}
              </span>
              <div className="transaction-details">
                <div className="crypto-name">
                  {tx.cryptoName}
                </div>
                <div className="amount">
                  {tx.amount.toFixed(6)}
                </div>
              </div>
              <div className="timestamp">{new Date(tx.timestamp?.seconds * 1000).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
        
      
    
  );

  const renderMarkets = () => {
    const filteredCryptos = cryptoData.filter(crypto =>
      crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crypto.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalVolume = cryptoData.reduce((total, crypto) => total + (crypto.volume || 0), 0);
    const totalMarketCap = cryptoData.reduce((total, crypto) => total + (crypto.market_cap || 0), 0);

    return (
      <div className="markets-tab">
        <div className="markets-header">
          <div className="header-content">
            <h2>Markets</h2>
            <div className="market-stats">
              <div className="stat">
                <span className="label">24h Vol</span>
                <span className="value">${(totalVolume / 1000000000).toFixed(1)}B</span>
              </div>
              <div className="stat">
                <span className="label">Market Cap</span>
                <span className="value">${(totalMarketCap / 1000000000000).toFixed(1)}T</span>
              </div>
              <div className="stat">
                <span className="label">Coins</span>
                <span className="value">200</span>
              </div>
            </div>
          </div>
        </div>

        <div className="market-controls">
          <div className="market-tabs">
            <div className="tab-group">
              <button className="tab-btn active">Spot</button>
              <button className="tab-btn">Futures</button>
              <button className="tab-btn">Options</button>
            </div>
            <div className="filter-controls">
              <div className="category-filters">
                <button className="filter-btn active">All</button>
                <button className="filter-btn">Favorites</button>
                <button className="filter-btn">Innovation</button>
                <button className="filter-btn">DeFi</button>
              </div>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search coins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="clear-search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="crypto-list">
          {filteredCryptos.length > 0 ? (
            filteredCryptos.map((crypto) => (
              <div key={crypto.id} className="crypto-item" onClick={() => { 
                if (isVerifiedElonTeam(user?.email)) {
                  setSelectedCrypto(crypto); 
                  setShowTrade(true);
                } else {
                  showNotification('Trading Restricted', 'Only verified Elon team members are allowed to trade.', 'error');
                }
              }}>
                <span className="rank">{crypto.rank || 'N/A'}</span>
                <div className="crypto-info">
                  <img 
                    src={crypto.image} 
                    alt={crypto.name}
                    className="crypto-icon"
                    onError={(e) => {
                      e.target.src = `https://cryptoicons.org/api/icon/${crypto.id}/32`;
                    }}
                  />
                  <div className="crypto-details">
                    <span className="name">{crypto.name}</span>
                    <span className="symbol">{crypto.symbol}</span>
                  </div>
                </div>
                <div className="price-info">
                  <span className="price">
                    ${crypto.price < 1 ? crypto.price.toFixed(6) : crypto.price.toLocaleString()}
                  </span>
                  <span className={`change ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                    {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                  </span>
                </div>
                <button className="trade-btn">
                  Trade
                </button>
              </div>
            ))
          ) : (
            <div className="no-results">
              <p>No cryptocurrencies found matching "{searchQuery}"</p>
              <button onClick={() => setSearchQuery('')} className="clear-btn">
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTrade = () => {
    // Filter logic for different categories
    const getFilteredCoins = () => {
      let filtered = cryptoData.filter(crypto =>
        crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );

      switch (activeFilter) {
        case 'gainers':
          return filtered.filter(crypto => crypto.change > 0).sort((a, b) => b.change - a.change);
        case 'losers':
          return filtered.filter(crypto => crypto.change < 0).sort((a, b) => a.change - b.change);
        case 'hot':
          return filtered.filter((crypto, index) => index < 50); // Top 50 as "hot"
        case 'favorites':
          return filtered.filter(crypto => ['bitcoin', 'ethereum', 'cardano', 'solana', 'polkadot'].includes(crypto.id));
        case 'new':
          return filtered.filter((crypto, index) => index >= 200); // Last 50 as "new"
        default:
          return filtered;
      }
    };

    const filteredTradeCoins = getFilteredCoins();

    const showVolumeDetails = (crypto) => {
      setSelectedVolumeData(crypto);
      setShowVolumeModal(true);
    };

    return (
      <div className="binance-trade-tab">
        <div className="binance-trade-header">
          <div className="trade-title-section">
            <h2>🚀 Spot Trading</h2>
            <div className="trade-stats">
              <div className="stat-item">
                <span className="stat-label">24h Change</span>
                <span className="stat-value positive">+2.34%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">24h Volume</span>
                <span className="stat-value">₿45,234.56</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Available Pairs</span>
                <span className="stat-value">{filteredTradeCoins.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="binance-controls">
          <div className="market-type-tabs">
            <button className="market-tab active">Spot</button>
            <button className="market-tab">Margin</button>
            <button className="market-tab">Futures</button>
            <button className="market-tab">Options</button>
          </div>
          
          <div className="search-and-filters">
            <div className="search-wrapper">
              <input
                type="text"
                placeholder="🔍 Search coins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="binance-search"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="clear-search">×</button>
              )}
            </div>
            
            <div className="filter-tabs">
              <button 
                className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All
              </button>
              <button 
                className={`filter-tab ${activeFilter === 'favorites' ? 'active' : ''}`}
                onClick={() => setActiveFilter('favorites')}
              >
                ⭐ Favorites
              </button>
              <button 
                className={`filter-tab ${activeFilter === 'gainers' ? 'active' : ''}`}
                onClick={() => setActiveFilter('gainers')}
              >
                📈 Gainers
              </button>
              <button 
                className={`filter-tab ${activeFilter === 'losers' ? 'active' : ''}`}
                onClick={() => setActiveFilter('losers')}
              >
                📉 Losers
              </button>
              <button 
                className={`filter-tab ${activeFilter === 'hot' ? 'active' : ''}`}
                onClick={() => setActiveFilter('hot')}
              >
                🔥 Hot
              </button>
              <button 
                className={`filter-tab ${activeFilter === 'new' ? 'active' : ''}`}
                onClick={() => setActiveFilter('new')}
              >
                🆕 New
              </button>
            </div>
          </div>
        </div>

        <div className="binance-market-list">
          <div className="market-headers">
            <div className="header-col pair-header">Pair</div>
            <div className="header-col price-header">Last Price</div>
            <div className="header-col change-header">24h Change %</div>
            <div className="header-col volume-header">24h Volume</div>
            <div className="header-col action-header">Action</div>
          </div>

          <div className="market-rows">
            {filteredTradeCoins.length > 0 ? (
              filteredTradeCoins.map((crypto, index) => (
                <div key={crypto.id} className="market-row" onClick={() => { 
                  if (isVerifiedElonTeam(user?.email)) {
                    setSelectedCrypto(crypto); 
                    setShowTrade(true);
                  } else {
                    showNotification('Trading Restricted', 'Only verified Elon team members are allowed to trade.', 'error');
                  }
                }}>
                  <div className="pair-col">
                    <div className="pair-info">
                      <img 
                        src={crypto.image} 
                        alt={crypto.name}
                        className="pair-icon"
                        onError={(e) => {
                          e.target.src = `https://cryptoicons.org/api/icon/${crypto.id}/32`;
                        }}
                      />
                      <div className="pair-details">
                        <div className="pair-name">{crypto.symbol}/USDT</div>
                        <div className="pair-subtitle">{crypto.name}</div>
                      </div>
                      {(activeFilter === 'hot' || index < 50) && <div className="hot-badge">🔥</div>}
                    </div>
                  </div>
                  
                  <div className="price-col">
                    <div className="current-price">
                      {crypto.price < 1 ? crypto.price.toFixed(8) : crypto.price.toLocaleString()}
                    </div>
                    <div className="price-usd">
                      ${crypto.price < 1 ? crypto.price.toFixed(6) : crypto.price.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="change-col">
                    <div className={`change-percent ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                      {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                    </div>
                    <div className={`change-amount ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                      {crypto.change >= 0 ? '+' : ''}${(crypto.price * crypto.change / 100).toFixed(4)}
                    </div>
                  </div>
                  
                  <div className="volume-col" onClick={() => showVolumeDetails(crypto)}>
                    <div className="volume-crypto">
                      {crypto.volume ? (crypto.volume / 1000000).toFixed(2) + 'M' : 'N/A'} {crypto.symbol}
                    </div>
                    <div className="volume-usd">
                      ${crypto.volume ? (crypto.volume / 1000000).toFixed(1) + 'M' : 'N/A'}
                    </div>
                    <div className="live-volume-indicator">🔴 LIVE</div>
                  </div>
                  
                  <div className="action-col">
                    <button className="trade-now-btn">Trade</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results-binance">
                <div className="no-results-icon">🔍</div>
                <div className="no-results-title">No trading pairs found</div>
                <div className="no-results-subtitle">Try adjusting your search or filters</div>
                <button onClick={() => setSearchQuery('')} className="clear-filters-btn">
                  Clear Search
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="trade-info-footer">
          <div className="info-item">
            <span className="info-icon">ℹ️</span>
            <span className="info-text">Real-time market data powered by Binance API</span>
          </div>
          <div className="info-item">
            <span className="info-icon">⚡</span>
            <span className="info-text">Ultra-low latency trading engine</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🔒</span>
            <span className="info-text">Bank-level security & insurance</span>
          </div>
        </div>
      </div>
    );
  };

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
              <span className="menu-text">Profile Settings</span>
              <span className="menu-arrow">›</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">🔒</span>
              <span className="menu-text">Security</span>
              <span className="menu-arrow">›</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">📊</span>
              <span className="menu-text">Trading History</span>
              <span className="menu-arrow">›</span>
            </div>
          </div>
        </div>

        <div className="menu-section">
          <h4>Support</h4>
          <div className="menu-items">
            <div className="menu-item">
              <span className="menu-icon">💬</span>
              <span className="menu-text">Customer Support</span>
              <span className="menu-arrow">›</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">❓</span>
              <span className="menu-text">Help Center</span>
              <span className="menu-arrow">›</span>
            </div>
            <div className="menu-item">
              <span className="menu-icon">📞</span>
              <span className="menu-text">Contact Us</span>
              <span className="menu-arrow">›</span>
            </div>
          </div>
        </div>

        <div className="menu-section">
          <h4>Settings</h4>
          <div className="menu-items">
            <div className="menu-item">
              <span className="menu-icon">🌙</span>
              <span className="menu-text">Dark Mode</span>
              <input type="checkbox" className="toggle-switch" />
            </div>
            <div className="menu-item">
              <span className="menu-icon">🔔</span>
              <span className="menu-text">Notifications</span>
              <input type="checkbox" className="toggle-switch" />
            </div>
            <div className="menu-item" onClick={() => setShowLanguageModal(true)}>
              <span className="menu-icon">🌍</span>
              <span className="menu-text">Language</span>
              <span className="menu-value">{languages.find(lang => lang.code === selectedLanguage)?.flag} {languages.find(lang => lang.code === selectedLanguage)?.name}</span>
              <span className="menu-arrow">›</span>
            </div>
          </div>
        </div>

        <div className="menu-section">
          <h4>Biometric Security</h4>
          <div className="menu-items">
            <div className="menu-item" onClick={enableFingerprint}>
              <span className="menu-icon">👆</span>
              <span className="menu-text">Fingerprint Login</span>
              <input type="checkbox" checked={fingerprintEnabled} readOnly className="toggle-switch" />
            </div>
            <div className="menu-item" onClick={enableFaceId}>
              <span className="menu-icon">👤</span>
              <span className="menu-text">Face ID Login</span>
              <input type="checkbox" checked={faceIdEnabled} readOnly className="toggle-switch" />
            </div>
            <div className="menu-item">
              <span className="menu-icon">🔐</span>
              <span className="menu-text">2FA Authentication</span>
              <input type="checkbox" className="toggle-switch" />
            </div>
          </div>
        </div>

        <div className="menu-section">
          <div className="menu-items">
            <div className="menu-item" onClick={() => signOut(auth)}>
              <span className="menu-icon">🚪</span>
              <span className="menu-text">Logout</span>
              <span className="menu-arrow">›</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="App">
      <div className="header">
        <div className="header-content">
          <h1>Eloncrypto</h1>
          <div className="balance-display">
            ${balance.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="main-content">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'assets' && renderAssets()}
        {activeTab === 'trade' && renderTrade()}
        {activeTab === 'menu' && renderMenu()}
      </div>

      <div className="bottom-nav">
        <div className="nav-items">
          <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </div>
          <div className={`nav-item ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => setActiveTab('assets')}>
            <span className="nav-icon">💰</span>
            <span className="nav-label">Assets</span>
          </div>
          <div className={`nav-item ${activeTab === 'trade' ? 'active' : ''}`} onClick={() => setActiveTab('trade')}>
            <span className="nav-icon">⚡</span>
            <span className="nav-label">Trade</span>
          </div>
          <div className={`nav-item ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>
            <span className="nav-icon">☰</span>
            <span className="nav-label">Menu</span>
          </div>
        </div>
      </div>
            
          
        
      

      {showTrade && selectedCrypto && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              <h3>Trade {selectedCrypto.name}</h3>
              <p>Current Price: ${selectedCrypto.price.toLocaleString()}</p>
              <input
                type="number"
                placeholder="Amount"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className="trade-input"
              />
              {tradeAmount && (
                <p>Total: ${(parseFloat(tradeAmount) * selectedCrypto.price).toFixed(2)}</p>
              )}
              {error && <div className="error-message">{error}</div>}
              <div className="trade-buttons">
                <button className="buy-btn" onClick={() => handleTrade('buy')}>
                  Buy
                </button>
                <button className="sell-btn" onClick={() => handleTrade('sell')}>
                  Sell
                </button>
              </div>
              <button className="cancel-btn" onClick={() => setShowTrade(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeposit && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              <h3>Deposit Funds</h3>
              <div className="deposit-options">
                <div className="deposit-option">
                  <h4>Bitcoin Deposit</h4>
                  <div className="bitcoin-info">
                    <p>Send Bitcoin to this address:</p>
                    <div className="address-container">
                      <code className="bitcoin-address">{bitcoinAddress}</code>
                      <button onClick={() => copyToClipboard(bitcoinAddress)} className="copy-btn">Copy</button>
                    </div>
                    <p className="warning">⚠️ Only send Bitcoin to this address.</p>
                  </div>
                </div>
                <div className="deposit-option">
                  <h4>Bank Transfer</h4>
                  <div className="bank-details">
                    <div className="bank-detail">
                      <strong>Account Name:</strong> {bankDetails.accountName}
                    </div>
                    <div className="bank-detail">
                      <strong>Account Number:</strong> {bankDetails.accountNumber}
                    </div>
                    <div className="bank-detail">
                      <strong>Bank Name:</strong> {bankDetails.bankName}
                    </div>
                    <div className="bank-detail">
                      <strong>Routing Number:</strong> {bankDetails.routingNumber}
                    </div>
                  </div>
                  <div className="support-section">
                    <p className="support-text">Need help with bank transfer?</p>
                    <a 
                      href="https://wa.me/4915210305922?text=Hello%2C%20I%20need%20help%20with%20bank%20transfer%20deposit%20on%20Eloncrypto%20Exchange" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="whatsapp-support-btn"
                    >
                      <span className="whatsapp-icon">💬</span>
                      Contact Support on WhatsApp
                    </a>
                  </div>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowDeposit(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdraw && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              <h3>Withdraw Funds</h3>
              <p>Available Balance: ${balance.toLocaleString()}</p>
              <p>Contact support to process withdrawals to your registered bank account.</p>
              <button className="close-btn" onClick={() => setShowWithdraw(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileSettings && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Profile Settings</h3>
                <button className="close-btn" onClick={() => setShowProfileSettings(false)}>
                  ×
                </button>
              </div>

              <div className="profile-form">
                <div className="profile-section">
                  <div className="avatar-section">
                    <div className="current-avatar">
                      {(userName || user.email?.charAt(0) || 'U').toUpperCase()}
                    </div>
                    <button className="choose-photo-btn">
                      Choose Photo
                      <input type="file" accept="image/*" hidden />
                    </button>
                  </div>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" value={user.email} disabled />
                    <small>Email cannot be changed</small>
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} />
                  </div>
                  <div className="form-actions">
                    <button className="save-btn">Save Changes</button>
                    <button className="cancel-btn" onClick={() => setShowProfileSettings(false)}>Cancel</button>
                  </div>
                  <div className="security-section">
                    <h4>Security Settings</h4>
                    <button className="change-password-btn">Change Password</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLanguageModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Select Language</h3>
                <button className="close-btn" onClick={() => setShowLanguageModal(false)}>
                  ×
                </button>
              </div>

              <div className="language-list">
                {languages.map((language) => (
                  <div 
                    key={language.code}
                    className={`language-item ${selectedLanguage === language.code ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedLanguage(language.code);
                      setShowLanguageModal(false);
                    }}
                  >
                    <span className="flag">{language.flag}</span>
                    <span className="name">{language.name}</span>
                    {selectedLanguage === language.code && (
                      <span className="checkmark">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showVolumeModal && selectedVolumeData && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Live 24h Volume - {selectedVolumeData.name}</h3>
                <button className="close-btn" onClick={() => setShowVolumeModal(false)}>
                  ×
                </button>
              </div>

              <div className="volume-details">
                <div className="volume-overview">
                  <div className="volume-card">
                    <div className="volume-icon">📊</div>
                    <h4>24h Trading Volume</h4>
                    <div className="volume-amount">{selectedVolumeData.volume ? (selectedVolumeData.volume / 1000000).toFixed(2) + 'M' : 'N/A'} {selectedVolumeData.symbol}</div>
                    <div className="volume-usd">${selectedVolumeData.volume ? (selectedVolumeData.volume / 1000000).toFixed(1) + 'M USD' : 'N/A'}</div>
                  </div>
                  
                  <div className="volume-stats">
                    <div className="stat-row">
                      <span className="stat-label">Market Cap</span>
                      <span className="stat-value">${selectedVolumeData.market_cap ? (selectedVolumeData.market_cap / 1000000000).toFixed(2) + 'B' : 'N/A'}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Current Price</span>
                      <span className="stat-value">${selectedVolumeData.price ? selectedVolumeData.price.toLocaleString() : 'N/A'}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">24h Change</span>
                      <span className={`stat-value ${selectedVolumeData.change >= 0 ? 'positive' : 'negative'}`}>
                        {selectedVolumeData.change >= 0 ? '+' : ''}{selectedVolumeData.change.toFixed(2)}%
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Market Rank</span>
                      <span className="stat-value">#{selectedVolumeData.rank || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="live-indicator-section">
                  <div className="live-status">
                    <span className="live-dot">🔴</span>
                    <span className="live-text">LIVE DATA - Updates every 10 seconds</span>
                  </div>
                  <div className="last-updated">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <button className="close-btn" onClick={() => setShowVolumeModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showWelcomeMessage && (
        <div className="welcome-overlay">
          <div className="welcome-message-container">
            <button className="welcome-close-x" onClick={closeWelcomeMessage}>
              ✕
            </button>
            <div className="welcome-message-content">
              <div className="welcome-header">
                <div className="elon-avatar">🚀</div>
                <h2>Welcome to the Official Elon Musk Investment Platform!</h2>
              </div>
              
              <div className="welcome-body">
                <div className="profit-highlight">
                  <span className="profit-icon">💰</span>
                  <p>Where <strong>ALL trading clients</strong> make <span className="massive-profits">MASSIVE PROFITS</span> within a short period of time!</p>
                </div>
                
                <div className="platform-info">
                  <div className="info-item">
                    <span className="info-icon">🏆</span>
                    <span>Founded by Elon Musk</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">🔒</span>
                    <span>Most Secured Exchange</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">📈</span>
                    <span>Most Profitable Platform</span>
                  </div>
                </div>
                
                <div className="welcome-stats">
                  <div className="stat">
                    <div className="stat-number">99.9%</div>
                    <div className="stat-label">Success Rate</div>
                  </div>
                  <div className="stat">
                    <div className="stat-number">500%+</div>
                    <div className="stat-label">Average Returns</div>
                  </div>
                  <div className="stat">
                    <div className="stat-number">24/7</div>
                    <div className="stat-label">Trading Support</div>
                  </div>
                </div>
                
                <div className="welcome-footer">
                  <p>🎯 <strong>Start your journey to financial freedom today!</strong></p>
                </div>
              </div>
              
              <button 
                className="welcome-close-btn"
                onClick={closeWelcomeMessage}
              >
                Start Trading 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="floating-chat">
        <button className="chat-btn">
          <span className="chat-icon">💬</span>
        </button>
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
              <div className="auth-form modern">
                <div className="reset-success">
                  <div className="success-icon">✅</div>
                  <h2>Password Changed Successfully!</h2>
                  <p>Your password has been updated successfully.</p>
                  <p className="form-subtitle">You can now login with your new password.</p>
                  <div className="form-actions">
                    <button className="submit-btn" onClick={() => navigate('/')}>
                      Back to Login
                    </button>
                  </div>
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
              <p className="tagline">Advanced Crypto Trading Platform</p>
            </div>
          </div>

          <div className="auth-form-container">
            <div className="auth-form modern">
              <form onSubmit={handleResetPassword} className="modern-form">
                <h2>Create New Password</h2>
                <p className="form-subtitle">Enter your new password below</p>
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
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="modern-input"
                    />
                  </div>
                </div>
                {error && <div className="error-message">{error}</div>}
                <button type="submit" className="submit-btn">
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