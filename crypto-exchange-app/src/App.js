import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
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
    }
  }, [user]);

  const fetchCryptoData = async () => {
    try {
      const q = query(collection(db, 'cryptoTransactions'), orderBy('timestamp', 'desc'));
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

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    // Validate email format
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

      // Store additional user data in Firestore
      await addDoc(collection(db, 'users'), {
        uid: userCredential.user.uid,
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
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

  const addTransaction = async (type, amount, crypto) => {
    try {
      await addDoc(collection(db, 'cryptoTransactions'), {
        userId: user.uid,
        type: type,
        amount: amount,
        cryptocurrency: crypto,
        timestamp: new Date(),
        userEmail: user.email
      });
      fetchCryptoData();
    } catch (error) {
      setError('Error adding transaction: ' + error.message);
    }
  };

  const switchToSignUp = () => {
    setIsSignUp(true);
    setError('');
    setEmail('');
    setPassword('');
    setUsername('');
    setName('');
  };

  const switchToSignIn = () => {
    setIsSignUp(false);
    setError('');
    setEmail('');
    setPassword('');
    setUsername('');
    setName('');
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
          <h1>Elon Crypto Exchange</h1>
          <div className="auth-container">
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
              <h2>{isSignUp ? 'Create Account' : 'Sign In'}</h2>
              {error && <div className="error">{error}</div>}

              {isSignUp && (
                <>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </>
              )}

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
              <button type="submit">{isSignUp ? 'Sign Up' : 'Sign In'}</button>

              {isSignUp ? (
                <button type="button" onClick={switchToSignIn}>
                  Already have an account? Sign In
                </button>
              ) : (
                <button type="button" onClick={switchToSignUp}>
                  Create Account
                </button>
              )}
            </form>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Elon Crypto Exchange</h1>
        <div className="user-info">
          <p>Welcome, {user.email}!</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      </header>

      <main className="main-content">
        <section className="trading-section">
          <h2>Quick Trade</h2>
          <div className="trade-buttons">
            <button 
              className="buy-btn"
              onClick={() => addTransaction('buy', 100, 'Bitcoin')}
            >
              Buy Bitcoin ($100)
            </button>
            <button 
              className="buy-btn"
              onClick={() => addTransaction('buy', 50, 'Ethereum')}
            >
              Buy Ethereum ($50)
            </button>
            <button 
              className="sell-btn"
              onClick={() => addTransaction('sell', 75, 'Dogecoin')}
            >
              Sell Dogecoin ($75)
            </button>
          </div>
        </section>

        <section className="transactions-section">
          <h2>Recent Transactions</h2>
          <div className="transactions-list">
            {cryptoData.length === 0 ? (
              <p>No transactions yet. Start trading!</p>
            ) : (
              cryptoData.map(transaction => (
                <div key={transaction.id} className="transaction-item">
                  <span className={`transaction-type ${transaction.type}`}>
                    {transaction.type.toUpperCase()}
                  </span>
                  <span className="crypto-name">{transaction.cryptocurrency}</span>
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
    </div>
  );
}

export default App;