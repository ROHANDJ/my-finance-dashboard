const express = require('express');
const stockService = require('../services/stockService');
const Stock = require('../models/Stock');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/quote/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { market = 'US' } = req.query;

    const stockData = await stockService.getStockQuote(symbol, market);
    res.json({ stock: stockData });
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    res.status(500).json({ message: 'Error fetching stock data' });
  }
});

router.get('/historical/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1M', market = 'US' } = req.query;

    const historicalData = await stockService.getHistoricalData(symbol, period, market);
    res.json({ data: historicalData });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ message: 'Error fetching historical data' });
  }
});

router.get('/search', auth, async (req, res) => {
  try {
    const { q: query, market = 'US' } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const results = await stockService.searchStocks(query, market);
    res.json({ results });
  } catch (error) {
    console.error('Error searching stocks:', error);
    res.status(500).json({ message: 'Error searching stocks' });
  }
});

router.get('/movers', auth, async (req, res) => {
  try {
    const { market = 'US', type = 'gainers' } = req.query;

    const movers = await stockService.getMarketMovers(market, type);
    res.json({ movers });
  } catch (error) {
    console.error('Error fetching market movers:', error);
    res.status(500).json({ message: 'Error fetching market movers' });
  }
});

router.get('/news/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { market = 'US' } = req.query;

    const news = await stockService.getStockNews(symbol, market);
    res.json({ news });
  } catch (error) {
    console.error('Error fetching stock news:', error);
    res.status(500).json({ message: 'Error fetching stock news' });
  }
});

router.get('/watchlist', auth, async (req, res) => {
  try {
    const { market = 'US' } = req.query;
    
    const user = await User.findById(req.userId).populate('watchlist');
    const watchlist = user.watchlist.filter(stock => stock.country === (market === 'US' ? 'US' : 'IN'));
    
    const watchlistData = [];
    for (const stock of watchlist) {
      try {
        const currentData = await stockService.getStockQuote(stock.symbol, market);
        watchlistData.push(currentData);
      } catch (error) {
        console.error(`Error fetching data for ${stock.symbol}:`, error);
      }
    }

    res.json({ watchlist: watchlistData });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ message: 'Error fetching watchlist' });
  }
});

router.post('/watchlist', auth, async (req, res) => {
  try {
    const { symbol, market = 'US' } = req.body;

    const stock = await Stock.findOne({ 
      symbol: symbol.toUpperCase(), 
      country: market === 'US' ? 'US' : 'IN' 
    });

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    const user = await User.findById(req.userId);
    if (user.watchlist.includes(stock._id)) {
      return res.status(400).json({ message: 'Stock already in watchlist' });
    }

    user.watchlist.push(stock._id);
    await user.save();

    res.json({ message: 'Stock added to watchlist' });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ message: 'Error adding to watchlist' });
  }
});

router.delete('/watchlist/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { market = 'US' } = req.query;

    const stock = await Stock.findOne({ 
      symbol: symbol.toUpperCase(), 
      country: market === 'US' ? 'US' : 'IN' 
    });

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    const user = await User.findById(req.userId);
    user.watchlist = user.watchlist.filter(id => !id.equals(stock._id));
    await user.save();

    res.json({ message: 'Stock removed from watchlist' });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ message: 'Error removing from watchlist' });
  }
});

router.get('/sectors', auth, async (req, res) => {
  try {
    const { market = 'US' } = req.query;
    
    const sectors = await Stock.distinct('sector', { 
      country: market === 'US' ? 'US' : 'IN',
      isActive: true 
    });

    res.json({ sectors: sectors.filter(Boolean) });
  } catch (error) {
    console.error('Error fetching sectors:', error);
    res.status(500).json({ message: 'Error fetching sectors' });
  }
});

router.get('/sector/:sectorName', auth, async (req, res) => {
  try {
    const { sectorName } = req.params;
    const { market = 'US' } = req.query;

    const stocks = await Stock.find({ 
      sector: sectorName,
      country: market === 'US' ? 'US' : 'IN',
      isActive: true 
    })
    .sort({ marketCap: -1 })
    .limit(50)
    .select('symbol name currentPrice change changePercent marketCap');

    res.json({ stocks });
  } catch (error) {
    console.error('Error fetching sector stocks:', error);
    res.status(500).json({ message: 'Error fetching sector stocks' });
  }
});

router.get('/indices', auth, async (req, res) => {
  try {
    const { market = 'US' } = req.query;

    let indices;
    if (market === 'US') {
      indices = [
        { symbol: '^GSPC', name: 'S&P 500' },
        { symbol: '^DJI', name: 'Dow Jones' },
        { symbol: '^IXIC', name: 'NASDAQ' },
        { symbol: '^VIX', name: 'VIX' }
      ];
    } else {
      indices = [
        { symbol: '^NSEI', name: 'NIFTY 50' },
        { symbol: '^NSEBANK', name: 'NIFTY BANK' },
        { symbol: '^CNXIT', name: 'NIFTY IT' },
        { symbol: '^NSEMID50', name: 'NIFTY MIDCAP 50' }
      ];
    }

    const indicesData = [];
    for (const index of indices) {
      try {
        const data = await stockService.getStockQuote(index.symbol, market);
        indicesData.push({ ...data, name: index.name });
      } catch (error) {
        console.error(`Error fetching ${index.symbol}:`, error);
      }
    }

    res.json({ indices: indicesData });
  } catch (error) {
    console.error('Error fetching indices:', error);
    res.status(500).json({ message: 'Error fetching indices' });
  }
});

module.exports = router;
