const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// ---------------------------------------------------------------------------
// End-of-Day (EOD) dashboard aggregation
//
// This route pulls together a comprehensive snapshot of the user's financial
// position at day-end. In demo mode all data is static/computed mock data.
// Once MongoDB is enabled, replace the inline mock objects with actual
// DB queries against Portfolio, Expense, and CreditCard collections.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Static demo snapshots (replace with real queries in production)
// ---------------------------------------------------------------------------

const DEMO_PORTFOLIO = {
  totalValue: 847250,
  dayChange: 9843,
  dayChangePercent: 1.18,
  topGainer: { symbol: 'INFY',  name: 'Infosys Ltd',           change: 3.42 },
  topLoser:  { symbol: 'WIPRO', name: 'Wipro Ltd',             change: -1.87 },
  holdingsCount: 12
};

const DEMO_MARKET = {
  nifty:  { value: 22648.20, change:  243.50, changePercent:  1.09 },
  sensex: { value: 74572.68, change:  782.45, changePercent:  1.06 },
  sp500:  { value:  5204.34, change:   28.12, changePercent:  0.54 },
  nasdaq: { value: 16275.52, change:  145.78, changePercent:  0.90 }
};

// Recent expense transactions (last 5)
const DEMO_RECENT_EXPENSES = [
  { id: 'exp_001', description: 'Lunch at Subway',         category: 'food',          amount: 320,  date: new Date(), paymentMethod: 'upi'  },
  { id: 'exp_006', description: 'Ola cab – office commute',category: 'transport',      amount: 450,  date: new Date(Date.now() - 86400000), paymentMethod: 'upi'  },
  { id: 'exp_012', description: 'Netflix subscription',    category: 'entertainment',  amount: 699,  date: new Date(Date.now() - 2 * 86400000), paymentMethod: 'card' },
  { id: 'exp_016', description: 'Apollo pharmacy',         category: 'health',         amount: 850,  date: new Date(Date.now() - 3 * 86400000), paymentMethod: 'upi'  },
  { id: 'exp_009', description: 'Amazon – USB-C hub',      category: 'shopping',       amount: 1890, date: new Date(Date.now() - 4 * 86400000), paymentMethod: 'card' }
];

// ---------------------------------------------------------------------------
// Helper – derive insights and alerts from current snapshot
// ---------------------------------------------------------------------------

function buildInsightsAndAlerts({ portfolio, expenses, creditCards, market }) {
  const insights = [];
  const alerts   = [];

  // Portfolio insights
  if (portfolio.dayChangePercent > 0) {
    insights.push(`Portfolio is up ${portfolio.dayChangePercent.toFixed(2)}% today (+₹${portfolio.dayChange.toLocaleString('en-IN')})`);
  } else {
    insights.push(`Portfolio is down ${Math.abs(portfolio.dayChangePercent).toFixed(2)}% today (-₹${Math.abs(portfolio.dayChange).toLocaleString('en-IN')})`);
  }
  if (portfolio.topGainer) {
    insights.push(`${portfolio.topGainer.symbol} is your best performer today (+${portfolio.topGainer.change}%)`);
  }

  // Expense insights
  const monthBudget = 40000;
  if (expenses.monthTotal > monthBudget * 0.9) {
    insights.push(`You've used ${((expenses.monthTotal / monthBudget) * 100).toFixed(0)}% of your monthly budget`);
    alerts.push({ type: 'warning', message: `Monthly expenses at ₹${expenses.monthTotal.toLocaleString('en-IN')} – close to budget limit`, action: 'Review Expenses' });
  } else {
    insights.push(`Monthly expenses at ₹${expenses.monthTotal.toLocaleString('en-IN')} – on track`);
  }
  if (expenses.topCategory) {
    insights.push(`Highest spending this month: ${expenses.topCategory}`);
  }

  // Credit card insights
  if (creditCards.utilizationPercent > 50) {
    alerts.push({ type: 'warning', message: `Credit utilisation at ${creditCards.utilizationPercent.toFixed(0)}% – consider a payment`, action: 'Pay Now' });
    insights.push(`Credit card utilisation is ${creditCards.utilizationPercent.toFixed(0)}% – aim to keep it below 30%`);
  } else {
    insights.push(`Credit utilisation at ${creditCards.utilizationPercent.toFixed(0)}% – healthy range`);
    alerts.push({ type: 'success', message: 'Credit utilisation is within healthy limits (< 30%)', action: null });
  }

  // Upcoming due dates
  if (creditCards.nextDueDate) {
    const daysLeft = Math.ceil((new Date(creditCards.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 5 && daysLeft >= 0) {
      alerts.push({ type: 'warning', message: `Credit card due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} – ₹${creditCards.totalDue.toLocaleString('en-IN')}`, action: 'Pay Now' });
      insights.push(`Credit card payment of ₹${creditCards.totalDue.toLocaleString('en-IN')} due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`);
    } else if (daysLeft <= 10) {
      alerts.push({ type: 'info', message: `Credit card payment due in ${daysLeft} days`, action: 'Schedule Payment' });
    }
  }

  // Market alerts
  if (market.nifty.changePercent > 1) {
    alerts.push({ type: 'success', message: `Nifty 50 up ${market.nifty.changePercent.toFixed(2)}% today – market rally`, action: 'View Stocks' });
  } else if (market.nifty.changePercent < -1) {
    alerts.push({ type: 'warning', message: `Nifty 50 down ${Math.abs(market.nifty.changePercent).toFixed(2)}% – market under pressure`, action: 'View Portfolio' });
  }

  // SIP reminder (generic)
  const today = new Date().getDate();
  if (today >= 1 && today <= 5) {
    alerts.push({ type: 'info', message: 'SIP instalment week – verify mutual fund deductions', action: 'View Mutual Funds' });
  }

  return { insights, alerts };
}

// ---------------------------------------------------------------------------
// GET /summary  –  comprehensive EOD snapshot
// ---------------------------------------------------------------------------

router.get('/summary', auth, (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();

    // ── Expenses (demo aggregates) ─────────────────────────────────────────
    const expenses = {
      todayTotal: 320,      // exp_001 only (today)
      monthTotal: 18942,    // sum of demo seed data for current month
      topCategory: 'shopping',
      recentTransactions: DEMO_RECENT_EXPENSES
    };

    // ── Credit cards (demo aggregates) ────────────────────────────────────
    // Next due: SBI card due on 5th of next/current month
    const sbiDueDay = 5;
    let sbiDueDate = new Date(now.getFullYear(), now.getMonth(), sbiDueDay);
    if (sbiDueDate <= now) sbiDueDate.setMonth(sbiDueDate.getMonth() + 1);

    const creditCards = {
      totalDue: 209360,      // sum of currentBalance across 3 demo cards
      nextDueDate: sbiDueDate.toISOString().slice(0, 10),
      utilizationPercent: parseFloat(((209360 / 650000) * 100).toFixed(2)),
      cardsCount: 3
    };

    // ── Derived insights + alerts ──────────────────────────────────────────
    const { insights, alerts } = buildInsightsAndAlerts({
      portfolio: DEMO_PORTFOLIO,
      expenses,
      creditCards,
      market: DEMO_MARKET
    });

    res.json({
      date: todayStr,
      portfolio: DEMO_PORTFOLIO,
      expenses,
      creditCards,
      market: DEMO_MARKET,
      insights,
      alerts
    });
  } catch (err) {
    console.error('EOD summary error:', err);
    res.status(500).json({ message: 'Error fetching EOD summary' });
  }
});

module.exports = router;
