
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

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
let users = [];
let portfolios = [];
let transactions = [];
let deposits = [];
let withdrawals = [];

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

users.push(defaultAdmin);

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

const authenticateAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
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
    const { email, password, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const walletAddress = `1${Math.random().toString(16).substr(2, 33).toUpperCase()}`;

    const newUser = {
      id: generateId(),
      email,
      firstName,
      lastName,
      password: hashedPassword,
      walletAddress,
      balance: 0,
      role: 'user',
      isAdmin: false,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    // Initialize portfolio
    portfolios.push({
      userId: newUser.id,
      holdings: [],
      totalValue: 0,
      totalProfit: 0
    });

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        walletAddress: newUser.walletAddress,
        balance: newUser.balance,
        role: newUser.role,
        isAdmin: newUser.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
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

app.put('/api/admin/config', authenticateAdmin, (req, res) => {
  const { bitcoinAddress, bankAccount, commissionRate, minDeposit, minWithdraw } = req.body;
  
  if (bitcoinAddress) adminConfig.bitcoinAddress = bitcoinAddress;
  if (bankAccount) adminConfig.bankAccount = { ...adminConfig.bankAccount, ...bankAccount };
  if (commissionRate !== undefined) adminConfig.commissionRate = commissionRate;
  if (minDeposit !== undefined) adminConfig.minDeposit = minDeposit;
  if (minWithdraw !== undefined) adminConfig.minWithdraw = minWithdraw;

  res.json({ message: 'Configuration updated successfully', config: adminConfig });
});

app.get('/api/admin/users', authenticateAdmin, (req, res) => {
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

app.put('/api/admin/users/:userId/balance', authenticateAdmin, (req, res) => {
  const { userId } = req.params;
  const { balance, action, amount } = req.body;

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

  // Record admin transaction
  transactions.push({
    id: generateId(),
    userId: userId,
    type: 'admin_adjustment',
    amount: action === 'set' ? balance : amount,
    action: action,
    adminId: req.user.userId,
    timestamp: new Date().toISOString()
  });

  res.json({ message: 'Balance updated successfully', newBalance: user.balance });
});

app.put('/api/admin/users/:userId/status', authenticateAdmin, (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.status = status;
  res.json({ message: `User ${status} successfully` });
});

app.get('/api/admin/transactions', authenticateAdmin, (req, res) => {
  const allTransactions = transactions.map(t => {
    const user = users.find(u => u.id === t.userId);
    return {
      ...t,
      userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown'
    };
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(allTransactions);
});

app.get('/api/admin/deposits', authenticateAdmin, (req, res) => {
  const allDeposits = deposits.map(d => {
    const user = users.find(u => u.id === d.userId);
    return {
      ...d,
      userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown'
    };
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(allDeposits);
});

app.put('/api/admin/deposits/:depositId', authenticateAdmin, (req, res) => {
  const { depositId } = req.params;
  const { status } = req.body;

  const deposit = deposits.find(d => d.id === depositId);
  if (!deposit) {
    return res.status(404).json({ message: 'Deposit not found' });
  }

  deposit.status = status;
  deposit.processedAt = new Date().toISOString();
  deposit.processedBy = req.user.userId;

  if (status === 'approved') {
    const user = users.find(u => u.id === deposit.userId);
    if (user) {
      user.balance += deposit.amount;
      
      transactions.push({
        id: generateId(),
        userId: deposit.userId,
        type: 'deposit_approved',
        amount: deposit.amount,
        timestamp: new Date().toISOString()
      });
    }
  }

  res.json({ message: `Deposit ${status} successfully` });
});

// Portfolio Routes
app.get('/api/portfolio', authenticateToken, (req, res) => {
  const portfolio = portfolios.find(p => p.userId === req.user.userId);
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

  res.json(portfolio);
});

// Trading Routes
app.post('/api/buy', authenticateToken, (req, res) => {
  try {
    const { cryptoId, amount, price } = req.body;
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

app.post('/api/sell', authenticateToken, (req, res) => {
  try {
    const { cryptoId, amount } = req.body;
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

    user.balance += finalValue;

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

app.post('/api/deposit', authenticateToken, (req, res) => {
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

    deposits.push(newDeposit);

    res.json({
      message: 'Deposit request submitted successfully. It will be processed by admin.',
      deposit: newDeposit
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/deposits', authenticateToken, (req, res) => {
  const userDeposits = deposits
    .filter(d => d.userId === req.user.userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(userDeposits);
});

// Withdrawal Routes
app.post('/api/withdraw', authenticateToken, (req, res) => {
  try {
    const { amount, method, address } = req.body;
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

    withdrawals.push(newWithdrawal);

    res.json({
      message: 'Withdrawal request submitted successfully. It will be processed by admin.',
      withdrawal: newWithdrawal
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/withdrawals', authenticateToken, (req, res) => {
  const userWithdrawals = withdrawals
    .filter(w => w.userId === req.user.userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(userWithdrawals);
});

// Market data
app.get('/api/market', (req, res) => {
  res.json(cryptoPrices);
});

// Investment and Profit Management
app.get('/api/investments', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

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

app.post('/api/invest', authenticateToken, (req, res) => {
  try {
    const { amount, method, reference } = req.body;
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

    transactions.push(newInvestment);
    deposits.push(newInvestment);

    res.json({
      message: 'Investment request submitted successfully. It will be processed by admin.',
      investment: newInvestment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/admin/users/:userId/profits', authenticateAdmin, (req, res) => {
  const { userId } = req.params;
  const { totalProfits, profitPercentage, action } = req.body;

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

  // Record admin profit adjustment
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

  res.json({ 
    message: 'Profits updated successfully', 
    totalProfits: user.totalProfits,
    profitPercentage: user.profitPercentage
  });
});

app.put('/api/admin/investments/:investmentId', authenticateAdmin, (req, res) => {
  const { investmentId } = req.params;
  const { status } = req.body;

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

  if (status === 'approved') {
    const user = users.find(u => u.id === investment.userId);
    if (user) {
      user.totalInvested = (user.totalInvested || 0) + investment.amount;
    }
  }

  res.json({ message: `Investment ${status} successfully` });
});

// Transactions
app.get('/api/transactions', authenticateToken, (req, res) => {
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Crypto Exchange Server running on http://0.0.0.0:${PORT}`);
  console.log(`👤 Default Admin: admin@cryptoexchange.com / admin123`);
  console.log(`💰 ${Object.keys(cryptoPrices).length} cryptocurrencies available`);
  console.log(`🔧 Admin Bitcoin Address: ${adminConfig.bitcoinAddress}`);
});
