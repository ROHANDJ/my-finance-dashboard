'use strict';
const express    = require('express');
const auth       = require('../middleware/auth');
const Portfolio  = require('../models/Portfolio');
const Expense    = require('../models/Expense');
const CreditCard = require('../models/CreditCard');
const router     = express.Router();

// yahoo-finance2 uses a default export
let yahooFinance;
try { yahooFinance = require('yahoo-finance2').default; } catch { yahooFinance = null; }

// ---------------------------------------------------------------------------
// Static demo fallback data
// ---------------------------------------------------------------------------

const DEMO_PORTFOLIO = {
  totalValue:       847250,
  dayChange:        9843,
  dayChangePercent: 1.18,
  topGainer:  { symbol: 'INFY',  name: 'Infosys Ltd',  changePercent:  3.42 },
  topLoser:   { symbol: 'WIPRO', name: 'Wipro Ltd',    changePercent: -1.87 },
  holdingsCount: 12,
};

const DEMO_MARKET_INDICES = [
  { symbol: 'NIFTY50', name: 'Nifty 50',   value: 22648.20, change:  243.50, changePercent:  1.09 },
  { symbol: 'SENSEX',  name: 'BSE Sensex', value: 74572.68, change:  782.45, changePercent:  1.06 },
  { symbol: 'SP500',   name: 'S&P 500',    value:  5204.34, change:   28.12, changePercent:  0.54 },
  { symbol: 'NASDAQ',  name: 'Nasdaq',     value: 16275.52, change:  145.78, changePercent:  0.90 },
];

const DEMO_RECENT_EXPENSES = [
  { id: 'exp_001', description: 'Lunch at Subway',          category: 'food',          amount: 320,  date: new Date().toISOString(),                          paymentMethod: 'upi'  },
  { id: 'exp_006', description: 'Ola cab – office commute', category: 'transport',     amount: 450,  date: new Date(Date.now() -     86400000).toISOString(), paymentMethod: 'upi'  },
  { id: 'exp_012', description: 'Netflix subscription',     category: 'entertainment', amount: 699,  date: new Date(Date.now() - 2 * 86400000).toISOString(), paymentMethod: 'card' },
  { id: 'exp_016', description: 'Apollo pharmacy',          category: 'health',        amount: 850,  date: new Date(Date.now() - 3 * 86400000).toISOString(), paymentMethod: 'upi'  },
  { id: 'exp_009', description: 'Amazon – USB-C hub',       category: 'shopping',      amount: 1890, date: new Date(Date.now() - 4 * 86400000).toISOString(), paymentMethod: 'card' },
];

const DEMO_SPENDING_BY_CATEGORY = [
  { category: 'Shopping',      amount: 6420, color: '#9C27B0' },
  { category: 'Food',          amount: 4380, color: '#FF6B35' },
  { category: 'Transport',     amount: 2150, color: '#4CAF50' },
  { category: 'Entertainment', amount: 1890, color: '#FF9800' },
  { category: 'Health',        amount: 1480, color: '#F44336' },
  { category: 'Utilities',     amount: 1022, color: '#2196F3' },
  { category: 'Other',         amount:  600, color: '#607D8B' },
];

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
  const trend = [];
  const now   = new Date();
  const steps = 14; // 7 hours × 2
  for (let i = steps; i >= 0; i--) {
    const t     = new Date(now.getTime() - i * 30 * 60 * 1000);
    const noise = (Math.random() - 0.48) * 2000;
    trend.push({
      time:  t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      value: Math.round(baseValue - (i * 700) + noise + (steps - i) * 800),
    });
  }
  return trend;
}

function buildInsightsAndAlerts({ portfolio, expenses, creditCards, marketIndices }) {
  const rawInsights = [];
  const alerts      = [];

  // Portfolio direction
  if (portfolio.dayChangePercent > 0) {
    rawInsights.push({ icon: '📈', text: `Portfolio is up ${portfolio.dayChangePercent.toFixed(2)}% today (+₹${portfolio.dayChange.toLocaleString('en-IN')})`, type: 'positive' });
  } else {
    rawInsights.push({ icon: '📉', text: `Portfolio is down ${Math.abs(portfolio.dayChangePercent).toFixed(2)}% today (-₹${Math.abs(portfolio.dayChange).toLocaleString('en-IN')})`, type: 'negative' });
  }

  if (portfolio.topGainer) {
    rawInsights.push({ icon: '🏆', text: `${portfolio.topGainer.symbol} is your best performer today (+${portfolio.topGainer.changePercent}%)`, type: 'positive' });
  }

  // Expenses vs. budget
  const monthBudget = 40000;
  if (expenses.monthTotal > monthBudget * 0.9) {
    rawInsights.push({ icon: '⚠️', text: `You've used ${((expenses.monthTotal / monthBudget) * 100).toFixed(0)}% of your monthly budget`, type: 'negative' });
    alerts.push({ type: 'warning', message: `Monthly expenses at ₹${expenses.monthTotal.toLocaleString('en-IN')} – close to budget limit`, action: 'Review Expenses' });
  } else {
    rawInsights.push({ icon: '✅', text: `Monthly expenses at ₹${expenses.monthTotal.toLocaleString('en-IN')} – on track`, type: 'positive' });
  }

  // Credit utilisation
  if (creditCards.utilizationPercent > 50) {
    alerts.push({ type: 'warning', message: `Credit utilisation at ${creditCards.utilizationPercent.toFixed(0)}% – consider a payment`, action: 'Pay Now' });
    rawInsights.push({ icon: '💳', text: `Credit card utilisation is ${creditCards.utilizationPercent.toFixed(0)}% – aim to keep it below 30%`, type: 'negative' });
  } else {
    rawInsights.push({ icon: '💳', text: `Credit utilisation at ${creditCards.utilizationPercent.toFixed(0)}% – healthy range`, type: 'positive' });
    if (creditCards.utilizationPercent <= 30) {
      alerts.push({ type: 'success', message: 'Credit utilisation is within healthy limits (< 30%)', action: null });
    }
  }

  // Credit card due date
  if (creditCards.nextDueDate) {
    const daysLeft = Math.ceil((new Date(creditCards.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 5 && daysLeft >= 0) {
      alerts.push({ type: 'warning', message: `Credit card due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} – ₹${creditCards.totalDue.toLocaleString('en-IN')}`, action: 'Pay Now' });
      rawInsights.push({ icon: '🔔', text: `Credit card payment of ₹${creditCards.totalDue.toLocaleString('en-IN')} due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, type: 'negative' });
    } else if (daysLeft <= 10) {
      alerts.push({ type: 'info', message: `Credit card payment due in ${daysLeft} days`, action: 'Schedule Payment' });
    }
  }

  // Nifty alert
  const nifty = marketIndices.find(m => m.symbol === 'NIFTY50' || m.symbol === '^NSEI');
  if (nifty) {
    if (nifty.changePercent > 1) {
      alerts.push({ type: 'success', message: `Nifty 50 up ${nifty.changePercent.toFixed(2)}% today – market rally`, action: 'View Stocks' });
    } else if (nifty.changePercent < -1) {
      alerts.push({ type: 'warning', message: `Nifty 50 down ${Math.abs(nifty.changePercent).toFixed(2)}% – market under pressure`, action: 'View Portfolio' });
    }
  }

  // SIP reminder (first week of month)
  const today = new Date().getDate();
  if (today >= 1 && today <= 5) {
    alerts.push({ type: 'info', message: 'SIP instalment week – verify mutual fund deductions', action: 'View Mutual Funds' });
  }

  const insights = rawInsights.map((ins, idx) => ({ id: `ins_${idx}`, ...ins }));
  return { insights, alerts };
}

// ---------------------------------------------------------------------------
// Data fetchers  (each returns real data or a demo fallback, never throws)
// ---------------------------------------------------------------------------

async function fetchMarketIndices() {
  if (!yahooFinance) return DEMO_MARKET_INDICES;

  const tickers = [
    { yahoo: '^NSEI',  symbol: 'NIFTY50', name: 'Nifty 50'   },
    { yahoo: '^BSESN', symbol: 'SENSEX',  name: 'BSE Sensex' },
    { yahoo: '^GSPC',  symbol: 'SP500',   name: 'S&P 500'    },
    { yahoo: '^IXIC',  symbol: 'NASDAQ',  name: 'Nasdaq'     },
  ];

  try {
    const quotes = await Promise.all(
      tickers.map(t =>
        yahooFinance.quote(t.yahoo, {}, { validateResult: false })
          .then(q => ({
            symbol:        t.symbol,
            name:          t.name,
            value:         parseFloat((q.regularMarketPrice        || 0).toFixed(2)),
            change:        parseFloat((q.regularMarketChange       || 0).toFixed(2)),
            changePercent: parseFloat((q.regularMarketChangePercent|| 0).toFixed(2)),
          }))
          .catch(() => null)
      )
    );

    const valid = quotes.filter(Boolean);
    if (valid.length === 0) return DEMO_MARKET_INDICES;

    // Fill in any failed tickers with the matching demo entry
    return tickers.map((t, i) => valid[i] || DEMO_MARKET_INDICES[i]);
  } catch (err) {
    console.error('[eod] yahooFinance error:', err.message);
    return DEMO_MARKET_INDICES;
  }
}

async function fetchPortfolioData(userId) {
  try {
    const portfolios = await Portfolio.find({ userId, isActive: true }).lean();
    if (!portfolios || portfolios.length === 0) return DEMO_PORTFOLIO;

    let totalValue      = 0;
    let totalDayChange  = 0;
    let holdingsCount   = 0;
    let topGainer       = null;
    let topLoser        = null;

    for (const p of portfolios) {
      totalValue     += p.performance?.currentValue   || 0;
      totalDayChange += p.performance?.dayChange       || 0;
      holdingsCount  += p.holdings?.length             || 0;

      for (const h of (p.holdings || [])) {
        const changePercent = h.averagePrice > 0
          ? ((h.currentPrice - h.averagePrice) / h.averagePrice) * 100
          : 0;
        const entry = { symbol: h.symbol, name: h.name, changePercent: parseFloat(changePercent.toFixed(2)) };
        if (!topGainer || entry.changePercent > topGainer.changePercent) topGainer = entry;
        if (!topLoser  || entry.changePercent < topLoser.changePercent)  topLoser  = entry;
      }
    }

    const dayChangePercent = totalValue > 0
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
    return DEMO_PORTFOLIO;
  }
}

async function fetchExpensesData(userId) {
  try {
    const now         = new Date();
    const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayExpenses, monthExpenses, recent] = await Promise.all([
      Expense.find({ userId, date: { $gte: todayStart } }).lean(),
      Expense.find({ userId, date: { $gte: monthStart } }).lean(),
      Expense.find({ userId }).sort({ date: -1 }).limit(5).lean(),
    ]);

    const todayTotal = todayExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const monthTotal = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    // Top category by spend this month
    const catTotals = {};
    monthExpenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + (e.amount || 0);
    });
    const topCategory = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0] || 'other';

    return {
      todayTotal:         parseFloat(todayTotal.toFixed(2)),
      monthTotal:         parseFloat(monthTotal.toFixed(2)),
      topCategory,
      recentTransactions: recent,
    };
  } catch (err) {
    console.error('[eod] expenses fetch error:', err.message);
    return { todayTotal: 320, monthTotal: 17942, topCategory: 'shopping', recentTransactions: DEMO_RECENT_EXPENSES };
  }
}

async function fetchCreditCardsData(userId) {
  try {
    const cards = await CreditCard.find({ userId, isActive: true }).lean();
    if (!cards || cards.length === 0) {
      // Return demo-shaped zero values so insights still build safely
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), 5);
      if (dueDate <= now) dueDate.setMonth(dueDate.getMonth() + 1);
      return { totalDue: 0, nextDueDate: dueDate.toISOString().slice(0, 10), utilizationPercent: 0, cardsCount: 0 };
    }

    let totalBalance = 0;
    let totalLimit   = 0;
    let earliestDue  = null;

    const now = new Date();

    for (const card of cards) {
      totalBalance += card.currentBalance || 0;
      totalLimit   += card.creditLimit    || 0;

      if (card.dueDate) {
        let due = new Date(now.getFullYear(), now.getMonth(), card.dueDate);
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
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 5);
    if (dueDate <= now) dueDate.setMonth(dueDate.getMonth() + 1);
    return { totalDue: 209360, nextDueDate: dueDate.toISOString().slice(0, 10), utilizationPercent: 32.21, cardsCount: 3 };
  }
}

async function fetchSpendingByCategory(userId) {
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const expenses   = await Expense.find({ userId, date: { $gte: monthStart } }).lean();
    if (!expenses || expenses.length === 0) return DEMO_SPENDING_BY_CATEGORY;

    const catTotals = {};
    expenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + (e.amount || 0);
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
    return DEMO_SPENDING_BY_CATEGORY;
  }
}

// ---------------------------------------------------------------------------
// GET /summary
// ---------------------------------------------------------------------------

router.get('/summary', auth, async (req, res) => {
  try {
    const userId   = req.userId;
    const todayStr = new Date().toISOString().slice(0, 10);

    // Fetch all data sources in parallel; each handles its own errors internally
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
    // Hard fallback — should rarely be reached since each fetcher has its own try/catch
    console.error('[eod] summary error:', err);

    const todayStr = new Date().toISOString().slice(0, 10);
    const now      = new Date();
    const sbiDue   = new Date(now.getFullYear(), now.getMonth(), 5);
    if (sbiDue <= now) sbiDue.setMonth(sbiDue.getMonth() + 1);

    const expenses    = { todayTotal: 320, monthTotal: 17942, topCategory: 'shopping', recentTransactions: DEMO_RECENT_EXPENSES };
    const creditCards = { totalDue: 209360, nextDueDate: sbiDue.toISOString().slice(0, 10), utilizationPercent: 32.21, cardsCount: 3 };
    const { insights, alerts } = buildInsightsAndAlerts({ portfolio: DEMO_PORTFOLIO, expenses, creditCards, marketIndices: DEMO_MARKET_INDICES });

    res.json({
      date:               todayStr,
      portfolio:          DEMO_PORTFOLIO,
      expenses,
      creditCards,
      marketIndices:      DEMO_MARKET_INDICES,
      insights,
      alerts,
      portfolioTrend:     buildPortfolioTrend(DEMO_PORTFOLIO.totalValue),
      spendingByCategory: DEMO_SPENDING_BY_CATEGORY,
    });
  }
});

module.exports = router;
