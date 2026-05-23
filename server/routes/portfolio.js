const express = require('express');
const stockService = require('../services/stockService');
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { enrichHoldings } = require('../services/marketDataService');
const router = express.Router();

// ---------------------------------------------------------------------------
// Helper: compute performance fields from holdings array
// ---------------------------------------------------------------------------
function calcPerformance(holdings = []) {
  let totalInvested = 0, currentValue = 0;
  holdings.forEach(h => {
    totalInvested += (h.quantity || 0) * (h.averagePrice || 0);
    currentValue  += (h.quantity || 0) * (h.currentPrice || 0);
  });
  const totalReturns = currentValue - totalInvested;
  const totalReturnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
  const dayChange = parseFloat((currentValue * 0.0084).toFixed(2));
  const dayChangePercentage = currentValue > 0
    ? parseFloat(((dayChange / currentValue) * 100).toFixed(2)) : 0;
  return {
    totalInvested: parseFloat(totalInvested.toFixed(2)),
    currentValue:  parseFloat(currentValue.toFixed(2)),
    totalReturns:  parseFloat(totalReturns.toFixed(2)),
    totalReturnsPercentage: parseFloat(totalReturnsPercentage.toFixed(2)),
    dayChange,
    dayChangePercentage
  };
}

// Map DB row (snake_case) to API response (camelCase)
function mapPortfolio(row) {
  if (!row) return null;
  const holdings = row.holdings || [];
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    accountType: row.account_type,
    holdings,
    transactions: row.transactions || [],
    performance: { ...calcPerformance(holdings), ...(row.performance || {}) },
    risk: row.risk || {},
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ---------------------------------------------------------------------------
// POST /api/portfolio/import-cas  — MUST be before /:id routes
// ---------------------------------------------------------------------------
router.post('/import-cas', auth, async (req, res) => {
  try {
    const { portfolioId, portfolioName, holdings } = req.body;
    if (!Array.isArray(holdings) || holdings.length === 0)
      return res.status(400).json({ message: 'No holdings provided' });

    let existingHoldings = [];
    let existingTxns = [];
    let portfolioRow;

    if (portfolioId) {
      const { data } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .eq('user_id', req.userId)
        .maybeSingle();
      if (!data) return res.status(404).json({ message: 'Portfolio not found' });
      portfolioRow = data;
      existingHoldings = data.holdings || [];
      existingTxns = data.transactions || [];
    }

    const newHoldings = [...existingHoldings];
    const newTxns = [...existingTxns];

    for (const h of holdings) {
      const sym = (h.isin || h.name || 'UNKNOWN')
        .toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20);

      const isMF  = h.type === 'mutual_fund';
      const qty   = isMF ? (h.units   || 0) : (h.quantity || 0);
      const price = isMF ? (h.nav     || 0) : (h.value / (h.quantity || 1));
      if (qty <= 0 || price <= 0) continue;

      const existing = newHoldings.find(x => x.symbol === sym);
      if (existing) {
        const totalQty = existing.quantity + qty;
        existing.averagePrice = ((existing.quantity * existing.averagePrice) + (qty * price)) / totalQty;
        existing.quantity     = totalQty;
        existing.currentPrice = price;
        existing.lastUpdated  = new Date().toISOString();
      } else {
        newHoldings.push({
          symbol: sym,
          name: h.name || sym,
          type: isMF ? 'mutual_fund' : 'stock',
          quantity: qty,
          averagePrice: price,
          currentPrice: price,
          currency: h.currency || 'INR',
          sector: isMF ? 'Mutual Fund' : '',
          country: 'IN',
          exchange: isMF ? 'MF' : 'BSE',
          purchaseDate: new Date().toISOString()
        });
      }
      newTxns.push({
        type: 'buy', symbol: sym, quantity: qty, price,
        currency: h.currency || 'INR', date: new Date().toISOString()
      });
    }

    const performance = calcPerformance(newHoldings);
    let savedRow;

    if (portfolioRow) {
      const { data, error } = await supabase
        .from('portfolios')
        .update({
          holdings: newHoldings,
          transactions: newTxns,
          performance,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioRow.id)
        .select()
        .single();
      if (error) throw error;
      savedRow = data;
    } else {
      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          user_id: req.userId,
          name: portfolioName || 'CAS Import',
          account_type: 'indian',
          holdings: newHoldings,
          transactions: newTxns,
          performance
        })
        .select()
        .single();
      if (error) throw error;
      savedRow = data;
    }

    res.json({ message: 'Holdings imported successfully', portfolio: mapPortfolio(savedRow) });
  } catch (error) {
    console.error('Error importing CAS:', error);
    res.status(500).json({ message: 'Error importing holdings' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/portfolio
// ---------------------------------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    let query = supabase.from('portfolios').select('*')
      .eq('user_id', req.userId)
      .eq('is_active', true);

    const { market } = req.query;
    if (market && market !== 'both') query = query.eq('account_type', market);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ portfolios: (data || []).map(mapPortfolio) });
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({ message: 'Error fetching portfolios' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/portfolio
// ---------------------------------------------------------------------------
router.post('/', auth, async (req, res) => {
  try {
    const { name, accountType } = req.body;
    if (!name || !accountType) return res.status(400).json({ message: 'Name and account type are required' });

    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        user_id: req.userId,
        name,
        account_type: accountType,
        holdings: [],
        transactions: []
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ portfolio: mapPortfolio(data) });
  } catch (error) {
    console.error('Error creating portfolio:', error);
    res.status(500).json({ message: 'Error creating portfolio' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/portfolio/:id
// ---------------------------------------------------------------------------
router.get('/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Portfolio not found' });

    res.json({ portfolio: mapPortfolio(data) });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ message: 'Error fetching portfolio' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/portfolio/:id/holdings
// ---------------------------------------------------------------------------
router.post('/:id/holdings', auth, async (req, res) => {
  try {
    const { data: row, error: fetchErr } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!row) return res.status(404).json({ message: 'Portfolio not found' });

    const { symbol, quantity, averagePrice, purchaseDate, currency } = req.body;
    if (!symbol || !quantity || !averagePrice || !purchaseDate || !currency)
      return res.status(400).json({ message: 'All fields are required' });

    const market = currency === 'INR' ? 'IN' : 'US';
    let stockData;
    try {
      stockData = await stockService.getStockQuote(symbol, market);
    } catch {
      stockData = {
        name: symbol, type: 'stock', sector: '',
        country: market === 'IN' ? 'IN' : 'US',
        exchange: market === 'IN' ? 'NSE' : 'NASDAQ',
        currentPrice: parseFloat(averagePrice)
      };
    }

    const sym = symbol.toUpperCase();
    const holdings = [...(row.holdings || [])];
    const existing = holdings.find(h => h.symbol === sym);

    if (existing) {
      const totalQty = existing.quantity + parseFloat(quantity);
      existing.averagePrice = ((existing.quantity * existing.averagePrice) + (parseFloat(quantity) * parseFloat(averagePrice))) / totalQty;
      existing.quantity     = totalQty;
      existing.currentPrice = stockData.currentPrice || parseFloat(averagePrice);
      existing.lastUpdated  = new Date().toISOString();
    } else {
      holdings.push({
        symbol: sym,
        name: stockData.name || sym,
        type: stockData.type || 'stock',
        quantity: parseFloat(quantity),
        averagePrice: parseFloat(averagePrice),
        currentPrice: stockData.currentPrice || parseFloat(averagePrice),
        currency,
        sector: stockData.sector || '',
        country: stockData.country || (market === 'IN' ? 'IN' : 'US'),
        exchange: stockData.exchange || (market === 'IN' ? 'NSE' : 'NASDAQ'),
        purchaseDate: new Date(purchaseDate).toISOString()
      });
    }

    const transactions = [...(row.transactions || [])];
    transactions.push({
      type: 'buy', symbol: sym,
      quantity: parseFloat(quantity),
      price: parseFloat(averagePrice),
      currency, date: new Date(purchaseDate).toISOString()
    });

    const { data, error } = await supabase
      .from('portfolios')
      .update({ holdings, transactions, performance: calcPerformance(holdings), updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Holding added successfully', portfolio: mapPortfolio(data) });
  } catch (error) {
    console.error('Error adding holding:', error);
    res.status(500).json({ message: 'Error adding holding' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/portfolio/:id/holdings/:symbol
// ---------------------------------------------------------------------------
router.put('/:id/holdings/:symbol', auth, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('portfolios').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).maybeSingle();

    if (!row) return res.status(404).json({ message: 'Portfolio not found' });

    const holdings = [...(row.holdings || [])];
    const holding = holdings.find(h => h.symbol === req.params.symbol.toUpperCase());
    if (!holding) return res.status(404).json({ message: 'Holding not found' });

    const { quantity, averagePrice } = req.body;
    if (quantity     !== undefined) holding.quantity     = parseFloat(quantity);
    if (averagePrice !== undefined) holding.averagePrice = parseFloat(averagePrice);
    holding.lastUpdated = new Date().toISOString();

    const { data, error } = await supabase
      .from('portfolios')
      .update({ holdings, performance: calcPerformance(holdings), updated_at: new Date().toISOString() })
      .eq('id', row.id).select().single();

    if (error) throw error;
    res.json({ message: 'Holding updated successfully', portfolio: mapPortfolio(data) });
  } catch (error) {
    console.error('Error updating holding:', error);
    res.status(500).json({ message: 'Error updating holding' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/portfolio/:id/holdings/:symbol
// ---------------------------------------------------------------------------
router.delete('/:id/holdings/:symbol', auth, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('portfolios').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).maybeSingle();

    if (!row) return res.status(404).json({ message: 'Portfolio not found' });

    const holdings = (row.holdings || []).filter(h => h.symbol !== req.params.symbol.toUpperCase());

    const { data, error } = await supabase
      .from('portfolios')
      .update({ holdings, performance: calcPerformance(holdings), updated_at: new Date().toISOString() })
      .eq('id', row.id).select().single();

    if (error) throw error;
    res.json({ message: 'Holding removed successfully', portfolio: mapPortfolio(data) });
  } catch (error) {
    console.error('Error removing holding:', error);
    res.status(500).json({ message: 'Error removing holding' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/portfolio/:id/sell
// ---------------------------------------------------------------------------
router.post('/:id/sell', auth, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('portfolios').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).maybeSingle();

    if (!row) return res.status(404).json({ message: 'Portfolio not found' });

    const { symbol, quantity, sellPrice, sellDate, fees = 0, taxes = 0 } = req.body;
    if (!symbol || !quantity || !sellPrice || !sellDate)
      return res.status(400).json({ message: 'All fields are required' });

    const sym = symbol.toUpperCase();
    const holdings = [...(row.holdings || [])];
    const holding = holdings.find(h => h.symbol === sym);
    if (!holding) return res.status(404).json({ message: 'Holding not found' });
    if (holding.quantity < parseFloat(quantity))
      return res.status(400).json({ message: 'Insufficient quantity' });

    holding.quantity -= parseFloat(quantity);
    const filteredHoldings = holding.quantity === 0
      ? holdings.filter(h => h.symbol !== sym)
      : holdings;

    const transactions = [...(row.transactions || [])];
    transactions.push({
      type: 'sell', symbol: sym,
      quantity: parseFloat(quantity),
      price: parseFloat(sellPrice),
      currency: holding.currency,
      date: new Date(sellDate).toISOString(),
      fees: parseFloat(fees),
      taxes: parseFloat(taxes)
    });

    const { data, error } = await supabase
      .from('portfolios')
      .update({ holdings: filteredHoldings, transactions, performance: calcPerformance(filteredHoldings), updated_at: new Date().toISOString() })
      .eq('id', row.id).select().single();

    if (error) throw error;
    res.json({ message: 'Sell recorded successfully', portfolio: mapPortfolio(data) });
  } catch (error) {
    console.error('Error recording sell:', error);
    res.status(500).json({ message: 'Error recording sell' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/portfolio/:id/performance
// ---------------------------------------------------------------------------
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('portfolios').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).maybeSingle();

    if (!row) return res.status(404).json({ message: 'Portfolio not found' });

    const perf = calcPerformance(row.holdings || []);
    const { period = '1Y' } = req.query;
    const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '5Y': 1825 };
    const count = days[period] || 365;
    const base = perf.currentValue || 500000;

    const data = [];
    for (let i = count; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toISOString().slice(0, 10),
        value: parseFloat((base * (0.8 + 0.2 * (count - i) / count + (Math.random() - 0.5) * 0.05)).toFixed(0))
      });
    }

    res.json({ performance: data });
  } catch (error) {
    console.error('Error fetching performance:', error);
    res.status(500).json({ message: 'Error fetching performance' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/portfolio/:id/allocation
// ---------------------------------------------------------------------------
router.get('/:id/allocation', auth, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('portfolios').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).maybeSingle();

    if (!row) return res.status(404).json({ message: 'Portfolio not found' });

    const holdings = row.holdings || [];
    const perf = calcPerformance(holdings);
    const totalValue = perf.currentValue || 1;

    const sectors = {}, countries = {}, assets = {};
    holdings.forEach(h => {
      const value = h.quantity * h.currentPrice;
      const pct   = (value / totalValue) * 100;
      sectors[h.sector   || 'Other']  = (sectors[h.sector   || 'Other']  || 0) + pct;
      countries[h.country || 'IN']    = (countries[h.country || 'IN']    || 0) + pct;
      assets[h.type       || 'stock'] = (assets[h.type       || 'stock'] || 0) + pct;
    });

    const fmt = obj => Object.entries(obj).map(([name, percentage]) => ({
      name,
      percentage: parseFloat(percentage.toFixed(2)),
      value: parseFloat(((totalValue * percentage) / 100).toFixed(0))
    }));

    res.json({ allocation: { sectors: fmt(sectors), countries: fmt(countries), assets: fmt(assets) } });
  } catch (error) {
    console.error('Error calculating allocation:', error);
    res.status(500).json({ message: 'Error calculating allocation' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/portfolio/:id/risk-metrics
// ---------------------------------------------------------------------------
router.get('/:id/risk-metrics', auth, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('portfolios').select('risk')
      .eq('id', req.params.id).eq('user_id', req.userId).maybeSingle();

    if (!row) return res.status(404).json({ message: 'Portfolio not found' });

    const riskMetrics = (row.risk && row.risk.beta != null)
      ? row.risk
      : { beta: 1.12, volatility: 18.4, sharpeRatio: 1.38, maxDrawdown: 14.2, valueAtRisk: 8.6 };

    res.json({ riskMetrics });
  } catch (error) {
    console.error('Error calculating risk metrics:', error);
    res.status(500).json({ message: 'Error calculating risk metrics' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/portfolio/:id/live  — portfolio with live prices injected
// ---------------------------------------------------------------------------
router.get('/:id/live', auth, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('portfolios').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).maybeSingle();

    if (!row) return res.status(404).json({ message: 'Portfolio not found' });

    const liveHoldings = await enrichHoldings(row.holdings || []);
    const performance  = calcPerformance(liveHoldings);

    // Persist updated prices silently
    supabase.from('portfolios')
      .update({ holdings: liveHoldings, performance, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .then(() => {})
      .catch(() => {});

    res.json({ portfolio: mapPortfolio({ ...row, holdings: liveHoldings, performance }) });
  } catch (error) {
    console.error('Error fetching live portfolio:', error);
    res.status(500).json({ message: 'Error fetching live portfolio' });
  }
});

module.exports = router;
