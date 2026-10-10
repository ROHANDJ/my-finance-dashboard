'use strict';
const express = require('express');
const axios   = require('axios');
const auth    = require('../middleware/auth');
const { enrichHoldings } = require('../services/marketDataService');
const router  = express.Router();

// ---------------------------------------------------------------------------
// NSE session
// NSE's JSON API rejects requests without the cookies its website sets, so
// we load a page first and reuse those cookies for a few minutes.
// ---------------------------------------------------------------------------

const NSE_BASE = 'https://www.nseindia.com';
const NSE_UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const COOKIE_TTL_MS = 5 * 60 * 1000;

let _cookie   = '';
let _cookieTs = 0;

async function getNseCookie(force = false) {
  if (!force && _cookie && Date.now() - _cookieTs < COOKIE_TTL_MS) return _cookie;
  const res = await axios.get(`${NSE_BASE}/market-data/all-upcoming-issues-ipo`, {
    headers: { 'User-Agent': NSE_UA, Accept: 'text/html,application/xhtml+xml' },
    timeout: 10000,
    validateStatus: () => true,
  });
  _cookie   = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  _cookieTs = Date.now();
  return _cookie;
}

async function fetchNse(path) {
  const get = async (cookie) => axios.get(`${NSE_BASE}${path}`, {
    headers: {
      'User-Agent': NSE_UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: `${NSE_BASE}/market-data/all-upcoming-issues-ipo`,
      Cookie: cookie,
    },
    timeout: 10000,
  });

  try {
    return (await get(await getNseCookie())).data;
  } catch (err) {
    // Cookies expire early sometimes — refresh once and retry.
    if (err.response && [401, 403].includes(err.response.status)) {
      return (await get(await getNseCookie(true))).data;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

const MONTHS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

/**
 * "15-Oct-2026" / "07-OCT-2026" → Date at noon IST (06:30 UTC), so the calendar
 * day is the same in any viewer timezone from UTC-6 to UTC+17. Else null.
 */
function parseNseDate(s) {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(s || '').trim());
  if (!m || MONTHS[m[2].toUpperCase()] === undefined) return null;
  return new Date(Date.UTC(+m[3], MONTHS[m[2].toUpperCase()], +m[1], 6, 30));
}

/** Calendar day in IST as "YYYY-MM-DD" (NSE dates are IST days). */
const istDay = (d) => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

/** "Rs.258 to Rs.271" → { min: 258, max: 271 }; "Rs.100" → { min: 100, max: 100 } */
function parsePriceRange(s) {
  const nums = String(s || '').match(/\d+(\.\d+)?/g);
  if (!nums) return null;
  const vals = nums.map(Number);
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function parseNumber(s) {
  const n = parseFloat(String(s || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// Equity issues only — NSE also lists debt, InvITs, REITs, rights etc.
const EQUITY_SERIES = new Set(['EQ', 'SME', 'BE']);

function statusFromDates(open, close, listing) {
  const today = istDay(new Date());
  if (listing && istDay(listing) <= today) return 'listed';
  if (open && istDay(open) > today) return 'upcoming';
  if (close && istDay(close) >= today) return 'open';
  return 'closed'; // bidding over, awaiting listing
}

/** Normalise an item from any of the NSE IPO endpoints to our shape. */
function mapNseIpo(item) {
  const series    = String(item.series || item.securityType || '').trim().toUpperCase();
  const openDate  = parseNseDate(item.issueStartDate || item.ipoStartDate);
  const closeDate = parseNseDate(item.issueEndDate   || item.ipoEndDate);
  const listDate  = parseNseDate(item.listingDate);
  const range     = parsePriceRange(item.priceBand || item.priceRange || item.issuePrice);
  const finalPrice = parseNumber(item.issuePrice && !/to/i.test(item.issuePrice) ? item.issuePrice : null);

  return {
    id:          `nse_${item.symbol}`,
    symbol:      item.symbol || '',
    companyName: (item.companyName || item.company || '').trim(),
    exchange:    'NSE',
    country:     'IN',
    currency:    'INR',
    status:      statusFromDates(openDate, closeDate, listDate),
    isSme:       series === 'SME',
    timeline: {
      openDate:    openDate  ? openDate.toISOString()  : null,
      closeDate:   closeDate ? closeDate.toISOString() : null,
      listingDate: listDate  ? listDate.toISOString()  : null,
    },
    offering: {
      priceRange:  range,
      finalPrice,
      totalShares: parseNumber(item.issueSize),
      lotSize:     parseNumber(item.lotSize),
    },
    details: { series },
    // NSE provides no recommendation; we don't invent one.
    analysis: null,
  };
}

// ---------------------------------------------------------------------------
// Live IPO list (cached 10 min). Returns null when NSE can't be reached.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS     = 10 * 60 * 1000;
const PAST_WINDOW_DAYS = 60;

let _cache     = null;
let _cacheTime = 0;

async function getLiveIpos() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL_MS) return _cache;

  const results = await Promise.allSettled([
    fetchNse('/api/ipo-current-issue'),
    fetchNse('/api/all-upcoming-issues?category=ipo'),
    fetchNse('/api/public-past-issues'),
  ]);

  const lists = results.map(r => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : null));
  if (lists.every(l => l === null)) {
    results.forEach(r => r.status === 'rejected' && console.error('[ipo] NSE fetch failed:', r.reason?.message));
    return null;
  }

  const [current, upcoming, past] = lists.map(l => l || []);
  const cutoff = new Date(Date.now() - PAST_WINDOW_DAYS * 86400 * 1000);

  // Current/upcoming first so they win when the same symbol appears twice.
  const bySymbol = new Map();
  for (const raw of [...current, ...upcoming, ...past]) {
    const series = String(raw.series || raw.securityType || '').trim().toUpperCase();
    if (!raw.symbol || !EQUITY_SERIES.has(series) || bySymbol.has(raw.symbol)) continue;
    const ipo = mapNseIpo(raw);
    const close = ipo.timeline.closeDate && new Date(ipo.timeline.closeDate);
    if (ipo.status !== 'upcoming' && ipo.status !== 'open' && close && close < cutoff) continue;
    bySymbol.set(raw.symbol, ipo);
  }

  const ipos = [...bySymbol.values()].sort((a, b) =>
    new Date(b.timeline.openDate || 0) - new Date(a.timeline.openDate || 0));

  await addListingPrices(ipos);

  _cache     = ipos;
  _cacheTime = Date.now();
  return ipos;
}

/** Attach today's price and gain over issue price to listed IPOs (one batch quote). */
async function addListingPrices(ipos) {
  const listed = ipos.filter(i => i.status === 'listed');
  if (listed.length === 0) return;
  try {
    const quotes = await enrichHoldings(listed.map(i => ({ symbol: i.symbol, currency: 'INR' })));
    quotes.forEach((q, k) => {
      if (!q.currentPrice) return;
      const ipo = listed[k];
      const issuePrice = ipo.offering.finalPrice || ipo.offering.priceRange?.max || null;
      ipo.listing = {
        currentPrice: q.currentPrice,
        issuePrice,
        gainPercent: issuePrice ? +(((q.currentPrice - issuePrice) / issuePrice) * 100).toFixed(2) : null,
      };
    });
  } catch (err) {
    console.error('[ipo] listing prices failed:', err.message); // non-fatal
  }
}

const UNAVAILABLE = { ipos: [], source: 'unavailable', message: 'Live IPO data from NSE is unavailable right now. Please try again later.' };

// NSE only covers Indian IPOs; accept both spellings the client uses.
const isUsMarket = (m) => ['us', 'US'].includes(m);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /  — all IPOs (?status=upcoming|open|closed|listed)
router.get('/', auth, async (req, res) => {
  try {
    const { market = 'both', status = 'all' } = req.query;
    if (isUsMarket(market)) return res.json({ ipos: [], source: 'nse-live', message: 'US IPOs are not available yet.' });

    const live = await getLiveIpos();
    if (!live) return res.json(UNAVAILABLE);

    const ipos = status === 'all' ? live : live.filter(i => i.status === status);
    res.json({ ipos, source: 'nse-live' });
  } catch (err) {
    console.error('[ipo] GET / error:', err);
    res.status(500).json({ message: 'Error fetching IPOs' });
  }
});

// GET /calendar/upcoming — upcoming + currently open, soonest first
router.get('/calendar/upcoming', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const live = await getLiveIpos();
    if (!live) return res.json(UNAVAILABLE);

    const ipos = live
      .filter(i => i.status === 'upcoming' || i.status === 'open')
      .sort((a, b) => new Date(a.timeline.openDate || 0) - new Date(b.timeline.openDate || 0));
    res.json({ ipos: ipos.slice(0, limit), source: 'nse-live' });
  } catch (err) {
    console.error('[ipo] GET /calendar/upcoming error:', err);
    res.status(500).json({ message: 'Error fetching upcoming IPOs' });
  }
});

// GET /calendar/open
router.get('/calendar/open', auth, async (req, res) => {
  try {
    const live = await getLiveIpos();
    if (!live) return res.json(UNAVAILABLE);
    res.json({ ipos: live.filter(i => i.status === 'open'), source: 'nse-live' });
  } catch (err) {
    console.error('[ipo] GET /calendar/open error:', err);
    res.status(500).json({ message: 'Error fetching open IPOs' });
  }
});

// GET /calendar/listed?days=30 — listed (or closed, awaiting listing) recently
router.get('/calendar/listed', auth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, PAST_WINDOW_DAYS);
    const cutoff = new Date(Date.now() - days * 86400 * 1000);

    const live = await getLiveIpos();
    if (!live) return res.json(UNAVAILABLE);

    const ipos = live.filter(i => {
      if (i.status !== 'listed' && i.status !== 'closed') return false;
      const d = i.timeline.listingDate || i.timeline.closeDate;
      return !d || new Date(d) >= cutoff;
    });
    res.json({ ipos, source: 'nse-live' });
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
    const wanted = new Set(symbols.split(',').map(s => s.trim().toUpperCase()));

    const live = await getLiveIpos();
    if (!live) return res.json({ comparison: [], ...UNAVAILABLE });
    res.json({ comparison: live.filter(i => wanted.has(i.symbol.toUpperCase())), source: 'nse-live' });
  } catch (err) {
    console.error('[ipo] GET /compare error:', err);
    res.status(500).json({ message: 'Error comparing IPOs' });
  }
});

// ---------------------------------------------------------------------------
// Rich per-issue details from NSE's issue-information page:
// subscription by category, issue terms, intermediaries, official documents.
// ---------------------------------------------------------------------------

const DETAIL_TTL_MS = 5 * 60 * 1000; // subscription numbers update during bidding
const _detailCache = new Map();

const stripHtml = (s) => String(s ?? '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/^"+|"+$/g, '')
  .replace(/\s+/g, ' ')
  .trim();

/** First http(s) URL in a value (values are sometimes raw URLs, sometimes <a href=...>). */
const firstUrl = (s) => (String(s ?? '').match(/https?:\/\/[^\s"'<>]+/) || [null])[0];

// NSE issue-info titles we surface, keyed by our field name. Matched by prefix
// because NSE varies the wording slightly between issues.
const INFO_FIELDS = {
  issueType:      'Issue Type',
  issueSize:      'Issue Size',
  priceRange:     'Price Range',
  faceValue:      'Face Value',
  bidLot:         'Bid Lot',
  minOrderQty:    'Minimum Order Quantity',
  maxRetail:      'Maximum Subscription Amount for Retail',
  discount:       'Discount',
  leadManagers:   'Book Running Lead Managers',
  sponsorBank:    'Sponsor Bank',
  registrar:      'Name of the Registrar',
  registrarContact: 'Contact person name number and Email',
  upiCutoff:      'Cut-off time for UPI Mandate',
};

const DOC_FIELDS = {
  rhp:            'Red Herring Prospectus',
  basisOfPrice:   'Ratios / Basis of Issue Price',
  applicationForms: 'Sample Application Forms',
};

// Top-level subscription categories (sub-rows like "1(a)" are skipped).
function subscriptionLabel(category, srNo) {
  const c = String(category || '');
  if (srNo === null || /^total$/i.test(c)) return 'Total';
  if (/qualified institutional/i.test(c)) return 'QIB';
  if (/^non institutional investors$/i.test(c)) return 'NII';
  if (/retail/i.test(c)) return 'Retail';
  if (/employee/i.test(c)) return 'Employees';
  if (/shareholder/i.test(c)) return 'Shareholders';
  return null;
}

function parseSubscription(json) {
  // activeCat is the consolidated (NSE + BSE) view; fall back to NSE-only bidDetails.
  const consolidated = (json.activeCat?.dataList || []).slice(1).map(r => ({
    category: r.category, srNo: r.srNo, offered: r.noOfShareOffered, bid: r.noOfSharesBid, times: r.noOfTotalMeant,
  }));
  const nseOnly = (json.bidDetails || []).map(r => ({
    category: r.category, srNo: r.srNo, offered: r.noOfSharesOffered, bid: r.noOfsharesBid, times: r.noOfTime,
  }));
  const rows = consolidated.length > 1 ? consolidated : nseOnly;

  const out = [];
  for (const r of rows) {
    const label = subscriptionLabel(r.category, r.srNo);
    if (!label || out.some(o => o.label === label)) continue;
    const offered = parseNumber(r.offered);
    const bid = parseNumber(r.bid);
    if (!offered && !bid) continue;
    // NSE reports the Total row's share counts in crores, unlike the other rows,
    // so only its "times subscribed" figure is comparable.
    const isTotal = label === 'Total';
    out.push({
      label,
      sharesOffered: isTotal ? null : offered,
      sharesBid: isTotal ? null : bid,
      times: +(parseFloat(r.times) || 0).toFixed(2),
    });
  }
  // Total last
  return out.sort((a, b) => (a.label === 'Total') - (b.label === 'Total'));
}

function parseIssueInfo(json) {
  const rows = (json.issueInfo?.dataList || []).filter(r => r.title);
  const find = (prefix) => rows.find(r => String(r.title).trim().toLowerCase().startsWith(prefix.toLowerCase()));

  const info = {};
  for (const [key, prefix] of Object.entries(INFO_FIELDS)) {
    const row = find(prefix);
    if (row && stripHtml(row.value)) info[key] = stripHtml(row.value);
  }
  // Long legal text: keep the first sentence only.
  if (info.upiCutoff) info.upiCutoff = info.upiCutoff.split(/\s(?=The\s)/)[0];

  const documents = {};
  for (const [key, prefix] of Object.entries(DOC_FIELDS)) {
    const url = firstUrl(find(prefix)?.value);
    if (url) documents[key] = url;
  }
  return { info, documents };
}

async function getIpoDetails(symbol, series) {
  const key = `${symbol}_${series}`;
  const hit = _detailCache.get(key);
  if (hit && Date.now() - hit.ts < DETAIL_TTL_MS) return hit.data;

  const json = await fetchNse(`/api/ipo-detail?symbol=${encodeURIComponent(symbol)}&series=${encodeURIComponent(series)}`);
  const meta = json?.metaInfo || {};
  const { info, documents } = parseIssueInfo(json || {});

  const data = {
    symbol,
    industry: meta.industry || null,
    isin: meta.isin || null,
    listingDate: meta.listingDate || null,
    info,
    documents,
    subscription: parseSubscription(json || {}),
    subscriptionUpdated: json?.activeCat?.updateTime && !/null/.test(json.activeCat.updateTime)
      ? json.activeCat.updateTime.replace(/^Updated as on\s*/i, '')
      : null,
  };
  _detailCache.set(key, { data, ts: Date.now() });
  return data;
}

function externalLinks(ipo) {
  const q = encodeURIComponent(`${ipo.companyName} IPO`);
  const listed = ipo.status === 'listed';
  return {
    nse: listed
      ? `${NSE_BASE}/get-quotes/equity?symbol=${encodeURIComponent(ipo.symbol)}`
      : `${NSE_BASE}/market-data/issue-information?symbol=${encodeURIComponent(ipo.symbol)}&series=${encodeURIComponent(ipo.details.series)}&type=Active`,
    news: `https://www.google.com/search?q=${q}&tbm=nws`,
    web: `https://www.google.com/search?q=${q}`,
  };
}

// GET /:symbol/details — rich details for one IPO
router.get('/:symbol/details', auth, async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const live = await getLiveIpos();
    if (!live) return res.status(503).json(UNAVAILABLE);

    const ipo = live.find(i => i.symbol.toUpperCase() === sym);
    if (!ipo) return res.status(404).json({ message: 'IPO not found' });

    let details = null;
    try {
      details = await getIpoDetails(ipo.symbol, ipo.details.series);
    } catch (err) {
      console.error('[ipo] detail fetch failed:', sym, err.message); // links still useful
    }
    res.json({ ipo, details, links: externalLinks(ipo), source: 'nse-live' });
  } catch (err) {
    console.error('[ipo] GET /:symbol/details error:', err);
    res.status(500).json({ message: 'Error fetching IPO details' });
  }
});

// GET /:symbol — single IPO detail
router.get('/:symbol', auth, async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const live = await getLiveIpos();
    if (!live) return res.status(503).json(UNAVAILABLE);

    const ipo = live.find(i => i.symbol.toUpperCase() === sym);
    if (!ipo) return res.status(404).json({ message: 'IPO not found' });
    res.json({ ipo, source: 'nse-live' });
  } catch (err) {
    console.error('[ipo] GET /:symbol error:', err);
    res.status(500).json({ message: 'Error fetching IPO details' });
  }
});

module.exports = router;
