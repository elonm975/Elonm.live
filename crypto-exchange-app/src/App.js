
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
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
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
            <form onSubmit={handleSignIn}>
              <h2>Sign In</h2>
              {error && <div className="error">{error}</div>}
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
              <button type="submit">Sign In</button>
              <button type="button" onClick={handleSignUp}>
                Create Account
              </button>
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
