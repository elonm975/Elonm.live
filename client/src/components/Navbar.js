
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaWallet, FaChartBar, FaExchangeAlt, FaCog } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: <FaHome />, label: 'Home' },
    { path: '/portfolio', icon: <FaWallet />, label: 'Portfolio' },
    { path: '/market', icon: <FaChartBar />, label: 'Market' },
    { path: '/transactions', icon: <FaExchangeAlt />, label: 'History' },
    { path: '/settings', icon: <FaCog />, label: 'Settings' }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <div className="nav-icon">{item.icon}</div>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
