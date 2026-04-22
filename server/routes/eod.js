'use strict';
const express = require('express');
const auth    = require('../middleware/auth');
const router  = express.Router();

// ---------------------------------------------------------------------------
// Static demo data – shaped to match the TypeScript EODSummary interface
// ---------------------------------------------------------------------------

const DEMO_PORTFOLIO = {
  totalValue:       847250,
  dayChange:        9843,
  dayChangePercent: 1.18,
  topGainer:  { symbol: 'INFY',  name: 'Infosys Ltd', changePercent:  3.42 },
  topLoser:   { symbol: 'WIPRO', name: 'Wipro Ltd',   changePercent: -1.87 },
  holdingsCount: 12
};

// marketIndices – array of MarketIndex objects
const DEMO_MARKET_INDICES = [
  { symbol: 'NIFTY50',  name: 'Nifty 50',   value: 22648.20, change:  243.50, changePercent:  1.09 },
  { symbol: 'SENSEX',   name: 'BSE Sensex', value: 74572.68, change:  782.45, changePercent:  1.06 },
  { symbol: 'SP500',    name: 'S&P 500',    value:  5204.34, change:   28.12, changePercent:  0.54 },
  { symbol: 'NASDAQ',   name: 'Nasdaq',     value: 16275.52, change:  145.78, changePercent:  0.90 },
];

// Also keep the object form for internal insight-building
const DEMO_MARKET = {
  nifty:  DEMO_MARKET_INDICES[0],
  sensex: DEMO_MARKET_INDICES[1],
  sp500:  DEMO_MARKET_INDICES[2],
  nasdaq: DEMO_MARKET_INDICES[3],
};

const DEMO_RECENT_EXPENSES = [
  { id: 'exp_001', description: 'Lunch at Subway',          category: 'food',          amount: 320,  date: new Date().toISOString(),                               paymentMethod: 'upi'  },
  { id: 'exp_006', description: 'Ola cab – office commute', category: 'transport',     amount: 450,  date: new Date(Date.now() -     86400000).toISOString(),      paymentMethod: 'upi'  },
  { id: 'exp_012', description: 'Netflix subscription',     category: 'entertainment', amount: 699,  date: new Date(Date.now() - 2 * 86400000).toISOString(),      paymentMethod: 'card' },
  { id: 'exp_016', description: 'Apollo pharmacy',          category: 'health',        amount: 850,  date: new Date(Date.now() - 3 * 86400000).toISOString(),      paymentMethod: 'upi'  },
  { id: 'exp_009', description: 'Amazon – USB-C hub',       category: 'shopping',      amount: 1890, date: new Date(Date.now() - 4 * 86400000).toISOString(),      paymentMethod: 'card' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildInsightsAndAlerts({ portfolio, expenses, creditCards, market }) {
  const rawInsights = [];
  const alerts      = [];

  if (portfolio.dayChangePercent > 0) {
    rawInsights.push({ icon: '📈', text: `Portfolio is up ${portfolio.dayChangePercent.toFixed(2)}% today (+₹${portfolio.dayChange.toLocaleString('en-IN')})`, type: 'positive' });
  } else {
    rawInsights.push({ icon: '📉', text: `Portfolio is down ${Math.abs(portfolio.dayChangePercent).toFixed(2)}% today (-₹${Math.abs(portfolio.dayChange).toLocaleString('en-IN')})`, type: 'negative' });
  }
  if (portfolio.topGainer) {
    rawInsights.push({ icon: '🏆', text: `${portfolio.topGainer.symbol} is your best performer today (+${portfolio.topGainer.changePercent}%)`, type: 'positive' });
  }

  const monthBudget = 40000;
  if (expenses.monthTotal > monthBudget * 0.9) {
    rawInsights.push({ icon: '⚠️', text: `You've used ${((expenses.monthTotal / monthBudget) * 100).toFixed(0)}% of your monthly budget`, type: 'negative' });
    alerts.push({ type: 'warning', message: `Monthly expenses at ₹${expenses.monthTotal.toLocaleString('en-IN')} – close to budget limit`, action: 'Review Expenses' });
  } else {
    rawInsights.push({ icon: '✅', text: `Monthly expenses at ₹${expenses.monthTotal.toLocaleString('en-IN')} – on track`, type: 'positive' });
  }

  if (creditCards.utilizationPercent > 50) {
    alerts.push({ type: 'warning', message: `Credit utilisation at ${creditCards.utilizationPercent.toFixed(0)}% – consider a payment`, action: 'Pay Now' });
    rawInsights.push({ icon: '💳', text: `Credit card utilisation is ${creditCards.utilizationPercent.toFixed(0)}% – aim to keep it below 30%`, type: 'negative' });
  } else {
    rawInsights.push({ icon: '💳', text: `Credit utilisation at ${creditCards.utilizationPercent.toFixed(0)}% – healthy range`, type: 'positive' });
    alerts.push({ type: 'success', message: 'Credit utilisation is within healthy limits (< 30%)', action: null });
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

  if (market.nifty.changePercent > 1) {
    alerts.push({ type: 'success', message: `Nifty 50 up ${market.nifty.changePercent.toFixed(2)}% today – market rally`, action: 'View Stocks' });
  } else if (market.nifty.changePercent < -1) {
    alerts.push({ type: 'warning', message: `Nifty 50 down ${Math.abs(market.nifty.changePercent).toFixed(2)}% – market under pressure`, action: 'View Portfolio' });
  }

  const today = new Date().getDate();
  if (today >= 1 && today <= 5) {
    alerts.push({ type: 'info', message: 'SIP instalment week – verify mutual fund deductions', action: 'View Mutual Funds' });
  }

  const insights = rawInsights.map((ins, i) => ({ id: `ins_${i}`, ...ins }));
  return { insights, alerts };
}

// Generate a realistic intraday portfolio trend (last 7 hours, every 30 min)
function buildPortfolioTrend(baseValue) {
  const trend = [];
  const now   = new Date();
  const steps = 14; // 7 hours × 2 per hour
  for (let i = steps; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 30 * 60 * 1000);
    const noise = (Math.random() - 0.48) * 2000;
    trend.push({
      time:  t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      value: Math.round(baseValue - (i * 700) + noise + (steps - i) * 800),
    });
  }
  return trend;
}

// Spending by category for the pie chart
const DEMO_SPENDING_BY_CATEGORY = [
  { category: 'Shopping',     amount: 6420, color: '#9C27B0' },
  { category: 'Food',         amount: 4380, color: '#FF6B35' },
  { category: 'Transport',    amount: 2150, color: '#4CAF50' },
  { category: 'Entertainment',amount: 1890, color: '#FF9800' },
  { category: 'Health',       amount: 1480, color: '#F44336' },
  { category: 'Utilities',    amount: 1022, color: '#2196F3' },
  { category: 'Other',        amount:  600, color: '#607D8B' },
];

// ---------------------------------------------------------------------------
// GET /summary
// ---------------------------------------------------------------------------

router.get('/summary', auth, (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const expenses = {
      todayTotal: 320,
      monthTotal: 17942,
      topCategory: 'shopping',
      recentTransactions: DEMO_RECENT_EXPENSES,
    };

    const sbiDueDay  = 5;
    let   sbiDueDate = new Date(now.getFullYear(), now.getMonth(), sbiDueDay);
    if (sbiDueDate <= now) sbiDueDate.setMonth(sbiDueDate.getMonth() + 1);

    const creditCards = {
      totalDue:           209360,
      nextDueDate:        sbiDueDate.toISOString().slice(0, 10),
      utilizationPercent: parseFloat(((209360 / 650000) * 100).toFixed(2)),
      cardsCount:         3,
    };

    const { insights, alerts } = buildInsightsAndAlerts({
      portfolio: DEMO_PORTFOLIO,
      expenses,
      creditCards,
      market: DEMO_MARKET,
    });

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
  } catch (err) {
    console.error('EOD summary error:', err);
    res.status(500).json({ message: 'Error fetching EOD summary' });
  }
});

module.exports = router;
