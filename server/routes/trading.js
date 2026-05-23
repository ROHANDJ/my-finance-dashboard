const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const upstoxService = require('../services/upstoxService');
const { getQuote } = require('../services/marketDataService');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function needsAuth(res) {
  return res.status(401).json({ message: 'Connect Upstox to use trading features', needsAuth: true });
}

function calculateCharges(orderValue, exchange = 'NSE') {
  const brokerage           = orderValue * 0.0001;
  const stt                 = orderValue * 0.0006;
  const transactionCharges  = orderValue * 0.000045;
  const gst                 = (brokerage + transactionCharges) * 0.18;
  const sebiCharges         = orderValue * 0.0000005;
  const stampDuty           = exchange === 'NSE' ? orderValue * 0.00015 : orderValue * 0.00002;
  const totalCharges        = brokerage + stt + transactionCharges + gst + sebiCharges + stampDuty;
  return { brokerage, stt, transactionCharges, gst, sebiCharges, stampDuty, totalCharges };
}

function validateOrder(o) {
  const errs = [];
  if (!o.symbol)                                                           errs.push('Symbol is required');
  if (!o.quantity || o.quantity <= 0)                                      errs.push('Valid quantity is required');
  if (!['BUY', 'SELL'].includes(o.transactionType))                       errs.push('transactionType must be BUY or SELL');
  if (!['MARKET', 'LIMIT', 'SL', 'SL-M'].includes(o.orderType))          errs.push('orderType must be MARKET/LIMIT/SL/SL-M');
  if (!['CNC', 'INTRADAY', 'CO', 'OCO'].includes(o.product))             errs.push('product must be CNC/INTRADAY/CO/OCO');
  if (o.orderType === 'LIMIT' && !(o.price > 0))                          errs.push('price required for LIMIT orders');
  if (['SL', 'SL-M'].includes(o.orderType) && !(o.triggerPrice > 0))     errs.push('triggerPrice required for SL orders');
  return errs;
}

// Map Upstox order → our standard shape
function mapOrder(o) {
  return {
    orderId:         o.order_id,
    symbol:          o.tradingsymbol,
    exchange:        o.exchange,
    transactionType: o.transaction_type,
    orderType:       o.order_type,
    product:         o.product,
    quantity:        o.quantity,
    filledQty:       o.filled_quantity,
    price:           o.price,
    triggerPrice:    o.trigger_price,
    status:          o.status,
    statusMessage:   o.status_message,
    averagePrice:    o.average_price,
    placedAt:        o.order_timestamp,
    exchange_order_id: o.exchange_order_id,
  };
}

// ---------------------------------------------------------------------------
// GET /orders
// ---------------------------------------------------------------------------
router.get('/orders', auth, async (req, res) => {
  try {
    const token = upstoxService.getToken(req.userId);
    if (!token) return needsAuth(res);

    const { data } = await axios.get('https://api.upstox.com/v2/order/retrieve-all', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 10000,
    });

    const orders = (data?.data || []).map(mapOrder);
    res.json({ orders });
  } catch (err) {
    if (err?.response?.status === 401) return needsAuth(res);
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// ---------------------------------------------------------------------------
// GET /positions
// ---------------------------------------------------------------------------
router.get('/positions', auth, async (req, res) => {
  try {
    const token = upstoxService.getToken(req.userId);
    if (!token) return needsAuth(res);

    const { data } = await axios.get('https://api.upstox.com/v2/portfolio/short-term-positions', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 10000,
    });

    const positions = (data?.data || []).map(p => ({
      symbol:          p.tradingsymbol,
      exchange:        p.exchange,
      product:         p.product,
      quantity:        p.quantity,
      overnight_qty:   p.overnight_quantity,
      buyPrice:        p.buy_price,
      sellPrice:       p.sell_price,
      buyQty:          p.buy_quantity,
      sellQty:         p.sell_quantity,
      ltp:             p.last_price,
      pnl:             p.pnl,
      dayChange:       p.day_buy_price ? (p.last_price - p.buy_price) : 0,
      value:           p.last_price * Math.abs(p.quantity),
    }));

    res.json({ positions });
  } catch (err) {
    if (err?.response?.status === 401) return needsAuth(res);
    console.error('Error fetching positions:', err.message);
    res.status(500).json({ message: 'Failed to fetch positions' });
  }
});

// ---------------------------------------------------------------------------
// GET /holdings
// ---------------------------------------------------------------------------
router.get('/holdings', auth, async (req, res) => {
  try {
    const token = upstoxService.getToken(req.userId);
    if (!token) return needsAuth(res);

    const result = await upstoxService.getHoldings(token);
    res.json(result);
  } catch (err) {
    if (err?.response?.status === 401) return needsAuth(res);
    console.error('Error fetching holdings:', err.message);
    res.status(500).json({ message: 'Failed to fetch holdings' });
  }
});

// ---------------------------------------------------------------------------
// GET /margins
// ---------------------------------------------------------------------------
router.get('/margins', auth, async (req, res) => {
  try {
    const token = upstoxService.getToken(req.userId);
    if (!token) return needsAuth(res);

    const result = await upstoxService.getFunds(token);
    res.json(result);
  } catch (err) {
    if (err?.response?.status === 401) return needsAuth(res);
    console.error('Error fetching margins:', err.message);
    res.status(500).json({ message: 'Failed to fetch margins' });
  }
});

// ---------------------------------------------------------------------------
// POST /order  (place order)
// ---------------------------------------------------------------------------
router.post('/order', auth, async (req, res) => {
  try {
    const token = upstoxService.getToken(req.userId);
    if (!token) return needsAuth(res);

    const orderDetails = req.body;
    const errors = validateOrder(orderDetails);
    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const price = parseFloat(orderDetails.price) || 0;
    const orderValue = orderDetails.quantity * price;
    const charges = calculateCharges(orderValue, orderDetails.exchange || 'NSE');

    const payload = {
      quantity:         parseInt(orderDetails.quantity),
      product:          orderDetails.product,
      validity:         'DAY',
      price:            price,
      tag:              'FinanceHub',
      instrument_token: `${orderDetails.exchange || 'NSE_EQ'}|${orderDetails.symbol}`,
      order_type:       orderDetails.orderType,
      transaction_type: orderDetails.transactionType,
      disclosed_quantity: 0,
      trigger_price:    parseFloat(orderDetails.triggerPrice) || 0,
      is_amo:           false,
    };

    const { data } = await axios.post('https://api.upstox.com/v2/order/place', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    res.json({ message: 'Order placed successfully', order: data?.data, charges });
  } catch (err) {
    if (err?.response?.status === 401) return needsAuth(res);
    const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || 'Failed to place order';
    console.error('Error placing order:', msg);
    res.status(err?.response?.status || 500).json({ message: msg });
  }
});

// ---------------------------------------------------------------------------
// DELETE /order/:orderId
// ---------------------------------------------------------------------------
router.delete('/order/:orderId', auth, async (req, res) => {
  try {
    const token = upstoxService.getToken(req.userId);
    if (!token) return needsAuth(res);

    const { orderId } = req.params;
    const { data } = await axios.delete(`https://api.upstox.com/v2/order/cancel?order_id=${orderId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 10000,
    });

    res.json({ message: 'Order cancelled successfully', data: data?.data });
  } catch (err) {
    if (err?.response?.status === 401) return needsAuth(res);
    console.error('Error cancelling order:', err.message);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
});

// ---------------------------------------------------------------------------
// PUT /order/:orderId  (modify)
// ---------------------------------------------------------------------------
router.put('/order/:orderId', auth, async (req, res) => {
  try {
    const token = upstoxService.getToken(req.userId);
    if (!token) return needsAuth(res);

    const { orderId } = req.params;
    const mods = req.body;

    const payload = {
      order_id:      orderId,
      quantity:      parseInt(mods.quantity),
      validity:      'DAY',
      price:         parseFloat(mods.price) || 0,
      order_type:    mods.orderType,
      trigger_price: parseFloat(mods.triggerPrice) || 0,
      disclosed_quantity: 0,
    };

    const { data } = await axios.put('https://api.upstox.com/v2/order/modify', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    res.json({ message: 'Order modified successfully', data: data?.data });
  } catch (err) {
    if (err?.response?.status === 401) return needsAuth(res);
    console.error('Error modifying order:', err.message);
    res.status(500).json({ message: 'Failed to modify order' });
  }
});

// ---------------------------------------------------------------------------
// GET /order/:orderId  (order details)
// ---------------------------------------------------------------------------
router.get('/order/:orderId', auth, async (req, res) => {
  try {
    const token = upstoxService.getToken(req.userId);
    if (!token) return needsAuth(res);

    const { orderId } = req.params;
    const { data } = await axios.get(`https://api.upstox.com/v2/order/details?order_id=${orderId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 10000,
    });

    res.json({ order: mapOrder(data?.data || {}) });
  } catch (err) {
    if (err?.response?.status === 401) return needsAuth(res);
    console.error('Error fetching order:', err.message);
    res.status(500).json({ message: 'Failed to fetch order details' });
  }
});

// ---------------------------------------------------------------------------
// GET /order/:orderId/trades  (fill history)
// ---------------------------------------------------------------------------
router.get('/order/:orderId/trades', auth, async (req, res) => {
  try {
    const token = upstoxService.getToken(req.userId);
    if (!token) return needsAuth(res);

    const { orderId } = req.params;
    const { data } = await axios.get(`https://api.upstox.com/v2/order/trades?order_id=${orderId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 10000,
    });

    res.json({ trades: data?.data || [] });
  } catch (err) {
    if (err?.response?.status === 401) return needsAuth(res);
    console.error('Error fetching trades:', err.message);
    res.status(500).json({ message: 'Failed to fetch trades' });
  }
});

// ---------------------------------------------------------------------------
// POST /calculate-charges  (pre-trade cost estimate)
// ---------------------------------------------------------------------------
router.post('/calculate-charges', auth, async (req, res) => {
  try {
    const { orderValue, exchange = 'NSE' } = req.body;
    if (!orderValue || orderValue <= 0) return res.status(400).json({ message: 'Valid orderValue required' });
    res.json({ charges: calculateCharges(orderValue, exchange) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate charges' });
  }
});

// ---------------------------------------------------------------------------
// GET /quote/:symbol  (live quote via market service, no Upstox needed)
// ---------------------------------------------------------------------------
router.get('/quote/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { market = 'IN' } = req.query;
    const quote = await getQuote(symbol, market);
    res.json({ quote });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch quote' });
  }
});

module.exports = router;
