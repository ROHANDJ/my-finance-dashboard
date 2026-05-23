const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');
const router = express.Router();

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

const VALID_CATEGORIES  = CATEGORIES.map(c => c.id);
const VALID_METHODS     = ['cash', 'card', 'upi', 'netbanking'];

// Map DB row to API response (snake_case → camelCase)
function mapExpense(e) {
  return {
    id: e.id,
    userId: e.user_id,
    amount: parseFloat(e.amount),
    category: e.category,
    description: e.description,
    date: e.date,
    paymentMethod: e.payment_method,
    tags: e.tags || [],
    isRecurring: e.is_recurring,
    recurringType: e.recurring_type,
    createdAt: e.created_at
  };
}

// ---------------------------------------------------------------------------
// GET /categories
// ---------------------------------------------------------------------------
router.get('/categories', auth, (req, res) => {
  res.json({ categories: CATEGORIES });
});

// ---------------------------------------------------------------------------
// GET /summary
// ---------------------------------------------------------------------------
router.get('/summary', auth, async (req, res) => {
  try {
    const now = new Date();

    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 29); thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Fetch all expenses from 30 days ago (covers today, week, month windows)
    const { data: recentAll, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.userId)
      .gte('date', thirtyDaysAgo.toISOString());

    if (error) throw error;
    const rows = recentAll || [];

    const todayExpenses  = rows.filter(e => new Date(e.date) >= todayStart);
    const weekExpenses   = rows.filter(e => new Date(e.date) >= weekStart);
    const monthExpenses  = rows.filter(e => new Date(e.date) >= monthStart);

    const sum = arr => arr.reduce((acc, e) => acc + parseFloat(e.amount), 0);
    const todayTotal = sum(todayExpenses);
    const weekTotal  = sum(weekExpenses);
    const monthTotal = sum(monthExpenses);

    const categoryMap = {};
    monthExpenses.forEach(e => {
      if (!categoryMap[e.category]) categoryMap[e.category] = { amount: 0, count: 0 };
      categoryMap[e.category].amount += parseFloat(e.amount);
      categoryMap[e.category].count  += 1;
    });

    const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: monthTotal > 0 ? parseFloat(((data.amount / monthTotal) * 100).toFixed(2)) : 0
    })).sort((a, b) => b.amount - a.amount);

    const dailyMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    rows.forEach(e => {
      const key = new Date(e.date).toISOString().slice(0, 10);
      if (key in dailyMap) dailyMap[key] += parseFloat(e.amount);
    });

    const dailyTrend = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount }));

    res.json({ todayTotal, weekTotal, monthTotal, categoryBreakdown, dailyTrend });
  } catch (err) {
    console.error('Expenses summary error:', err);
    res.status(500).json({ message: 'Error fetching expense summary' });
  }
});

// ---------------------------------------------------------------------------
// GET /eod
// ---------------------------------------------------------------------------
router.get('/eod', auth, async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const { data: todayList, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.userId)
      .gte('date', todayStart.toISOString())
      .order('date', { ascending: false });

    if (error) throw error;
    const rows = todayList || [];

    const totalSpent = rows.reduce((acc, e) => acc + parseFloat(e.amount), 0);
    const catMap = {};
    rows.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + parseFloat(e.amount); });
    const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    res.json({
      totalSpent,
      transactionCount: rows.length,
      topCategory,
      transactions: rows.map(mapExpense)
    });
  } catch (err) {
    console.error('Expenses EOD error:', err);
    res.status(500).json({ message: 'Error fetching EOD expense data' });
  }
});

// ---------------------------------------------------------------------------
// GET /  –  list expenses with optional filters + pagination
// ---------------------------------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, category, search, page = 1, limit = 50 } = req.query;
    const pageNum  = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const from     = (pageNum - 1) * pageSize;
    const to       = from + pageSize - 1;

    let q = supabase.from('expenses').select('*', { count: 'exact' })
      .eq('user_id', req.userId)
      .order('date', { ascending: false })
      .range(from, to);

    if (startDate) q = q.gte('date', new Date(startDate).toISOString());
    if (endDate) {
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
      q = q.lte('date', end.toISOString());
    }
    if (category) q = q.eq('category', category);
    if (search)   q = q.ilike('description', `%${search.trim()}%`);

    const { data, error, count } = await q;
    if (error) throw error;

    const total = count || 0;
    res.json({
      expenses: (data || []).map(mapExpense),
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
router.post('/', auth, async (req, res) => {
  try {
    const { amount, category, description, date, paymentMethod, tags, isRecurring, recurringType } = req.body;

    if (!amount || parseFloat(amount) <= 0)
      return res.status(400).json({ message: 'A positive amount is required' });
    if (!description || !description.trim())
      return res.status(400).json({ message: 'Description is required' });

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: req.userId,
        amount: parseFloat(amount),
        category: VALID_CATEGORIES.includes(category) ? category : 'other',
        description: description.trim(),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        payment_method: VALID_METHODS.includes(paymentMethod) ? paymentMethod : 'upi',
        tags: Array.isArray(tags) ? tags : [],
        is_recurring: Boolean(isRecurring),
        recurring_type: isRecurring ? (recurringType || null) : null
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Expense added successfully', expense: mapExpense(data) });
  } catch (err) {
    console.error('Add expense error:', err);
    res.status(500).json({ message: 'Error adding expense' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id  –  update expense
// ---------------------------------------------------------------------------
router.put('/:id', auth, async (req, res) => {
  try {
    const { amount, category, description, date, paymentMethod, tags, isRecurring, recurringType } = req.body;
    const updates = {};

    if (amount !== undefined) {
      if (parseFloat(amount) <= 0) return res.status(400).json({ message: 'Amount must be positive' });
      updates.amount = parseFloat(amount);
    }
    if (category    !== undefined && VALID_CATEGORIES.includes(category)) updates.category = category;
    if (description !== undefined) updates.description    = description.trim();
    if (date        !== undefined) updates.date           = new Date(date).toISOString();
    if (paymentMethod !== undefined && VALID_METHODS.includes(paymentMethod)) updates.payment_method = paymentMethod;
    if (tags        !== undefined) updates.tags           = Array.isArray(tags) ? tags : [];
    if (isRecurring !== undefined) updates.is_recurring   = Boolean(isRecurring);
    if (recurringType !== undefined) updates.recurring_type = recurringType;

    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Expense not found' });

    res.json({ message: 'Expense updated successfully', expense: mapExpense(data) });
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ message: 'Error updating expense' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id  –  delete expense
// ---------------------------------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Expense not found' });

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ message: 'Error deleting expense' });
  }
});

module.exports = router;
