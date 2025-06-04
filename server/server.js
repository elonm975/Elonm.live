
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../progressive-crypto-app/build')));

// In-memory storage (replace with database in production)
let users = [];
let investments = [];
let adminWallet = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"; // Your receiving wallet address

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'crypto_exchange_secret_key';

// Helper function to generate user ID
const generateUserId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = users.find(user => user.email === email || user.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: generateUserId(),
      username,
      email,
      fullName,
      password: hashedPassword,
      walletBalance: 0,
      totalInvested: 0,
      totalProfit: 0,
      investments: [],
      createdAt: new Date()
    };

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        walletBalance: newUser.walletBalance,
        totalInvested: newUser.totalInvested,
        totalProfit: newUser.totalProfit
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        walletBalance: user.walletBalance,
        totalInvested: user.totalInvested,
        totalProfit: user.totalProfit
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    walletBalance: user.walletBalance,
    totalInvested: user.totalInvested,
    totalProfit: user.totalProfit,
    investments: user.investments
  });
});

// Create investment
app.post('/api/invest', authenticateToken, (req, res) => {
  try {
    const { cryptoId, cryptoName, cryptoSymbol, amount, currentPrice } = req.body;
    const user = users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const investment = {
      id: generateUserId(),
      userId: user.id,
      cryptoId,
      cryptoName,
      cryptoSymbol,
      amount: parseFloat(amount),
      investmentPrice: parseFloat(currentPrice),
      currentPrice: parseFloat(currentPrice),
      profit: 0,
      profitPercentage: 0,
      createdAt: new Date(),
      receivingWallet: adminWallet
    };

    // Add investment to user's investments
    user.investments.push(investment);
    user.totalInvested += investment.amount * investment.investmentPrice;

    // Add to global investments array
    investments.push(investment);

    res.status(201).json({
      message: 'Investment created successfully',
      investment,
      receivingWallet: adminWallet
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update investment profits (Admin only)
app.put('/api/admin/update-profit/:investmentId', (req, res) => {
  try {
    const { investmentId } = req.params;
    const { newPrice, profitAmount } = req.body;

    // Find investment
    const investment = investments.find(inv => inv.id === investmentId);
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    // Find user
    const user = users.find(u => u.id === investment.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update investment
    investment.currentPrice = parseFloat(newPrice);
    investment.profit = parseFloat(profitAmount);
    investment.profitPercentage = ((investment.profit / (investment.amount * investment.investmentPrice)) * 100);

    // Update user's investment in their array
    const userInvestmentIndex = user.investments.findIndex(inv => inv.id === investmentId);
    if (userInvestmentIndex !== -1) {
      user.investments[userInvestmentIndex] = investment;
    }

    // Update user's total profit
    user.totalProfit = user.investments.reduce((total, inv) => total + inv.profit, 0);
    user.walletBalance = user.totalProfit;

    res.json({
      message: 'Investment profit updated successfully',
      investment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all investments (Admin only)
app.get('/api/admin/investments', (req, res) => {
  res.json({
    investments,
    totalUsers: users.length,
    totalInvestments: investments.length,
    adminWallet
  });
});

// Get user's investments
app.get('/api/investments', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({
    investments: user.investments,
    totalInvested: user.totalInvested,
    totalProfit: user.totalProfit,
    walletBalance: user.walletBalance
  });
});

// Deposit funds
app.post('/api/deposit', authenticateToken, (req, res) => {
  try {
    const { amount } = req.body;
    const user = users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid deposit amount' });
    }

    user.walletBalance += parseFloat(amount);

    res.json({
      message: 'Deposit successful',
      newBalance: user.walletBalance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Withdraw funds
app.post('/api/withdraw', authenticateToken, (req, res) => {
  try {
    const { amount } = req.body;
    const user = users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    if (amount > user.walletBalance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    user.walletBalance -= parseFloat(amount);

    res.json({
      message: 'Withdrawal successful',
      newBalance: user.walletBalance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Sell investment
app.post('/api/sell-investment/:investmentId', authenticateToken, (req, res) => {
  try {
    const { investmentId } = req.params;
    const user = users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find investment in user's portfolio
    const investmentIndex = user.investments.findIndex(inv => inv.id === investmentId);
    if (investmentIndex === -1) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    const investment = user.investments[investmentIndex];
    
    // Calculate sale value (current price * amount + profit)
    const saleValue = (investment.currentPrice * investment.amount) + investment.profit;
    
    // Add sale value to wallet
    user.walletBalance += saleValue;
    
    // Update user totals
    user.totalInvested -= (investment.investmentPrice * investment.amount);
    user.totalProfit -= investment.profit;
    
    // Remove investment from user's portfolio
    user.investments.splice(investmentIndex, 1);
    
    // Remove from global investments array
    const globalInvestmentIndex = investments.findIndex(inv => inv.id === investmentId);
    if (globalInvestmentIndex !== -1) {
      investments.splice(globalInvestmentIndex, 1);
    }

    res.json({
      message: 'Investment sold successfully',
      saleValue: saleValue,
      newBalance: user.walletBalance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../progressive-crypto-app/build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Admin wallet address: ${adminWallet}`);
});
