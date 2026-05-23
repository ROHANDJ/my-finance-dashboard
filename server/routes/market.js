const express = require('express');
const auth = require('../middleware/auth');
const market = require('../services/marketDataService');
const router = express.Router();

// GET /api/market/indices  — public, no auth (for ticker)
router.get('/indices', async (req, res) => {
  try {
    const indices = await market.getIndices();
    res.json({ indices, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Indices error:', err.message);
    res.status(500).json({ message: 'Error fetching market indices' });
  }
});

// GET /api/market/quote/:symbol?market=IN|US
router.get('/quote/:symbol', auth, async (req, res) => {
  try {
    const m = req.query.market || 'IN';
    let quote;

    if (m === 'US') {
      try { quote = await market.getFinnhubQuote(req.params.symbol); }
      catch { quote = await market.getQuote(req.params.symbol, 'US'); }
    } else {
      quote = await market.getQuote(req.params.symbol, 'IN');
    }

    res.json({ quote });
  } catch (err) {
    console.error('Quote error:', err.message);
    res.status(502).json({ message: `Cannot fetch quote for ${req.params.symbol}` });
  }
});

// GET /api/market/search?q=RELI&market=IN
router.get('/search', auth, async (req, res) => {
  try {
    const { q = '', market: m = 'IN' } = req.query;
    if (q.length < 2) return res.json({ results: [] });
    const results = await market.searchStocks(q, m);
    res.json({ results });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ message: 'Search failed' });
  }
});

// GET /api/market/bulk?symbols=RELIANCE,TCS,INFY&market=IN
router.get('/bulk', auth, async (req, res) => {
  try {
    const { symbols = '', market: m = 'IN' } = req.query;
    const list = symbols.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20);
    const results = await Promise.allSettled(list.map(s => market.getQuote(s, m)));
    const quotes = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { symbol: list[i], price: 0, error: true }
    );
    res.json({ quotes });
  } catch (err) {
    res.status(500).json({ message: 'Bulk quote failed' });
  }
});

module.exports = router;
