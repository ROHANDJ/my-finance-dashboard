const express = require('express');
const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const stockService = require('../services/stockService');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { market = 'both' } = req.query;
    
    let filter = { userId: req.userId };
    if (market !== 'both') {
      filter.accountType = market;
    }

    const portfolios = await Portfolio.find(filter)
      .populate('holdings.symbol')
      .sort({ createdAt: -1 });

    res.json({ portfolios });
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({ message: 'Error fetching portfolios' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, accountType } = req.body;

    if (!name || !accountType) {
      return res.status(400).json({ message: 'Name and account type are required' });
    }

    const portfolio = new Portfolio({
      userId: req.userId,
      name,
      accountType
    });

    await portfolio.save();
    res.status(201).json({ portfolio });
  } catch (error) {
    console.error('Error creating portfolio:', error);
    res.status(500).json({ message: 'Error creating portfolio' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId: req.userId
    }).populate('holdings.symbol');

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const updatedPortfolio = await updatePortfolioPrices(portfolio);
    res.json({ portfolio: updatedPortfolio });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ message: 'Error fetching portfolio' });
  }
});

router.post('/:id/holdings', auth, async (req, res) => {
  try {
    const { symbol, quantity, averagePrice, purchaseDate, currency } = req.body;

    if (!symbol || !quantity || !averagePrice || !purchaseDate || !currency) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    const existingHolding = portfolio.holdings.find(
      h => h.symbol === symbol.toUpperCase()
    );

    if (existingHolding) {
      const totalQuantity = existingHolding.quantity + quantity;
      const totalCost = (existingHolding.quantity * existingHolding.averagePrice) + (quantity * averagePrice);
      existingHolding.quantity = totalQuantity;
      existingHolding.averagePrice = totalCost / totalQuantity;
      existingHolding.currentPrice = stock.currentPrice;
    } else {
      portfolio.holdings.push({
        symbol: symbol.toUpperCase(),
        name: stock.name,
        type: stock.type,
        quantity,
        averagePrice,
        currentPrice: stock.currentPrice,
        currency,
        sector: stock.sector,
        country: stock.country,
        exchange: stock.exchange,
        purchaseDate: new Date(purchaseDate)
      });
    }

    portfolio.transactions.push({
      type: 'buy',
      symbol: symbol.toUpperCase(),
      quantity,
      price: averagePrice,
      currency,
      date: new Date(purchaseDate)
    });

    await portfolio.save();
    res.json({ message: 'Holding added successfully', portfolio });
  } catch (error) {
    console.error('Error adding holding:', error);
    res.status(500).json({ message: 'Error adding holding' });
  }
});

router.put('/:id/holdings/:symbol', auth, async (req, res) => {
  try {
    const { quantity, averagePrice } = req.body;

    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const holding = portfolio.holdings.find(
      h => h.symbol === req.params.symbol.toUpperCase()
    );

    if (!holding) {
      return res.status(404).json({ message: 'Holding not found' });
    }

    if (quantity !== undefined) holding.quantity = quantity;
    if (averagePrice !== undefined) holding.averagePrice = averagePrice;

    await portfolio.save();
    res.json({ message: 'Holding updated successfully', portfolio });
  } catch (error) {
    console.error('Error updating holding:', error);
    res.status(500).json({ message: 'Error updating holding' });
  }
});

router.delete('/:id/holdings/:symbol', auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    portfolio.holdings = portfolio.holdings.filter(
      h => h.symbol !== req.params.symbol.toUpperCase()
    );

    await portfolio.save();
    res.json({ message: 'Holding removed successfully', portfolio });
  } catch (error) {
    console.error('Error removing holding:', error);
    res.status(500).json({ message: 'Error removing holding' });
  }
});

router.post('/:id/sell', auth, async (req, res) => {
  try {
    const { symbol, quantity, sellPrice, sellDate, fees = 0, taxes = 0 } = req.body;

    if (!symbol || !quantity || !sellPrice || !sellDate) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const holding = portfolio.holdings.find(
      h => h.symbol === symbol.toUpperCase()
    );

    if (!holding) {
      return res.status(404).json({ message: 'Holding not found' });
    }

    if (holding.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient quantity to sell' });
    }

    holding.quantity -= quantity;
    if (holding.quantity === 0) {
      portfolio.holdings = portfolio.holdings.filter(
        h => h.symbol !== symbol.toUpperCase()
      );
    }

    portfolio.transactions.push({
      type: 'sell',
      symbol: symbol.toUpperCase(),
      quantity,
      price: sellPrice,
      currency: holding.currency,
      date: new Date(sellDate),
      fees,
      taxes
    });

    await portfolio.save();
    res.json({ message: 'Sell transaction recorded successfully', portfolio });
  } catch (error) {
    console.error('Error recording sell transaction:', error);
    res.status(500).json({ message: 'Error recording sell transaction' });
  }
});

router.get('/:id/performance', auth, async (req, res) => {
  try {
    const { period = '1Y' } = req.query;

    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const performanceData = await calculatePortfolioPerformance(portfolio, period);
    res.json({ performance: performanceData });
  } catch (error) {
    console.error('Error calculating portfolio performance:', error);
    res.status(500).json({ message: 'Error calculating portfolio performance' });
  }
});

router.get('/:id/allocation', auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const allocation = calculatePortfolioAllocation(portfolio);
    res.json({ allocation });
  } catch (error) {
    console.error('Error calculating portfolio allocation:', error);
    res.status(500).json({ message: 'Error calculating portfolio allocation' });
  }
});

router.get('/:id/risk-metrics', auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const riskMetrics = await calculatePortfolioRisk(portfolio);
    res.json({ riskMetrics });
  } catch (error) {
    console.error('Error calculating portfolio risk:', error);
    res.status(500).json({ message: 'Error calculating portfolio risk' });
  }
});

async function updatePortfolioPrices(portfolio) {
  for (const holding of portfolio.holdings) {
    try {
      const market = holding.country === 'US' ? 'US' : 'IN';
      const stockData = await stockService.getStockQuote(holding.symbol, market);
      holding.currentPrice = stockData.currentPrice;
      holding.lastUpdated = new Date();
    } catch (error) {
      console.error(`Error updating price for ${holding.symbol}:`, error);
    }
  }
  
  await portfolio.save();
  return portfolio;
}

async function calculatePortfolioPerformance(portfolio, period) {
  const historicalData = [];
  const startDate = getStartDate(period);

  for (const holding of portfolio.holdings) {
    try {
      const market = holding.country === 'US' ? 'US' : 'IN';
      const data = await stockService.getHistoricalData(holding.symbol, period, market);
      
      data.dates.forEach((date, index) => {
        const value = holding.quantity * (data.prices[index] || 0);
        const existingDate = historicalData.find(d => d.date.getTime() === date.getTime());
        
        if (existingDate) {
          existingDate.value += value;
        } else {
          historicalData.push({ date, value });
        }
      });
    } catch (error) {
      console.error(`Error fetching historical data for ${holding.symbol}:`, error);
    }
  }

  return historicalData.sort((a, b) => a.date - b.date);
}

function calculatePortfolioAllocation(portfolio) {
  const totalValue = portfolio.performance.currentValue;
  const allocation = {
    sectors: {},
    countries: {},
    assets: {}
  };

  portfolio.holdings.forEach(holding => {
    const value = holding.quantity * holding.currentPrice;
    const percentage = (value / totalValue) * 100;

    if (holding.sector) {
      allocation.sectors[holding.sector] = 
        (allocation.sectors[holding.sector] || 0) + percentage;
    }

    allocation.countries[holding.country] = 
      (allocation.countries[holding.country] || 0) + percentage;

    allocation.assets[holding.type] = 
      (allocation.assets[holding.type] || 0) + percentage;
  });

  const formatAllocation = (obj) => 
    Object.entries(obj).map(([name, percentage]) => ({
      name,
      percentage,
      value: (totalValue * percentage) / 100
    }));

  return {
    sectors: formatAllocation(allocation.sectors),
    countries: formatAllocation(allocation.countries),
    assets: formatAllocation(allocation.assets)
  };
}

async function calculatePortfolioRisk(portfolio) {
  const riskMetrics = {
    beta: 0,
    volatility: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    valueAtRisk: 0
  };

  let totalBeta = 0;
  let totalWeight = 0;

  for (const holding of portfolio.holdings) {
    try {
      const stock = await Stock.findOne({ symbol: holding.symbol });
      if (stock && stock.beta) {
        const weight = (holding.quantity * holding.currentPrice) / portfolio.performance.currentValue;
        totalBeta += stock.beta * weight;
        totalWeight += weight;
      }
    } catch (error) {
      console.error(`Error fetching beta for ${holding.symbol}:`, error);
    }
  }

  riskMetrics.beta = totalWeight > 0 ? totalBeta / totalWeight : 0;
  
  return riskMetrics;
}

function getStartDate(period) {
  const now = new Date();
  const periods = {
    '1M': 1,
    '3M': 3,
    '6M': 6,
    '1Y': 12,
    '2Y': 24,
    '5Y': 60
  };
  
  const months = periods[period] || 12;
  return new Date(now.setMonth(now.getMonth() - months));
}

module.exports = router;
