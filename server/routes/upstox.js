const express = require('express');
const auth = require('../middleware/auth');
const upstox = require('../services/upstoxService');
const supabase = require('../lib/supabase');
const router = express.Router();

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';

function calcPerformance(holdings = []) {
  let invested = 0, value = 0;
  holdings.forEach(h => {
    invested += (h.quantity || 0) * (h.averagePrice || 0);
    value    += (h.quantity || 0) * (h.currentPrice || h.averagePrice || 0);
  });
  const returns = value - invested;
  return {
    totalInvested:          parseFloat(invested.toFixed(2)),
    currentValue:           parseFloat(value.toFixed(2)),
    totalReturns:           parseFloat(returns.toFixed(2)),
    totalReturnsPercentage: invested > 0 ? parseFloat(((returns / invested) * 100).toFixed(2)) : 0,
  };
}

// ---------------------------------------------------------------------------
// GET /status — is Upstox configured + is user connected?
// ---------------------------------------------------------------------------
router.get('/status', auth, (req, res) => {
  res.json({
    configured: upstox.isConfigured(),
    connected:  !!upstox.getToken(req.userId),
  });
});

// ---------------------------------------------------------------------------
// GET /auth-url — get OAuth login URL
// ---------------------------------------------------------------------------
router.get('/auth-url', auth, (req, res) => {
  if (!upstox.isConfigured()) {
    return res.status(503).json({
      message: 'Upstox API not configured. Add UPSTOX_API_KEY, UPSTOX_API_SECRET, UPSTOX_REDIRECT_URI to .env',
    });
  }
  res.json({ url: upstox.getAuthUrl(req.userId) });
});

// ---------------------------------------------------------------------------
// GET /callback — Upstox redirects here after login (no auth middleware)
// ---------------------------------------------------------------------------
router.get('/callback', async (req, res) => {
  const { code, state: userId, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND}/portfolio?upstox_error=${error || 'missing_code'}`);
  }

  try {
    const tokenData = await upstox.exchangeToken(code);
    upstox.setToken(userId, tokenData.access_token);
    res.redirect(`${FRONTEND}/portfolio?upstox_connected=1`);
  } catch (err) {
    console.error('Upstox token exchange error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND}/portfolio?upstox_error=token_exchange_failed`);
  }
});

// ---------------------------------------------------------------------------
// GET /disconnect
// ---------------------------------------------------------------------------
router.post('/disconnect', auth, (req, res) => {
  upstox.clearToken(req.userId);
  res.json({ message: 'Disconnected from Upstox' });
});

// ---------------------------------------------------------------------------
// GET /profile
// ---------------------------------------------------------------------------
router.get('/profile', auth, async (req, res) => {
  const token = upstox.getToken(req.userId);
  if (!token) return res.status(401).json({ message: 'Not connected to Upstox', needsAuth: true });

  try {
    const profile = await upstox.getProfile(token);
    res.json({ profile });
  } catch (err) {
    if (err.response?.status === 401) {
      upstox.clearToken(req.userId);
      return res.status(401).json({ message: 'Upstox session expired. Please reconnect.', needsAuth: true });
    }
    res.status(500).json({ message: 'Error fetching Upstox profile' });
  }
});

// ---------------------------------------------------------------------------
// GET /holdings — live holdings from Upstox
// ---------------------------------------------------------------------------
router.get('/holdings', auth, async (req, res) => {
  const token = upstox.getToken(req.userId);
  if (!token) return res.status(401).json({ message: 'Not connected to Upstox', needsAuth: true });

  try {
    const holdings = await upstox.getHoldings(token);
    const totalValue  = holdings.reduce((s, h) => s + h.value, 0);
    const totalPnl    = holdings.reduce((s, h) => s + h.pnl, 0);
    const invested    = holdings.reduce((s, h) => s + h.quantity * h.averagePrice, 0);
    const pnlPercent  = invested > 0 ? (totalPnl / invested) * 100 : 0;

    res.json({ holdings, summary: { totalValue, totalPnl, invested, pnlPercent: parseFloat(pnlPercent.toFixed(2)) } });
  } catch (err) {
    if (err.response?.status === 401) {
      upstox.clearToken(req.userId);
      return res.status(401).json({ message: 'Upstox session expired. Please reconnect.', needsAuth: true });
    }
    console.error('Upstox holdings error:', err.message);
    res.status(500).json({ message: 'Error fetching Upstox holdings' });
  }
});

// ---------------------------------------------------------------------------
// GET /positions — intraday positions
// ---------------------------------------------------------------------------
router.get('/positions', auth, async (req, res) => {
  const token = upstox.getToken(req.userId);
  if (!token) return res.status(401).json({ message: 'Not connected to Upstox', needsAuth: true });

  try {
    const positions = await upstox.getPositions(token);
    res.json({ positions });
  } catch (err) {
    if (err.response?.status === 401) {
      upstox.clearToken(req.userId);
      return res.status(401).json({ message: 'Upstox session expired. Please reconnect.', needsAuth: true });
    }
    res.status(500).json({ message: 'Error fetching positions' });
  }
});

// ---------------------------------------------------------------------------
// GET /funds — available margin / funds
// ---------------------------------------------------------------------------
router.get('/funds', auth, async (req, res) => {
  const token = upstox.getToken(req.userId);
  if (!token) return res.status(401).json({ message: 'Not connected to Upstox', needsAuth: true });

  try {
    const funds = await upstox.getFunds(token);
    res.json({ funds });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching funds' });
  }
});

// ---------------------------------------------------------------------------
// POST /sync-portfolio — import Upstox holdings into a portfolio
// ---------------------------------------------------------------------------
router.post('/sync-portfolio', auth, async (req, res) => {
  const token = upstox.getToken(req.userId);
  if (!token) return res.status(401).json({ message: 'Not connected to Upstox', needsAuth: true });

  try {
    const [holdings, positions] = await Promise.all([
      upstox.getHoldings(token),
      upstox.getPositions(token).catch(() => []),
    ]);

    // Merge long-term holdings and intraday positions
    const allRaw = [...holdings];
    positions.filter(p => p.quantity > 0).forEach(p => {
      if (!allRaw.find(h => h.symbol === p.symbol)) allRaw.push(p);
    });

    const mappedHoldings = allRaw.map(h => ({
      symbol:       h.symbol.toUpperCase(),
      name:         h.name || h.symbol,
      type:         'stock',
      quantity:     Math.abs(h.quantity),
      averagePrice: h.averagePrice || 0,
      currentPrice: h.currentPrice || h.averagePrice || 0,
      currency:     'INR',
      sector:       '',
      country:      'IN',
      exchange:     h.exchange || 'NSE',
      purchaseDate: new Date().toISOString(),
      isin:         h.isin || '',
    }));

    const performance = calcPerformance(mappedHoldings);

    let portfolioId = req.body.portfolioId;

    if (portfolioId) {
      const { error } = await supabase
        .from('portfolios')
        .update({ holdings: mappedHoldings, performance, updated_at: new Date().toISOString() })
        .eq('id', portfolioId)
        .eq('user_id', req.userId);
      if (error) throw error;
    } else {
      const { data: newP, error } = await supabase
        .from('portfolios')
        .insert({
          user_id:      req.userId,
          name:         'Upstox Portfolio',
          account_type: 'indian',
          holdings:     mappedHoldings,
          transactions: [],
          performance,
        })
        .select()
        .single();
      if (error) throw error;
      portfolioId = newP.id;
    }

    res.json({
      message:       `Synced ${mappedHoldings.length} holdings from Upstox`,
      portfolioId,
      holdingsCount: mappedHoldings.length,
      performance,
    });
  } catch (err) {
    if (err.response?.status === 401) {
      upstox.clearToken(req.userId);
      return res.status(401).json({ message: 'Upstox session expired. Please reconnect.', needsAuth: true });
    }
    console.error('Upstox sync error:', err.message);
    res.status(500).json({ message: 'Error syncing portfolio from Upstox' });
  }
});

module.exports = router;
