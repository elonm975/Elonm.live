import React, { useState, useEffect, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, confirmPasswordReset } from 'firebase/auth';
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
  const [profilePicture, setProfilePicture] = useState('');
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
  const [showTradingHistory, setShowTradingHistory] = useState(false);

  // Deposit/Withdraw info (dynamic from admin settings)
  const bitcoinAddress = adminSettings.bitcoinAddress;
  const bankDetails = {
    accountName: adminSettings.bankAccountName,
    accountNumber: adminSettings.bankAccountNumber,
    bankName: adminSettings.bankName,
    routingNumber: adminSettings.routingNumber
  };

  // Load admin settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('adminSettings');
    if (savedSettings) {
      setAdminSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Load all users for admin
  const loadAllUsers = async () => {
    if (!isVerifiedElonTeam(user?.email)) return;
    
    try {
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setAllUsers(usersData);
    } catch (error) {
      console.warn('Could not load users from Firebase, using localStorage fallback');
      // Fallback to localStorage data
      const localUsers = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('userData_')) {
          const userData = JSON.parse(localStorage.getItem(key));
          localUsers.push(userData);
        }
      }
      setAllUsers(localUsers);
    }
  };

  // Update user balance
  const updateUserBalance = async (userId, newBalance) => {
    try {
      // Update in Firebase if possible
      try {
        const userQuery = query(collection(db, 'users'), where('userId', '==', userId));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          await updateDoc(doc(db, 'users', userDoc.id), {
            balance: parseFloat(newBalance),
            updatedAt: new Date()
          });
        }
      } catch (firebaseError) {
        console.warn('Firebase update failed, updating localStorage');
      }

      // Update localStorage
      localStorage.setItem(`userBalance_${userId}`, newBalance);
      
      // Update current user balance if it's the same user
      if (user.uid === userId) {
        setBalance(parseFloat(newBalance));
      }

      // Reload users list
      loadAllUsers();
      alert('User balance updated successfully!');
    } catch (error) {
      console.error('Error updating user balance:', error);
      alert('Failed to update user balance. Please try again.');
    }
  };

  // Save admin settings
  const saveAdminSettings = () => {
    localStorage.setItem('adminSettings', JSON.stringify(adminSettings));
    alert('Admin settings saved successfully!');
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

  // Admin state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [adminSettings, setAdminSettings] = useState({
    bitcoinAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    bankAccountName: "Eloncrypto Exchange",
    bankAccountNumber: "1234567890",
    bankName: "Crypto Bank",
    routingNumber: "021000021",
    adminEmail: "admin@elonm.live",
    adminPassword: ""
  });

  // Check if user is verified Elon team member (Admin)
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
      // Load from localStorage first for immediate display
      const savedProfilePicture = localStorage.getItem(`profilePicture_${userId}`);
      const savedUserName = localStorage.getItem(`userName_${userId}`);
      const savedUserPhone = localStorage.getItem(`userPhone_${userId}`);
      
      if (savedProfilePicture) setProfilePicture(savedProfilePicture);
      if (savedUserName) setUserName(savedUserName);
      if (savedUserPhone) setUserPhone(savedUserPhone);

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
        // Only update if Firebase has newer data (or localStorage is empty)
        if (userData.userName && !savedUserName) setUserName(userData.userName);
        if (userData.userPhone && !savedUserPhone) setUserPhone(userData.userPhone);
        if (userData.profilePicture && !savedProfilePicture) setProfilePicture(userData.profilePicture);
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

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target.result;
        
        // Update profile picture in state immediately
        setProfilePicture(base64Image);
        
        // Save to localStorage as backup
        try {
          localStorage.setItem(`profilePicture_${user.uid}`, base64Image);
          localStorage.setItem(`userName_${user.uid}`, userName || '');
          localStorage.setItem(`userPhone_${user.uid}`, userPhone || '');
          
          // Also try to save to Firebase (but don't fail if it doesn't work)
          try {
            const userQuery = query(collection(db, 'users'), where('userId', '==', user.uid));
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
              const userDoc = userSnapshot.docs[0];
              await updateDoc(doc(db, 'users', userDoc.id), {
                profilePicture: base64Image,
                userName: userName || '',
                userPhone: userPhone || '',
                updatedAt: new Date()
              });
              console.log('Profile saved to Firebase successfully');
            } else {
              // Create new user document if none exists
              await addDoc(collection(db, 'users'), {
                userId: user.uid,
                email: user.email,
                profilePicture: base64Image,
                userName: userName || '',
                userPhone: userPhone || '',
                balance: 0,
                createdAt: new Date()
              });
              console.log('New user profile created in Firebase');
            }
          } catch (firebaseError) {
            console.warn('Firebase save failed, but localStorage backup saved:', firebaseError);
          }
          
          showNotification('Success', 'Profile picture updated successfully!', 'success');
        } catch (error) {
          console.error('Error saving profile picture:', error);
          alert('Profile picture displayed but may not be permanently saved. Please try again.');
        }
      };
      
      reader.onerror = () => {
        alert('Error reading file. Please try again.');
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture. Please try again.');
    }
  };

  const handleProfileUpdate = async () => {
    try {
      // Save to localStorage first
      localStorage.setItem(`userName_${user.uid}`, userName || '');
      localStorage.setItem(`userPhone_${user.uid}`, userPhone || '');
      
      // Try to save to Firebase
      try {
        const userQuery = query(collection(db, 'users'), where('userId', '==', user.uid));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          await updateDoc(doc(db, 'users', userDoc.id), {
            userName: userName || '',
            userPhone: userPhone || '',
            profilePicture: profilePicture || '',
            updatedAt: new Date()
          });
        } else {
          // Create new user document
          await addDoc(collection(db, 'users'), {
            userId: user.uid,
            email: user.email,
            userName: userName || '',
            userPhone: userPhone || '',
            profilePicture: profilePicture || '',
            balance: 0,
            createdAt: new Date()
          });
        }
      } catch (firebaseError) {
        console.warn('Firebase update failed, but localStorage saved:', firebaseError);
      }
      
      showNotification('Success', 'Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Profile may not be permanently saved. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    setError('');
    try {
      // Import Firebase auth function
      const { sendPasswordResetEmail } = await import('firebase/auth');

      // Configure the action code settings for the password reset email
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: false,
      };

      // Send password reset email using Firebase
      await sendPasswordResetEmail(auth, user.email, actionCodeSettings);

      setShowProfileSettings(false);
      alert('Password reset link has been sent to your email address. Please check your email and click the link to reset your password.');
    } catch (error) {
      console.error('Firebase change password error:', error);
      let errorMessage = 'Failed to send password reset email. Please try again.';

      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }

      alert(errorMessage);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');

    // Validate email format on frontend
    const emailRegex = /^[a-zA-Z0-9._-]{1,1000}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const trimmedEmail = resetEmail?.trim();

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      // Import Firebase auth function
      const { sendPasswordResetEmail } = await import('firebase/auth');

      // Configure the action code settings for the password reset email
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: false,
      };

      // Send password reset email using Firebase
      await sendPasswordResetEmail(auth, trimmedEmail, actionCodeSettings);

      setResetEmailSent(true);
      setError('');
    } catch (error) {
      console.error('Firebase password reset error:', error);
      let errorMessage = 'Failed to send reset email. Please try again.';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }

      setError(errorMessage);
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
                      ```text

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
                      <div className="important-notice">
                        <p className="spam-notice">
                          <strong>Important:</strong> Please check your spam or junk folder if you haven't received the email within a few minutes. Sometimes our security emails may be filtered by your email provider.
                        </p>
                      </div>
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
                  alert('Trading Restricted: Only verified Elon team members are allowed to trade.');
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
            </div>
          </div>
        </div>

        <div className="binance-market-list">
          <div className="market-headers">
            <div className="header-col pair-header">Pair</div>
            <div className="header-col change-header">24h Change %</div>
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
                    alert('Trading Restricted: Only verified Elon team members are allowed to trade.');
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
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" className="profile-avatar-image" />
            ) : (
              (userName || user.email?.charAt(0) || 'U').toUpperCase()
            )}
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
            {isVerifiedElonTeam(user?.email) && (
              <div className="menu-item admin-access" onClick={() => {
                setShowAdminPanel(true);
                loadAllUsers();
              }}>
                <span className="menu-icon">🔧</span>
                <span className="menu-text">Admin Panel</span>
                <span className="menu-arrow">›</span>
              </div>
            )}
            <div className="menu-item">
              <span className="menu-icon">🔒</span>
              <span className="menu-text">Security</span>
              <span className="menu-arrow">›</span>
            </div>
            <div className="menu-item" onClick={() => setShowTradingHistory(true)}>
              <span className="menu-icon">📊</span>
              <span className="menu-text">Trading History</span>
              <span className="menu-arrow">›</span>
            </div>
          </div>
        </div>

        <div className="menu-section">
          <h4>Support</h4>
          <div className="menu-items">
            <div 
              className="menu-item" 
              onClick={() => window.open('https://wa.me/4915210305922?text=Hello%2C%20I%20need%20help%20with%20my%20Eloncrypto%20Exchange%20account', '_blank')}
            >
              <span className="menu-icon">💬</span>
              <span className="menu-text">Customer Support</span>
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
              <p>Contact support to process withdrawals to yourregistered bank account.</p>
              <button className="close-btn" onClick={() => setShowWithdraw(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileSettings && (
        <div className="modal-overlay">
          <div className="simple-profile-modal">
            <div className="profile-modal-header">
              <h3>Profile Settings</h3>
              <button className="profile-close-btn" onClick={() => setShowProfileSettings(false)}>
                ×
              </button>
            </div>

            <div className="profile-modal-content">
              <div className="profile-picture-section">
                <div className="circular-avatar-container">
                  <div className="circular-avatar">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="avatar-image" />
                    ) : (
                      <div className="default-avatar">
                        {(userName || user.email?.charAt(0) || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <label className="camera-overlay">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProfilePictureUpload}
                      style={{display: 'none'}}
                    />
                    <span className="camera-icon">📷</span>
                  </label>
                </div>
                <p className="picture-hint">Click the camera icon to change your profile picture</p>
              </div>

              <div className="profile-form">
                <div className="form-field">
                  <label className="field-label">Username</label>
                  <input 
                    type="text" 
                    className="profile-input"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your username"
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">Phone Number</label>
                  <input 
                    type="tel" 
                    className="profile-input"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div className="profile-actions">
                <button className="save-profile-btn" onClick={handleProfileUpdate}>
                  Save Changes
                </button>
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

      {showTradingHistory && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Trading History</h3>
                <button className="close-btn" onClick={() => setShowTradingHistory(false)}>
                  ×
                </button>
              </div>

              <div className="trading-history-content">
                <div className="history-tabs">
                  <button className="history-tab active">All Transactions</button>
                  <button className="history-tab">Deposits</button>
                  <button className="history-tab">Withdrawals</button>
                </div>

                <div className="transaction-history-list">
                  {transactions.length > 0 ? (
                    <div className="history-transactions">
                      <div className="history-header">
                        <span className="history-col">Type</span>
                        <span className="history-col">Asset</span>
                        <span className="history-col">Amount</span>
                        <span className="history-col">Status</span>
                        <span className="history-col">Date</span>
                      </div>
                      {transactions.map(tx => (
                        <div key={tx.id} className="history-row">
                          <div className="history-col">
                            <span className={`history-type-badge ${tx.type}`}>
                              {tx.type === 'buy' ? '💰 Deposit' : 
                               tx.type === 'sell' ? '💸 Withdrawal' : 
                               tx.type}
                            </span>
                          </div>
                          <div className="history-col">
                            <div className="history-asset">
                              <span className="asset-name">{tx.cryptoName}</span>
                            </div>
                          </div>
                          <div className="history-col">
                            <div className="history-amount">
                              <span className="amount-crypto">{tx.amount.toFixed(6)}</span>
                              <span className="amount-usd">${tx.total.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="history-col">
                            <span className="status-badge successful">
                              ✅ Successful
                            </span>
                          </div>
                          <div className="history-col">
                            <span className="history-date">
                              {new Date(tx.timestamp?.seconds * 1000).toLocaleDateString()}
                            </span>
                            <span className="history-time">
                              {new Date(tx.timestamp?.seconds * 1000).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-history">
                      <div className="no-history-icon">📊</div>
                      <h4>No Transactions Yet</h4>
                      <p>You haven't made any deposits or withdrawals yet.</p>
                      <p>Start trading to see your transaction history here.</p>
                      <div className="history-actions">
                        <button className="history-action-btn deposit" onClick={() => {
                          setShowTradingHistory(false);
                          setShowDeposit(true);
                        }}>
                          Make a Deposit
                        </button>
                        <button className="history-action-btn trade" onClick={() => {
                          setShowTradingHistory(false);
                          setActiveTab('trade');
                        }}>
                          Start Trading
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="history-summary">
                  <div className="summary-item">
                    <span className="summary-label">Total Deposits</span>
                    <span className="summary-value">
                      ${transactions.filter(tx => tx.type === 'buy').reduce((sum, tx) => sum + tx.total, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Withdrawals</span>
                    <span className="summary-value">
                      ${transactions.filter(tx => tx.type === 'sell').reduce((sum, tx) => sum + tx.total, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Net Flow</span>
                    <span className="summary-value positive">
                      +${(transactions.filter(tx => tx.type === 'buy').reduce((sum, tx) => sum + tx.total, 0) - 
                           transactions.filter(tx => tx.type === 'sell').reduce((sum, tx) => sum + tx.total, 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button className="close-btn" onClick={() => setShowTradingHistory(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminPanel && isVerifiedElonTeam(user?.email) && (
        <div className="modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3>🔧 Admin Control Panel</h3>
              <button className="close-btn" onClick={() => setShowAdminPanel(false)}>
                ×
              </button>
            </div>

            <div className="admin-modal-content">
              <div className="admin-section">
                <h4>💰 User Balance Management</h4>
                <div className="users-management">
                  {allUsers.length > 0 ? (
                    <div className="users-list">
                      {allUsers.map((userData) => (
                        <div key={userData.userId || userData.id} className="user-balance-item">
                          <div className="user-info">
                            <span className="user-email">{userData.email}</span>
                            <span className="user-id">ID: {userData.userId}</span>
                          </div>
                          <div className="balance-controls">
                            <span className="current-balance">
                              ${(userData.balance || 0).toLocaleString()}
                            </span>
                            <input
                              type="number"
                              placeholder="New balance"
                              className="balance-input"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const newBalance = e.target.value;
                                  if (newBalance && !isNaN(newBalance)) {
                                    updateUserBalance(userData.userId, newBalance);
                                    e.target.value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              className="update-balance-btn"
                              onClick={(e) => {
                                const input = e.target.previousElementSibling;
                                const newBalance = input.value;
                                if (newBalance && !isNaN(newBalance)) {
                                  updateUserBalance(userData.userId, newBalance);
                                  input.value = '';
                                }
                              }}
                            >
                              Update
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-users">
                      <p>No users found. Users will appear here once they register.</p>
                      <button onClick={loadAllUsers} className="refresh-users-btn">
                        🔄 Refresh Users
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-section">
                <h4>🏦 Payment Settings</h4>
                <div className="payment-settings">
                  <div className="setting-group">
                    <label>Bitcoin Address</label>
                    <input
                      type="text"
                      value={adminSettings.bitcoinAddress}
                      onChange={(e) => setAdminSettings({
                        ...adminSettings,
                        bitcoinAddress: e.target.value
                      })}
                      className="admin-input"
                    />
                  </div>

                  <div className="setting-group">
                    <label>Bank Account Name</label>
                    <input
                      type="text"
                      value={adminSettings.bankAccountName}
                      onChange={(e) => setAdminSettings({
                        ...adminSettings,
                        bankAccountName: e.target.value
                      })}
                      className="admin-input"
                    />
                  </div>

                  <div className="setting-group">
                    <label>Bank Account Number</label>
                    <input
                      type="text"
                      value={adminSettings.bankAccountNumber}
                      onChange={(e) => setAdminSettings({
                        ...adminSettings,
                        bankAccountNumber: e.target.value
                      })}
                      className="admin-input"
                    />
                  </div>

                  <div className="setting-group">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      value={adminSettings.bankName}
                      onChange={(e) => setAdminSettings({
                        ...adminSettings,
                        bankName: e.target.value
                      })}
                      className="admin-input"
                    />
                  </div>

                  <div className="setting-group">
                    <label>Routing Number</label>
                    <input
                      type="text"
                      value={adminSettings.routingNumber}
                      onChange={(e) => setAdminSettings({
                        ...adminSettings,
                        routingNumber: e.target.value
                      })}
                      className="admin-input"
                    />
                  </div>
                </div>
              </div>

              <div className="admin-section">
                <h4>🔐 Admin Account Settings</h4>
                <div className="admin-account-settings">
                  <div className="setting-group">
                    <label>Admin Email</label>
                    <input
                      type="email"
                      value={adminSettings.adminEmail}
                      onChange={(e) => setAdminSettings({
                        ...adminSettings,
                        adminEmail: e.target.value
                      })}
                      className="admin-input"
                    />
                  </div>

                  <div className="setting-group">
                    <label>New Admin Password</label>
                    <input
                      type="password"
                      value={adminSettings.adminPassword}
                      onChange={(e) => setAdminSettings({
                        ...adminSettings,
                        adminPassword: e.target.value
                      })}
                      placeholder="Enter new password (optional)"
                      className="admin-input"
                    />
                  </div>
                </div>
              </div>

              <div className="admin-actions">
                <button className="save-admin-btn" onClick={saveAdminSettings}>
                  💾 Save All Settings
                </button>
                <button className="refresh-users-btn" onClick={loadAllUsers}>
                  🔄 Refresh User List
                </button>
              </div>
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
  const [loading, setLoading] = useState(false);

  // Get the action code from URL parameters (Firebase uses 'oobCode')
  const actionCode = searchParams.get('oobCode') || searchParams.get('token');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!actionCode) {
      setError('Invalid or missing reset code. Please request a new password reset.');
      setLoading(false);
      return;
    }

    try {
      // Import Firebase auth functions for password reset
      const { confirmPasswordReset } = await import('firebase/auth');

      // Use Firebase's confirmPasswordReset method with the action code
      await confirmPasswordReset(auth, actionCode, newPassword);

      setSuccess(true);
    } catch (error) {
      console.error('Firebase password reset error:', error);
      let errorMessage = 'Failed to reset password. Please try again.';

      if (error.code === 'auth/expired-action-code') {
        errorMessage = 'Password reset link has expired. Please request a new one.';
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'Invalid password reset link. Please request a new one.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
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
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Resetting Password...' : 'Reset Password'}
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