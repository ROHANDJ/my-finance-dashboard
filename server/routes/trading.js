const express = require('express');
const KiteConnect = require('kiteconnect').KiteConnect;
const auth = require('../middleware/auth');
const router = express.Router();

class TradingService {
  constructor() {
    this.kiteConnections = new Map();
  }

  async initializeKiteConnection(userId, apiKey, accessToken) {
    try {
      const kite = new KiteConnect({
        api_key: apiKey,
        access_token: accessToken
      });

      this.kiteConnections.set(userId, kite);
      return kite;
    } catch (error) {
      console.error('Error initializing Kite connection:', error);
      throw error;
    }
  }

  async getKiteConnection(userId) {
    return this.kiteConnections.get(userId);
  }

  async placeOrder(userId, orderDetails) {
    try {
      const kite = await this.getKiteConnection(userId);
      if (!kite) {
        throw new Error('Trading connection not established');
      }

      const order = {
        exchange: orderDetails.exchange,
        tradingsymbol: orderDetails.symbol,
        quantity: orderDetails.quantity,
        transaction_type: orderDetails.transactionType,
        order_type: orderDetails.orderType,
        product: orderDetails.product,
        price: orderDetails.price,
        validity: 'DAY'
      };

      if (orderDetails.stopLoss) {
        order.trigger_price = orderDetails.stopLoss;
        order.order_type = 'SL';
      }

      const response = await kite.placeOrder(order);
      return response;
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  async cancelOrder(userId, orderId) {
    try {
      const kite = await this.getKiteConnection(userId);
      if (!kite) {
        throw new Error('Trading connection not established');
      }

      const response = await kite.cancelOrder(orderId);
      return response;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  async getOrders(userId) {
    try {
      const kite = await this.getKiteConnection(userId);
      if (!kite) {
        throw new Error('Trading connection not established');
      }

      const orders = await kite.getOrders();
      return orders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  async getPositions(userId) {
    try {
      const kite = await this.getKiteConnection(userId);
      if (!kite) {
        throw new Error('Trading connection not established');
      }

      const positions = await kite.getPositions();
      return positions;
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  }

  async getHoldings(userId) {
    try {
      const kite = await this.getKiteConnection(userId);
      if (!kite) {
        throw new Error('Trading connection not established');
      }

      const holdings = await kite.getHoldings();
      return holdings;
    } catch (error) {
      console.error('Error fetching holdings:', error);
      throw error;
    }
  }

  async getMargins(userId) {
    try {
      const kite = await this.getKiteConnection(userId);
      if (!kite) {
        throw new Error('Trading connection not established');
      }

      const margins = await kite.getMargins();
      return margins;
    } catch (error) {
      console.error('Error fetching margins:', error);
      throw error;
    }
  }

  async getInstruments(userId, exchange = 'NSE') {
    try {
      const kite = await this.getKiteConnection(userId);
      if (!kite) {
        throw new Error('Trading connection not established');
      }

      const instruments = await kite.getInstruments(exchange);
      return instruments;
    } catch (error) {
      console.error('Error fetching instruments:', error);
      throw error;
    }
  }

  async getQuote(userId, exchange, tradingsymbol) {
    try {
      const kite = await this.getKiteConnection(userId);
      if (!kite) {
        throw new Error('Trading connection not established');
      }

      const quote = await kite.getQuote(exchange, tradingsymbol);
      return quote;
    } catch (error) {
      console.error('Error fetching quote:', error);
      throw error;
    }
  }

  async getHistoricalData(userId, instrumentToken, from_date, to_date, interval) {
    try {
      const kite = await this.getKiteConnection(userId);
      if (!kite) {
        throw new Error('Trading connection not established');
      }

      const historicalData = await kite.getHistoricalData(
        instrumentToken,
        from_date,
        to_date,
        interval
      );
      return historicalData;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  async modifyOrder(userId, orderId, modifications) {
    try {
      const kite = await this.getKiteConnection(userId);
      if (!kite) {
        throw new Error('Trading connection not established');
      }

      const response = await kite.modifyOrder(orderId, modifications);
      return response;
    } catch (error) {
      console.error('Error modifying order:', error);
      throw error;
    }
  }

  validateOrder(orderDetails) {
    const errors = [];

    if (!orderDetails.symbol) {
      errors.push('Symbol is required');
    }

    if (!orderDetails.quantity || orderDetails.quantity <= 0) {
      errors.push('Valid quantity is required');
    }

    if (!orderDetails.transactionType || !['BUY', 'SELL'].includes(orderDetails.transactionType)) {
      errors.push('Valid transaction type (BUY/SELL) is required');
    }

    if (!orderDetails.orderType || !['MARKET', 'LIMIT', 'SL'].includes(orderDetails.orderType)) {
      errors.push('Valid order type (MARKET/LIMIT/SL) is required');
    }

    if (!orderDetails.product || !['CNC', 'NRML', 'MIS'].includes(orderDetails.product)) {
      errors.push('Valid product type (CNC/NRML/MIS) is required');
    }

    if (orderDetails.orderType === 'LIMIT' && (!orderDetails.price || orderDetails.price <= 0)) {
      errors.push('Price is required for limit orders');
    }

    if (orderDetails.orderType === 'SL' && (!orderDetails.stopLoss || orderDetails.stopLoss <= 0)) {
      errors.push('Stop loss is required for stop loss orders');
    }

    return errors;
  }

  calculateOrderValue(quantity, price) {
    return quantity * price;
  }

  calculateCharges(orderValue, exchange = 'NSE') {
    const brokerage = orderValue * 0.0001;
    const stt = orderValue * 0.0006;
    const transactionCharges = orderValue * 0.000045;
    const gst = (brokerage + transactionCharges) * 0.18;
    const sebiCharges = orderValue * 0.0000005;
    const stampDuty = exchange === 'NSE' ? orderValue * 0.00015 : orderValue * 0.00002;

    const totalCharges = brokerage + stt + transactionCharges + gst + sebiCharges + stampDuty;

    return {
      brokerage,
      stt,
      transactionCharges,
      gst,
      sebiCharges,
      stampDuty,
      totalCharges
    };
  }
}

const tradingService = new TradingService();

router.post('/connect', auth, async (req, res) => {
  try {
    const { apiKey, accessToken } = req.body;

    if (!apiKey || !accessToken) {
      return res.status(400).json({ message: 'API key and access token are required' });
    }

    await tradingService.initializeKiteConnection(req.userId, apiKey, accessToken);
    
    res.json({ message: 'Trading connection established successfully' });
  } catch (error) {
    console.error('Error establishing trading connection:', error);
    res.status(500).json({ message: 'Error establishing trading connection' });
  }
});

router.post('/order', auth, async (req, res) => {
  try {
    const orderDetails = req.body;

    const validationErrors = tradingService.validateOrder(orderDetails);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }

    const orderValue = tradingService.calculateOrderValue(
      orderDetails.quantity, 
      orderDetails.price || 0
    );

    const charges = tradingService.calculateCharges(orderValue);

    const orderResponse = await tradingService.placeOrder(req.userId, orderDetails);

    res.json({ 
      message: 'Order placed successfully',
      order: orderResponse,
      charges
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ message: 'Error placing order' });
  }
});

router.delete('/order/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    const response = await tradingService.cancelOrder(req.userId, orderId);
    
    res.json({ message: 'Order cancelled successfully', response });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Error cancelling order' });
  }
});

router.put('/order/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const modifications = req.body;

    const response = await tradingService.modifyOrder(req.userId, orderId, modifications);
    
    res.json({ message: 'Order modified successfully', response });
  } catch (error) {
    console.error('Error modifying order:', error);
    res.status(500).json({ message: 'Error modifying order' });
  }
});

router.get('/orders', auth, async (req, res) => {
  try {
    const orders = await tradingService.getOrders(req.userId);
    res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

router.get('/positions', auth, async (req, res) => {
  try {
    const positions = await tradingService.getPositions(req.userId);
    res.json({ positions });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ message: 'Error fetching positions' });
  }
});

router.get('/holdings', auth, async (req, res) => {
  try {
    const holdings = await tradingService.getHoldings(req.userId);
    res.json({ holdings });
  } catch (error) {
    console.error('Error fetching holdings:', error);
    res.status(500).json({ message: 'Error fetching holdings' });
  }
});

router.get('/margins', auth, async (req, res) => {
  try {
    const margins = await tradingService.getMargins(req.userId);
    res.json({ margins });
  } catch (error) {
    console.error('Error fetching margins:', error);
    res.status(500).json({ message: 'Error fetching margins' });
  }
});

router.get('/instruments', auth, async (req, res) => {
  try {
    const { exchange = 'NSE' } = req.query;

    const instruments = await tradingService.getInstruments(req.userId, exchange);
    res.json({ instruments });
  } catch (error) {
    console.error('Error fetching instruments:', error);
    res.status(500).json({ message: 'Error fetching instruments' });
  }
});

router.get('/quote/:exchange/:tradingsymbol', auth, async (req, res) => {
  try {
    const { exchange, tradingsymbol } = req.params;

    const quote = await tradingService.getQuote(req.userId, exchange, tradingsymbol);
    res.json({ quote });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ message: 'Error fetching quote' });
  }
});

router.get('/historical/:instrumentToken', auth, async (req, res) => {
  try {
    const { instrumentToken } = req.params;
    const { from_date, to_date, interval = 'day' } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({ message: 'From date and to date are required' });
    }

    const historicalData = await tradingService.getHistoricalData(
      req.userId,
      parseInt(instrumentToken),
      from_date,
      to_date,
      interval
    );

    res.json({ data: historicalData });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ message: 'Error fetching historical data' });
  }
});

router.post('/calculate-charges', auth, async (req, res) => {
  try {
    const { orderValue, exchange = 'NSE' } = req.body;

    if (!orderValue || orderValue <= 0) {
      return res.status(400).json({ message: 'Valid order value is required' });
    }

    const charges = tradingService.calculateCharges(orderValue, exchange);
    res.json({ charges });
  } catch (error) {
    console.error('Error calculating charges:', error);
    res.status(500).json({ message: 'Error calculating charges' });
  }
});

module.exports = router;
