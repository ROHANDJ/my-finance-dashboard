'use strict';
const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { getIndices } = require('../services/marketDataService');
const router = express.Router();

// ---------------------------------------------------------------------------
// Category colors
// ---------------------------------------------------------------------------
const CATEGORY_COLORS = {
  shopping:      '#9C27B0',
  food:          '#FF6B35',
  transport:     '#4CAF50',
  entertainment: '#FF9800',
  health:        '#F44336',
  utilities:     '#2196F3',
  education:     '#00BCD4',
  other:         '#607D8B',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildPortfolioTrend(baseValue) {
  // Snapshot-style two-point trend (no synthetic intraday data)
  return [
    { time: 'Open',  value: Math.round(baseValue * 0.99) },
    { time: 'Now',   value: Math.round(baseValue) },
  ];
}

function buildInsightsAndAlerts({ portfolio, expenses, creditCards, marketIndices }) {
  const rawInsights = [];
  const alerts      = [];

  if (portfolio.dayChangePercent > 0) {
    rawInsights.push({ icon: '📈', text: `Portfolio is up ${portfolio.dayChangePercent.toFixed(2)}% today (+₹${portfolio.dayChange.toLocaleString('en-IN')})`, type: 'positive' });
  } else if (portfolio.dayChangePercent < 0) {
    rawInsights.push({ icon: '📉', text: `Portfolio is down ${Math.abs(portfolio.dayChangePercent).toFixed(2)}% today (-₹${Math.abs(portfolio.dayChange).toLocaleString('en-IN')})`, type: 'negative' });
  }

  if (portfolio.topGainer) {
    rawInsights.push({ icon: '🏆', text: `${portfolio.topGainer.symbol} is your best performer (+${portfolio.topGainer.changePercent}%)`, type: 'positive' });
  }

  const monthBudget = 40000;
  if (expenses.monthTotal > monthBudget * 0.9) {
    rawInsights.push({ icon: '⚠️', text: `You've used ${((expenses.monthTotal / monthBudget) * 100).toFixed(0)}% of your monthly budget`, type: 'negative' });
    alerts.push({ type: 'warning', message: `Monthly expenses at ₹${expenses.monthTotal.toLocaleString('en-IN')} – close to budget limit`, action: 'Review Expenses' });
  } else if (expenses.monthTotal > 0) {
    rawInsights.push({ icon: '✅', text: `Monthly expenses at ₹${expenses.monthTotal.toLocaleString('en-IN')} – on track`, type: 'positive' });
  }

  if (creditCards.utilizationPercent > 50) {
    alerts.push({ type: 'warning', message: `Credit utilisation at ${creditCards.utilizationPercent.toFixed(0)}% – consider a payment`, action: 'Pay Now' });
    rawInsights.push({ icon: '💳', text: `Credit card utilisation is ${creditCards.utilizationPercent.toFixed(0)}% – aim to keep it below 30%`, type: 'negative' });
  } else if (creditCards.cardsCount > 0) {
    rawInsights.push({ icon: '💳', text: `Credit utilisation at ${creditCards.utilizationPercent.toFixed(0)}% – healthy range`, type: 'positive' });
    if (creditCards.utilizationPercent <= 30) {
      alerts.push({ type: 'success', message: 'Credit utilisation is within healthy limits (< 30%)', action: null });
    }
  }

  if (creditCards.nextDueDate) {
    const daysLeft = Math.ceil((new Date(creditCards.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 5 && daysLeft >= 0) {
      alerts.push({ type: 'warning', message: `Credit card due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} – ₹${creditCards.totalDue.toLocaleString('en-IN')}`, action: 'Pay Now' });
      rawInsights.push({ icon: '🔔', text: `Credit card payment of ₹${creditCards.totalDue.toLocaleString('en-IN')} due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, type: 'negative' });
    } else if (daysLeft <= 10) {
      alerts.push({ type: 'info', message: `Credit card payment due in ${daysLeft} days`, action: 'Schedule Payment' });
    }
  }

  const nifty = marketIndices.find(m => m.symbol === '^NSEI' || m.short === 'NIFTY');
  if (nifty) {
    if (nifty.changePercent > 1) {
      alerts.push({ type: 'success', message: `Nifty 50 up ${nifty.changePercent.toFixed(2)}% today – market rally`, action: 'View Stocks' });
    } else if (nifty.changePercent < -1) {
      alerts.push({ type: 'warning', message: `Nifty 50 down ${Math.abs(nifty.changePercent).toFixed(2)}% – market under pressure`, action: 'View Portfolio' });
    }
  }

  const today = new Date().getDate();
  if (today >= 1 && today <= 5) {
    alerts.push({ type: 'info', message: 'SIP instalment week – verify mutual fund deductions', action: 'View Mutual Funds' });
  }

  const insights = rawInsights.map((ins, idx) => ({ id: `ins_${idx}`, ...ins }));
  return { insights, alerts };
}

// ---------------------------------------------------------------------------
// Data fetchers (Supabase-backed; return zero-shaped data on failure/empty)
// ---------------------------------------------------------------------------

const EMPTY_PORTFOLIO = {
  totalValue: 0, dayChange: 0, dayChangePercent: 0,
  topGainer: null, topLoser: null, holdingsCount: 0,
};

async function fetchMarketIndices() {
  try {
    const indices = await getIndices();
    return indices.map(i => ({
      symbol:        i.symbol,
      short:         i.short,
      name:          i.name,
      value:         parseFloat((i.price || 0).toFixed(2)),
      change:        parseFloat((i.change || 0).toFixed(2)),
      changePercent: parseFloat((i.changePercent || 0).toFixed(2)),
    }));
  } catch (err) {
    console.error('[eod] indices error:', err.message);
    return [];
  }
}

async function fetchPortfolioData(userId) {
  try {
    const { data: portfolios, error } = await supabase
      .from('portfolios').select('*').eq('user_id', userId).eq('is_active', true);

    if (error) throw error;
    if (!portfolios || portfolios.length === 0) return EMPTY_PORTFOLIO;

    let totalValue = 0, totalDayChange = 0, holdingsCount = 0;
    let topGainer = null, topLoser = null;

    for (const p of portfolios) {
      const perf = p.performance || {};
      totalValue     += perf.currentValue || 0;
      totalDayChange += perf.dayChange    || 0;
      holdingsCount  += (p.holdings || []).length;

      for (const h of (p.holdings || [])) {
        const changePercent = h.averagePrice > 0
          ? ((h.currentPrice - h.averagePrice) / h.averagePrice) * 100
          : 0;
        const entry = { symbol: h.symbol, name: h.name, changePercent: parseFloat(changePercent.toFixed(2)) };
        if (!topGainer || entry.changePercent > topGainer.changePercent) topGainer = entry;
        if (!topLoser  || entry.changePercent < topLoser.changePercent)  topLoser  = entry;
      }
    }

    const dayChangePercent = (totalValue - totalDayChange) > 0
      ? parseFloat(((totalDayChange / (totalValue - totalDayChange)) * 100).toFixed(2))
      : 0;

    return {
      totalValue:       parseFloat(totalValue.toFixed(2)),
      dayChange:        parseFloat(totalDayChange.toFixed(2)),
      dayChangePercent,
      topGainer,
      topLoser,
      holdingsCount,
    };
  } catch (err) {
    console.error('[eod] portfolio fetch error:', err.message);
    return EMPTY_PORTFOLIO;
  }
}

async function fetchExpensesData(userId) {
  try {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [todayRes, monthRes, recentRes] = await Promise.all([
      supabase.from('expenses').select('amount').eq('user_id', userId).gte('date', todayStart),
      supabase.from('expenses').select('amount, category').eq('user_id', userId).gte('date', monthStart),
      supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(5),
    ]);

    const todayExpenses = todayRes.data || [];
    const monthExpenses = monthRes.data || [];
    const recent        = recentRes.data || [];

    const todayTotal = todayExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const monthTotal = monthExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    const catTotals = {};
    monthExpenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount || 0);
    });
    const topCategory = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0] || 'other';

    return {
      todayTotal:         parseFloat(todayTotal.toFixed(2)),
      monthTotal:         parseFloat(monthTotal.toFixed(2)),
      topCategory,
      recentTransactions: recent.map(r => ({
        id:            r.id,
        description:   r.description,
        category:      r.category,
        amount:        parseFloat(r.amount),
        date:          r.date,
        paymentMethod: r.payment_method,
      })),
    };
  } catch (err) {
    console.error('[eod] expenses fetch error:', err.message);
    return { todayTotal: 0, monthTotal: 0, topCategory: 'other', recentTransactions: [] };
  }
}

async function fetchCreditCardsData(userId) {
  try {
    const { data: cards, error } = await supabase
      .from('credit_cards').select('*').eq('user_id', userId).eq('is_active', true);

    if (error) throw error;
    if (!cards || cards.length === 0) {
      return { totalDue: 0, nextDueDate: null, utilizationPercent: 0, cardsCount: 0 };
    }

    let totalBalance = 0, totalLimit = 0, earliestDue = null;
    const now = new Date();

    for (const card of cards) {
      totalBalance += parseFloat(card.current_balance || 0);
      totalLimit   += parseFloat(card.credit_limit    || 0);

      if (card.due_date) {
        // due_date is integer day-of-month
        let due = new Date(now.getFullYear(), now.getMonth(), parseInt(card.due_date));
        if (due <= now) due.setMonth(due.getMonth() + 1);
        if (!earliestDue || due < earliestDue) earliestDue = due;
      }
    }

    const utilizationPercent = totalLimit > 0
      ? parseFloat(((totalBalance / totalLimit) * 100).toFixed(2))
      : 0;

    return {
      totalDue:           parseFloat(totalBalance.toFixed(2)),
      nextDueDate:        earliestDue ? earliestDue.toISOString().slice(0, 10) : null,
      utilizationPercent,
      cardsCount:         cards.length,
    };
  } catch (err) {
    console.error('[eod] creditcards fetch error:', err.message);
    return { totalDue: 0, nextDueDate: null, utilizationPercent: 0, cardsCount: 0 };
  }
}

async function fetchSpendingByCategory(userId) {
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: expenses, error } = await supabase
      .from('expenses').select('amount, category').eq('user_id', userId).gte('date', monthStart);

    if (error) throw error;
    if (!expenses || expenses.length === 0) return [];

    const catTotals = {};
    expenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount || 0);
    });

    return Object.entries(catTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount:   parseFloat(amount.toFixed(2)),
        color:    CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
      }));
  } catch (err) {
    console.error('[eod] spendingByCategory error:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// GET /summary
// ---------------------------------------------------------------------------
router.get('/summary', auth, async (req, res) => {
  try {
    const userId   = req.userId;
    const todayStr = new Date().toISOString().slice(0, 10);

    const [portfolio, expenses, creditCards, marketIndices, spendingByCategory] = await Promise.all([
      fetchPortfolioData(userId),
      fetchExpensesData(userId),
      fetchCreditCardsData(userId),
      fetchMarketIndices(),
      fetchSpendingByCategory(userId),
    ]);

    const { insights, alerts } = buildInsightsAndAlerts({ portfolio, expenses, creditCards, marketIndices });
    const portfolioTrend       = buildPortfolioTrend(portfolio.totalValue);

    res.json({
      date: todayStr,
      portfolio,
      expenses,
      creditCards,
      marketIndices,
      insights,
      alerts,
      portfolioTrend,
      spendingByCategory,
    });
  } catch (err) {
    console.error('[eod] summary error:', err);
    res.status(500).json({ message: 'Failed to build EOD summary' });
  }
});

module.exports = router;
