const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const router = express.Router();

// ---------------------------------------------------------------------------
// Demo mutual fund data (used as fallback when mfapi.in is unavailable)
// ---------------------------------------------------------------------------

const DEMO_FUNDS = [
  { schemeCode: '120503', schemeName: 'Mirae Asset Large Cap Fund - Direct Growth',         amc: 'Mirae Asset', category: 'Equity - Large Cap', nav: 102.35, date: new Date().toISOString().slice(0,10),
    returns: { '1M': 2.1, '3M': 6.4, '6M': 12.8, '1Y': 24.6, '3Y': 18.2, '5Y': 16.4 }, risk: { standardDeviation: 14.2, sharpeRatio: 1.38, maxDrawdown: 16.8 }, rating: { morningstar: 5, valueResearch: 4 } },
  { schemeCode: '119551', schemeName: 'Parag Parikh Flexi Cap Fund - Direct Growth',        amc: 'PPFAS Mutual Fund', category: 'Equity - Flexi Cap', nav: 68.92, date: new Date().toISOString().slice(0,10),
    returns: { '1M': 1.8, '3M': 5.9, '6M': 11.2, '1Y': 27.8, '3Y': 21.4, '5Y': 19.6 }, risk: { standardDeviation: 13.1, sharpeRatio: 1.65, maxDrawdown: 14.5 }, rating: { morningstar: 5, valueResearch: 5 } },
  { schemeCode: '125497', schemeName: 'Axis Bluechip Fund - Direct Growth',                 amc: 'Axis Mutual Fund', category: 'Equity - Large Cap', nav: 56.14, date: new Date().toISOString().slice(0,10),
    returns: { '1M': 1.2, '3M': 4.8, '6M': 9.6, '1Y': 19.8, '3Y': 15.6, '5Y': 14.8 }, risk: { standardDeviation: 12.8, sharpeRatio: 1.24, maxDrawdown: 13.2 }, rating: { morningstar: 4, valueResearch: 4 } },
  { schemeCode: '118989', schemeName: 'SBI Small Cap Fund - Direct Growth',                 amc: 'SBI Mutual Fund', category: 'Equity - Small Cap', nav: 148.72, date: new Date().toISOString().slice(0,10),
    returns: { '1M': 3.4, '3M': 9.2, '6M': 18.6, '1Y': 42.1, '3Y': 28.4, '5Y': 24.6 }, risk: { standardDeviation: 22.4, sharpeRatio: 1.78, maxDrawdown: 24.8 }, rating: { morningstar: 5, valueResearch: 5 } },
  { schemeCode: '101206', schemeName: 'HDFC Mid-Cap Opportunities Fund - Direct Growth',   amc: 'HDFC Mutual Fund', category: 'Equity - Mid Cap', nav: 125.88, date: new Date().toISOString().slice(0,10),
    returns: { '1M': 2.8, '3M': 7.8, '6M': 15.4, '1Y': 38.6, '3Y': 24.8, '5Y': 21.2 }, risk: { standardDeviation: 18.6, sharpeRatio: 1.62, maxDrawdown: 20.4 }, rating: { morningstar: 5, valueResearch: 4 } },
  { schemeCode: '112090', schemeName: 'ICICI Pru Balanced Advantage Fund - Direct Growth', amc: 'ICICI Prudential', category: 'Hybrid - Dynamic Asset Allocation', nav: 58.24, date: new Date().toISOString().slice(0,10),
    returns: { '1M': 1.1, '3M': 3.6, '6M': 7.8, '1Y': 16.2, '3Y': 13.4, '5Y': 12.8 }, risk: { standardDeviation: 9.2, sharpeRatio: 1.42, maxDrawdown: 10.6 }, rating: { morningstar: 4, valueResearch: 4 } },
  { schemeCode: '119598', schemeName: 'Nippon India Nifty 50 Index Fund - Direct Growth',  amc: 'Nippon India', category: 'Index Fund - Large Cap', nav: 24.68, date: new Date().toISOString().slice(0,10),
    returns: { '1M': 1.1, '3M': 4.2, '6M': 8.6, '1Y': 22.8, '3Y': 17.2, '5Y': 15.4 }, risk: { standardDeviation: 13.8, sharpeRatio: 1.28, maxDrawdown: 15.2 }, rating: { morningstar: 3, valueResearch: 3 } },
  { schemeCode: '100476', schemeName: 'Franklin India Prima Fund - Direct Growth',          amc: 'Franklin Templeton', category: 'Equity - Mid Cap', nav: 2148.52, date: new Date().toISOString().slice(0,10),
    returns: { '1M': 2.4, '3M': 7.2, '6M': 14.8, '1Y': 35.4, '3Y': 22.6, '5Y': 18.8 }, risk: { standardDeviation: 17.4, sharpeRatio: 1.54, maxDrawdown: 18.6 }, rating: { morningstar: 4, valueResearch: 4 } }
];

const DEMO_CATEGORIES = ['Equity - Large Cap', 'Equity - Mid Cap', 'Equity - Small Cap', 'Equity - Flexi Cap', 'Hybrid - Dynamic Asset Allocation', 'Index Fund - Large Cap', 'Debt - Short Duration', 'Debt - Liquid'];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Search query is required' });
    try {
      const response = await axios.get(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`, { timeout: 5000 });
      return res.json({ funds: response.data.slice(0, 20).map(f => ({ schemeCode: f.schemeCode, schemeName: f.schemeName, amc: f.amc || '', category: f.category || '', nav: '', date: '' })) });
    } catch {
      const ql = q.toLowerCase();
      return res.json({ funds: DEMO_FUNDS.filter(f => f.schemeName.toLowerCase().includes(ql) || f.amc.toLowerCase().includes(ql)) });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error searching mutual funds' });
  }
});

router.get('/nav/:schemeCode', auth, async (req, res) => {
  try {
    const { schemeCode } = req.params;
    const demo = DEMO_FUNDS.find(f => f.schemeCode === schemeCode);
    try {
      const response = await axios.get(`https://api.mfapi.in/mf/${schemeCode}`, { timeout: 5000 });
      const data = response.data;
      return res.json({ fund: { schemeCode: data.meta.scheme_code, schemeName: data.meta.scheme_name, amc: data.meta.amc, category: data.meta.category, nav: data.data[0].nav, date: data.data[0].date } });
    } catch {
      if (demo) return res.json({ fund: demo });
      return res.status(404).json({ message: 'Fund not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fund NAV' });
  }
});

router.get('/details/:schemeCode', auth, async (req, res) => {
  try {
    const { schemeCode } = req.params;
    const demo = DEMO_FUNDS.find(f => f.schemeCode === schemeCode);
    if (demo) return res.json({ fund: demo });
    try {
      const response = await axios.get(`https://api.mfapi.in/mf/${schemeCode}`, { timeout: 5000 });
      const data = response.data;
      return res.json({ fund: { schemeCode: data.meta.scheme_code, schemeName: data.meta.scheme_name, amc: data.meta.amc, category: data.meta.category, nav: data.data[0].nav, date: data.data[0].date, returns: {}, risk: {} } });
    } catch {
      return res.status(404).json({ message: 'Fund not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fund details' });
  }
});

router.get('/top', auth, async (req, res) => {
  try {
    const { category = 'all' } = req.query;
    let funds = [...DEMO_FUNDS];
    if (category !== 'all') funds = funds.filter(f => f.category === category);
    funds.sort((a, b) => (b.returns['1Y'] || 0) - (a.returns['1Y'] || 0));
    res.json({ funds });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching top funds' });
  }
});

router.get('/categories', auth, (req, res) => {
  try {
    res.json({ categories: DEMO_CATEGORIES });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

router.post('/compare', auth, (req, res) => {
  try {
    const { schemeCodes } = req.body;
    if (!schemeCodes || !Array.isArray(schemeCodes) || schemeCodes.length < 2) {
      return res.status(400).json({ message: 'At least 2 scheme codes required' });
    }
    const comparison = schemeCodes.map(code => DEMO_FUNDS.find(f => f.schemeCode === code)).filter(Boolean);
    res.json({ comparison });
  } catch (error) {
    res.status(500).json({ message: 'Error comparing funds' });
  }
});

router.get('/sip-calculator', auth, (req, res) => {
  try {
    const { amount, period, expectedReturn = 12 } = req.query;
    if (!amount || !period) return res.status(400).json({ message: 'Amount and period are required' });
    const monthlyAmount = parseFloat(amount);
    const months = parseInt(period);
    const monthlyReturn = parseFloat(expectedReturn) / 100 / 12;
    const futureValue = monthlyAmount * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn) * (1 + monthlyReturn);
    const totalInvestment = monthlyAmount * months;
    const totalReturns = futureValue - totalInvestment;
    res.json({ investment: totalInvestment, futureValue: parseFloat(futureValue.toFixed(0)), returns: parseFloat(totalReturns.toFixed(0)), returnPercentage: parseFloat(((totalReturns / totalInvestment) * 100).toFixed(2)) });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating SIP' });
  }
});

module.exports = router;
