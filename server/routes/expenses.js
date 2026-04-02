const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// ---------------------------------------------------------------------------
// In-memory demo data store
// ---------------------------------------------------------------------------

const DEMO_USER_ID = 'demo_user';

// Helper: generate a date N days ago from today
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

let expenses = [
  // --- Food ---
  { id: 'exp_001', userId: DEMO_USER_ID, amount: 320,  category: 'food',          description: 'Lunch at Subway',              date: daysAgo(0),  paymentMethod: 'upi',        tags: ['lunch', 'fast-food'], isRecurring: false, recurringType: null, createdAt: daysAgo(0) },
  { id: 'exp_002', userId: DEMO_USER_ID, amount: 85,   category: 'food',          description: 'Morning chai & breakfast',      date: daysAgo(1),  paymentMethod: 'cash',       tags: ['breakfast'],          isRecurring: false, recurringType: null, createdAt: daysAgo(1) },
  { id: 'exp_003', userId: DEMO_USER_ID, amount: 650,  category: 'food',          description: 'Dinner at Pizza Hut',           date: daysAgo(3),  paymentMethod: 'card',       tags: ['dinner', 'dining'],   isRecurring: false, recurringType: null, createdAt: daysAgo(3) },
  { id: 'exp_004', userId: DEMO_USER_ID, amount: 240,  category: 'food',          description: 'Swiggy order – Biryani',        date: daysAgo(5),  paymentMethod: 'upi',        tags: ['delivery', 'dinner'], isRecurring: false, recurringType: null, createdAt: daysAgo(5) },
  { id: 'exp_005', userId: DEMO_USER_ID, amount: 180,  category: 'food',          description: 'Grocery – local market',        date: daysAgo(7),  paymentMethod: 'cash',       tags: ['grocery'],            isRecurring: false, recurringType: null, createdAt: daysAgo(7) },

  // --- Transport ---
  { id: 'exp_006', userId: DEMO_USER_ID, amount: 450,  category: 'transport',     description: 'Ola cab – office commute',      date: daysAgo(1),  paymentMethod: 'upi',        tags: ['cab', 'commute'],     isRecurring: false, recurringType: null, createdAt: daysAgo(1) },
  { id: 'exp_007', userId: DEMO_USER_ID, amount: 120,  category: 'transport',     description: 'Metro card recharge',           date: daysAgo(6),  paymentMethod: 'upi',        tags: ['metro'],              isRecurring: true,  recurringType: 'monthly', createdAt: daysAgo(6) },
  { id: 'exp_008', userId: DEMO_USER_ID, amount: 2200, category: 'transport',     description: 'Petrol fill – full tank',       date: daysAgo(10), paymentMethod: 'card',       tags: ['petrol', 'fuel'],     isRecurring: false, recurringType: null, createdAt: daysAgo(10) },

  // --- Shopping ---
  { id: 'exp_009', userId: DEMO_USER_ID, amount: 1890, category: 'shopping',      description: 'Amazon – USB-C hub & cables',   date: daysAgo(4),  paymentMethod: 'card',       tags: ['electronics', 'amazon'], isRecurring: false, recurringType: null, createdAt: daysAgo(4) },
  { id: 'exp_010', userId: DEMO_USER_ID, amount: 3500, category: 'shopping',      description: 'Myntra – casual shirts (x3)',   date: daysAgo(9),  paymentMethod: 'card',       tags: ['clothing', 'myntra'],    isRecurring: false, recurringType: null, createdAt: daysAgo(9) },
  { id: 'exp_011', userId: DEMO_USER_ID, amount: 560,  category: 'shopping',      description: 'Stationery & notebooks',        date: daysAgo(14), paymentMethod: 'cash',       tags: ['stationery'],            isRecurring: false, recurringType: null, createdAt: daysAgo(14) },

  // --- Entertainment ---
  { id: 'exp_012', userId: DEMO_USER_ID, amount: 699,  category: 'entertainment', description: 'Netflix subscription (monthly)',date: daysAgo(2),  paymentMethod: 'card',       tags: ['streaming', 'subscription'], isRecurring: true, recurringType: 'monthly', createdAt: daysAgo(2) },
  { id: 'exp_013', userId: DEMO_USER_ID, amount: 400,  category: 'entertainment', description: 'PVR movie tickets (x2)',        date: daysAgo(8),  paymentMethod: 'upi',        tags: ['movies'],             isRecurring: false, recurringType: null, createdAt: daysAgo(8) },

  // --- Utilities ---
  { id: 'exp_014', userId: DEMO_USER_ID, amount: 1250, category: 'utilities',     description: 'Electricity bill – April',      date: daysAgo(5),  paymentMethod: 'netbanking', tags: ['electricity', 'bill'], isRecurring: true, recurringType: 'monthly', createdAt: daysAgo(5) },
  { id: 'exp_015', userId: DEMO_USER_ID, amount: 399,  category: 'utilities',     description: 'Jio broadband – monthly plan',  date: daysAgo(12), paymentMethod: 'upi',        tags: ['internet', 'bill'],   isRecurring: true, recurringType: 'monthly', createdAt: daysAgo(12) },

  // --- Health ---
  { id: 'exp_016', userId: DEMO_USER_ID, amount: 850,  category: 'health',        description: 'Apollo pharmacy – medicines',   date: daysAgo(3),  paymentMethod: 'upi',        tags: ['medicine', 'pharmacy'], isRecurring: false, recurringType: null, createdAt: daysAgo(3) },
  { id: 'exp_017', userId: DEMO_USER_ID, amount: 600,  category: 'health',        description: 'Gym membership – monthly fee',  date: daysAgo(15), paymentMethod: 'card',       tags: ['gym', 'fitness'],     isRecurring: true, recurringType: 'monthly', createdAt: daysAgo(15) },

  // --- Education ---
  { id: 'exp_018', userId: DEMO_USER_ID, amount: 1999, category: 'education',     description: 'Udemy – Python course',         date: daysAgo(11), paymentMethod: 'card',       tags: ['course', 'online'],   isRecurring: false, recurringType: null, createdAt: daysAgo(11) },
  { id: 'exp_019', userId: DEMO_USER_ID, amount: 2500, category: 'education',     description: 'Books – CFA Level 1 study material', date: daysAgo(20), paymentMethod: 'netbanking', tags: ['books', 'cfa'], isRecurring: false, recurringType: null, createdAt: daysAgo(20) },

  // --- Other ---
  { id: 'exp_020', userId: DEMO_USER_ID, amount: 750,  category: 'other',         description: 'Gift – friend\'s birthday',     date: daysAgo(6),  paymentMethod: 'upi',        tags: ['gift'],               isRecurring: false, recurringType: null, createdAt: daysAgo(6) }
];

// ---------------------------------------------------------------------------
// Predefined categories with icons (Lucide / emoji fallback)
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { id: 'food',          label: 'Food & Dining',    icon: 'UtensilsCrossed', emoji: '🍽️',  color: '#f97316' },
  { id: 'transport',     label: 'Transport',        icon: 'Car',             emoji: '🚗',  color: '#3b82f6' },
  { id: 'shopping',      label: 'Shopping',         icon: 'ShoppingBag',     emoji: '🛍️',  color: '#8b5cf6' },
  { id: 'entertainment', label: 'Entertainment',    icon: 'Film',            emoji: '🎬',  color: '#ec4899' },
  { id: 'utilities',     label: 'Utilities & Bills',icon: 'Zap',             emoji: '⚡',  color: '#eab308' },
  { id: 'health',        label: 'Health & Fitness', icon: 'HeartPulse',      emoji: '🏥',  color: '#22c55e' },
  { id: 'education',     label: 'Education',        icon: 'GraduationCap',   emoji: '🎓',  color: '#06b6d4' },
  { id: 'other',         label: 'Other',            icon: 'MoreHorizontal',  emoji: '📦',  color: '#6b7280' }
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function generateId() {
  return 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getUserExpenses(userId) {
  // In demo mode every authenticated user sees the same seed data
  return expenses.filter(e => e.userId === DEMO_USER_ID || e.userId === userId);
}

// ---------------------------------------------------------------------------
// GET /categories
// ---------------------------------------------------------------------------

router.get('/categories', auth, (req, res) => {
  res.json({ categories: CATEGORIES });
});

// ---------------------------------------------------------------------------
// GET /summary  –  aggregated stats
// ---------------------------------------------------------------------------

router.get('/summary', auth, (req, res) => {
  try {
    const userExpenses = getUserExpenses(req.userId);
    const now = new Date();

    const todayStart = startOfDay(now);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayExpenses  = userExpenses.filter(e => new Date(e.date) >= todayStart);
    const weekExpenses   = userExpenses.filter(e => new Date(e.date) >= weekStart);
    const monthExpenses  = userExpenses.filter(e => new Date(e.date) >= monthStart);

    const sum = arr => arr.reduce((acc, e) => acc + e.amount, 0);

    const todayTotal = sum(todayExpenses);
    const weekTotal  = sum(weekExpenses);
    const monthTotal = sum(monthExpenses);

    // Category breakdown for current month
    const categoryMap = {};
    monthExpenses.forEach(e => {
      if (!categoryMap[e.category]) categoryMap[e.category] = { amount: 0, count: 0 };
      categoryMap[e.category].amount += e.amount;
      categoryMap[e.category].count  += 1;
    });

    const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: monthTotal > 0 ? parseFloat(((data.amount / monthTotal) * 100).toFixed(2)) : 0
    })).sort((a, b) => b.amount - a.amount);

    // Daily trend – last 30 days
    const dailyMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }

    userExpenses.forEach(e => {
      const key = new Date(e.date).toISOString().slice(0, 10);
      if (key in dailyMap) dailyMap[key] += e.amount;
    });

    const dailyTrend = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount }));

    res.json({ todayTotal, weekTotal, monthTotal, categoryBreakdown, dailyTrend });
  } catch (err) {
    console.error('Expenses summary error:', err);
    res.status(500).json({ message: 'Error fetching expense summary' });
  }
});

// ---------------------------------------------------------------------------
// GET /eod  –  today's end-of-day summary
// ---------------------------------------------------------------------------

router.get('/eod', auth, (req, res) => {
  try {
    const userExpenses = getUserExpenses(req.userId);
    const todayStart = startOfDay(new Date());

    const todayList = userExpenses.filter(e => new Date(e.date) >= todayStart);
    const totalSpent = todayList.reduce((acc, e) => acc + e.amount, 0);

    // Find top category today
    const catMap = {};
    todayList.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    res.json({
      totalSpent,
      transactionCount: todayList.length,
      topCategory,
      transactions: todayList.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  } catch (err) {
    console.error('Expenses EOD error:', err);
    res.status(500).json({ message: 'Error fetching EOD expense data' });
  }
});

// ---------------------------------------------------------------------------
// GET /  –  list expenses with optional filters
// ---------------------------------------------------------------------------

router.get('/', auth, (req, res) => {
  try {
    const { startDate, endDate, category, search, page = 1, limit = 50 } = req.query;

    let result = getUserExpenses(req.userId);

    if (startDate) {
      const from = new Date(startDate);
      result = result.filter(e => new Date(e.date) >= from);
    }
    if (endDate) {
      const to = new Date(endDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter(e => new Date(e.date) <= to);
    }
    if (category) {
      result = result.filter(e => e.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.description.toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = result.length;
    const pageNum = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const paginated = result.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    res.json({
      expenses: paginated,
      pagination: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) }
    });
  } catch (err) {
    console.error('Expenses list error:', err);
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});

// ---------------------------------------------------------------------------
// POST /  –  add expense
// ---------------------------------------------------------------------------

router.post('/', auth, (req, res) => {
  try {
    const { amount, category, description, date, paymentMethod, tags, isRecurring, recurringType } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'A positive amount is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const validCategories = CATEGORIES.map(c => c.id);
    const resolvedCategory = validCategories.includes(category) ? category : 'other';

    const validMethods = ['cash', 'card', 'upi', 'netbanking'];
    const resolvedMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'upi';

    const expense = {
      id: generateId(),
      userId: req.userId,
      amount: parseFloat(amount),
      category: resolvedCategory,
      description: description.trim(),
      date: date ? new Date(date) : new Date(),
      paymentMethod: resolvedMethod,
      tags: Array.isArray(tags) ? tags : [],
      isRecurring: Boolean(isRecurring),
      recurringType: isRecurring ? (recurringType || null) : null,
      createdAt: new Date()
    };

    expenses.push(expense);
    res.status(201).json({ message: 'Expense added successfully', expense });
  } catch (err) {
    console.error('Add expense error:', err);
    res.status(500).json({ message: 'Error adding expense' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id  –  update expense
// ---------------------------------------------------------------------------

router.put('/:id', auth, (req, res) => {
  try {
    const idx = expenses.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Expense not found' });

    const expense = expenses[idx];

    const { amount, category, description, date, paymentMethod, tags, isRecurring, recurringType } = req.body;

    if (amount !== undefined) {
      if (parseFloat(amount) <= 0) return res.status(400).json({ message: 'Amount must be positive' });
      expense.amount = parseFloat(amount);
    }
    if (category !== undefined) {
      const valid = CATEGORIES.map(c => c.id);
      expense.category = valid.includes(category) ? category : expense.category;
    }
    if (description !== undefined) expense.description = description.trim();
    if (date !== undefined)        expense.date        = new Date(date);
    if (paymentMethod !== undefined) {
      const valid = ['cash', 'card', 'upi', 'netbanking'];
      expense.paymentMethod = valid.includes(paymentMethod) ? paymentMethod : expense.paymentMethod;
    }
    if (tags !== undefined)         expense.tags         = Array.isArray(tags) ? tags : expense.tags;
    if (isRecurring !== undefined)  expense.isRecurring  = Boolean(isRecurring);
    if (recurringType !== undefined) expense.recurringType = recurringType;

    expenses[idx] = expense;
    res.json({ message: 'Expense updated successfully', expense });
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ message: 'Error updating expense' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id  –  delete expense
// ---------------------------------------------------------------------------

router.delete('/:id', auth, (req, res) => {
  try {
    const idx = expenses.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Expense not found' });

    expenses.splice(idx, 1);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ message: 'Error deleting expense' });
  }
});

module.exports = router;
