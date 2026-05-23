'use strict';
const express = require('express');
const https   = require('https');
const auth    = require('../middleware/auth');
const router  = express.Router();

// ---------------------------------------------------------------------------
// NSE fetch helpers
// ---------------------------------------------------------------------------

const NSE_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         'https://www.nseindia.com/',
  'Connection':      'keep-alive',
};

/**
 * Fetch JSON from an NSE URL.  Returns null on any error so callers can fall
 * back gracefully without crashing the request.
 */
function fetchNse(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.nseindia.com',
      path,
      method:  'GET',
      headers: NSE_HEADERS,
      timeout: 8000,
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve(null); }
      });
    });
    req.on('error',   () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Map NSE item → our internal shape
// ---------------------------------------------------------------------------

function mapNseIpo(item, status) {
  const openDate    = item.ipoOpenDate    || item.openDate    || null;
  const closeDate   = item.ipoCloseDate   || item.closeDate   || null;
  const listingDate = item.listingDate    || item.allotmentDate || null;
  const minPrice    = item.minBidPrice    || item.offeringPrice || item.priceMin || null;
  const maxPrice    = item.maxBidPrice    || item.offeringPrice || item.priceMax || null;

  return {
    id:          `nse_${item.symbol || item.companyName || Math.random().toString(36).slice(2)}`,
    symbol:      item.symbol      || '',
    companyName: item.companyName || item.name || '',
    exchange:    'NSE',
    country:     'IN',
    currency:    'INR',
    status,
    timeline: {
      openDate:    openDate    ? new Date(openDate)    : null,
      closeDate:   closeDate   ? new Date(closeDate)   : null,
      listingDate: listingDate ? new Date(listingDate) : null,
    },
    offering: {
      priceRange: { min: minPrice, max: maxPrice },
      finalPrice: item.offeringPrice || null,
      totalAmount: item.issueSize   || null,
    },
    details: {
      description: item.issueDescription || '',
      industry:    item.industry  || '',
      sector:      item.sector    || '',
      series:      item.series    || '',
    },
    // analysis kept as demo; see /analysis/:symbol
    analysis: null,
    _raw: item,   // keep raw for debugging; strip before sending if desired
  };
}

// ---------------------------------------------------------------------------
// Demo fallback data (used when NSE is unreachable)
// ---------------------------------------------------------------------------

function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function daysAgo(n)     { const d = new Date(); d.setDate(d.getDate() - n); return d; }

const DEMO_IPOS = [
  {
    id: 'ipo_001', symbol: 'TECHIPO', companyName: 'Tech Innovators Ltd',
    exchange: 'NSE', country: 'IN', currency: 'INR', status: 'upcoming',
    timeline: { openDate: daysFromNow(8), closeDate: daysFromNow(11), listingDate: daysFromNow(18) },
    offering: { totalShares: 10000000, priceRange: { min: 850, max: 900 }, totalAmount: 8750000000 },
    details: { description: 'Leading cloud-based enterprise software solutions provider with 200+ enterprise clients.', industry: 'Information Technology', sector: 'Technology' },
    analysis: { recommendation: 'subscribe', rating: 4, pros: ['High revenue growth (45% YoY)', 'Asset-light SaaS model'], cons: ['High valuation at 35x P/E'], valuation: 'fair', keyHighlights: ['₹875 Cr issue size', 'Profitable for 3 consecutive years'] }
  },
  {
    id: 'ipo_002', symbol: 'GREENERGY', companyName: 'Green Energy Solutions Pvt Ltd',
    exchange: 'BSE', country: 'IN', currency: 'INR', status: 'upcoming',
    timeline: { openDate: daysFromNow(15), closeDate: daysFromNow(18), listingDate: daysFromNow(25) },
    offering: { totalShares: 8000000, priceRange: { min: 400, max: 425 }, totalAmount: 3300000000 },
    details: { description: 'Renewable energy EPC company with 2.5 GW of installed solar capacity.', industry: 'Renewable Energy', sector: 'Energy' },
    analysis: { recommendation: 'neutral', rating: 3, pros: ["Tailwind from government's 500 GW target"], cons: ['Margin pressure from raw material costs'], valuation: 'fair', keyHighlights: ['₹330 Cr issue', 'Order book ₹1,200 Cr'] }
  },
  {
    id: 'ipo_003', symbol: 'HEALTHIPO', companyName: 'HealthFirst Diagnostics Ltd',
    exchange: 'NSE', country: 'IN', currency: 'INR', status: 'open',
    timeline: { openDate: daysAgo(1), closeDate: daysFromNow(2), listingDate: daysFromNow(9) },
    offering: { totalShares: 5000000, priceRange: { min: 1200, max: 1250 }, totalAmount: 6125000000 },
    subscription: { retail: { subscribed: 3000000, total: 2000000, percentage: 150 }, nii: { subscribed: 2200000, total: 1000000, percentage: 220 }, qib: { subscribed: 3800000, total: 2000000, percentage: 190 } },
    details: { description: 'Pan-India chain of diagnostic centres with 180+ labs.', industry: 'Healthcare', sector: 'Diagnostics' },
    analysis: { recommendation: 'subscribe', rating: 4, pros: ['Subscription 1.87x on Day 2', 'Defensive sector'], cons: ['High debt post-expansion'], valuation: 'fair', keyHighlights: ['Over-subscribed by 187%'] }
  },
  {
    id: 'ipo_004', symbol: 'FINTECHIPO', companyName: 'PayFast Fintech Solutions',
    exchange: 'NSE', country: 'IN', currency: 'INR', status: 'listed',
    timeline: { listingDate: daysAgo(12) },
    offering: { finalPrice: 750, totalAmount: 5000000000 },
    listing: { listingPrice: 832, listingGain: 82, listingGainPercentage: 10.93, currentPrice: 890 },
    details: { description: 'Digital payments and lending platform with 25M+ users.', industry: 'Fintech', sector: 'Financial Services' },
    analysis: { recommendation: 'hold', rating: 3, pros: ['Strong listing gain (10.93%)'], cons: ['Competitive UPI landscape'], valuation: 'fair', keyHighlights: ['Listed at ₹832 vs issue price ₹750'] }
  },
  {
    id: 'ipo_005', symbol: 'USTECH', companyName: 'US Technology Corp',
    exchange: 'NASDAQ', country: 'US', currency: 'USD', status: 'upcoming',
    timeline: { openDate: daysFromNow(5), closeDate: daysFromNow(7), listingDate: daysFromNow(14) },
    offering: { totalShares: 5000000, priceRange: { min: 25, max: 28 }, totalAmount: 132500000 },
    details: { description: 'AI-powered enterprise security solutions.', industry: 'Cybersecurity', sector: 'Technology' },
    analysis: { recommendation: 'neutral', rating: 3, pros: ['High-growth AI segment'], cons: ['Pre-revenue company'], valuation: 'overvalued', keyHighlights: ['$132.5M raise'] }
  },
  {
    id: 'ipo_006', symbol: 'ECOMIND', companyName: 'EcoMind Consumer Goods',
    exchange: 'BSE', country: 'IN', currency: 'INR', status: 'listed',
    timeline: { listingDate: daysAgo(25) },
    offering: { finalPrice: 320, totalAmount: 1800000000 },
    listing: { listingPrice: 370, listingGain: 50, listingGainPercentage: 15.63, currentPrice: 355 },
    details: { description: 'Sustainable FMCG brand with D2C model.', industry: 'FMCG', sector: 'Consumer Goods' },
    analysis: { recommendation: 'hold', rating: 3, pros: ['Strong D2C brand recall'], cons: ['High marketing spend pressuring margins'], valuation: 'fair', keyHighlights: ['Listed at ₹370 vs issue price ₹320'] }
  },
];

// ---------------------------------------------------------------------------
// Fetch live IPO data from NSE (cached for 10 minutes)
// ---------------------------------------------------------------------------

let _cache     = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getLiveIpos() {
  const now = Date.now();
  if (_cache && (now - _cacheTime) < CACHE_TTL_MS) return _cache;

  try {
    // Fetch both endpoints in parallel
    const [allData, liveData] = await Promise.all([
      fetchNse('/api/allIpo'),
      fetchNse('/api/liveIpo'),
    ]);

    // If NSE returned nothing useful, fall back
    if (!allData && !liveData) return null;

    const result = { upcoming: [], open: [], listed: [] };

    // /api/allIpo → { upcoming:[], open:[], listed:[] }
    if (allData) {
      if (Array.isArray(allData.upcoming)) result.upcoming.push(...allData.upcoming.map(i => mapNseIpo(i, 'upcoming')));
      if (Array.isArray(allData.open))     result.open.push(...allData.open.map(i => mapNseIpo(i, 'open')));
      if (Array.isArray(allData.listed))   result.listed.push(...allData.listed.map(i => mapNseIpo(i, 'listed')));
    }

    // /api/liveIpo supplements open list (dedupe by symbol)
    if (liveData) {
      const liveArr = Array.isArray(liveData) ? liveData : (Array.isArray(liveData.data) ? liveData.data : []);
      const existingOpen = new Set(result.open.map(i => i.symbol));
      liveArr.forEach(item => {
        const mapped = mapNseIpo(item, 'open');
        if (!existingOpen.has(mapped.symbol)) {
          result.open.push(mapped);
          existingOpen.add(mapped.symbol);
        }
      });
    }

    // Only cache if we got actual data
    const total = result.upcoming.length + result.open.length + result.listed.length;
    if (total === 0) return null;

    _cache     = result;
    _cacheTime = now;
    return result;
  } catch (err) {
    console.error('[ipo] NSE fetch error:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /  — all IPOs
router.get('/', auth, async (req, res) => {
  try {
    const { market = 'both', status = 'all' } = req.query;

    const live = await getLiveIpos();
    let ipos;

    if (live) {
      ipos = [...live.upcoming, ...live.open, ...live.listed];
    } else {
      ipos = [...DEMO_IPOS];
    }

    // Indian-only filter for live data (US not returned by NSE)
    if (market === 'US') {
      ipos = ipos.filter(i => i.country === 'US');
    } else if (market === 'IN') {
      ipos = ipos.filter(i => i.country === 'IN');
    }

    if (status !== 'all') ipos = ipos.filter(i => i.status === status);

    res.json({ ipos, source: live ? 'nse-live' : 'demo' });
  } catch (err) {
    console.error('[ipo] GET / error:', err);
    res.status(500).json({ message: 'Error fetching IPOs' });
  }
});

// GET /calendar/upcoming
router.get('/calendar/upcoming', auth, async (req, res) => {
  try {
    const { market = 'both', limit = 10 } = req.query;

    const live = await getLiveIpos();
    let ipos;

    if (live) {
      ipos = [...live.upcoming];
    } else {
      ipos = DEMO_IPOS.filter(i => i.status === 'upcoming');
    }

    if (market === 'US') ipos = ipos.filter(i => i.country === 'US');
    else if (market === 'IN') ipos = ipos.filter(i => i.country === 'IN');

    ipos.sort((a, b) => new Date(a.timeline.openDate) - new Date(b.timeline.openDate));
    res.json({ ipos: ipos.slice(0, parseInt(limit)), source: live ? 'nse-live' : 'demo' });
  } catch (err) {
    console.error('[ipo] GET /calendar/upcoming error:', err);
    res.status(500).json({ message: 'Error fetching upcoming IPOs' });
  }
});

// GET /calendar/open
router.get('/calendar/open', auth, async (req, res) => {
  try {
    const { market = 'both' } = req.query;

    const live = await getLiveIpos();
    let ipos;

    if (live) {
      ipos = [...live.open];
    } else {
      ipos = DEMO_IPOS.filter(i => i.status === 'open');
    }

    if (market === 'US') ipos = ipos.filter(i => i.country === 'US');
    else if (market === 'IN') ipos = ipos.filter(i => i.country === 'IN');

    res.json({ ipos, source: live ? 'nse-live' : 'demo' });
  } catch (err) {
    console.error('[ipo] GET /calendar/open error:', err);
    res.status(500).json({ message: 'Error fetching open IPOs' });
  }
});

// GET /calendar/listed
router.get('/calendar/listed', auth, async (req, res) => {
  try {
    const { market = 'both', days = 30 } = req.query;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));

    const live = await getLiveIpos();
    let ipos;

    if (live) {
      ipos = live.listed.filter(i => !i.timeline.listingDate || new Date(i.timeline.listingDate) >= cutoff);
    } else {
      ipos = DEMO_IPOS.filter(i => i.status === 'listed' && new Date(i.timeline.listingDate) >= cutoff);
    }

    if (market === 'US') ipos = ipos.filter(i => i.country === 'US');
    else if (market === 'IN') ipos = ipos.filter(i => i.country === 'IN');

    ipos.sort((a, b) => new Date(b.timeline.listingDate) - new Date(a.timeline.listingDate));
    res.json({ ipos, source: live ? 'nse-live' : 'demo' });
  } catch (err) {
    console.error('[ipo] GET /calendar/listed error:', err);
    res.status(500).json({ message: 'Error fetching listed IPOs' });
  }
});

// GET /compare?symbols=A,B,C
router.get('/compare', auth, async (req, res) => {
  try {
    const { symbols } = req.query;
    if (!symbols) return res.status(400).json({ message: 'Symbols are required' });
    const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());

    const live = await getLiveIpos();
    const allIpos = live
      ? [...live.upcoming, ...live.open, ...live.listed]
      : DEMO_IPOS;

    const comparison = allIpos.filter(i => symbolArray.includes((i.symbol || '').toUpperCase()));
    res.json({ comparison, source: live ? 'nse-live' : 'demo' });
  } catch (err) {
    console.error('[ipo] GET /compare error:', err);
    res.status(500).json({ message: 'Error comparing IPOs' });
  }
});

// GET /analysis/:symbol — always uses demo analysis data
router.get('/analysis/:symbol', auth, async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();

    // First try to find in demo set for curated analysis
    const demo = DEMO_IPOS.find(i => i.symbol.toUpperCase() === sym);
    if (demo && demo.analysis) return res.json({ analysis: demo.analysis, source: 'demo' });

    // Try live data; analysis will be null but at least we confirm it exists
    const live = await getLiveIpos();
    if (live) {
      const allIpos = [...live.upcoming, ...live.open, ...live.listed];
      const found = allIpos.find(i => (i.symbol || '').toUpperCase() === sym);
      if (found) {
        return res.json({
          analysis: {
            recommendation: 'neutral',
            rating: 3,
            pros: ['Listed on NSE'],
            cons: ['Analysis not yet available'],
            valuation: 'unknown',
            keyHighlights: [`Company: ${found.companyName}`],
          },
          source: 'nse-live',
        });
      }
    }

    res.status(404).json({ message: 'IPO not found' });
  } catch (err) {
    console.error('[ipo] GET /analysis/:symbol error:', err);
    res.status(500).json({ message: 'Error analyzing IPO' });
  }
});

// GET /:symbol — single IPO detail
router.get('/:symbol', auth, async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();

    const live = await getLiveIpos();
    if (live) {
      const allIpos = [...live.upcoming, ...live.open, ...live.listed];
      const found = allIpos.find(i => (i.symbol || '').toUpperCase() === sym);
      if (found) return res.json({ ipo: found, source: 'nse-live' });
    }

    // Fallback to demo
    const demo = DEMO_IPOS.find(i => i.symbol.toUpperCase() === sym);
    if (demo) return res.json({ ipo: demo, source: 'demo' });

    res.status(404).json({ message: 'IPO not found' });
  } catch (err) {
    console.error('[ipo] GET /:symbol error:', err);
    res.status(500).json({ message: 'Error fetching IPO details' });
  }
});

module.exports = router;
