import React, { useState } from 'react';
import './Auth.css';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: ''
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
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onAuthSuccess(data.user);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="wallet-logo">TW</div>
        <h2>{isLogin ? 'Welcome Back' : 'Create Your Wallet'}</h2>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required={!isLogin}
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required={!isLogin}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
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
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="switch-button"
            >
              {isLogin ? 'Create Account' : 'Login'}
            </button>
          </p>
        </div>

        {!isLogin && (
          <div className="trust-features">
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <span>Secure multi-crypto wallet</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <span>Buy, sell, and swap crypto</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <span>Track your portfolio</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <span>Earn rewards on holdings</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;