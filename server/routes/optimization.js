const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// ---------------------------------------------------------------------------
// Portfolio Optimization & Profit Improvement Suggestions
//
// All data is static/computed demo data.  In production, wire this up to
// real portfolio holdings, live prices, and a risk-scoring engine.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Demo data helpers
// ---------------------------------------------------------------------------

// Simulate a risk score that varies slightly per request (demo realism)
function getDemoRiskScore() {
  return 6; // 1 = very conservative, 10 = very aggressive
}

function getDemoHealthScore() {
  return 72; // out of 100
}

// Matches TypeScript: SuggestionType = 'diversification'|'risk'|'profit'|'rebalance'|'general'
// Priority uppercase to match priorityConfig keys: 'HIGH'|'MEDIUM'|'LOW'
// potentialImpact is a number (percentage), actionLabel is the CTA string
const SUGGESTIONS = [
  {
    _id: 'sug_001',
    type: 'diversification',
    priority: 'HIGH',
    title: 'Over-concentration in IT Sector',
    description: 'Your portfolio has 42% allocation in IT stocks (INFY, TCS, WIPRO). A single-sector downturn could significantly impact returns. Consider diversifying into FMCG, banking, or healthcare.',
    potentialImpact: 18,
    actionLabel: 'Reduce IT exposure to 25% and reallocate to FMCG & pharma ETFs'
  },
  {
    _id: 'sug_002',
    type: 'rebalance',
    priority: 'HIGH',
    title: 'Small-Cap Overweight',
    description: 'Small-cap stocks represent 35% of portfolio vs the recommended 15-20% for a moderate risk profile. Higher allocation increases drawdown risk during market corrections.',
    potentialImpact: 14,
    actionLabel: 'Trim small-cap positions gradually and move proceeds to large-cap index fund'
  },
  {
    _id: 'sug_003',
    type: 'profit',
    priority: 'HIGH',
    title: 'Harvest Short-Term Losses',
    description: 'WIPRO is at a 12% unrealised loss. Booking this loss before March 31 can offset capital gains from INFY (+22%) and reduce your FY tax liability.',
    potentialImpact: 12,
    actionLabel: 'Sell WIPRO (book loss), wait 31 days, then re-enter if outlook improves'
  },
  {
    _id: 'sug_004',
    type: 'risk',
    priority: 'MEDIUM',
    title: 'Add Defensive Exposure via Gold ETFs',
    description: 'Your portfolio has zero allocation to commodities or gold. Gold typically moves inversely to equities and can act as a hedge during market downturns.',
    potentialImpact: 8,
    actionLabel: 'Allocate 5-7% to Sovereign Gold Bonds or SBI Gold ETF'
  },
  {
    _id: 'sug_005',
    type: 'general',
    priority: 'MEDIUM',
    title: 'Increase SIP Amount to Match Goal',
    description: 'At the current SIP amount (₹10,000/month) and assumed 12% CAGR, you will fall short of your ₹1 Cr corpus goal by age 45 by ~₹18L.',
    potentialImpact: 6,
    actionLabel: 'Step up SIP by ₹3,000/month in a large-cap or flexi-cap fund'
  },
  {
    _id: 'sug_006',
    type: 'general',
    priority: 'MEDIUM',
    title: 'Reduce Discretionary Spending',
    description: 'Shopping and entertainment together account for 38% of monthly expenses. Reducing this by 20% frees ₹2,400/month that can be invested.',
    potentialImpact: 5,
    actionLabel: 'Set a monthly shopping budget and track against it using the expense tracker'
  },
  {
    _id: 'sug_007',
    type: 'risk',
    priority: 'LOW',
    title: 'Pay Down High-Utilisation Cards First',
    description: 'HDFC Regalia shows 40.5% utilisation. Keeping utilisation below 30% improves credit score and may qualify you for a higher limit or lower interest rate.',
    potentialImpact: 3,
    actionLabel: 'Make a partial payment of ₹31,460 to bring utilisation to 30%'
  }
];

// action uppercase to match RebalanceAction = 'BUY'|'SELL'|'HOLD'
// currentPercent/suggestedPercent to match RebalanceRow interface
const REBALANCING = [
  { symbol: 'INFY',      name: 'Infosys Ltd',                    currentPercent: 18.5, suggestedPercent: 12.0, action: 'SELL', reason: 'Over-allocated in IT; take partial profits after 22% YTD gain' },
  { symbol: 'TCS',       name: 'Tata Consultancy Services',       currentPercent: 15.2, suggestedPercent: 10.0, action: 'SELL', reason: 'Reduce IT concentration; P/E at 28x looks stretched' },
  { symbol: 'WIPRO',     name: 'Wipro Ltd',                       currentPercent:  8.3, suggestedPercent:  5.0, action: 'SELL', reason: 'Underperforming peers; book loss for tax harvesting' },
  { symbol: 'HDFCBANK',  name: 'HDFC Bank Ltd',                   currentPercent: 10.1, suggestedPercent: 14.0, action: 'BUY',  reason: 'Banking recovery play; strong NIMs and credit growth' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries',   currentPercent:  4.2, suggestedPercent:  8.0, action: 'BUY',  reason: 'Healthcare under-represented; defensive sector' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd',                currentPercent:  3.5, suggestedPercent:  6.0, action: 'BUY',  reason: 'FMCG for stability; consistent dividend payer' },
  { symbol: 'RELIANCE',  name: 'Reliance Industries Ltd',         currentPercent: 12.4, suggestedPercent: 12.0, action: 'HOLD', reason: 'Well-diversified conglomerate; allocation is appropriate' },
  { symbol: 'GOLDBEES',  name: 'Nippon India Gold BeES ETF',      currentPercent:  0.0, suggestedPercent:  5.0, action: 'BUY',  reason: 'No gold exposure; add as portfolio hedge' },
];

// Matches TaxOpportunity: { _id, symbol, holdingPeriod, unrealizedGainLoss, taxRate, suggestion, potentialTaxSaving }
const TAX_OPTIMIZATION = [
  {
    _id: 'tax_001',
    symbol: 'INFY',
    name: 'Infosys Ltd',
    holdingPeriod: 384,
    unrealizedGainLoss: 48200,
    taxRate: 10,
    potentialTaxSaving: 4820,
    suggestion: 'Long-term gain qualifies for 10% LTCG. Consider booking in tranches to stay within ₹1L annual exemption if possible.'
  },
  {
    _id: 'tax_002',
    symbol: 'WIPRO',
    name: 'Wipro Ltd',
    holdingPeriod: 210,
    unrealizedGainLoss: -14500,
    taxRate: 15,
    potentialTaxSaving: 2175,
    suggestion: 'Book short-term loss of ₹14,500 before fiscal year-end to offset short-term capital gains from other instruments.'
  },
  {
    _id: 'tax_003',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    holdingPeriod: 156,
    unrealizedGainLoss: 12300,
    taxRate: 15,
    potentialTaxSaving: 614,
    suggestion: 'If held 9 more months this becomes LTCG taxed at 10%. Consider holding to reduce tax outgo by ~₹614.'
  },
  {
    _id: 'tax_004',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    holdingPeriod: 420,
    unrealizedGainLoss: 62800,
    taxRate: 10,
    potentialTaxSaving: 6280,
    suggestion: 'Significant LTCG. Book ₹1L worth (exempt) this fiscal year and carry forward remainder to next FY.'
  }
];

// Matches MarketOpportunity: { _id, symbol, name, reason, currentPrice, targetPrice, upsidePercent, sector }
const MARKET_OPPORTUNITIES = [
  { _id: 'opp_001', symbol: 'ICICIBANK',  name: 'ICICI Bank Ltd',                  reason: 'Strong Q3 results; NIM expansion and asset quality improvement.',               currentPrice: 1087.45, targetPrice: 1280.00, upsidePercent: 17.7, sector: 'Banking'    },
  { _id: 'opp_002', symbol: 'DRREDDY',    name: "Dr. Reddy's Laboratories",         reason: 'US generics pipeline gaining approvals; EBITDA margins expanding.',              currentPrice: 6248.30, targetPrice: 7100.00, upsidePercent: 13.6, sector: 'Healthcare' },
  { _id: 'opp_003', symbol: 'NIFTYBEES',  name: 'Nippon India Nifty BeES ETF',      reason: 'Low-cost index exposure. India macro story intact; GDP growth 7%+.',             currentPrice:  226.40, targetPrice:  260.00, upsidePercent: 14.8, sector: 'Index ETF'  },
  { _id: 'opp_004', symbol: 'TATAPOWER',  name: 'Tata Power Company Ltd',           reason: "Renewable energy capex cycle; government's 500 GW green energy target.",        currentPrice:  418.75, targetPrice:  510.00, upsidePercent: 21.8, sector: 'Energy'     },
  { _id: 'opp_005', symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd',                reason: 'NBFC leader; credit card and EMI finance growth accelerating.',                  currentPrice: 6892.00, targetPrice: 8000.00, upsidePercent: 16.1, sector: 'NBFC'       },
];

// ---------------------------------------------------------------------------
// GET /suggestions  –  portfolio optimization payload
// ---------------------------------------------------------------------------

router.get('/suggestions', auth, (req, res) => {
  try {
    const riskScore   = getDemoRiskScore();
    const healthScore = getDemoHealthScore();

    // Filter suggestions by priority if requested
    const { priority, type } = req.query;
    let suggestions = [...SUGGESTIONS];
    if (priority) suggestions = suggestions.filter(s => s.priority === priority);
    if (type)     suggestions = suggestions.filter(s => s.type === type);

    res.json({
      riskScore,
      healthScore,
      healthLabel: healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Poor',
      riskLabel: riskScore <= 3 ? 'Conservative' : riskScore <= 6 ? 'Moderate' : 'Aggressive',
      suggestions,
      rebalancing: REBALANCING,
      taxOptimization: TAX_OPTIMIZATION,
      marketOpportunities: MARKET_OPPORTUNITIES,
      generatedAt: new Date().toISOString(),
      disclaimer: 'These suggestions are for informational purposes only and do not constitute financial advice. Please consult a SEBI-registered investment advisor before making investment decisions.'
    });
  } catch (err) {
    console.error('Optimization suggestions error:', err);
    res.status(500).json({ message: 'Error fetching optimization suggestions' });
  }
});

module.exports = router;
