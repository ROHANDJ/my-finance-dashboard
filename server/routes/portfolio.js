const express = require('express');
const stockService = require('../services/stockService');
const auth = require('../middleware/auth');
const router = express.Router();

// ---------------------------------------------------------------------------
// In-memory portfolio store
// ---------------------------------------------------------------------------
const portfolios = {};

function demoPortfolio(userId) {
  return {
    id: 'demo_port_' + userId,
    userId,
    name: 'My Portfolio',
    accountType: 'indian',
    holdings: [
      { symbol: 'INFY',     name: 'Infosys Ltd',                  type: 'stock', quantity: 15,  averagePrice: 1620, currentPrice: 1842.50, currency: 'INR', sector: 'IT',      country: 'IN', exchange: 'NSE', purchaseDate: new Date('2023-06-01') },
      { symbol: 'TCS',      name: 'Tata Consultancy Services',     type: 'stock', quantity: 8,   averagePrice: 3500, currentPrice: 3920.00, currency: 'INR', sector: 'IT',      country: 'IN', exchange: 'NSE', purchaseDate: new Date('2023-04-15') },
      { symbol: 'RELIANCE', name: 'Reliance Industries',           type: 'stock', quantity: 10,  averagePrice: 2680, currentPrice: 2948.35, currency: 'INR', sector: 'Energy',  country: 'IN', exchange: 'NSE', purchaseDate: new Date('2023-09-10') },
      { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd',                 type: 'stock', quantity: 20,  averagePrice: 1480, currentPrice: 1612.80, currency: 'INR', sector: 'Banking', country: 'IN', exchange: 'NSE', purchaseDate: new Date('2023-11-20') },
      { symbol: 'WIPRO',    name: 'Wipro Ltd',                     type: 'stock', quantity: 30,  averagePrice: 520,  currentPrice: 482.40,  currency: 'INR', sector: 'IT',      country: 'IN', exchange: 'NSE', purchaseDate: new Date('2024-01-05') },
    ],
    transactions: [],
    performance: { invested: 0, currentValue: 0, totalReturns: 0, totalReturnsPercentage: 0 },
    createdAt: new Date()
  };
}

function calcPerformance(portfolio) {
  let invested = 0, currentValue = 0;
  portfolio.holdings.forEach(h => {
    invested     += h.quantity * h.averagePrice;
    currentValue += h.quantity * h.currentPrice;
  });
  const totalReturns = currentValue - invested;
  const totalReturnsPercentage = invested > 0 ? (totalReturns / invested) * 100 : 0;
  // Simulate day change as ~0.5-1.5% of current value
  const dayChange = parseFloat((currentValue * 0.0084).toFixed(2));
  const dayChangePercentage = parseFloat(((dayChange / (currentValue || 1)) * 100).toFixed(2));
  portfolio.performance = { invested, currentValue, totalReturns, totalReturnsPercentage, dayChange, dayChangePercentage };
  return portfolio;
}

function getUserPortfolios(userId) {
  if (!portfolios[userId]) {
    portfolios[userId] = [calcPerformance(demoPortfolio(userId))];
  }
  return portfolios[userId];
}

// GET /api/portfolio
router.get('/', auth, (req, res) => {
  try {
    const all = getUserPortfolios(req.userId);
    const { market } = req.query;
    const result = market && market !== 'both'
      ? all.filter(p => p.accountType === market)
      : all;
    res.json({ portfolios: result });
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({ message: 'Error fetching portfolios' });
  }
});

// POST /api/portfolio
router.post('/', auth, (req, res) => {
  try {
    const { name, accountType } = req.body;
    if (!name || !accountType) return res.status(400).json({ message: 'Name and account type are required' });
    const portfolio = {
      id: 'port_' + Date.now(),
      userId: req.userId, name, accountType,
      holdings: [], transactions: [],
      performance: { invested: 0, currentValue: 0, totalReturns: 0, totalReturnsPercentage: 0 },
      createdAt: new Date()
    };
    getUserPortfolios(req.userId).push(portfolio);
    res.status(201).json({ portfolio });
  } catch (error) {
    res.status(500).json({ message: 'Error creating portfolio' });
  }
});

// GET /api/portfolio/:id
router.get('/:id', auth, (req, res) => {
  try {
    const all = getUserPortfolios(req.userId);
    const portfolio = all.find(p => p.id === req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });
    res.json({ portfolio: calcPerformance(portfolio) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching portfolio' });
  }
});

// POST /api/portfolio/:id/holdings
router.post('/:id/holdings', auth, async (req, res) => {
  try {
    const all = getUserPortfolios(req.userId);
    const portfolio = all.find(p => p.id === req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });

    const { symbol, quantity, averagePrice, purchaseDate, currency } = req.body;
    if (!symbol || !quantity || !averagePrice || !purchaseDate || !currency) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const market = currency === 'INR' ? 'IN' : 'US';
    let stockData;
    try { stockData = await stockService.getStockQuote(symbol, market); } catch { stockData = { name: symbol, type: 'stock', sector: '', country: market === 'IN' ? 'IN' : 'US', exchange: 'NSE', currentPrice: averagePrice }; }

    const sym = symbol.toUpperCase();
    const existing = portfolio.holdings.find(h => h.symbol === sym);
    if (existing) {
      const totalQty = existing.quantity + parseFloat(quantity);
      existing.averagePrice = ((existing.quantity * existing.averagePrice) + (parseFloat(quantity) * parseFloat(averagePrice))) / totalQty;
      existing.quantity = totalQty;
      existing.currentPrice = stockData.currentPrice;
    } else {
      portfolio.holdings.push({ symbol: sym, name: stockData.name || sym, type: stockData.type || 'stock', quantity: parseFloat(quantity), averagePrice: parseFloat(averagePrice), currentPrice: stockData.currentPrice || parseFloat(averagePrice), currency, sector: stockData.sector || '', country: stockData.country || 'IN', exchange: stockData.exchange || 'NSE', purchaseDate: new Date(purchaseDate) });
    }
    portfolio.transactions.push({ type: 'buy', symbol: sym, quantity: parseFloat(quantity), price: parseFloat(averagePrice), currency, date: new Date(purchaseDate) });
    calcPerformance(portfolio);
    res.json({ message: 'Holding added successfully', portfolio });
  } catch (error) {
    res.status(500).json({ message: 'Error adding holding' });
  }
});

// PUT /api/portfolio/:id/holdings/:symbol
router.put('/:id/holdings/:symbol', auth, (req, res) => {
  try {
    const all = getUserPortfolios(req.userId);
    const portfolio = all.find(p => p.id === req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });
    const holding = portfolio.holdings.find(h => h.symbol === req.params.symbol.toUpperCase());
    if (!holding) return res.status(404).json({ message: 'Holding not found' });
    const { quantity, averagePrice } = req.body;
    if (quantity !== undefined) holding.quantity = parseFloat(quantity);
    if (averagePrice !== undefined) holding.averagePrice = parseFloat(averagePrice);
    calcPerformance(portfolio);
    res.json({ message: 'Holding updated successfully', portfolio });
  } catch (error) {
    res.status(500).json({ message: 'Error updating holding' });
  }
});

// DELETE /api/portfolio/:id/holdings/:symbol
router.delete('/:id/holdings/:symbol', auth, (req, res) => {
  try {
    const all = getUserPortfolios(req.userId);
    const portfolio = all.find(p => p.id === req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });
    portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== req.params.symbol.toUpperCase());
    calcPerformance(portfolio);
    res.json({ message: 'Holding removed successfully', portfolio });
  } catch (error) {
    res.status(500).json({ message: 'Error removing holding' });
  }
});

// POST /api/portfolio/:id/sell
router.post('/:id/sell', auth, (req, res) => {
  try {
    const all = getUserPortfolios(req.userId);
    const portfolio = all.find(p => p.id === req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });
    const { symbol, quantity, sellPrice, sellDate, fees = 0, taxes = 0 } = req.body;
    if (!symbol || !quantity || !sellPrice || !sellDate) return res.status(400).json({ message: 'All fields are required' });
    const sym = symbol.toUpperCase();
    const holding = portfolio.holdings.find(h => h.symbol === sym);
    if (!holding) return res.status(404).json({ message: 'Holding not found' });
    if (holding.quantity < parseFloat(quantity)) return res.status(400).json({ message: 'Insufficient quantity' });
    holding.quantity -= parseFloat(quantity);
    if (holding.quantity === 0) portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== sym);
    portfolio.transactions.push({ type: 'sell', symbol: sym, quantity: parseFloat(quantity), price: parseFloat(sellPrice), currency: holding.currency, date: new Date(sellDate), fees, taxes });
    calcPerformance(portfolio);
    res.json({ message: 'Sell recorded successfully', portfolio });
  } catch (error) {
    res.status(500).json({ message: 'Error recording sell' });
  }
});

// GET /api/portfolio/:id/performance
router.get('/:id/performance', auth, (req, res) => {
  try {
    const all = getUserPortfolios(req.userId);
    const portfolio = all.find(p => p.id === req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });
    const { period = '1Y' } = req.query;
    // Generate demo performance history
    const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '5Y': 1825 };
    const count = days[period] || 365;
    const base = portfolio.performance.currentValue || 500000;
    const data = [];
    for (let i = count; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      data.push({ date: d.toISOString().slice(0, 10), value: parseFloat((base * (0.8 + 0.2 * (count - i) / count + (Math.random() - 0.5) * 0.05)).toFixed(0)) });
    }
    res.json({ performance: data });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching performance' });
  }
});

// GET /api/portfolio/:id/allocation
router.get('/:id/allocation', auth, (req, res) => {
  try {
    const all = getUserPortfolios(req.userId);
    const portfolio = all.find(p => p.id === req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });
    calcPerformance(portfolio);
    const totalValue = portfolio.performance.currentValue || 1;
    const sectors = {}, countries = {}, assets = {};
    portfolio.holdings.forEach(h => {
      const value = h.quantity * h.currentPrice;
      const pct = (value / totalValue) * 100;
      sectors[h.sector || 'Other'] = (sectors[h.sector || 'Other'] || 0) + pct;
      countries[h.country || 'IN'] = (countries[h.country || 'IN'] || 0) + pct;
      assets[h.type || 'stock'] = (assets[h.type || 'stock'] || 0) + pct;
    });
    const fmt = obj => Object.entries(obj).map(([name, percentage]) => ({ name, percentage: parseFloat(percentage.toFixed(2)), value: parseFloat(((totalValue * percentage) / 100).toFixed(0)) }));
    res.json({ allocation: { sectors: fmt(sectors), countries: fmt(countries), assets: fmt(assets) } });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating allocation' });
  }
});

// GET /api/portfolio/:id/risk-metrics
router.get('/:id/risk-metrics', auth, (req, res) => {
  try {
    res.json({ riskMetrics: { beta: 1.12, volatility: 18.4, sharpeRatio: 1.38, maxDrawdown: 14.2, valueAtRisk: 8.6 } });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating risk metrics' });
  }
});

module.exports = router;
