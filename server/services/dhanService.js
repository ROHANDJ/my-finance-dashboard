const axios = require('axios');
const market = require('./marketDataService');

const BASE_URL = 'https://api.dhan.co/v2';
const SCRIP_MASTER_URL = 'https://images.dhan.co/api-data/api-scrip-master.csv';

// ---------------------------------------------------------------------------
// Per-user token store. Dhan uses a static access token (JWT) that the user
// generates from the Dhan web portal (My Profile -> DhanHQ Trading APIs).
// There is no OAuth redirect flow. We also accept an env-level default token
// (DHAN_ACCESS_TOKEN / DHAN_CLIENT_ID) for single-user / dev setups.
// ---------------------------------------------------------------------------
const tokenStore = new Map(); // userId -> { accessToken, clientId, expiresAt }

function envToken() {
  const accessToken = process.env.DHAN_ACCESS_TOKEN;
  const clientId    = process.env.DHAN_CLIENT_ID;
  if (accessToken && !accessToken.startsWith('your_') && clientId && !clientId.startsWith('your_')) {
    return { accessToken, clientId };
  }
  return null;
}

// Dhan needs no app-level API keys — every user brings their own token — so
// "configured" is true whenever the integration can be used at all.
function isConfigured() {
  return true;
}

function setToken(userId, accessToken, clientId, validityMs) {
  const exp = new Date(Date.now() + (validityMs || 24 * 60 * 60 * 1000));
  tokenStore.set(String(userId), { accessToken, clientId, expiresAt: exp });
}

function getCreds(userId) {
  const entry = tokenStore.get(String(userId));
  if (entry) {
    if (new Date() > entry.expiresAt) { tokenStore.delete(String(userId)); }
    else return { accessToken: entry.accessToken, clientId: entry.clientId };
  }
  return envToken(); // fall back to env default if present
}

// Back-compat with the shape trading.js / route guards expect
function getToken(userId) {
  return getCreds(userId)?.accessToken || null;
}

function clearToken(userId) {
  tokenStore.delete(String(userId));
}

// ---------------------------------------------------------------------------
// Low-level request helper
// ---------------------------------------------------------------------------
async function api(endpoint, creds, { method = 'get', body = null, extraHeaders = {} } = {}) {
  const cfg = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'access-token': creds.accessToken,
      Accept:         'application/json',
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    timeout: 12000,
  };
  if (body) cfg.data = body;
  const { data } = await axios(cfg);
  return data;
}

// ---------------------------------------------------------------------------
// Profile — also used to validate a token on connect
// ---------------------------------------------------------------------------
async function getProfile(creds) {
  const data = await api('/profile', creds);
  return data; // { dhanClientId, tokenValidity, activeSegment, ddpi, dataPlan, ... }
}

// ---------------------------------------------------------------------------
// Scrip master (symbol -> securityId). Dhan order APIs use numeric securityId,
// not the trading symbol, so we fetch and cache the master CSV once.
// ---------------------------------------------------------------------------
let _scripMap = null;      // `${EXCHSEG}:${SYMBOL}` -> securityId
let _scripLoadedAt = 0;
let _scripLoading = null;
const SCRIP_TTL = 12 * 60 * 60 * 1000; // 12h

// Dhan exchange-segment code (from CSV) -> our exchangeSegment
const SEG_MAP = {
  NSE_EQ: 'NSE_EQ', BSE_EQ: 'BSE_EQ',
  NSE_FNO: 'NSE_FNO', BSE_FNO: 'BSE_FNO',
  NSE_CURRENCY: 'NSE_CURRENCY', BSE_CURRENCY: 'BSE_CURRENCY',
  MCX_COMM: 'MCX_COMM',
};

async function loadScripMaster() {
  const now = Date.now();
  if (_scripMap && (now - _scripLoadedAt) < SCRIP_TTL) return _scripMap;
  if (_scripLoading) return _scripLoading;

  _scripLoading = (async () => {
    const { data } = await axios.get(SCRIP_MASTER_URL, { timeout: 30000, responseType: 'text' });
    const map = new Map();
    const lines = String(data).split('\n');
    const header = lines[0].split(',').map(h => h.trim());
    const idx = {
      seg:    header.indexOf('SEM_EXM_EXCH_ID'),
      secId:  header.indexOf('SEM_SMST_SECURITY_ID'),
      symbol: header.indexOf('SEM_TRADING_SYMBOL'),
      series: header.indexOf('SEM_SERIES'),
      instr:  header.indexOf('SEM_INSTRUMENT_NAME'),
    };
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < header.length) continue;
      const exch   = (cols[idx.seg] || '').trim();        // NSE / BSE / MCX
      const secId  = (cols[idx.secId] || '').trim();
      const symbol = (cols[idx.symbol] || '').trim().toUpperCase();
      const instr  = (cols[idx.instr] || '').trim();       // EQUITY / FUTIDX / ...
      if (!secId || !symbol) continue;
      // Only index equities into the plain <EXCH>_EQ namespace
      if (instr === 'EQUITY' || instr === 'ES') {
        const seg = exch === 'NSE' ? 'NSE_EQ' : exch === 'BSE' ? 'BSE_EQ' : null;
        if (seg) map.set(`${seg}:${symbol}`, secId);
      }
    }
    _scripMap = map;
    _scripLoadedAt = Date.now();
    _scripLoading = null;
    return map;
  })().catch(err => { _scripLoading = null; throw err; });

  return _scripLoading;
}

async function resolveSecurityId(symbol, exchangeSegment = 'NSE_EQ') {
  const seg = SEG_MAP[exchangeSegment] || 'NSE_EQ';
  const map = await loadScripMaster();
  const key = `${seg}:${String(symbol).trim().toUpperCase()}`;
  const secId = map.get(key);
  if (!secId) throw new Error(`Could not resolve securityId for ${symbol} on ${seg}`);
  return secId;
}

// ---------------------------------------------------------------------------
// Holdings. Dhan's holdings response has no LTP / P&L, so we enrich current
// price via the shared market data service (Yahoo) and compute P&L ourselves.
// ---------------------------------------------------------------------------
async function getHoldings(creds) {
  const data = await api('/holdings', creds);
  const raw = Array.isArray(data) ? data : (data.data || []);

  const base = raw
    .filter(h => (h.totalQty || h.availableQty || 0) > 0)
    .map(h => {
      const qty = h.totalQty ?? h.availableQty ?? 0;
      const avg = parseFloat(h.avgCostPrice) || 0;
      return {
        symbol:       h.tradingSymbol,
        isin:         h.isin,
        name:         h.tradingSymbol,
        quantity:     qty,
        averagePrice: avg,
        currentPrice: avg,          // enriched below
        pnl:          0,
        dayChange:    0,
        dayChangePercent: 0,
        exchange:     h.exchange === 'ALL' ? 'NSE' : (h.exchange || 'NSE'),
        securityId:   h.securityId,
        value:        qty * avg,
      };
    });

  // Enrich with live prices (best effort — never fail holdings over this)
  try {
    const enriched = await market.enrichHoldings(
      base.map(h => ({ ...h, currency: 'INR' }))
    );
    return enriched.map(h => {
      const currentPrice = h.currentPrice || h.averagePrice || 0;
      const pnl = (currentPrice - h.averagePrice) * h.quantity;
      return {
        ...h,
        currentPrice,
        pnl:              parseFloat(pnl.toFixed(2)),
        dayChange:        h.liveChange || 0,
        dayChangePercent: h.liveChangePercent || 0,
        value:            parseFloat((currentPrice * h.quantity).toFixed(2)),
      };
    });
  } catch {
    return base;
  }
}

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------
async function getPositions(creds) {
  const data = await api('/positions', creds);
  const raw = Array.isArray(data) ? data : (data.data || []);
  return raw.map(p => {
    const netQty = p.netQty ?? p.buyQty - p.sellQty ?? 0;
    const avg    = parseFloat(p.buyAvg || p.costPrice) || 0;
    const ltp    = parseFloat(p.lastTradedPrice || p.costPrice) || 0;
    const unreal = parseFloat(p.unrealizedProfit) || 0;
    const real   = parseFloat(p.realizedProfit) || 0;
    return {
      symbol:        p.tradingSymbol,
      name:          p.tradingSymbol,
      quantity:      netQty,
      averagePrice:  avg,
      currentPrice:  ltp,
      pnl:           parseFloat((unreal + real).toFixed(2)),
      realizedPnl:   real,
      unrealizedPnl: unreal,
      dayChange:     0,
      exchange:      (p.exchangeSegment || '').replace('_EQ', '') || 'NSE',
      productType:   p.productType,
      positionType:  p.positionType,
      securityId:    p.securityId,
      value:         Math.abs(netQty) * ltp,
    };
  });
}

// ---------------------------------------------------------------------------
// Funds
// ---------------------------------------------------------------------------
async function getFunds(creds) {
  const d = await api('/fundlimit', creds);
  // Normalise to the shape the Trading page reads (equity.available_margin, ...)
  const available = parseFloat(d.availabelBalance ?? d.availableBalance ?? 0);
  const used      = parseFloat(d.utilizedAmount ?? 0);
  return {
    ...d,
    available_margin: available,
    used_margin:      used,
    equity: {
      available_margin: available,
      used_margin:      used,
    },
  };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
function mapOrder(o) {
  return {
    orderId:           o.orderId,
    symbol:            o.tradingSymbol,
    exchange:          (o.exchangeSegment || '').replace('_EQ', ''),
    transactionType:   o.transactionType,
    orderType:         o.orderType,
    product:           o.productType,
    quantity:          o.quantity,
    filledQty:         o.filledQty ?? o.filled_qty ?? 0,
    price:             o.price,
    triggerPrice:      o.triggerPrice,
    status:            o.orderStatus,
    statusMessage:     o.omsErrorDescription || '',
    averagePrice:      o.averageTradedPrice || o.price,
    placedAt:          o.createTime,
    exchange_order_id: o.exchangeOrderId,
    securityId:        o.securityId,
  };
}

async function getOrders(creds) {
  const data = await api('/orders', creds);
  const raw = Array.isArray(data) ? data : (data.data || []);
  return raw.map(mapOrder);
}

async function getOrder(creds, orderId) {
  const data = await api(`/orders/${orderId}`, creds);
  const raw = Array.isArray(data) ? data[0] : (data.data || data);
  return mapOrder(raw || {});
}

// Dhan order-type + product enums differ from the app's internal ones
const ORDER_TYPE_MAP = { MARKET: 'MARKET', LIMIT: 'LIMIT', SL: 'STOP_LOSS', 'SL-M': 'STOP_LOSS_MARKET' };
const PRODUCT_MAP     = { CNC: 'CNC', INTRADAY: 'INTRADAY', CO: 'CO', OCO: 'BO', MARGIN: 'MARGIN', MTF: 'MTF' };

async function placeOrder(creds, o) {
  const exchangeSegment = o.exchange && o.exchange.includes('_') ? o.exchange
    : (o.exchange === 'BSE' ? 'BSE_EQ' : 'NSE_EQ');
  const securityId = await resolveSecurityId(o.symbol, exchangeSegment);

  const payload = {
    dhanClientId:      creds.clientId,
    transactionType:   o.transactionType,
    exchangeSegment,
    productType:       PRODUCT_MAP[o.product] || 'CNC',
    orderType:         ORDER_TYPE_MAP[o.orderType] || 'MARKET',
    validity:          'DAY',
    securityId,
    quantity:          parseInt(o.quantity),
    disclosedQuantity: 0,
    price:             parseFloat(o.price) || 0,
    triggerPrice:      parseFloat(o.triggerPrice) || 0,
    afterMarketOrder:  false,
  };
  const data = await api('/orders', creds, { method: 'post', body: payload });
  return data;
}

async function cancelOrder(creds, orderId) {
  return api(`/orders/${orderId}`, creds, { method: 'delete' });
}

async function modifyOrder(creds, orderId, mods) {
  const payload = {
    dhanClientId:      creds.clientId,
    orderId:           String(orderId),
    orderType:         ORDER_TYPE_MAP[mods.orderType] || 'LIMIT',
    quantity:          parseInt(mods.quantity),
    price:             parseFloat(mods.price) || 0,
    triggerPrice:      parseFloat(mods.triggerPrice) || 0,
    disclosedQuantity: 0,
    validity:          'DAY',
  };
  return api(`/orders/${orderId}`, creds, { method: 'put', body: payload });
}

module.exports = {
  isConfigured,
  setToken, getCreds, getToken, clearToken,
  getProfile, getHoldings, getPositions, getFunds,
  getOrders, getOrder, placeOrder, cancelOrder, modifyOrder,
  resolveSecurityId,
};
