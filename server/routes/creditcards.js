const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// ---------------------------------------------------------------------------
// In-memory demo data store
// ---------------------------------------------------------------------------

const DEMO_USER_ID = 'demo_user';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

let creditCards = [
  {
    id: 'cc_001',
    userId: DEMO_USER_ID,
    bankName: 'HDFC Bank',
    cardName: 'HDFC Regalia Gold',
    last4Digits: '4821',
    cardType: 'visa',
    creditLimit: 300000,
    availableCredit: 178540,
    billingCycleDate: 5,
    dueDate: 25,
    minimumPayment: 2500,
    currentBalance: 121460,
    totalSpent: 121460,
    color: '#1a56db',
    isActive: true,
    createdAt: daysAgo(180),
    transactions: [
      { id: 'txn_h001', amount: 5499,  description: 'Amazon Prime subscription',  category: 'entertainment', date: daysAgo(2),  type: 'debit',  merchantName: 'Amazon'       },
      { id: 'txn_h002', amount: 12800, description: 'Tanishq jewellery store',     category: 'shopping',      date: daysAgo(4),  type: 'debit',  merchantName: 'Tanishq'      },
      { id: 'txn_h003', amount: 3200,  description: 'IndiGo flight – BLR to DEL', category: 'transport',     date: daysAgo(5),  type: 'debit',  merchantName: 'IndiGo'       },
      { id: 'txn_h004', amount: 850,   description: 'Swiggy food order',           category: 'food',          date: daysAgo(6),  type: 'debit',  merchantName: 'Swiggy'       },
      { id: 'txn_h005', amount: 25000, description: 'Card payment received',       category: 'other',         date: daysAgo(7),  type: 'credit', merchantName: 'HDFC Bank'    },
      { id: 'txn_h006', amount: 7800,  description: 'H&M clothing',                category: 'shopping',      date: daysAgo(9),  type: 'debit',  merchantName: 'H&M'          },
      { id: 'txn_h007', amount: 2100,  description: 'Apollo pharmacy',             category: 'health',        date: daysAgo(10), type: 'debit',  merchantName: 'Apollo'       },
      { id: 'txn_h008', amount: 1560,  description: 'Domino\'s pizza order',       category: 'food',          date: daysAgo(12), type: 'debit',  merchantName: 'Domino\'s'    },
      { id: 'txn_h009', amount: 45000, description: 'HP laptop – EMI deduction',   category: 'shopping',      date: daysAgo(14), type: 'debit',  merchantName: 'Croma'        },
      { id: 'txn_h010', amount: 50000, description: 'Card payment received',       category: 'other',         date: daysAgo(15), type: 'credit', merchantName: 'HDFC Bank'    },
      { id: 'txn_h011', amount: 699,   description: 'Spotify Premium',             category: 'entertainment', date: daysAgo(18), type: 'debit',  merchantName: 'Spotify'      },
      { id: 'txn_h012', amount: 4200,  description: 'Nykaa cosmetics',             category: 'shopping',      date: daysAgo(20), type: 'debit',  merchantName: 'Nykaa'        }
    ]
  },
  {
    id: 'cc_002',
    userId: DEMO_USER_ID,
    bankName: 'SBI Card',
    cardName: 'SBI SimplyCLICK',
    last4Digits: '9734',
    cardType: 'visa',
    creditLimit: 150000,
    availableCredit: 94300,
    billingCycleDate: 15,
    dueDate: 5,
    minimumPayment: 1200,
    currentBalance: 55700,
    totalSpent: 55700,
    color: '#2563eb',
    isActive: true,
    createdAt: daysAgo(365),
    transactions: [
      { id: 'txn_s001', amount: 1299,  description: 'Zomato Gold membership',      category: 'food',          date: daysAgo(1),  type: 'debit',  merchantName: 'Zomato'       },
      { id: 'txn_s002', amount: 8500,  description: 'Decathlon sports gear',        category: 'shopping',      date: daysAgo(3),  type: 'debit',  merchantName: 'Decathlon'    },
      { id: 'txn_s003', amount: 3600,  description: 'Electricity bill payment',     category: 'utilities',     date: daysAgo(5),  type: 'debit',  merchantName: 'BESCOM'       },
      { id: 'txn_s004', amount: 20000, description: 'Card payment received',        category: 'other',         date: daysAgo(8),  type: 'credit', merchantName: 'SBI Card'     },
      { id: 'txn_s005', amount: 2450,  description: 'BookMyShow – concert tickets', category: 'entertainment', date: daysAgo(9),  type: 'debit',  merchantName: 'BookMyShow'   },
      { id: 'txn_s006', amount: 980,   description: 'Rapido bike – monthly pass',   category: 'transport',     date: daysAgo(11), type: 'debit',  merchantName: 'Rapido'       },
      { id: 'txn_s007', amount: 15000, description: 'Mobile phone EMI',             category: 'shopping',      date: daysAgo(13), type: 'debit',  merchantName: 'Flipkart'     },
      { id: 'txn_s008', amount: 5200,  description: 'Restaurant – anniversary dinner', category: 'food',       date: daysAgo(16), type: 'debit',  merchantName: 'The Fatty Bao'},
      { id: 'txn_s009', amount: 1750,  description: 'Cult.fit gym membership',      category: 'health',        date: daysAgo(18), type: 'debit',  merchantName: 'Cult.fit'     },
      { id: 'txn_s010', amount: 25000, description: 'Card payment received',        category: 'other',         date: daysAgo(20), type: 'credit', merchantName: 'SBI Card'     }
    ]
  },
  {
    id: 'cc_003',
    userId: DEMO_USER_ID,
    bankName: 'Axis Bank',
    cardName: 'Axis Ace Credit Card',
    last4Digits: '2267',
    cardType: 'visa',
    creditLimit: 200000,
    availableCredit: 167800,
    billingCycleDate: 20,
    dueDate: 10,
    minimumPayment: 800,
    currentBalance: 32200,
    totalSpent: 32200,
    color: '#7c3aed',
    isActive: true,
    createdAt: daysAgo(90),
    transactions: [
      { id: 'txn_a001', amount: 4500,  description: 'MakeMyTrip hotel booking',    category: 'transport',     date: daysAgo(2),  type: 'debit',  merchantName: 'MakeMyTrip'   },
      { id: 'txn_a002', amount: 350,   description: 'Chai Point – office snacks',  category: 'food',          date: daysAgo(4),  type: 'debit',  merchantName: 'Chai Point'   },
      { id: 'txn_a003', amount: 12500, description: 'Myntra Big Fashion Sale',     category: 'shopping',      date: daysAgo(6),  type: 'debit',  merchantName: 'Myntra'       },
      { id: 'txn_a004', amount: 15000, description: 'Card payment received',       category: 'other',         date: daysAgo(10), type: 'credit', merchantName: 'Axis Bank'    },
      { id: 'txn_a005', amount: 2800,  description: 'Udemy course bundle',         category: 'education',     date: daysAgo(12), type: 'debit',  merchantName: 'Udemy'        },
      { id: 'txn_a006', amount: 6500,  description: 'VLCC health package',         category: 'health',        date: daysAgo(14), type: 'debit',  merchantName: 'VLCC'         },
      { id: 'txn_a007', amount: 1200,  description: 'Jio postpaid bill',           category: 'utilities',     date: daysAgo(16), type: 'debit',  merchantName: 'Jio'          },
      { id: 'txn_a008', amount: 8000,  description: 'Card payment received',       category: 'other',         date: daysAgo(18), type: 'credit', merchantName: 'Axis Bank'    },
      { id: 'txn_a009', amount: 550,   description: 'Blinkit – grocery delivery',  category: 'food',          date: daysAgo(20), type: 'debit',  merchantName: 'Blinkit'      },
      { id: 'txn_a010', amount: 2800,  description: 'PVR IMAX movie experience',   category: 'entertainment', date: daysAgo(22), type: 'debit',  merchantName: 'PVR'          }
    ]
  }
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function generateId(prefix = 'cc') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getUserCards(userId) {
  return creditCards.filter(c => c.userId === DEMO_USER_ID || c.userId === userId);
}

function recalcBalance(card) {
  const debits  = card.transactions.filter(t => t.type === 'debit').reduce((s, t)  => s + t.amount, 0);
  const credits = card.transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  card.currentBalance  = Math.max(0, debits - credits);
  card.totalSpent      = debits;
  card.availableCredit = Math.max(0, card.creditLimit - card.currentBalance);
  return card;
}

// ---------------------------------------------------------------------------
// GET /summary  –  overall credit card overview
// ---------------------------------------------------------------------------

router.get('/summary', auth, (req, res) => {
  try {
    const cards = getUserCards(req.userId);
    const activeCards = cards.filter(c => c.isActive);

    const totalCreditLimit = activeCards.reduce((s, c) => s + c.creditLimit, 0);
    const totalUsed        = activeCards.reduce((s, c) => s + c.currentBalance, 0);
    const totalAvailable   = activeCards.reduce((s, c) => s + c.availableCredit, 0);
    const utilizationPct   = totalCreditLimit > 0
      ? parseFloat(((totalUsed / totalCreditLimit) * 100).toFixed(2))
      : 0;

    const today = new Date();

    // Build upcoming dues (next 30 days)
    const upcomingDues = activeCards.map(card => {
      const dueDay = card.dueDate;
      let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
      if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return {
        cardId: card.id,
        cardName: card.cardName,
        bankName: card.bankName,
        last4Digits: card.last4Digits,
        dueDate: dueDate.toISOString().slice(0, 10),
        daysUntilDue,
        amountDue: card.currentBalance,
        minimumPayment: card.minimumPayment
      };
    }).filter(d => d.daysUntilDue <= 30)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    const cardsData = activeCards.map(c => ({
      id: c.id,
      bankName: c.bankName,
      cardName: c.cardName,
      last4Digits: c.last4Digits,
      cardType: c.cardType,
      creditLimit: c.creditLimit,
      availableCredit: c.availableCredit,
      currentBalance: c.currentBalance,
      utilization: c.creditLimit > 0
        ? parseFloat(((c.currentBalance / c.creditLimit) * 100).toFixed(2))
        : 0,
      color: c.color,
      dueDate: c.dueDate,
      minimumPayment: c.minimumPayment
    }));

    res.json({
      totalCreditLimit,
      totalUsed,
      totalAvailable,
      utilizationPercentage: utilizationPct,
      upcomingDues,
      cardsData,
      cardsCount: activeCards.length
    });
  } catch (err) {
    console.error('Credit card summary error:', err);
    res.status(500).json({ message: 'Error fetching credit card summary' });
  }
});

// ---------------------------------------------------------------------------
// GET /  –  list all credit cards
// ---------------------------------------------------------------------------

router.get('/', auth, (req, res) => {
  try {
    const cards = getUserCards(req.userId);

    const result = cards.map(c => ({
      ...c,
      transactionCount: c.transactions.length,
      utilization: c.creditLimit > 0
        ? parseFloat(((c.currentBalance / c.creditLimit) * 100).toFixed(2))
        : 0
    }));

    res.json({ creditCards: result, count: result.length });
  } catch (err) {
    console.error('List credit cards error:', err);
    res.status(500).json({ message: 'Error fetching credit cards' });
  }
});

// ---------------------------------------------------------------------------
// POST /  –  add a new credit card
// ---------------------------------------------------------------------------

router.post('/', auth, (req, res) => {
  try {
    const {
      bankName, cardName, last4Digits, cardType,
      creditLimit, billingCycleDate, dueDate,
      minimumPayment, color
    } = req.body;

    if (!bankName || !cardName || !last4Digits || !cardType || !creditLimit) {
      return res.status(400).json({ message: 'bankName, cardName, last4Digits, cardType, and creditLimit are required' });
    }
    if (!/^\d{4}$/.test(last4Digits)) {
      return res.status(400).json({ message: 'last4Digits must be exactly 4 digits' });
    }
    const validCardTypes = ['visa', 'mastercard', 'rupay', 'amex'];
    if (!validCardTypes.includes(cardType)) {
      return res.status(400).json({ message: `cardType must be one of: ${validCardTypes.join(', ')}` });
    }

    const card = {
      id: generateId('cc'),
      userId: req.userId,
      bankName: bankName.trim(),
      cardName: cardName.trim(),
      last4Digits,
      cardType,
      creditLimit: parseFloat(creditLimit),
      availableCredit: parseFloat(creditLimit),
      billingCycleDate: billingCycleDate || 1,
      dueDate: dueDate || 20,
      minimumPayment: minimumPayment || 0,
      currentBalance: 0,
      totalSpent: 0,
      color: color || '#6366f1',
      isActive: true,
      createdAt: new Date(),
      transactions: []
    };

    creditCards.push(card);
    res.status(201).json({ message: 'Credit card added successfully', creditCard: card });
  } catch (err) {
    console.error('Add credit card error:', err);
    res.status(500).json({ message: 'Error adding credit card' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id  –  update credit card details
// ---------------------------------------------------------------------------

router.put('/:id', auth, (req, res) => {
  try {
    const idx = creditCards.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Credit card not found' });

    const card = creditCards[idx];
    const fields = ['bankName', 'cardName', 'cardType', 'creditLimit', 'billingCycleDate', 'dueDate', 'minimumPayment', 'color', 'isActive'];

    fields.forEach(f => {
      if (req.body[f] !== undefined) card[f] = req.body[f];
    });

    // Recalculate available credit if limit changed
    card.availableCredit = Math.max(0, card.creditLimit - card.currentBalance);
    creditCards[idx] = card;

    res.json({ message: 'Credit card updated successfully', creditCard: card });
  } catch (err) {
    console.error('Update credit card error:', err);
    res.status(500).json({ message: 'Error updating credit card' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id  –  delete credit card
// ---------------------------------------------------------------------------

router.delete('/:id', auth, (req, res) => {
  try {
    const idx = creditCards.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Credit card not found' });

    creditCards.splice(idx, 1);
    res.json({ message: 'Credit card deleted successfully' });
  } catch (err) {
    console.error('Delete credit card error:', err);
    res.status(500).json({ message: 'Error deleting credit card' });
  }
});

// ---------------------------------------------------------------------------
// GET /:id/transactions  –  list transactions for a card
// ---------------------------------------------------------------------------

router.get('/:id/transactions', auth, (req, res) => {
  try {
    const card = creditCards.find(c => c.id === req.params.id);
    if (!card) return res.status(404).json({ message: 'Credit card not found' });

    const { type, category, startDate, endDate, page = 1, limit = 50 } = req.query;

    let txns = [...card.transactions];

    if (type)      txns = txns.filter(t => t.type === type);
    if (category)  txns = txns.filter(t => t.category === category);
    if (startDate) txns = txns.filter(t => new Date(t.date) >= new Date(startDate));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      txns = txns.filter(t => new Date(t.date) <= end);
    }

    txns.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total    = txns.length;
    const pageNum  = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const paginated = txns.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    res.json({
      transactions: paginated,
      pagination: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) },
      cardSummary: {
        creditLimit: card.creditLimit,
        currentBalance: card.currentBalance,
        availableCredit: card.availableCredit,
        totalSpent: card.totalSpent
      }
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/transactions  –  add transaction to a card
// ---------------------------------------------------------------------------

router.post('/:id/transactions', auth, (req, res) => {
  try {
    const idx = creditCards.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Credit card not found' });

    const { amount, description, category, date, type, merchantName } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'A positive amount is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (!['debit', 'credit'].includes(type)) {
      return res.status(400).json({ message: 'type must be "debit" or "credit"' });
    }

    const validCategories = ['food', 'transport', 'shopping', 'entertainment', 'utilities', 'health', 'education', 'other'];

    const txn = {
      id: generateId('txn'),
      amount: parseFloat(amount),
      description: description.trim(),
      category: validCategories.includes(category) ? category : 'other',
      date: date ? new Date(date) : new Date(),
      type,
      merchantName: merchantName || ''
    };

    const card = creditCards[idx];
    card.transactions.push(txn);
    recalcBalance(card);
    creditCards[idx] = card;

    res.status(201).json({
      message: 'Transaction added successfully',
      transaction: txn,
      updatedBalance: card.currentBalance,
      availableCredit: card.availableCredit
    });
  } catch (err) {
    console.error('Add transaction error:', err);
    res.status(500).json({ message: 'Error adding transaction' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id/transactions/:txnId  –  remove transaction
// ---------------------------------------------------------------------------

router.delete('/:id/transactions/:txnId', auth, (req, res) => {
  try {
    const cardIdx = creditCards.findIndex(c => c.id === req.params.id);
    if (cardIdx === -1) return res.status(404).json({ message: 'Credit card not found' });

    const card = creditCards[cardIdx];
    const txnIdx = card.transactions.findIndex(t => t.id === req.params.txnId);
    if (txnIdx === -1) return res.status(404).json({ message: 'Transaction not found' });

    card.transactions.splice(txnIdx, 1);
    recalcBalance(card);
    creditCards[cardIdx] = card;

    res.json({
      message: 'Transaction deleted successfully',
      updatedBalance: card.currentBalance,
      availableCredit: card.availableCredit
    });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ message: 'Error deleting transaction' });
  }
});

module.exports = router;
