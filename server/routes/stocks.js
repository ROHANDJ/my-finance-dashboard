const express = require('express');
const stockService = require('../services/stockService');
const auth = require('../middleware/auth');
const router = express.Router();

// In-memory watchlists keyed by userId
const watchlists = {};

const DEMO_SECTORS = {
  US: ['Technology', 'Healthcare', 'Finance', 'Consumer Cyclical', 'Industrials', 'Communication Services', 'Energy', 'Utilities', 'Real Estate', 'Materials'],
  IN: ['IT', 'Banking', 'FMCG', 'Pharmaceuticals', 'Energy', 'Automobiles', 'Metals', 'Realty', 'Telecom', 'Infrastructure']
};

router.get('/quote/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { market = 'US' } = req.query;
    const stockData = await stockService.getStockQuote(symbol, market);
    res.json({ stock: stockData });
  } catch (error) {
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
    res.status(500).json({ message: 'Error fetching historical data' });
  }
});

router.get('/search', auth, async (req, res) => {
  try {
    const { q: query, market = 'US' } = req.query;
    if (!query) return res.status(400).json({ message: 'Search query is required' });
    const results = await stockService.searchStocks(query, market);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: 'Error searching stocks' });
  }
});

router.get('/movers', auth, async (req, res) => {
  try {
    const { market = 'US', type = 'gainers' } = req.query;
    const movers = await stockService.getMarketMovers(market, type);
    res.json({ movers });
  } catch (error) {
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
    res.status(500).json({ message: 'Error fetching stock news' });
  }
});

router.get('/watchlist', auth, (req, res) => {
  try {
    const list = watchlists[req.userId] || [];
    res.json({ watchlist: list });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching watchlist' });
  }
});

router.post('/watchlist', auth, async (req, res) => {
  try {
    const { symbol, market = 'US' } = req.body;
    if (!symbol) return res.status(400).json({ message: 'Symbol is required' });
    if (!watchlists[req.userId]) watchlists[req.userId] = [];
    const sym = symbol.toUpperCase();
    if (watchlists[req.userId].find(s => s.symbol === sym)) {
      return res.status(400).json({ message: 'Stock already in watchlist' });
    }
    const stockData = await stockService.getStockQuote(sym, market);
    watchlists[req.userId].push(stockData);
    res.json({ message: 'Stock added to watchlist', stock: stockData });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to watchlist' });
  }
});

router.delete('/watchlist/:symbol', auth, (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    if (watchlists[req.userId]) {
      watchlists[req.userId] = watchlists[req.userId].filter(s => s.symbol !== sym);
    }
    res.json({ message: 'Stock removed from watchlist' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing from watchlist' });
  }
});

router.get('/sectors', auth, (req, res) => {
  try {
    const { market = 'US' } = req.query;
    const sectors = DEMO_SECTORS[market] || DEMO_SECTORS.US;
    res.json({ sectors });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sectors' });
  }
});

router.get('/sector/:sectorName', auth, async (req, res) => {
  try {
    const { sectorName } = req.params;
    const { market = 'US' } = req.query;
    // Return demo stocks matching sector
    const allSymbols = market === 'IN'
      ? ['INFY', 'TCS', 'WIPRO', 'RELIANCE', 'HDFCBANK']
      : ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
    const stocks = await Promise.all(allSymbols.map(s => stockService.getStockQuote(s, market).catch(() => null)));
    res.json({ stocks: stocks.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sector stocks' });
  }
});

router.get('/indices', auth, async (req, res) => {
  try {
    const { market = 'US' } = req.query;
    const indexList = market === 'US'
      ? [{ symbol: '^GSPC', name: 'S&P 500' }, { symbol: '^DJI', name: 'Dow Jones' }, { symbol: '^IXIC', name: 'NASDAQ' }, { symbol: '^VIX', name: 'VIX' }]
      : [{ symbol: '^NSEI', name: 'NIFTY 50' }, { symbol: '^NSEBANK', name: 'NIFTY BANK' }, { symbol: '^CNXIT', name: 'NIFTY IT' }, { symbol: '^NSEMID50', name: 'NIFTY MIDCAP 50' }];

    const indicesData = await Promise.all(
      indexList.map(async idx => {
        const data = await stockService.getStockQuote(idx.symbol, market);
        return { ...data, name: idx.name };
      })
    );
    res.json({ indices: indicesData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching indices' });
  }
});

module.exports = router;
