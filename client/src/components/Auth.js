
import React, { useState } from 'react';
import { FaWallet, FaShieldAlt, FaChartLine, FaGift } from 'react-icons/fa';
import './Auth.css';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        onAuthSuccess(data.user, data.token);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <FaWallet />,
      title: "Multi-Currency Wallet",
      description: "Support for 100+ cryptocurrencies"
    },
    {
      icon: <FaShieldAlt />,
      title: "Bank-Level Security",
      description: "Your funds are protected with advanced encryption"
    },
    {
      icon: <FaChartLine />,
      title: "Real-Time Analytics",
      description: "Track your portfolio performance 24/7"
    },
    {
      icon: <FaGift />,
      title: "Staking Rewards",
      description: "Earn passive income on your holdings"
    }
  ];

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="auth-form-section">
          <div className="auth-card">
            <div className="trust-logo">
              <div className="logo-circle">
                <FaWallet />
              </div>
              <h1>Trust Crypto</h1>
            </div>

            <div className="form-header">
              <h2>{isLogin ? 'Welcome Back' : 'Create Your Wallet'}</h2>
              <p>{isLogin ? 'Sign in to access your crypto portfolio' : 'Join millions of users worldwide'}</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required={!isLogin}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" disabled={loading} className="auth-button">
                {loading ? (
                  <div className="loading-spinner-small"></div>
                ) : (
                  isLogin ? 'Sign In' : 'Create Wallet'
                )}
              </button>
            </form>

            <div className="auth-switch">
              <p>
                {isLogin ? "Don't have a wallet? " : "Already have a wallet? "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="switch-button"
                >
                  {isLogin ? 'Create One' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className="features-section">
          <div className="features-content">
            <h2>The Most Trusted Crypto Wallet</h2>
            <p>Experience the future of digital finance with our secure, user-friendly platform.</p>
            
            <div className="features-grid">
              {features.map((feature, index) => (
                <div key={index} className="feature-card">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="stats">
              <div className="stat">
                <h3>5M+</h3>
                <p>Active Users</p>
              </div>
              <div className="stat">
                <h3>$50B+</h3>
                <p>Assets Secured</p>
              </div>
              <div className="stat">
                <h3>100+</h3>
                <p>Cryptocurrencies</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
