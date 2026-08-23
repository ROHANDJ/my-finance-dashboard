const express = require('express');
const auth = require('../middleware/auth');
const dhan = require('../services/dhanService');
const { getQuote } = require('../services/marketDataService');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function needsAuth(res) {
  return res.status(401).json({ message: 'Connect Dhan to use trading features', needsAuth: true });
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

// ---------------------------------------------------------------------------
// GET /orders
// ---------------------------------------------------------------------------
router.get('/orders', auth, async (req, res) => {
  try {
    const creds = dhan.getCreds(req.userId);
    if (!creds) return needsAuth(res);

    const orders = await dhan.getOrders(creds);
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
    const creds = dhan.getCreds(req.userId);
    if (!creds) return needsAuth(res);

    const raw = await dhan.getPositions(creds);
    const positions = raw.map(p => ({
      symbol:    p.symbol,
      exchange:  p.exchange,
      product:   p.productType,
      quantity:  p.quantity,
      buyPrice:  p.averagePrice,
      ltp:       p.currentPrice,
      pnl:       p.pnl,
      dayChange: p.dayChange,
      value:     p.value,
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
    const creds = dhan.getCreds(req.userId);
    if (!creds) return needsAuth(res);

    const holdings = await dhan.getHoldings(creds);
    res.json({ holdings });
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
    const creds = dhan.getCreds(req.userId);
    if (!creds) return needsAuth(res);

    const funds = await dhan.getFunds(creds);
    res.json(funds);
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
    const creds = dhan.getCreds(req.userId);
    if (!creds) return needsAuth(res);

    const orderDetails = req.body;
    const errors = validateOrder(orderDetails);
    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const price = parseFloat(orderDetails.price) || 0;
    const orderValue = orderDetails.quantity * price;
    const charges = calculateCharges(orderValue, (orderDetails.exchange || 'NSE').replace('_EQ', ''));

    const data = await dhan.placeOrder(creds, orderDetails);
    res.json({ message: 'Order placed successfully', order: data, charges });
  } catch (err) {
    if (err?.response?.status === 401) return needsAuth(res);
    const msg = err?.response?.data?.errorMessage
      || err?.response?.data?.message
      || err.message
      || 'Failed to place order';
    console.error('Error placing order:', msg);
    res.status(err?.response?.status || 500).json({ message: msg });
  }
});

// ---------------------------------------------------------------------------
// DELETE /order/:orderId
// ---------------------------------------------------------------------------
router.delete('/order/:orderId', auth, async (req, res) => {
  try {
    const creds = dhan.getCreds(req.userId);
    if (!creds) return needsAuth(res);

    const data = await dhan.cancelOrder(creds, req.params.orderId);
    res.json({ message: 'Order cancelled successfully', data });
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
    const creds = dhan.getCreds(req.userId);
    if (!creds) return needsAuth(res);

    const data = await dhan.modifyOrder(creds, req.params.orderId, req.body);
    res.json({ message: 'Order modified successfully', data });
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
    const creds = dhan.getCreds(req.userId);
    if (!creds) return needsAuth(res);

    const order = await dhan.getOrder(creds, req.params.orderId);
    res.json({ order });
  } catch (err) {
    if (err?.response?.status === 401) return needsAuth(res);
    console.error('Error fetching order:', err.message);
    res.status(500).json({ message: 'Failed to fetch order details' });
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
// GET /quote/:symbol  (live quote via market service, no broker needed)
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
