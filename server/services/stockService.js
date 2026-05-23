const axios = require('axios');

// yahoo-finance2 v2 API — .default required for the ESM-compatible export
let yahooFinance;
try {
  yahooFinance = require('yahoo-finance2').default;
} catch (e) {
  yahooFinance = null;
}

// ---------------------------------------------------------------------------
// Demo stock data – used when API keys are absent or calls fail
// ---------------------------------------------------------------------------
const DEMO_STOCKS = {
  '^GSPC':      { symbol: '^GSPC',     name: 'S&P 500',            exchange: 'INDEX', country: 'US', currency: 'USD', currentPrice: 5204.34, previousClose: 5176.22, change: 28.12,  changePercent: 0.54,  dayHigh: 5218.40,  dayLow: 5162.10,  marketCap: 0 },
  '^DJI':       { symbol: '^DJI',      name: 'Dow Jones',          exchange: 'INDEX', country: 'US', currency: 'USD', currentPrice: 38996.39,previousClose: 38714.77,change: 281.62, changePercent: 0.73,  dayHigh: 39102.00, dayLow: 38820.00, marketCap: 0 },
  '^IXIC':      { symbol: '^IXIC',     name: 'NASDAQ',             exchange: 'INDEX', country: 'US', currency: 'USD', currentPrice: 16275.52,previousClose: 16129.74,change: 145.78, changePercent: 0.90,  dayHigh: 16320.00, dayLow: 16100.00, marketCap: 0 },
  '^VIX':       { symbol: '^VIX',      name: 'VIX',                exchange: 'INDEX', country: 'US', currency: 'USD', currentPrice: 13.42,   previousClose: 14.01,   change: -0.59,  changePercent: -4.21, dayHigh: 14.20,    dayLow: 13.10,    marketCap: 0 },
  '^NSEI':      { symbol: '^NSEI',     name: 'NIFTY 50',           exchange: 'NSE',   country: 'IN', currency: 'INR', currentPrice: 22648.20,previousClose: 22404.70,change: 243.50, changePercent: 1.09,  dayHigh: 22710.00, dayLow: 22520.00, marketCap: 0 },
  '^NSEBANK':   { symbol: '^NSEBANK',  name: 'NIFTY BANK',         exchange: 'NSE',   country: 'IN', currency: 'INR', currentPrice: 48320.80,previousClose: 47912.40,change: 408.40, changePercent: 0.85,  dayHigh: 48520.00, dayLow: 48100.00, marketCap: 0 },
  '^CNXIT':     { symbol: '^CNXIT',    name: 'NIFTY IT',           exchange: 'NSE',   country: 'IN', currency: 'INR', currentPrice: 35124.60,previousClose: 34782.30,change: 342.30, changePercent: 0.98,  dayHigh: 35280.00, dayLow: 34950.00, marketCap: 0 },
  '^NSEMID50':  { symbol: '^NSEMID50', name: 'NIFTY MIDCAP 50',    exchange: 'NSE',   country: 'IN', currency: 'INR', currentPrice: 14218.35,previousClose: 14042.10,change: 176.25, changePercent: 1.26,  dayHigh: 14290.00, dayLow: 14100.00, marketCap: 0 },
  'AAPL':       { symbol: 'AAPL',      name: 'Apple Inc.',         exchange: 'NASDAQ',country: 'US', currency: 'USD', currentPrice: 189.30,  previousClose: 186.50,  change: 2.80,   changePercent: 1.50,  dayHigh: 191.00,   dayLow: 186.20,   marketCap: 2950000000000, sector: 'Technology' },
  'MSFT':       { symbol: 'MSFT',      name: 'Microsoft Corp.',    exchange: 'NASDAQ',country: 'US', currency: 'USD', currentPrice: 415.20,  previousClose: 410.30,  change: 4.90,   changePercent: 1.19,  dayHigh: 416.80,   dayLow: 410.10,   marketCap: 3080000000000, sector: 'Technology' },
  'GOOGL':      { symbol: 'GOOGL',     name: 'Alphabet Inc.',      exchange: 'NASDAQ',country: 'US', currency: 'USD', currentPrice: 172.40,  previousClose: 170.10,  change: 2.30,   changePercent: 1.35,  dayHigh: 173.50,   dayLow: 170.00,   marketCap: 2120000000000, sector: 'Technology' },
  'AMZN':       { symbol: 'AMZN',      name: 'Amazon.com Inc.',    exchange: 'NASDAQ',country: 'US', currency: 'USD', currentPrice: 198.90,  previousClose: 195.40,  change: 3.50,   changePercent: 1.79,  dayHigh: 200.20,   dayLow: 195.20,   marketCap: 2080000000000, sector: 'Consumer Cyclical' },
  'TSLA':       { symbol: 'TSLA',      name: 'Tesla Inc.',         exchange: 'NASDAQ',country: 'US', currency: 'USD', currentPrice: 248.70,  previousClose: 252.30,  change: -3.60,  changePercent: -1.43, dayHigh: 254.00,   dayLow: 246.50,   marketCap: 790000000000,  sector: 'Automotive' },
  'INFY':       { symbol: 'INFY',      name: 'Infosys Ltd',        exchange: 'NSE',   country: 'IN', currency: 'INR', currentPrice: 1842.50, previousClose: 1781.20, change: 61.30,  changePercent: 3.44,  dayHigh: 1860.00,  dayLow: 1798.00,  marketCap: 7650000000000,  sector: 'IT' },
  'TCS':        { symbol: 'TCS',       name: 'Tata Consultancy Services', exchange: 'NSE', country: 'IN', currency: 'INR', currentPrice: 3920.00, previousClose: 3884.50, change: 35.50, changePercent: 0.91, dayHigh: 3940.00, dayLow: 3870.00, marketCap: 14220000000000, sector: 'IT' },
  'RELIANCE':   { symbol: 'RELIANCE',  name: 'Reliance Industries', exchange: 'NSE',  country: 'IN', currency: 'INR', currentPrice: 2948.35, previousClose: 2912.40, change: 35.95,  changePercent: 1.23,  dayHigh: 2960.00,  dayLow: 2900.00,  marketCap: 19940000000000, sector: 'Energy' },
  'HDFCBANK':   { symbol: 'HDFCBANK',  name: 'HDFC Bank Ltd',      exchange: 'NSE',   country: 'IN', currency: 'INR', currentPrice: 1612.80, previousClose: 1594.20, change: 18.60,  changePercent: 1.17,  dayHigh: 1625.00,  dayLow: 1590.00,  marketCap: 12280000000000, sector: 'Banking' },
  'WIPRO':      { symbol: 'WIPRO',     name: 'Wipro Ltd',          exchange: 'NSE',   country: 'IN', currency: 'INR', currentPrice: 482.40,  previousClose: 491.80,  change: -9.40,  changePercent: -1.91, dayHigh: 492.00,   dayLow: 479.50,   marketCap: 2512000000000,  sector: 'IT' },
};

function getDemoQuote(symbol) {
  const upper = symbol.toUpperCase().replace(/\.(NS|BO)$/, '');
  if (DEMO_STOCKS[upper]) return { ...DEMO_STOCKS[upper] };
  // generic fallback
  const price = 100 + (upper.charCodeAt(0) * 7.3) % 900;
  return {
    symbol: upper, name: upper, exchange: 'DEMO', country: 'US', currency: 'USD',
    currentPrice: parseFloat(price.toFixed(2)),
    previousClose: parseFloat((price * 0.98).toFixed(2)),
    change: parseFloat((price * 0.02).toFixed(2)),
    changePercent: 2.0,
    dayHigh: parseFloat((price * 1.01).toFixed(2)),
    dayLow: parseFloat((price * 0.97).toFixed(2)),
    marketCap: 0
  };
}

function generateDemoHistory(symbol, period = '1M') {
  const days = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '5Y': 1825 };
  const count = days[period] || 30;
  const base = getDemoQuote(symbol).currentPrice;
  const dates = [], prices = [], volumes = [], highs = [], lows = [], opens = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d);
    const noise = (Math.random() - 0.48) * base * 0.02;
    const close = parseFloat(Math.max(1, base + noise * (count - i) / count).toFixed(2));
    prices.push(close);
    volumes.push(Math.floor(Math.random() * 5000000) + 500000);
    highs.push(parseFloat((close * 1.01).toFixed(2)));
    lows.push(parseFloat((close * 0.99).toFixed(2)));
    opens.push(parseFloat((close * 0.995).toFixed(2)));
  }
  return { dates, prices, volumes, highs, lows, opens };
}

// ---------------------------------------------------------------------------
// Map a yahoo-finance2 v2 quote object to our normalised shape
// ---------------------------------------------------------------------------
function mapYahooQuote(q, symbol, exchange, country, currency) {
  const currentPrice = q.regularMarketPrice || 0;
  const previousClose = q.regularMarketPreviousClose || 0;
  return {
    symbol: symbol.toUpperCase(),
    name: q.shortName || q.longName || symbol,
    exchange: q.fullExchangeName || exchange,
    country,
    currency,
    currentPrice: parseFloat((currentPrice).toFixed(2)),
    previousClose: parseFloat((previousClose).toFixed(2)),
    change: parseFloat((q.regularMarketChange || currentPrice - previousClose).toFixed(2)),
    changePercent: parseFloat((q.regularMarketChangePercent || 0).toFixed(2)),
    dayHigh: q.regularMarketDayHigh || 0,
    dayLow:  q.regularMarketDayLow  || 0,
    volume:  q.regularMarketVolume  || 0,
    marketCap: q.marketCap || 0,
    sector: q.sector || ''
  };
}

class StockService {
  constructor() {
    this.finnhubKey = process.env.FINNHUB_API_KEY;
  }

  async getStockQuote(symbol, market = 'US') {
    try {
      if (market === 'IN') {
        return await this.getIndianStockQuote(symbol);
      }
      return await this.getUSStockQuote(symbol);
    } catch (error) {
      console.warn(`Stock API failed for ${symbol}, using demo data:`, error.message);
      return getDemoQuote(symbol);
    }
  }

  async getUSStockQuote(symbol) {
    // Prefer Finnhub if key is set; otherwise fall back to Yahoo Finance
    if (this.finnhubKey) {
      try {
        const [quoteRes, profileRes] = await Promise.all([
          axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.finnhubKey}`, { timeout: 5000 }),
          axios.get(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${this.finnhubKey}`, { timeout: 5000 })
        ]);
        const quote   = quoteRes.data;
        const profile = profileRes.data;
        if (!quote.c) throw new Error('No price from Finnhub');
        return {
          symbol: symbol.toUpperCase(),
          name: profile.name || symbol,
          exchange: profile.exchange || 'NASDAQ',
          country: 'US', currency: 'USD',
          currentPrice:  quote.c  || 0,
          previousClose: quote.pc || 0,
          change:        quote.d  || 0,
          changePercent: quote.dp || 0,
          dayHigh: quote.h || 0,
          dayLow:  quote.l || 0,
          marketCap: profile.marketCapitalization || 0,
          sector:   profile.gics        || '',
          industry: profile.subIndustry || '',
          description: profile.description || '',
          website: profile.weburl || '',
          logo:    profile.logo   || ''
        };
      } catch (err) {
        console.warn(`Finnhub failed for ${symbol}, falling back to Yahoo Finance:`, err.message);
      }
    }

    // Yahoo Finance fallback for US stocks
    if (yahooFinance) {
      try {
        const q = await yahooFinance.quote(symbol, {}, { validateResult: false });
        if (q && q.regularMarketPrice) {
          return mapYahooQuote(q, symbol, q.fullExchangeName || 'NASDAQ', 'US', 'USD');
        }
      } catch (err) {
        console.warn(`Yahoo Finance failed for US ${symbol}:`, err.message);
      }
    }

    return getDemoQuote(symbol);
  }

  async getIndianStockQuote(symbol) {
    if (!yahooFinance) return getDemoQuote(symbol);

    const cleanSym = symbol.toUpperCase().replace(/\.(NS|BO)$/, '');

    // Try NSE first, then BSE
    for (const suffix of ['.NS', '.BO']) {
      const ySymbol = cleanSym + suffix;
      const exchange = suffix === '.NS' ? 'NSE' : 'BSE';
      try {
        const q = await yahooFinance.quote(ySymbol, {}, { validateResult: false });
        if (q && q.regularMarketPrice) {
          const result = mapYahooQuote(q, cleanSym, exchange, 'IN', 'INR');
          result.exchange = exchange; // ensure correct exchange label
          return result;
        }
      } catch (err) {
        console.warn(`Yahoo Finance ${ySymbol} failed:`, err.message);
      }
    }

    return getDemoQuote(symbol);
  }

  async getHistoricalData(symbol, period = '1M', market = 'US') {
    // Determine date range
    const periodSeconds = {
      '1D': 86400, '1W': 604800, '1M': 2592000,
      '3M': 7776000, '6M': 15552000, '1Y': 31536000,
      '2Y': 63072000, '5Y': 157680000
    };
    const secondsBack = periodSeconds[period] || 2592000;
    const period2 = new Date();
    const period1 = new Date(Date.now() - secondsBack * 1000);

    // US stocks: Finnhub first
    if (market === 'US' && this.finnhubKey) {
      try {
        const from = Math.floor(period1.getTime() / 1000);
        const to   = Math.floor(period2.getTime() / 1000);
        const url  = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${this.finnhubKey}`;
        const response = await axios.get(url, { timeout: 5000 });
        const data = response.data;
        if (data.s !== 'no_data' && data.t && data.t.length > 0) {
          return {
            dates:   data.t.map(t => new Date(t * 1000)),
            prices:  data.c,
            volumes: data.v,
            highs:   data.h,
            lows:    data.l,
            opens:   data.o
          };
        }
      } catch (err) {
        console.warn(`Finnhub historical failed for ${symbol}:`, err.message);
      }
    }

    // Yahoo Finance (covers both US and IN)
    if (yahooFinance) {
      let ySymbol = symbol;
      if (market === 'IN') {
        const clean = symbol.toUpperCase().replace(/\.(NS|BO)$/, '');
        ySymbol = clean + '.NS';
      }
      try {
        const rows = await yahooFinance.historical(
          ySymbol,
          { period1, period2, interval: '1d' },
          { validateResult: false }
        );
        if (rows && rows.length > 0) {
          return {
            dates:   rows.map(r => r.date),
            prices:  rows.map(r => r.close),
            volumes: rows.map(r => r.volume),
            highs:   rows.map(r => r.high),
            lows:    rows.map(r => r.low),
            opens:   rows.map(r => r.open)
          };
        }
      } catch (err) {
        console.warn(`Yahoo Finance historical failed for ${ySymbol}:`, err.message);
        // If .NS failed for Indian stock, try .BO
        if (market === 'IN') {
          try {
            const boSym = symbol.toUpperCase().replace(/\.(NS|BO)$/, '') + '.BO';
            const rows = await yahooFinance.historical(
              boSym,
              { period1, period2, interval: '1d' },
              { validateResult: false }
            );
            if (rows && rows.length > 0) {
              return {
                dates:   rows.map(r => r.date),
                prices:  rows.map(r => r.close),
                volumes: rows.map(r => r.volume),
                highs:   rows.map(r => r.high),
                lows:    rows.map(r => r.low),
                opens:   rows.map(r => r.open)
              };
            }
          } catch (err2) {
            console.warn(`Yahoo Finance .BO historical also failed:`, err2.message);
          }
        }
      }
    }

    return generateDemoHistory(symbol, period);
  }

  async searchStocks(query, market = 'US') {
    // Try Finnhub for US market
    if (market === 'US' && this.finnhubKey) {
      try {
        const response = await axios.get(
          `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${this.finnhubKey}`,
          { timeout: 5000 }
        );
        if (response.data.result && response.data.result.length > 0) {
          return response.data.result.map(item => ({
            symbol: item.symbol,
            name: item.description,
            type: item.type,
            exchange: item.primary_exchange
          }));
        }
      } catch (err) {
        console.warn('Finnhub search failed:', err.message);
      }
    }

    // Yahoo Finance search (works for both markets)
    if (yahooFinance) {
      try {
        const result = await yahooFinance.search(query, {}, { validateResult: false });
        if (result && result.quotes && result.quotes.length > 0) {
          return result.quotes
            .filter(q => q.symbol && q.quoteType !== 'OPTION')
            .map(q => ({
              symbol:   q.symbol,
              name:     q.shortname || q.longname || q.symbol,
              exchange: q.exchange  || '',
              type:     (q.quoteType || 'stock').toLowerCase()
            }));
        }
      } catch (err) {
        console.warn('Yahoo Finance search failed:', err.message);
      }
    }

    // Demo fallback
    const q = query.toLowerCase();
    return Object.values(DEMO_STOCKS)
      .filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .map(s => ({ symbol: s.symbol, name: s.name, exchange: s.exchange, type: 'stock' }));
  }

  async getMarketMovers(market = 'US', type = 'gainers') {
    try {
      const stocks = Object.values(DEMO_STOCKS).filter(s => s.country === market && s.marketCap > 0);
      if (type === 'gainers') {
        return stocks.filter(s => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
      }
      return stocks.filter(s => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
    } catch {
      return [];
    }
  }

  async getStockNews(symbol) {
    return [];
  }
}

const stockServiceInstance = new StockService();

module.exports = {
  getStockQuote:    (symbol, market) => stockServiceInstance.getStockQuote(symbol, market),
  getHistoricalData:(symbol, period, market) => stockServiceInstance.getHistoricalData(symbol, period, market),
  searchStocks:     (query, market)  => stockServiceInstance.searchStocks(query, market),
  getMarketMovers:  (market, type)   => stockServiceInstance.getMarketMovers(market, type),
  getStockNews:     (symbol)         => stockServiceInstance.getStockNews(symbol)
};
