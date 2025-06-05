const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const Database = require("@replit/database")
const db = new Database()

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'trust_wallet_secret_key_2024';

// Middleware
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'trust-wallet-app/build')));

// Admin Configuration - Can be edited by admin
let adminConfig = {
  bitcoinAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  bankAccount: {
    accountName: 'Crypto Exchange LLC',
    accountNumber: '1234567890',
    bankName: 'Digital Bank',
    routingNumber: '987654321'
  },
  commissionRate: 0.02, // 2% commission
  minDeposit: 50,
  minWithdraw: 25
};

// In-memory storage
//let users = [];
//let portfolios = [];
//let transactions = [];
//let deposits = [];
//let withdrawals = [];

// Helper function to get users from the database
const getUsers = async () => {
  try {
    const users = await db.get("users");
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Error getting users:", error);
    return [];
  }
};

// Helper function to save users to the database
const saveUsers = async (users) => {
  try {
    if (!Array.isArray(users)) {
      throw new Error("Users data must be an array");
    }
    await db.set("users", users);
    console.log("Users saved successfully");
  } catch (error) {
    console.error("Error saving users:", error);
    throw error;
  }
};

// Helper function to get portfolios from the database
const getPortfolios = async () => {
  try {
    const portfolios = await db.get("portfolios");
    return portfolios ? portfolios : [];
  } catch (error) {
    console.error("Error getting portfolios:", error);
    return [];
  }
};

// Helper function to save portfolios to the database
const savePortfolios = async (portfolios) => {
  try {
    await db.set("portfolios", portfolios);
    console.log("Portfolios saved successfully");
  } catch (error) {
    console.error("Error saving portfolios:", error);
  }
};

// Helper function to get transactions from the database
const getTransactions = async () => {
  try {
    const transactions = await db.get("transactions");
    return transactions ? transactions : [];
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
  }
};

// Helper function to save transactions to the database
const saveTransactions = async (transactions) => {
  try {
    await db.set("transactions", transactions);
    console.log("Transactions saved successfully");
  } catch (error) {
    console.error("Error saving transactions:", error);
  }
};

// Helper function to get deposits from the database
const getDeposits = async () => {
  try {
    const deposits = await db.get("deposits");
    return deposits ? deposits : [];
  } catch (error) {
    console.error("Error getting deposits:", error);
    return [];
  }
};

// Helper function to save deposits to the database
const saveDeposits = async (deposits) => {
  try {
    await db.set("deposits", deposits);
    console.log("Deposits saved successfully");
  } catch (error) {
    console.error("Error saving deposits:", error);
  }
};

// Helper function to get withdrawals from the database
const getWithdrawals = async () => {
  try {
    const withdrawals = await db.get("withdrawals");
    return withdrawals ? withdrawals : [];
  } catch (error) {
    console.error("Error getting withdrawals:", error);
    return [];
  }
};

// Helper function to save withdrawals to the database
const saveWithdrawals = async (withdrawals) => {
  try {
    await db.set("withdrawals", withdrawals);
    console.log("Withdrawals saved successfully");
  } catch (error) {
    console.error("Error saving withdrawals:", error);
  }
};

// Default admin user
const defaultAdmin = {
  id: 'admin-001',
  email: 'admin@cryptoexchange.com',
  firstName: 'Admin',
  lastName: 'User',
  password: '$2a$12$LQv3c1yqBwADSVdOCU.RQOa2Z2mAYFP4LbWPAk7.1t8.6AqJU5N8m', // password: admin123
  role: 'admin',
  walletAddress: adminConfig.bitcoinAddress,
  balance: 0,
  isAdmin: true,
  createdAt: new Date().toISOString()
};

//users.push(defaultAdmin);

let cryptoPrices = {
  'bitcoin': { price: 67234.50, change: 2.45, symbol: 'BTC', name: 'Bitcoin' },
  'ethereum': { price: 3567.89, change: -1.23, symbol: 'ETH', name: 'Ethereum' },
  'binancecoin': { price: 589.34, change: 4.56, symbol: 'BNB', name: 'BNB' },
  'cardano': { price: 1.23, change: 3.21, symbol: 'ADA', name: 'Cardano' },
  'solana': { price: 178.45, change: 5.67, symbol: 'SOL', name: 'Solana' },
  'polygon': { price: 0.89, change: -2.34, symbol: 'MATIC', name: 'Polygon' },
  'avalanche': { price: 45.67, change: 1.89, symbol: 'AVAX', name: 'Avalanche' },
  'chainlink': { price: 23.45, change: 2.78, symbol: 'LINK', name: 'Chainlink' }
};

// Helper functions
const generateId = () => uuidv4();

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

const authenticateAdmin = async (req, res, next) => {
  authenticateToken(req, res, async () => {
    const users = await getUsers();
    const user = users.find(u => u.id === req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, username } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !username) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Email validation (case insensitive)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Username validation (letters and numbers only, case insensitive)
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: 'Username can only contain letters and numbers' });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long' });
    }

    // Password validation (must contain uppercase, lowercase, and numbers)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number' });
    }

    const users = await getUsers();
    
    // Check for existing email (case insensitive)
    const existingEmail = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check for existing username (case insensitive)
    const existingUsername = users.find(user => user.username && user.username.toLowerCase() === username.toLowerCase());
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const walletAddress = `1${Math.random().toString(16).substr(2, 33).toUpperCase()}`;

    const newUser = {
      id: generateId(),
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      firstName,
      lastName,
      password: hashedPassword,
      walletAddress,
      balance: 0,
      role: 'user',
      isAdmin: false,
      status: 'active',
      totalInvested: 0,
      totalProfits: 0,
      profitPercentage: 0,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers(users);

    // Initialize portfolio
    const portfolios = await getPortfolios();
    portfolios.push({
      userId: newUser.id,
      holdings: [],
      totalValue: 0,
      totalProfit: 0
    });
    await savePortfolios(portfolios);

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        walletAddress: newUser.walletAddress,
        balance: newUser.balance,
        role: newUser.role,
        isAdmin: newUser.isAdmin,
        totalInvested: newUser.totalInvested,
        totalProfits: newUser.totalProfits,
        profitPercentage: newUser.profitPercentage
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const users = await getUsers();
    // Allow login with either email or username (case insensitive)
    const user = users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() || 
      (u.username && u.username.toLowerCase() === email.toLowerCase())
    );
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended. Contact admin.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        balance: user.balance,
        role: user.role,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Routes
app.get('/api/admin/config', authenticateAdmin, (req, res) => {
  res.json(adminConfig);
});

app.put('/api/admin/config', authenticateAdmin, async (req, res) => {
  try {
    const { bitcoinAddress, bankAccount, commissionRate, minDeposit, minWithdraw } = req.body;

    if (bitcoinAddress) adminConfig.bitcoinAddress = bitcoinAddress;
    if (bankAccount) adminConfig.bankAccount = { ...adminConfig.bankAccount, ...bankAccount };
    if (commissionRate !== undefined) adminConfig.commissionRate = commissionRate;
    if (minDeposit !== undefined) adminConfig.minDeposit = minDeposit;
    if (minWithdraw !== undefined) adminConfig.minWithdraw = minWithdraw;

    // Save to database
    await db.set("adminConfig", adminConfig);

    res.json({ message: 'Configuration updated successfully', config: adminConfig });
  } catch (error) {
    console.error('Error updating admin config:', error);
    res.status(500).json({ message: 'Failed to update configuration' });
  }
});

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  const users = await getUsers();
  const userList = users.map(user => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    balance: user.balance,
    role: user.role,
    status: user.status || 'active',
    createdAt: user.createdAt
  }));
  res.json(userList);
});

app.put('/api/admin/users/:userId/balance', authenticateAdmin, async (req, res) => {
  const { userId } = req.params;
  const { balance, action, amount } = req.body;

  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (action === 'set') {
    user.balance = parseFloat(balance);
  } else if (action === 'add') {
    user.balance += parseFloat(amount);
  } else if (action === 'subtract') {
    user.balance -= parseFloat(amount);
  }
  await saveUsers(users);

  // Record admin transaction
  const transactions = await getTransactions();
  transactions.push({
    id: generateId(),
    userId: userId,
    type: 'admin_adjustment',
    amount: action === 'set' ? balance : amount,
    action: action,
    adminId: req.user.userId,
    timestamp: new Date().toISOString()
  });
  await saveTransactions(transactions);

  res.json({ message: 'Balance updated successfully', newBalance: user.balance });
});

app.put('/api/admin/users/:userId/status', authenticateAdmin, async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.status = status;
  await saveUsers(users);
  res.json({ message: `User ${status} successfully` });
});

app.get('/api/admin/transactions', authenticateAdmin, async (req, res) => {
  const transactions = await getTransactions();
  const users = await getUsers();
  const allTransactions = transactions.map(t => {
    const user = users.find(u => u.id === t.userId);
    return {
      ...t,
      userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown'
    };
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(allTransactions);
});

app.get('/api/admin/deposits', authenticateAdmin, async (req, res) => {
  const deposits = await getDeposits();
  const users = await getUsers();
  const allDeposits = deposits.map(d => {
    const user = users.find(u => u.id === d.userId);
    return {
      ...d,
      userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown'
    };
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(allDeposits);
});

app.put('/api/admin/deposits/:depositId', authenticateAdmin, async (req, res) => {
  const { depositId } = req.params;
  const { status } = req.body;

  const deposits = await getDeposits();
  const users = await getUsers();
  const deposit = deposits.find(d => d.id === depositId);
  if (!deposit) {
    return res.status(404).json({ message: 'Deposit not found' });
  }

  deposit.status = status;
  deposit.processedAt = new Date().toISOString();
  deposit.processedBy = req.user.userId;
  await saveDeposits(deposits);

  if (status === 'approved') {
    const user = users.find(u => u.id === deposit.userId);
    if (user) {
      user.balance += deposit.amount;
      await saveUsers(users);

      const transactions = await getTransactions();
      transactions.push({
        id: generateId(),
        userId: deposit.userId,
        type: 'deposit_approved',
        amount: deposit.amount,
        timestamp: new Date().toISOString()
      });
      await saveTransactions(transactions);
    }
  }

  res.json({ message: `Deposit ${status} successfully` });
});

// Portfolio Routes
app.get('/api/portfolio', authenticateToken, async (req, res) => {
  const portfolios = await getPortfolios();
  let portfolio = portfolios.find(p => p.userId === req.user.userId);
  if (!portfolio) {
    return res.status(404).json({ message: 'Portfolio not found' });
  }

  let totalValue = 0;
  const updatedHoldings = portfolio.holdings.map(holding => {
    const currentPrice = cryptoPrices[holding.cryptoId]?.price || 0;
    const currentValue = holding.amount * currentPrice;
    const profit = currentValue - holding.invested;
    const profitPercentage = holding.invested > 0 ? (profit / holding.invested) * 100 : 0;

    totalValue += currentValue;

    return {
      ...holding,
      currentPrice,
      currentValue,
      profit,
      profitPercentage
    };
  });

  portfolio.holdings = updatedHoldings;
  portfolio.totalValue = totalValue;
  await savePortfolios(portfolios);

  res.json(portfolio);
});

// Trading Routes
app.post('/api/buy', authenticateToken, async (req, res) => {
  try {
    const { cryptoId, amount, price } = req.body;
    const users = await getUsers();
    const portfolios = await getPortfolios();
    const user = users.find(u => u.id === req.user.userId);
    const portfolio = portfolios.find(p => p.userId === req.user.userId);

    if (!user || !portfolio) {
      return res.status(404).json({ message: 'User or portfolio not found' });
    }

    const totalCost = amount * price;
    const commission = totalCost * adminConfig.commissionRate;
    const finalCost = totalCost + commission;

    if (user.balance < finalCost) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    user.balance -= finalCost;
    await saveUsers(users);

    const existingHolding = portfolio.holdings.find(h => h.cryptoId === cryptoId);
    if (existingHolding) {
      const newAmount = existingHolding.amount + amount;
      const newInvested = existingHolding.invested + totalCost;
      existingHolding.amount = newAmount;
      existingHolding.invested = newInvested;
      existingHolding.avgPrice = newInvested / newAmount;
    } else {
      portfolio.holdings.push({
        id: generateId(),
        cryptoId,
        symbol: cryptoPrices[cryptoId]?.symbol || 'UNKNOWN',
        name: cryptoPrices[cryptoId]?.name || 'Unknown',
        amount,
        avgPrice: price,
        invested: totalCost,
        purchaseDate: new Date().toISOString()
      });
    }
    await savePortfolios(portfolios);

    const transactions = await getTransactions();
    transactions.push({
      id: generateId(),
      userId: req.user.userId,
      type: 'buy',
      cryptoId,
      amount,
      price,
      total: totalCost,
      commission,
      timestamp: new Date().toISOString()
    });
    await saveTransactions(transactions);

    res.json({
      message: 'Purchase successful',
      newBalance: user.balance,
      commission,
      transaction: {
        type: 'buy',
        amount,
        price,
        total: totalCost,
        commission
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/sell', authenticateToken, async (req, res) => {
  try {
    const { cryptoId, amount } = req.body;
    const users = await getUsers();
    const portfolios = await getPortfolios();
    const user = users.find(u => u.id === req.user.userId);
    const portfolio = portfolios.find(p => p.userId === req.user.userId);

    if (!user || !portfolio) {
      return res.status(404).json({ message: 'User or portfolio not found' });
    }

    const holding = portfolio.holdings.find(h => h.cryptoId === cryptoId);
    if (!holding || holding.amount < amount) {
      return res.status(400).json({ message: 'Insufficient holdings' });
    }

    const currentPrice = cryptoPrices[cryptoId]?.price || 0;
    const saleValue = amount * currentPrice;
    const commission = saleValue * adminConfig.commissionRate;
    const finalValue = saleValue - commission;

    holding.amount -= amount;
    const proportionSold = amount / (holding.amount + amount);
    holding.invested -= holding.invested * proportionSold;

    if (holding.amount === 0) {
      portfolio.holdings = portfolio.holdings.filter(h => h.id !== holding.id);
    } else {
      holding.avgPrice = holding.invested / holding.amount;
    }
    await savePortfolios(portfolios);

    user.balance += finalValue;
    await saveUsers(users);

    const transactions = await getTransactions();
    transactions.push({
      id: generateId(),
      userId: req.user.userId,
      type: 'sell',
      cryptoId,
      amount,
      price: currentPrice,
      total: saleValue,
      commission,
      timestamp: new Date().toISOString()
    });
    await saveTransactions(transactions);

    res.json({
      message: 'Sale successful',
      newBalance: user.balance,
      saleValue: finalValue,
      commission
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Deposit Routes
app.get('/api/deposit/info', authenticateToken, (req, res) => {
  res.json({
    bitcoinAddress: adminConfig.bitcoinAddress,
    bankAccount: adminConfig.bankAccount,
    minDeposit: adminConfig.minDeposit
  });
});

app.post('/api/deposit', authenticateToken, async (req, res) => {
  try {
    const { amount, method, reference } = req.body;

    if (amount < adminConfig.minDeposit) {
      return res.status(400).json({ message: `Minimum deposit is $${adminConfig.minDeposit}` });
    }

    const newDeposit = {
      id: generateId(),
      userId: req.user.userId,
      amount: parseFloat(amount),
      method, // 'bitcoin' or 'bank'
      reference,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    const deposits = await getDeposits();
    deposits.push(newDeposit);
    await saveDeposits(deposits);

    res.json({
      message: 'Deposit request submitted successfully. It will be processed by admin.',
      deposit: newDeposit
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/deposits', authenticateToken, async (req, res) => {
  const deposits = await getDeposits();
  const userDeposits = deposits
    .filter(d => d.userId === req.user.userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(userDeposits);
});

// Withdrawal Routes
app.post('/api/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, method, address } = req.body;
    const users = await getUsers();
    const user = users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (amount < adminConfig.minWithdraw) {
      return res.status(400).json({ message: `Minimum withdrawal is $${adminConfig.minWithdraw}` });
    }

    if (amount > user.balance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const newWithdrawal = {
      id: generateId(),
      userId: req.user.userId,
      amount: parseFloat(amount),
      method,
      address,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    const withdrawals = await getWithdrawals();
    withdrawals.push(newWithdrawal);
    await saveWithdrawals(withdrawals);

    res.json({
      message: 'Withdrawal request submitted successfully. It will be processed by admin.',
      withdrawal: newWithdrawal
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/withdrawals', authenticateToken, async (req, res) => {
  const withdrawals = await getWithdrawals();
  const userWithdrawals = withdrawals
    .filter(w => w.userId === req.user.userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(userWithdrawals);
});

// Market data
app.get('/api/market', (req, res) => {
  res.json(cryptoPrices);
});

// Database status endpoint
app.get('/api/admin/database-status', authenticateAdmin, async (req, res) => {
  try {
    const status = {
      connected: true,
      collections: {},
      timestamp: new Date().toISOString()
    };

    // Check each collection
    const users = await getUsers();
    const portfolios = await getPortfolios();
    const transactions = await getTransactions();
    const deposits = await getDeposits();
    const withdrawals = await getWithdrawals();

    status.collections = {
      users: users.length,
      portfolios: portfolios.length,
      transactions: transactions.length,
      deposits: deposits.length,
      withdrawals: withdrawals.length
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Investment and Profit Management
app.get('/api/investments', authenticateToken, async (req, res) => {
  const users = await getUsers();
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const transactions = await getTransactions();
  const userTransactions = transactions
    .filter(t => t.userId === req.user.userId && t.type === 'investment')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    totalInvested: user.totalInvested || 0,
    totalProfits: user.totalProfits || 0,
    profitPercentage: user.profitPercentage || 0,
    investments: userTransactions
  });
});

app.post('/api/invest', authenticateToken, async (req, res) => {
  try {
    const { amount, method, reference } = req.body;
    const users = await getUsers();
    const user = users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (amount < adminConfig.minDeposit) {
      return res.status(400).json({ message: `Minimum investment is $${adminConfig.minDeposit}` });
    }

    const newInvestment = {
      id: generateId(),
      userId: req.user.userId,
      amount: parseFloat(amount),
      method,
      reference,
      status: 'pending',
      type: 'investment',
      timestamp: new Date().toISOString()
    };

    const transactions = await getTransactions();
    transactions.push(newInvestment);
    await saveTransactions(transactions);

    const deposits = await getDeposits();
    deposits.push(newInvestment);
    await saveDeposits(deposits);

    res.json({
      message: 'Investment request submitted successfully. It will be processed by admin.',
      investment: newInvestment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/admin/users/:userId/profits', authenticateAdmin, async (req, res) => {
  const { userId } = req.params;
  const { totalProfits, profitPercentage, action } = req.body;

  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (action === 'set') {
    user.totalProfits = parseFloat(totalProfits) || 0;
    user.profitPercentage = parseFloat(profitPercentage) || 0;
  } else if (action === 'add') {
    user.totalProfits = (user.totalProfits || 0) + parseFloat(totalProfits || 0);
    user.profitPercentage = (user.profitPercentage || 0) + parseFloat(profitPercentage || 0);
  }
  await saveUsers(users);

  // Record admin profit adjustment
  const transactions = await getTransactions();
  transactions.push({
    id: generateId(),
    userId: userId,
    type: 'profit_adjustment',
    profitAmount: totalProfits,
    profitPercentage: profitPercentage,
    action: action,
    adminId: req.user.userId,
    timestamp: new Date().toISOString()
  });
  await saveTransactions(transactions);

  res.json({ 
    message: 'Profits updated successfully', 
    totalProfits: user.totalProfits,
    profitPercentage: user.profitPercentage
  });
});

app.put('/api/admin/investments/:investmentId', authenticateAdmin, async (req, res) => {
  const { investmentId } = req.params;
  const { status } = req.body;

  const transactions = await getTransactions();
  const deposits = await getDeposits();
  const investment = transactions.find(t => t.id === investmentId && t.type === 'investment');
  const deposit = deposits.find(d => d.id === investmentId);

  if (!investment || !deposit) {
    return res.status(404).json({ message: 'Investment not found' });
  }

  investment.status = status;
  deposit.status = status;
  investment.processedAt = new Date().toISOString();
  deposit.processedAt = new Date().toISOString();
  investment.processedBy = req.user.userId;
  deposit.processedBy = req.user.userId;

  await saveTransactions(transactions);
  await saveDeposits(deposits);

  if (status === 'approved') {
    const users = await getUsers();
    const user = users.find(u => u.id === investment.userId);
    if (user) {
      user.totalInvested = (user.totalInvested || 0) + investment.amount;
      await saveUsers(users);
    }
  }

  res.json({ message: `Investment ${status} successfully` });
});

// Transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
  const transactions = await getTransactions();
  const userTransactions = transactions
    .filter(t => t.userId === req.user.userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 50);

  res.json(userTransactions);
});

// Real-time price updates
setInterval(() => {
  Object.keys(cryptoPrices).forEach(cryptoId => {
    const volatility = 0.02;
    const change = (Math.random() - 0.5) * volatility;
    cryptoPrices[cryptoId].price *= (1 + change);
    cryptoPrices[cryptoId].change = ((Math.random() - 0.5) * 10);
  });

  io.emit('priceUpdate', cryptoPrices);
}, 5000);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.emit('priceUpdate', cryptoPrices);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Serve React app
app.get('*', (req, res) => {
  const buildPath = path.join(__dirname, 'trust-wallet-app/build', 'index.html');
  if (require('fs').existsSync(buildPath)) {
    res.sendFile(buildPath);
  } else {
    res.json({ 
      message: 'Crypto Exchange API Server', 
      status: 'running',
      endpoints: {
        auth: '/api/auth/login, /api/auth/register',
        market: '/api/market',
        portfolio: '/api/portfolio',
        trading: '/api/buy, /api/sell',
        deposits: '/api/deposit, /api/deposits',
        withdrawals: '/api/withdraw, /api/withdrawals',
        admin: '/api/admin/*'
      }
    });
  }
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Crypto Exchange Server running on http://0.0.0.0:${PORT}`);
  console.log(`👤 Default Admin: admin@cryptoexchange.com / admin123`);
  console.log(`💰 ${Object.keys(cryptoPrices).length} cryptocurrencies available`);
  console.log(`🔧 Admin Bitcoin Address: ${adminConfig.bitcoinAddress}`);

  try {
    // Initialize default admin user if not already in the database
    let users = await getUsers();
    const adminExists = users.find(user => user.id === defaultAdmin.id);
    if (!adminExists) {
      users.push(defaultAdmin);
      await saveUsers(users);
      console.log('✅ Default admin user initialized in database.');
    } else {
      console.log('✅ Default admin user already exists in database.');
    }

    // Initialize admin config in database
    const existingConfig = await db.get("adminConfig");
    if (!existingConfig) {
      await db.set("adminConfig", adminConfig);
      console.log('✅ Admin configuration initialized in database.');
    } else {
      // Load existing config from database
      adminConfig = { ...adminConfig, ...existingConfig };
      console.log('✅ Admin configuration loaded from database.');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
});