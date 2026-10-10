const axios = require('axios');

// ---------------------------------------------------------------------------
// TTL cache
// ---------------------------------------------------------------------------
const cache = new Map();
function cached(key, ttlMs, fn) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < ttlMs) return Promise.resolve(hit.data);
  return Promise.resolve(fn()).then(data => { cache.set(key, { data, ts: now }); return data; });
}

// ---------------------------------------------------------------------------
// Yahoo Finance crumb session (required since late 2024)
// ---------------------------------------------------------------------------
let _crumb  = null;
let _cookie = null;
let _crumbTs = 0;
const CRUMB_TTL = 30 * 60 * 1000; // 30 min

const YF_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function getYfSession() {
  const now = Date.now();
  if (_crumb && (now - _crumbTs) < CRUMB_TTL) return { crumb: _crumb, cookie: _cookie };

  // Step 1 — acquire cookie via consent endpoint
  const r1 = await axios.get('https://fc.yahoo.com', {
    headers: { 'User-Agent': YF_UA },
    timeout: 10000,
    maxRedirects: 5,
    validateStatus: () => true,
  });
  const rawCookies = r1.headers['set-cookie'] || [];
  _cookie = rawCookies.map(c => c.split(';')[0]).join('; ');

  // Step 2 — get crumb string
  const r2 = await axios.get('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': YF_UA, Cookie: _cookie },
    timeout: 8000,
    validateStatus: () => true,
  });

  if (r2.data && typeof r2.data === 'string' && r2.data.length > 0) {
    _crumb  = r2.data.trim();
    _crumbTs = now;
    return { crumb: _crumb, cookie: _cookie };
  }

  // Fallback: try query2
  const r3 = await axios.get('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': YF_UA, Cookie: _cookie },
    timeout: 8000,
    validateStatus: () => true,
  });
  _crumb  = (typeof r3.data === 'string' ? r3.data : '').trim() || 'fallback';
  _crumbTs = now;
  return { crumb: _crumb, cookie: _cookie };
}

// ---------------------------------------------------------------------------
// Yahoo Finance direct HTTP calls
// ---------------------------------------------------------------------------
async function yfQuotes(symbols) {
  const { crumb, cookie } = await getYfSession();
  const joined = symbols.join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(joined)}&lang=en-US&region=IN&crumb=${encodeURIComponent(crumb)}`;

  const { data } = await axios.get(url, {
    headers: { 'User-Agent': YF_UA, Accept: 'application/json', Cookie: cookie },
    timeout: 10000,
  });
  return (data?.quoteResponse?.result || []);
}

async function yfSearch(query) {
  const { cookie } = await getYfSession();
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=IN&quotesCount=10&newsCount=0`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': YF_UA, Accept: 'application/json', Cookie: cookie },
    timeout: 8000,
  });
  return (data?.quotes || []);
}

// ---------------------------------------------------------------------------
// Index definitions
// ---------------------------------------------------------------------------
const INDICES = [
  { symbol: '%5ENSEI',    name: 'Nifty 50',   short: 'NIFTY',     raw: '^NSEI' },
  { symbol: '%5EBSESN',   name: 'Sensex',     short: 'SENSEX',    raw: '^BSESN' },
  { symbol: '%5ENSEBANK', name: 'Bank Nifty', short: 'BANKNIFTY', raw: '^NSEBANK' },
  { symbol: '%5ECNXIT',   name: 'Nifty IT',   short: 'NIFTY IT',  raw: '^CNXIT' },
  { symbol: 'GC%3DF',     name: 'Gold',       short: 'GOLD',      raw: 'GC=F' },
  { symbol: 'CL%3DF',     name: 'Crude Oil',  short: 'CRUDE',     raw: 'CL=F' },
  { symbol: 'USDINR%3DX', name: 'USD/INR',    short: 'USD/INR',   raw: 'USDINR=X' },
];

function mapQuote(q, meta) {
  return {
    symbol:        meta?.raw    || q.symbol,
    name:          meta?.name   || q.longName || q.shortName || q.symbol,
    short:         meta?.short  || q.symbol,
    price:         q.regularMarketPrice         || 0,
    change:        q.regularMarketChange        || 0,
    changePercent: q.regularMarketChangePercent || 0,
    open:          q.regularMarketOpen          || 0,
    high:          q.regularMarketDayHigh       || 0,
    low:           q.regularMarketDayLow        || 0,
    prevClose:     q.regularMarketPreviousClose || 0,
    volume:        q.regularMarketVolume        || 0,
    marketCap:     q.marketCap                  || 0,
    pe:            q.trailingPE                 || 0,
    week52High:    q.fiftyTwoWeekHigh           || 0,
    week52Low:     q.fiftyTwoWeekLow            || 0,
    marketState:   q.marketState                || 'CLOSED',
    currency:      q.currency                   || 'INR',
    exchange:      q.fullExchangeName           || q.exchange || '',
  };
}

// ---------------------------------------------------------------------------
// Get live indices
// ---------------------------------------------------------------------------
async function getIndices() {
  return cached('indices', 30_000, async () => {
    const rawSymbols = INDICES.map(i => i.raw);
    const results = await yfQuotes(rawSymbols);

    return INDICES.map(meta => {
      const q = results.find(r => r.symbol === meta.raw);
      if (q) return mapQuote(q, meta);
      return { symbol: meta.raw, name: meta.name, short: meta.short, price: 0, change: 0, changePercent: 0, marketState: 'CLOSED' };
    });
  });
}

// ---------------------------------------------------------------------------
// Get single stock quote
// ---------------------------------------------------------------------------
async function getQuote(symbol, market = 'IN') {
  return cached(`q_${symbol}_${market}`, 30_000, async () => {
    let ySymbol = symbol;
    if (market === 'IN' && !symbol.includes('.') && !symbol.startsWith('^')) {
      ySymbol = symbol + '.NS';
    }

    const results = await yfQuotes([ySymbol]);
    if (results.length > 0) return mapQuote(results[0], null);

    // BSE fallback for Indian stocks
    if (market === 'IN') {
      const boSymbol = symbol.replace('.NS', '') + '.BO';
      const r2 = await yfQuotes([boSymbol]);
      if (r2.length > 0) return mapQuote(r2[0], null);
    }

    throw new Error(`No quote data for ${symbol}`);
  });
}

// ---------------------------------------------------------------------------
// Finnhub quote (US stocks)
// ---------------------------------------------------------------------------
async function getFinnhubQuote(symbol) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key || key.startsWith('your_')) throw new Error('Finnhub not configured');

  return cached(`fh_${symbol}`, 15_000, async () => {
    const { data } = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`,
      { timeout: 8000 }
    );
    if (!data?.c) throw new Error('No Finnhub data');
    return {
      symbol,
      price:         data.c,
      change:        data.d  || 0,
      changePercent: data.dp || 0,
      high:          data.h  || 0,
      low:           data.l  || 0,
      open:          data.o  || 0,
      prevClose:     data.pc || 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Alpha Vantage quote (fallback)
// ---------------------------------------------------------------------------
async function getAlphaVantageQuote(symbol, market = 'IN') {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key || key.startsWith('your_')) throw new Error('Alpha Vantage not configured');

  const avSymbol = market === 'IN' ? `${symbol}.BSE` : symbol;
  return cached(`av_${avSymbol}`, 60_000, async () => {
    const { data } = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${avSymbol}&apikey=${key}`,
      { timeout: 10000 }
    );
    const q = data['Global Quote'];
    if (!q?.['05. price']) throw new Error('No Alpha Vantage data');
    return {
      symbol,
      price:         parseFloat(q['05. price']),
      change:        parseFloat(q['09. change']),
      changePercent: parseFloat(q['10. change percent'].replace('%', '')),
      open:          parseFloat(q['02. open']),
      high:          parseFloat(q['03. high']),
      low:           parseFloat(q['04. low']),
      prevClose:     parseFloat(q['08. previous close']),
      volume:        parseInt(q['06. volume']),
    };
  });
}

// ---------------------------------------------------------------------------
// Search stocks
// ---------------------------------------------------------------------------
async function searchStocks(query, market = 'IN') {
  try {
    const results = await yfSearch(query);
    return results
      .filter(q => {
        if (market === 'IN') return q.exchange === 'NSI' || q.exchange === 'BSE' || q.exchange === 'NSE';
        return q.quoteType === 'EQUITY';
      })
      .slice(0, 12)
      .map(q => ({
        symbol:   q.symbol,
        name:     q.longname || q.shortname || q.symbol,
        exchange: q.exchange,
        type:     q.quoteType || 'EQUITY',
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Bulk enrich holdings with live prices
// ---------------------------------------------------------------------------
async function enrichHoldings(holdings = []) {
  if (holdings.length === 0) return holdings;
  try {
    const symbols = holdings.map(h => {
      if (h.currency === 'INR' && !h.symbol.includes('.') && !h.symbol.startsWith('^')) {
        return h.symbol + '.NS';
      }
      return h.symbol;
    });

    const results = await yfQuotes(symbols);
    return holdings.map((h, i) => {
      const q = results.find(r => r.symbol === symbols[i] || r.symbol === h.symbol);
      if (q && q.regularMarketPrice) {
        return { ...h, currentPrice: q.regularMarketPrice, liveChange: q.regularMarketChange || 0, liveChangePercent: q.regularMarketChangePercent || 0 };
      }
      return h;
    });
  } catch {
    return holdings;
  }
}

// ---------------------------------------------------------------------------
// Price history for charts (Yahoo v8 chart API)
// ---------------------------------------------------------------------------
const CHART_RANGES = {
  '1d':  { interval: '5m',  ttl: 60_000 },
  '5d':  { interval: '15m', ttl: 5 * 60_000 },
  '1mo': { interval: '1d',  ttl: 30 * 60_000 },
  '6mo': { interval: '1d',  ttl: 60 * 60_000 },
  '1y':  { interval: '1d',  ttl: 60 * 60_000 },
  '5y':  { interval: '1wk', ttl: 6 * 60 * 60_000 },
};

async function getChart(symbol, range = '1d') {
  const cfg = CHART_RANGES[range];
  if (!cfg) throw new Error(`Unsupported range: ${range}`);

  return cached(`chart_${symbol}_${range}`, cfg.ttl, async () => {
    const { cookie } = await getYfSession();
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${cfg.interval}`;
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': YF_UA, Accept: 'application/json', Cookie: cookie },
      timeout: 10000,
    });

    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No chart data');
    const meta   = result.meta || {};
    const closes = result.indicators?.quote?.[0]?.close || [];

    const points = (result.timestamp || [])
      .map((t, i) => ({ t: t * 1000, p: closes[i] }))
      .filter(pt => typeof pt.p === 'number');

    // Intraday compares with yesterday's close; longer ranges with the first point.
    const base = range === '1d'
      ? (meta.chartPreviousClose ?? meta.previousClose ?? points[0]?.p)
      : points[0]?.p;
    const last = meta.regularMarketPrice ?? points[points.length - 1]?.p ?? null;

    return {
      symbol,
      range,
      name: meta.longName || meta.shortName || symbol,
      currency: meta.currency || null,
      timezone: meta.exchangeTimezoneName || null,
      price: last,
      base: base ?? null,
      change: last != null && base != null ? last - base : null,
      changePercent: last != null && base ? ((last - base) / base) * 100 : null,
      high: points.length ? Math.max(...points.map(pt => pt.p)) : null,
      low:  points.length ? Math.min(...points.map(pt => pt.p)) : null,
      points,
    };
  });
}

module.exports = { getIndices, getQuote, getFinnhubQuote, getAlphaVantageQuote, searchStocks, enrichHoldings, getChart, CHART_RANGES };
