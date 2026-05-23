const axios = require('axios');

const BASE_URL = 'https://api.upstox.com/v2';

// In-memory token store. Tokens expire at 3:30 AM IST the next day.
const tokenStore = new Map(); // userId → { accessToken, expiresAt, profile }

function getRedirectUri() {
  return process.env.UPSTOX_REDIRECT_URI || 'http://localhost:5000/api/upstox/callback';
}

function isConfigured() {
  const key = process.env.UPSTOX_API_KEY;
  return !!(key && !key.startsWith('your_'));
}

function getAuthUrl(userId) {
  const params = new URLSearchParams({
    client_id:     process.env.UPSTOX_API_KEY,
    redirect_uri:  getRedirectUri(),
    response_type: 'code',
    state:         userId,
  });
  return `https://api.upstox.com/v2/login/authorization/dialog?${params}`;
}

async function exchangeToken(code) {
  const params = new URLSearchParams({
    code,
    client_id:     process.env.UPSTOX_API_KEY,
    client_secret: process.env.UPSTOX_API_SECRET,
    redirect_uri:  getRedirectUri(),
    grant_type:    'authorization_code',
  });
  const { data } = await axios.post(
    `${BASE_URL}/login/authorization/token`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
  );
  return data; // { access_token, token_type, user_id, ... }
}

function setToken(userId, accessToken) {
  // Expire at 3:30 AM IST next day
  const exp = new Date();
  exp.setDate(exp.getDate() + 1);
  exp.setHours(3, 30, 0, 0);
  tokenStore.set(String(userId), { accessToken, expiresAt: exp });
}

function getToken(userId) {
  const entry = tokenStore.get(String(userId));
  if (!entry) return null;
  if (new Date() > entry.expiresAt) { tokenStore.delete(String(userId)); return null; }
  return entry.accessToken;
}

function clearToken(userId) {
  tokenStore.delete(String(userId));
}

async function api(endpoint, accessToken, method = 'get', body = null) {
  const cfg = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    timeout: 12000,
  };
  if (body) cfg.data = body;
  const { data } = await axios(cfg);
  return data;
}

async function getProfile(accessToken) {
  const data = await api('/user/profile', accessToken);
  return data.data || data;
}

async function getHoldings(accessToken) {
  const data = await api('/portfolio/long-term-holdings', accessToken);
  return (data.data || []).map(h => ({
    symbol:           h.tradingsymbol,
    isin:             h.isin,
    name:             h.company_name || h.tradingsymbol,
    quantity:         h.quantity,
    averagePrice:     parseFloat(h.average_price) || 0,
    currentPrice:     parseFloat(h.last_price) || parseFloat(h.average_price) || 0,
    pnl:              parseFloat(h.pnl) || 0,
    dayChange:        parseFloat(h.day_change) || 0,
    dayChangePercent: parseFloat(h.day_change_percentage) || 0,
    exchange:         h.exchange,
    instrumentToken:  h.instrument_token,
    value:            h.quantity * (parseFloat(h.last_price) || parseFloat(h.average_price) || 0),
  }));
}

async function getPositions(accessToken) {
  const data = await api('/portfolio/short-term-positions', accessToken);
  return (data.data || []).map(p => ({
    symbol:          p.tradingsymbol,
    name:            p.company_name || p.tradingsymbol,
    quantity:        p.quantity,
    averagePrice:    parseFloat(p.average_price) || 0,
    currentPrice:    parseFloat(p.last_price) || 0,
    pnl:             parseFloat(p.pnl) || 0,
    realizedPnl:     parseFloat(p.realised_profit) || 0,
    unrealizedPnl:   parseFloat(p.unrealised_profit) || 0,
    dayChange:       parseFloat(p.day_change) || 0,
    exchange:        p.exchange,
    productType:     p.product,
    value:           p.quantity * (parseFloat(p.last_price) || 0),
  }));
}

async function getFunds(accessToken) {
  const data = await api('/user/get-funds-and-margin?segment=SEC', accessToken);
  return data.data || data;
}

async function getOrderHistory(accessToken) {
  try {
    const data = await api('/order/history', accessToken);
    return data.data || [];
  } catch {
    return [];
  }
}

module.exports = {
  isConfigured, getAuthUrl, exchangeToken,
  setToken, getToken, clearToken,
  getProfile, getHoldings, getPositions, getFunds, getOrderHistory,
};
