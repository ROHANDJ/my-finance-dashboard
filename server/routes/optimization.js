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

const SUGGESTIONS = [
  {
    type: 'diversification',
    priority: 'high',
    title: 'Over-concentration in IT Sector',
    description: 'Your portfolio has 42% allocation in IT stocks (INFY, TCS, WIPRO). A single-sector downturn could significantly impact returns. Consider diversifying into FMCG, banking, or healthcare.',
    potentialImpact: 'Reduce portfolio volatility by ~18% and improve risk-adjusted returns',
    action: 'Reduce IT exposure to 25% and reallocate to FMCG & pharma ETFs'
  },
  {
    type: 'rebalancing',
    priority: 'high',
    title: 'Small-Cap Overweight',
    description: 'Small-cap stocks represent 35% of portfolio vs the recommended 15-20% for a moderate risk profile. Higher allocation increases drawdown risk during market corrections.',
    potentialImpact: 'Smoother returns and lower max drawdown during market stress',
    action: 'Trim small-cap positions gradually and move proceeds to large-cap index fund'
  },
  {
    type: 'tax_saving',
    priority: 'high',
    title: 'Harvest Short-Term Losses',
    description: 'WIPRO is at a 12% unrealised loss. Booking this loss before March 31 can offset capital gains from INFY (+22%) and reduce your FY tax liability.',
    potentialImpact: 'Potential tax saving of ₹8,400–₹12,600 depending on slab',
    action: 'Sell WIPRO (book loss), wait 31 days to avoid wash-sale, then re-enter if outlook improves'
  },
  {
    type: 'opportunity',
    priority: 'medium',
    title: 'Add Defensive Exposure via Gold ETFs',
    description: 'Your portfolio has zero allocation to commodities or gold. Gold typically moves inversely to equities and can act as a hedge during market downturns.',
    potentialImpact: 'Portfolio correlation drops; hedge against INR depreciation and inflation',
    action: 'Allocate 5-7% to Sovereign Gold Bonds or SBI Gold ETF'
  },
  {
    type: 'sip',
    priority: 'medium',
    title: 'Increase SIP Amount to Match Goal',
    description: 'At the current SIP amount (₹10,000/month) and assumed 12% CAGR, you will fall short of your ₹1 Cr corpus goal by age 45 by ~₹18L.',
    potentialImpact: 'Increasing SIP by ₹3,000/month bridges the gap and overshoots the goal by 8%',
    action: 'Step up SIP by ₹3,000/month in a large-cap or flexi-cap fund'
  },
  {
    type: 'expense_reduction',
    priority: 'medium',
    title: 'Reduce Discretionary Spending',
    description: 'Shopping and entertainment together account for 38% of monthly expenses. Reducing this by 20% frees ₹2,400/month that can be invested.',
    potentialImpact: '₹2,400/month invested for 10 years at 12% CAGR = ₹4.45L additional corpus',
    action: 'Set a monthly shopping budget and track against it using the expense tracker'
  },
  {
    type: 'credit_card',
    priority: 'low',
    title: 'Pay Down High-Utilisation Cards First',
    description: 'HDFC Regalia shows 40.5% utilisation. Keeping utilisation below 30% improves credit score and may qualify you for a higher limit or lower interest rate.',
    potentialImpact: 'CIBIL score improvement of 15-30 points over 3 months',
    action: 'Make a partial payment of ₹31,460 to bring utilisation to 30%'
  }
];

const REBALANCING = [
  {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    currentAllocation: 18.5,
    suggestedAllocation: 12.0,
    action: 'sell',
    reason: 'Over-allocated in IT sector; take partial profits after 22% YTD gain'
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    currentAllocation: 15.2,
    suggestedAllocation: 10.0,
    action: 'sell',
    reason: 'Reduce IT concentration; P/E at 28x looks stretched vs historical average'
  },
  {
    symbol: 'WIPRO',
    name: 'Wipro Ltd',
    currentAllocation: 8.3,
    suggestedAllocation: 5.0,
    action: 'sell',
    reason: 'Underperforming peers; book loss for tax harvesting'
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    currentAllocation: 10.1,
    suggestedAllocation: 14.0,
    action: 'buy',
    reason: 'Banking sector recovery play; strong NIMs and credit growth expected'
  },
  {
    symbol: 'SUNPHARMA',
    name: 'Sun Pharmaceutical Industries',
    currentAllocation: 4.2,
    suggestedAllocation: 8.0,
    action: 'buy',
    reason: 'Healthcare under-represented; defensive sector with steady growth'
  },
  {
    symbol: 'NESTLEIND',
    name: 'Nestle India Ltd',
    currentAllocation: 3.5,
    suggestedAllocation: 6.0,
    action: 'buy',
    reason: 'FMCG for stability; consistent dividend payer with strong rural distribution'
  },
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    currentAllocation: 12.4,
    suggestedAllocation: 12.0,
    action: 'hold',
    reason: 'Well-diversified conglomerate; current allocation is appropriate'
  },
  {
    symbol: 'GOLDBEES',
    name: 'Nippon India Gold BeES ETF',
    currentAllocation: 0,
    suggestedAllocation: 5.0,
    action: 'buy',
    reason: 'No gold exposure; add as portfolio hedge and inflation protection'
  }
];

const TAX_OPTIMIZATION = [
  {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    holdingPeriod: 384,
    gain: 48200,
    taxRate: 10,  // LTCG above ₹1L
    suggestion: 'Long-term gain qualifies for 10% LTCG. Consider booking in tranches to stay within ₹1L annual exemption if possible.'
  },
  {
    symbol: 'WIPRO',
    name: 'Wipro Ltd',
    holdingPeriod: 210,
    gain: -14500,
    taxRate: 15,  // STCL
    suggestion: 'Book short-term loss of ₹14,500 before fiscal year-end to offset short-term capital gains from other instruments.'
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    holdingPeriod: 156,
    gain: 12300,
    taxRate: 15,  // STCG
    suggestion: 'If held 9 more months this becomes LTCG taxed at 10%. Consider holding to reduce tax outgo by ~₹614.'
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    holdingPeriod: 420,
    gain: 62800,
    taxRate: 10,
    suggestion: 'Significant LTCG. Book ₹1L worth (exempt) this fiscal year and carry forward remainder to next FY to utilise exemption limit.'
  }
];

const MARKET_OPPORTUNITIES = [
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    reason: 'Strong Q3 results; NIM expansion and asset quality improvement. Banking sector rotation play as rate cycle peaks.',
    currentPrice: 1087.45,
    targetPrice: 1280.00,
    upside: 17.7
  },
  {
    symbol: 'DRREDDY',
    name: 'Dr. Reddy\'s Laboratories',
    reason: 'US generics pipeline gaining approvals; EBITDA margins expanding. Healthcare sector typically outperforms in election years.',
    currentPrice: 6248.30,
    targetPrice: 7100.00,
    upside: 13.6
  },
  {
    symbol: 'NIFTYBEES',
    name: 'Nippon India Nifty BeES ETF',
    reason: 'Low-cost index exposure. India macro story intact; GDP growth 7%+, FII inflows resuming after rate clarity.',
    currentPrice: 226.40,
    targetPrice: 260.00,
    upside: 14.8
  },
  {
    symbol: 'TATAPOWER',
    name: 'Tata Power Company Ltd',
    reason: 'Renewable energy capex cycle; government\'s 500 GW green energy target drives multi-year order book.',
    currentPrice: 418.75,
    targetPrice: 510.00,
    upside: 21.8
  },
  {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Ltd',
    reason: 'NBFC leader with diversified retail loan book. Credit card and EMI finance growth accelerating; valuations corrected 15% from peak.',
    currentPrice: 6892.00,
    targetPrice: 8000.00,
    upside: 16.1
  }
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
