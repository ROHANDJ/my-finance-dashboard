const express = require('express');
const auth = require('../middleware/auth');
const dhan = require('../services/dhanService');
const supabase = require('../lib/supabase');
const router = express.Router();

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
// GET /status — is Dhan available + is this user connected?
// ---------------------------------------------------------------------------
router.get('/status', auth, (req, res) => {
  res.json({
    configured: dhan.isConfigured(),
    connected:  !!dhan.getToken(req.userId),
  });
});

// ---------------------------------------------------------------------------
// POST /connect — user pastes their Dhan access token + client id.
// We validate it by calling the profile endpoint before storing.
// ---------------------------------------------------------------------------
router.post('/connect', auth, async (req, res) => {
  const { accessToken, clientId } = req.body;
  if (!accessToken || !clientId) {
    return res.status(400).json({ message: 'accessToken and clientId are required' });
  }

  try {
    const creds = { accessToken: accessToken.trim(), clientId: String(clientId).trim() };
    const profile = await dhan.getProfile(creds);

    // Dhan returns tokenValidity like "2025-01-30 03:30:00" — use it if parseable
    let validityMs;
    if (profile.tokenValidity) {
      const t = Date.parse(profile.tokenValidity.replace(' ', 'T'));
      if (!Number.isNaN(t)) validityMs = Math.max(0, t - Date.now());
    }

    dhan.setToken(req.userId, creds.accessToken, creds.clientId, validityMs);
    res.json({ message: 'Connected to Dhan', profile });
  } catch (err) {
    const status = err.response?.status;
    if (status === 401 || status === 400) {
      return res.status(401).json({ message: 'Invalid Dhan access token or client id' });
    }
    console.error('Dhan connect error:', err.response?.data || err.message);
    res.status(502).json({ message: 'Could not reach Dhan to validate the token' });
  }
});

// ---------------------------------------------------------------------------
// POST /disconnect
// ---------------------------------------------------------------------------
router.post('/disconnect', auth, (req, res) => {
  dhan.clearToken(req.userId);
  res.json({ message: 'Disconnected from Dhan' });
});

// ---------------------------------------------------------------------------
// GET /profile
// ---------------------------------------------------------------------------
router.get('/profile', auth, async (req, res) => {
  const creds = dhan.getCreds(req.userId);
  if (!creds) return res.status(401).json({ message: 'Not connected to Dhan', needsAuth: true });

  try {
    const profile = await dhan.getProfile(creds);
    res.json({ profile });
  } catch (err) {
    if (err.response?.status === 401) {
      dhan.clearToken(req.userId);
      return res.status(401).json({ message: 'Dhan session expired. Please reconnect.', needsAuth: true });
    }
    res.status(500).json({ message: 'Error fetching Dhan profile' });
  }
});

// ---------------------------------------------------------------------------
// GET /holdings
// ---------------------------------------------------------------------------
router.get('/holdings', auth, async (req, res) => {
  const creds = dhan.getCreds(req.userId);
  if (!creds) return res.status(401).json({ message: 'Not connected to Dhan', needsAuth: true });

  try {
    const holdings = await dhan.getHoldings(creds);
    const totalValue = holdings.reduce((s, h) => s + h.value, 0);
    const totalPnl   = holdings.reduce((s, h) => s + h.pnl, 0);
    const invested   = holdings.reduce((s, h) => s + h.quantity * h.averagePrice, 0);
    const pnlPercent = invested > 0 ? (totalPnl / invested) * 100 : 0;

    res.json({ holdings, summary: { totalValue, totalPnl, invested, pnlPercent: parseFloat(pnlPercent.toFixed(2)) } });
  } catch (err) {
    if (err.response?.status === 401) {
      dhan.clearToken(req.userId);
      return res.status(401).json({ message: 'Dhan session expired. Please reconnect.', needsAuth: true });
    }
    console.error('Dhan holdings error:', err.message);
    res.status(500).json({ message: 'Error fetching Dhan holdings' });
  }
});

// ---------------------------------------------------------------------------
// GET /positions
// ---------------------------------------------------------------------------
router.get('/positions', auth, async (req, res) => {
  const creds = dhan.getCreds(req.userId);
  if (!creds) return res.status(401).json({ message: 'Not connected to Dhan', needsAuth: true });

  try {
    const positions = await dhan.getPositions(creds);
    res.json({ positions });
  } catch (err) {
    if (err.response?.status === 401) {
      dhan.clearToken(req.userId);
      return res.status(401).json({ message: 'Dhan session expired. Please reconnect.', needsAuth: true });
    }
    res.status(500).json({ message: 'Error fetching positions' });
  }
});

// ---------------------------------------------------------------------------
// GET /funds
// ---------------------------------------------------------------------------
router.get('/funds', auth, async (req, res) => {
  const creds = dhan.getCreds(req.userId);
  if (!creds) return res.status(401).json({ message: 'Not connected to Dhan', needsAuth: true });

  try {
    const funds = await dhan.getFunds(creds);
    res.json({ funds });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching funds' });
  }
});

// ---------------------------------------------------------------------------
// POST /sync-portfolio — import Dhan holdings into a portfolio
// ---------------------------------------------------------------------------
router.post('/sync-portfolio', auth, async (req, res) => {
  const creds = dhan.getCreds(req.userId);
  if (!creds) return res.status(401).json({ message: 'Not connected to Dhan', needsAuth: true });

  try {
    const [holdings, positions] = await Promise.all([
      dhan.getHoldings(creds),
      dhan.getPositions(creds).catch(() => []),
    ]);

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
          name:         'Dhan Portfolio',
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
      message:       `Synced ${mappedHoldings.length} holdings from Dhan`,
      portfolioId,
      holdingsCount: mappedHoldings.length,
      performance,
    });
  } catch (err) {
    if (err.response?.status === 401) {
      dhan.clearToken(req.userId);
      return res.status(401).json({ message: 'Dhan session expired. Please reconnect.', needsAuth: true });
    }
    console.error('Dhan sync error:', err.message);
    res.status(500).json({ message: 'Error syncing portfolio from Dhan' });
  }
});

module.exports = router;
