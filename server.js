
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

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
app.use(express.static(path.join(__dirname, 'client/build')));

// In-memory storage
let users = [];
let portfolios = [];
let transactions = [];
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

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const walletAddress = `0x${Math.random().toString(16).substr(2, 40)}`;

    const newUser = {
      id: generateId(),
      email,
      firstName,
      lastName,
      password: hashedPassword,
      walletAddress,
      balance: 0,
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
        balance: newUser.balance
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
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Portfolio Routes
app.get('/api/portfolio', authenticateToken, (req, res) => {
  const portfolio = portfolios.find(p => p.userId === req.user.userId);
  if (!portfolio) {
    return res.status(404).json({ message: 'Portfolio not found' });
  }

  // Update portfolio values with current prices
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

app.post('/api/buy', authenticateToken, (req, res) => {
  try {
    const { cryptoId, amount, price } = req.body;
    const user = users.find(u => u.id === req.user.userId);
    const portfolio = portfolios.find(p => p.userId === req.user.userId);

    if (!user || !portfolio) {
      return res.status(404).json({ message: 'User or portfolio not found' });
    }

    const totalCost = amount * price;
    if (user.balance < totalCost) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Deduct from balance
    user.balance -= totalCost;

    // Add to portfolio
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

    // Record transaction
    transactions.push({
      id: generateId(),
      userId: req.user.userId,
      type: 'buy',
      cryptoId,
      amount,
      price,
      total: totalCost,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Purchase successful',
      newBalance: user.balance,
      transaction: {
        type: 'buy',
        amount,
        price,
        total: totalCost
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

    // Update holdings
    holding.amount -= amount;
    const proportionSold = amount / (holding.amount + amount);
    holding.invested -= holding.invested * proportionSold;

    if (holding.amount === 0) {
      portfolio.holdings = portfolio.holdings.filter(h => h.id !== holding.id);
    } else {
      holding.avgPrice = holding.invested / holding.amount;
    }

    // Add to balance
    user.balance += saleValue;

    // Record transaction
    transactions.push({
      id: generateId(),
      userId: req.user.userId,
      type: 'sell',
      cryptoId,
      amount,
      price: currentPrice,
      total: saleValue,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Sale successful',
      newBalance: user.balance,
      saleValue
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Market data
app.get('/api/market', (req, res) => {
  const marketData = Object.entries(cryptoPrices).map(([id, data]) => ({
    id,
    ...data,
    marketCap: (data.price * Math.random() * 1000000000).toFixed(0),
    volume24h: (data.price * Math.random() * 100000000).toFixed(0)
  }));

  res.json(marketData);
});

// Transactions
app.get('/api/transactions', authenticateToken, (req, res) => {
  const userTransactions = transactions
    .filter(t => t.userId === req.user.userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 50);

  res.json(userTransactions);
});

// Deposit/Withdraw
app.post('/api/deposit', authenticateToken, (req, res) => {
  try {
    const { amount } = req.body;
    const user = users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    user.balance += parseFloat(amount);

    transactions.push({
      id: generateId(),
      userId: req.user.userId,
      type: 'deposit',
      amount: parseFloat(amount),
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Deposit successful',
      newBalance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/withdraw', authenticateToken, (req, res) => {
  try {
    const { amount } = req.body;
    const user = users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (amount <= 0 || amount > user.balance) {
      return res.status(400).json({ message: 'Invalid amount or insufficient balance' });
    }

    user.balance -= parseFloat(amount);

    transactions.push({
      id: generateId(),
      userId: req.user.userId,
      type: 'withdraw',
      amount: parseFloat(amount),
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Withdrawal successful',
      newBalance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Real-time price updates
setInterval(() => {
  Object.keys(cryptoPrices).forEach(cryptoId => {
    const volatility = 0.02; // 2% max change
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
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Trust Crypto Wallet Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Real-time price updates enabled`);
  console.log(`💰 ${Object.keys(cryptoPrices).length} cryptocurrencies available`);
});
