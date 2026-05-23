const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');
const router = express.Router();

const VALID_CARD_TYPES = ['visa', 'mastercard', 'rupay', 'amex'];
const VALID_CATEGORIES = ['food', 'transport', 'shopping', 'entertainment', 'utilities', 'health', 'education', 'other'];

function recalcBalance(card) {
  const txns    = card.transactions || [];
  const debits  = txns.filter(t => t.type === 'debit').reduce((s, t)  => s + t.amount, 0);
  const credits = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  card.current_balance  = Math.max(0, debits - credits);
  card.total_spent      = debits;
  card.available_credit = Math.max(0, card.credit_limit - card.current_balance);
  return card;
}

function mapCard(c) {
  return {
    id: c.id,
    userId: c.user_id,
    bankName: c.bank_name,
    cardName: c.card_name,
    last4Digits: c.last_4_digits,
    cardType: c.card_type,
    creditLimit: parseFloat(c.credit_limit),
    availableCredit: parseFloat(c.available_credit),
    billingCycleDate: c.billing_cycle_date,
    dueDate: c.due_date,
    minimumPayment: parseFloat(c.minimum_payment || 0),
    currentBalance: parseFloat(c.current_balance || 0),
    totalSpent: parseFloat(c.total_spent || 0),
    color: c.color,
    isActive: c.is_active,
    transactions: c.transactions || [],
    createdAt: c.created_at
  };
}

// ---------------------------------------------------------------------------
// GET /summary
// ---------------------------------------------------------------------------
router.get('/summary', auth, async (req, res) => {
  try {
    const { data: cards, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', req.userId)
      .eq('is_active', true);

    if (error) throw error;
    const activeCards = cards || [];

    const totalCreditLimit = activeCards.reduce((s, c) => s + parseFloat(c.credit_limit), 0);
    const totalUsed        = activeCards.reduce((s, c) => s + parseFloat(c.current_balance || 0), 0);
    const totalAvailable   = activeCards.reduce((s, c) => s + parseFloat(c.available_credit), 0);
    const utilizationPct   = totalCreditLimit > 0
      ? parseFloat(((totalUsed / totalCreditLimit) * 100).toFixed(2)) : 0;

    const today = new Date();
    const upcomingDues = activeCards.map(card => {
      const dueDay = card.due_date || 20;
      let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
      if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return {
        cardId: card.id,
        cardName: card.card_name,
        bankName: card.bank_name,
        last4Digits: card.last_4_digits,
        dueDate: dueDate.toISOString().slice(0, 10),
        daysUntilDue,
        amountDue: parseFloat(card.current_balance || 0),
        minimumPayment: parseFloat(card.minimum_payment || 0)
      };
    }).filter(d => d.daysUntilDue <= 30)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    const cardsData = activeCards.map(c => ({
      id: c.id,
      bankName: c.bank_name,
      cardName: c.card_name,
      last4Digits: c.last_4_digits,
      cardType: c.card_type,
      creditLimit: parseFloat(c.credit_limit),
      availableCredit: parseFloat(c.available_credit),
      currentBalance: parseFloat(c.current_balance || 0),
      utilization: parseFloat(c.credit_limit) > 0
        ? parseFloat(((parseFloat(c.current_balance || 0) / parseFloat(c.credit_limit)) * 100).toFixed(2)) : 0,
      color: c.color,
      dueDate: c.due_date,
      minimumPayment: parseFloat(c.minimum_payment || 0)
    }));

    res.json({ totalCreditLimit, totalUsed, totalAvailable, utilizationPercentage: utilizationPct, upcomingDues, cardsData, cardsCount: activeCards.length });
  } catch (err) {
    console.error('Credit card summary error:', err);
    res.status(500).json({ message: 'Error fetching credit card summary' });
  }
});

// ---------------------------------------------------------------------------
// GET /  –  list all active credit cards
// ---------------------------------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const { data: cards, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', req.userId)
      .eq('is_active', true);

    if (error) throw error;
    const result = (cards || []).map(c => ({
      ...mapCard(c),
      transactionCount: (c.transactions || []).length,
      utilization: parseFloat(c.credit_limit) > 0
        ? parseFloat(((parseFloat(c.current_balance || 0) / parseFloat(c.credit_limit)) * 100).toFixed(2)) : 0
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
router.post('/', auth, async (req, res) => {
  try {
    const { bankName, cardName, last4Digits, cardType, creditLimit, billingCycleDate, dueDate, minimumPayment, color } = req.body;

    if (!bankName || !cardName || !last4Digits || !cardType || !creditLimit)
      return res.status(400).json({ message: 'bankName, cardName, last4Digits, cardType, and creditLimit are required' });
    if (!/^\d{4}$/.test(last4Digits))
      return res.status(400).json({ message: 'last4Digits must be exactly 4 digits' });
    if (!VALID_CARD_TYPES.includes(cardType))
      return res.status(400).json({ message: `cardType must be one of: ${VALID_CARD_TYPES.join(', ')}` });

    const limit = parseFloat(creditLimit);
    const { data, error } = await supabase
      .from('credit_cards')
      .insert({
        user_id: req.userId,
        bank_name: bankName.trim(),
        card_name: cardName.trim(),
        last_4_digits: last4Digits,
        card_type: cardType,
        credit_limit: limit,
        available_credit: limit,
        billing_cycle_date: billingCycleDate || 1,
        due_date: dueDate || 20,
        minimum_payment: minimumPayment || 0,
        current_balance: 0,
        total_spent: 0,
        color: color || '#6366f1',
        transactions: []
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Credit card added successfully', creditCard: mapCard(data) });
  } catch (err) {
    console.error('Add credit card error:', err);
    res.status(500).json({ message: 'Error adding credit card' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id  –  update credit card details
// ---------------------------------------------------------------------------
router.put('/:id', auth, async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('credit_cards').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ message: 'Credit card not found' });

    const fieldMap = {
      bankName: 'bank_name', cardName: 'card_name', cardType: 'card_type',
      creditLimit: 'credit_limit', billingCycleDate: 'billing_cycle_date',
      dueDate: 'due_date', minimumPayment: 'minimum_payment',
      color: 'color', isActive: 'is_active'
    };

    const updates = {};
    Object.entries(fieldMap).forEach(([camel, snake]) => {
      if (req.body[camel] !== undefined) updates[snake] = req.body[camel];
    });

    const newLimit = parseFloat(updates.credit_limit || existing.credit_limit);
    const balance  = parseFloat(existing.current_balance || 0);
    updates.available_credit = Math.max(0, newLimit - balance);

    const { data, error } = await supabase
      .from('credit_cards').update(updates)
      .eq('id', req.params.id).select().single();

    if (error) throw error;
    res.json({ message: 'Credit card updated successfully', creditCard: mapCard(data) });
  } catch (err) {
    console.error('Update credit card error:', err);
    res.status(500).json({ message: 'Error updating credit card' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id  –  soft-delete
// ---------------------------------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('credit_cards')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Credit card not found' });

    res.json({ message: 'Credit card deleted successfully' });
  } catch (err) {
    console.error('Delete credit card error:', err);
    res.status(500).json({ message: 'Error deleting credit card' });
  }
});

// ---------------------------------------------------------------------------
// GET /:id/transactions
// ---------------------------------------------------------------------------
router.get('/:id/transactions', auth, async (req, res) => {
  try {
    const { data: card, error } = await supabase
      .from('credit_cards').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).maybeSingle();

    if (error) throw error;
    if (!card) return res.status(404).json({ message: 'Credit card not found' });

    const { type, category, startDate, endDate, page = 1, limit = 50 } = req.query;
    let txns = (card.transactions || []).slice();

    if (type)      txns = txns.filter(t => t.type === type);
    if (category)  txns = txns.filter(t => t.category === category);
    if (startDate) txns = txns.filter(t => new Date(t.date) >= new Date(startDate));
    if (endDate) {
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
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
        creditLimit: parseFloat(card.credit_limit),
        currentBalance: parseFloat(card.current_balance || 0),
        availableCredit: parseFloat(card.available_credit),
        totalSpent: parseFloat(card.total_spent || 0)
      }
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/transactions  –  add transaction
// ---------------------------------------------------------------------------
router.post('/:id/transactions', auth, async (req, res) => {
  try {
    const { data: card, error: fetchErr } = await supabase
      .from('credit_cards').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!card) return res.status(404).json({ message: 'Credit card not found' });

    const { amount, description, category, date, type, merchantName } = req.body;

    if (!amount || parseFloat(amount) <= 0)
      return res.status(400).json({ message: 'A positive amount is required' });
    if (!description || !description.trim())
      return res.status(400).json({ message: 'Description is required' });
    if (!['debit', 'credit'].includes(type))
      return res.status(400).json({ message: 'type must be "debit" or "credit"' });

    const txn = {
      id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      amount: parseFloat(amount),
      description: description.trim(),
      category: VALID_CATEGORIES.includes(category) ? category : 'other',
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      type,
      merchantName: merchantName || ''
    };

    card.transactions = [...(card.transactions || []), txn];
    recalcBalance(card);

    const { data, error } = await supabase
      .from('credit_cards')
      .update({
        transactions: card.transactions,
        current_balance: card.current_balance,
        available_credit: card.available_credit,
        total_spent: card.total_spent
      })
      .eq('id', card.id)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({
      message: 'Transaction added successfully',
      transaction: txn,
      updatedBalance: parseFloat(data.current_balance),
      availableCredit: parseFloat(data.available_credit)
    });
  } catch (err) {
    console.error('Add transaction error:', err);
    res.status(500).json({ message: 'Error adding transaction' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id/transactions/:txnId
// ---------------------------------------------------------------------------
router.delete('/:id/transactions/:txnId', auth, async (req, res) => {
  try {
    const { data: card, error: fetchErr } = await supabase
      .from('credit_cards').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!card) return res.status(404).json({ message: 'Credit card not found' });

    const originalLength = (card.transactions || []).length;
    card.transactions = (card.transactions || []).filter(t => t.id !== req.params.txnId);
    if (card.transactions.length === originalLength)
      return res.status(404).json({ message: 'Transaction not found' });

    recalcBalance(card);

    const { data, error } = await supabase
      .from('credit_cards')
      .update({
        transactions: card.transactions,
        current_balance: card.current_balance,
        available_credit: card.available_credit,
        total_spent: card.total_spent
      })
      .eq('id', card.id)
      .select()
      .single();

    if (error) throw error;
    res.json({
      message: 'Transaction deleted successfully',
      updatedBalance: parseFloat(data.current_balance),
      availableCredit: parseFloat(data.available_credit)
    });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ message: 'Error deleting transaction' });
  }
});

module.exports = router;
