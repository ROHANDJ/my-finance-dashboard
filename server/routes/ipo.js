const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// ---------------------------------------------------------------------------
// In-memory IPO demo data
// ---------------------------------------------------------------------------

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const DEMO_IPOS = [
  {
    id: 'ipo_001',
    symbol: 'TECHIPO',
    companyName: 'Tech Innovators Ltd',
    exchange: 'NSE',
    country: 'IN',
    currency: 'INR',
    status: 'upcoming',
    timeline: { openDate: daysFromNow(8), closeDate: daysFromNow(11), listingDate: daysFromNow(18) },
    offering: { totalShares: 10000000, priceRange: { min: 850, max: 900 }, totalAmount: 8750000000 },
    details: { description: 'Leading cloud-based enterprise software solutions provider with 200+ enterprise clients.', industry: 'Information Technology', sector: 'Technology' },
    analysis: { recommendation: 'subscribe', rating: 4, pros: ['High revenue growth (45% YoY)', 'Asset-light SaaS model'], cons: ['High valuation at 35x P/E'], valuation: 'fair', keyHighlights: ['₹875 Cr issue size', 'Profitable for 3 consecutive years'] }
  },
  {
    id: 'ipo_002',
    symbol: 'GREENERGY',
    companyName: 'Green Energy Solutions Pvt Ltd',
    exchange: 'BSE',
    country: 'IN',
    currency: 'INR',
    status: 'upcoming',
    timeline: { openDate: daysFromNow(15), closeDate: daysFromNow(18), listingDate: daysFromNow(25) },
    offering: { totalShares: 8000000, priceRange: { min: 400, max: 425 }, totalAmount: 3300000000 },
    details: { description: 'Renewable energy EPC company with 2.5 GW of installed solar capacity.', industry: 'Renewable Energy', sector: 'Energy' },
    analysis: { recommendation: 'neutral', rating: 3, pros: ['Tailwind from government\'s 500 GW target'], cons: ['Margin pressure from raw material costs', 'Highly competitive market'], valuation: 'fair', keyHighlights: ['₹330 Cr issue', 'Order book ₹1,200 Cr'] }
  },
  {
    id: 'ipo_003',
    symbol: 'HEALTHIPO',
    companyName: 'HealthFirst Diagnostics Ltd',
    exchange: 'NSE',
    country: 'IN',
    currency: 'INR',
    status: 'open',
    timeline: { openDate: daysAgo(1), closeDate: daysFromNow(2), listingDate: daysFromNow(9) },
    offering: { totalShares: 5000000, priceRange: { min: 1200, max: 1250 }, totalAmount: 6125000000 },
    subscription: { retail: { subscribed: 3000000, total: 2000000, percentage: 150 }, nii: { subscribed: 2200000, total: 1000000, percentage: 220 }, qib: { subscribed: 3800000, total: 2000000, percentage: 190 } },
    details: { description: 'Pan-India chain of diagnostic centres with 180+ labs.', industry: 'Healthcare', sector: 'Diagnostics' },
    analysis: { recommendation: 'subscribe', rating: 4, pros: ['Subscription 1.87x on Day 2', 'Defensive sector'], cons: ['High debt post-expansion'], valuation: 'fair', keyHighlights: ['Over-subscribed by 187%'] }
  },
  {
    id: 'ipo_004',
    symbol: 'FINTECHIPO',
    companyName: 'PayFast Fintech Solutions',
    exchange: 'NSE',
    country: 'IN',
    currency: 'INR',
    status: 'listed',
    timeline: { listingDate: daysAgo(12) },
    offering: { finalPrice: 750, totalAmount: 5000000000 },
    listing: { listingPrice: 832, listingGain: 82, listingGainPercentage: 10.93, currentPrice: 890, dayHigh: 910, dayLow: 825 },
    details: { description: 'Digital payments and lending platform with 25M+ users.', industry: 'Fintech', sector: 'Financial Services' },
    analysis: { recommendation: 'hold', rating: 3, pros: ['Strong listing gain (10.93%)', 'Growing user base'], cons: ['Competitive UPI landscape'], valuation: 'fair', keyHighlights: ['Listed at ₹832 vs issue price ₹750'] }
  },
  {
    id: 'ipo_005',
    symbol: 'USTECH',
    companyName: 'US Technology Corp',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    status: 'upcoming',
    timeline: { openDate: daysFromNow(5), closeDate: daysFromNow(7), listingDate: daysFromNow(14) },
    offering: { totalShares: 5000000, priceRange: { min: 25, max: 28 }, totalAmount: 132500000 },
    details: { description: 'AI-powered enterprise security solutions.', industry: 'Cybersecurity', sector: 'Technology' },
    analysis: { recommendation: 'neutral', rating: 3, pros: ['High-growth AI segment'], cons: ['Pre-revenue company'], valuation: 'overvalued', keyHighlights: ['$132.5M raise'] }
  },
  {
    id: 'ipo_006',
    symbol: 'ECOMIND',
    companyName: 'EcoMind Consumer Goods',
    exchange: 'BSE',
    country: 'IN',
    currency: 'INR',
    status: 'listed',
    timeline: { listingDate: daysAgo(25) },
    offering: { finalPrice: 320, totalAmount: 1800000000 },
    listing: { listingPrice: 370, listingGain: 50, listingGainPercentage: 15.63, currentPrice: 355, dayHigh: 380, dayLow: 350 },
    details: { description: 'Sustainable FMCG brand with D2C model.', industry: 'FMCG', sector: 'Consumer Goods' },
    analysis: { recommendation: 'hold', rating: 3, pros: ['Strong D2C brand recall'], cons: ['High marketing spend pressuring margins'], valuation: 'fair', keyHighlights: ['Listed at ₹370 vs issue price ₹320'] }
  }
];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.get('/', auth, (req, res) => {
  try {
    const { market = 'both', status = 'all' } = req.query;
    let ipos = [...DEMO_IPOS];
    if (market !== 'both') ipos = ipos.filter(i => i.country === (market === 'US' ? 'US' : 'IN'));
    if (status !== 'all') ipos = ipos.filter(i => i.status === status);
    res.json({ ipos });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching IPOs' });
  }
});

router.get('/calendar/upcoming', auth, (req, res) => {
  try {
    const { market = 'both', limit = 10 } = req.query;
    let ipos = DEMO_IPOS.filter(i => i.status === 'upcoming');
    if (market !== 'both') ipos = ipos.filter(i => i.country === (market === 'US' ? 'US' : 'IN'));
    ipos.sort((a, b) => new Date(a.timeline.openDate) - new Date(b.timeline.openDate));
    res.json({ ipos: ipos.slice(0, parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching upcoming IPOs' });
  }
});

router.get('/calendar/open', auth, (req, res) => {
  try {
    const { market = 'both' } = req.query;
    let ipos = DEMO_IPOS.filter(i => i.status === 'open');
    if (market !== 'both') ipos = ipos.filter(i => i.country === (market === 'US' ? 'US' : 'IN'));
    res.json({ ipos });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching open IPOs' });
  }
});

router.get('/calendar/listed', auth, (req, res) => {
  try {
    const { market = 'both', days = 30 } = req.query;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - parseInt(days));
    let ipos = DEMO_IPOS.filter(i => i.status === 'listed' && new Date(i.timeline.listingDate) >= cutoff);
    if (market !== 'both') ipos = ipos.filter(i => i.country === (market === 'US' ? 'US' : 'IN'));
    ipos.sort((a, b) => new Date(b.timeline.listingDate) - new Date(a.timeline.listingDate));
    res.json({ ipos });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching listed IPOs' });
  }
});

router.get('/compare', auth, (req, res) => {
  try {
    const { symbols } = req.query;
    if (!symbols) return res.status(400).json({ message: 'Symbols are required' });
    const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
    const ipos = DEMO_IPOS.filter(i => symbolArray.includes(i.symbol.toUpperCase()));
    res.json({ comparison: ipos });
  } catch (error) {
    res.status(500).json({ message: 'Error comparing IPOs' });
  }
});

router.get('/analysis/:symbol', auth, (req, res) => {
  try {
    const ipo = DEMO_IPOS.find(i => i.symbol.toUpperCase() === req.params.symbol.toUpperCase());
    if (!ipo) return res.status(404).json({ message: 'IPO not found' });
    res.json({ analysis: ipo.analysis || {} });
  } catch (error) {
    res.status(500).json({ message: 'Error analyzing IPO' });
  }
});

router.get('/:symbol', auth, (req, res) => {
  try {
    const ipo = DEMO_IPOS.find(i => i.symbol.toUpperCase() === req.params.symbol.toUpperCase());
    if (!ipo) return res.status(404).json({ message: 'IPO not found' });
    res.json({ ipo });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching IPO details' });
  }
});

module.exports = router;
