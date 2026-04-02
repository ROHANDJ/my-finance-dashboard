const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  exchange: {
    type: String,
    required: true
  },
  country: {
    type: String,
    enum: ['US', 'IN', 'UK', 'JP', 'DE', 'CA', 'AU'],
    required: true
  },
  currency: {
    type: String,
    enum: ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
    required: true
  },
  type: {
    type: String,
    enum: ['stock', 'etf', 'mutual_fund', 'bond', 'commodity', 'crypto'],
    default: 'stock'
  },
  sector: String,
  industry: String,
  marketCap: Number,
  currentPrice: {
    type: Number,
    default: 0
  },
  previousClose: {
    type: Number,
    default: 0
  },
  change: {
    type: Number,
    default: 0
  },
  changePercent: {
    type: Number,
    default: 0
  },
  dayHigh: Number,
  dayLow: Number,
  volume: Number,
  avgVolume: Number,
  week52High: Number,
  week52Low: Number,
  beta: Number,
  eps: Number,
  pe: Number,
  dividend: Number,
  dividendYield: Number,
  marketCapCategory: {
    type: String,
    enum: ['large-cap', 'mid-cap', 'small-cap', 'micro-cap']
  },
  description: String,
  website: String,
  employees: Number,
  founded: Date,
  ceo: String,
  headquarters: String,
  priceHistory: [{
    date: Date,
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    volume: Number,
    adjustedClose: Number
  }],
  technicalIndicators: {
    rsi: Number,
    macd: Number,
    bollingerUpper: Number,
    bollingerLower: Number,
    sma20: Number,
    sma50: Number,
    sma200: Number,
    ema12: Number,
    ema26: Number
  },
  fundamentals: {
    revenue: Number,
    revenueGrowth: Number,
    netIncome: Number,
    grossMargin: Number,
    operatingMargin: Number,
    netMargin: Number,
    debtToEquity: Number,
    returnOnEquity: Number,
    returnOnAssets: Number,
    bookValue: Number,
    priceToBook: Number,
    priceToSales: Number
  },
  analysts: {
    rating: {
      strongBuy: Number,
      buy: Number,
      hold: Number,
      sell: Number,
      strongSell: Number
    },
    targetPrice: Number,
    priceTargets: [{
      firm: String,
      target: Number,
      rating: String,
      date: Date
    }]
  },
  news: [{
    title: String,
    url: String,
    source: String,
    publishedAt: Date,
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    summary: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

stockSchema.index({ symbol: 1, exchange: 1 }, { unique: true });
stockSchema.index({ country: 1, sector: 1 });
stockSchema.index({ marketCap: -1 });

stockSchema.methods.calculateChange = function() {
  if (this.previousClose && this.currentPrice) {
    this.change = this.currentPrice - this.previousClose;
    this.changePercent = (this.change / this.previousClose) * 100;
  }
  return this;
};

stockSchema.methods.updateMarketCapCategory = function() {
  if (this.marketCap) {
    if (this.marketCap >= 10000000000) {
      this.marketCapCategory = 'large-cap';
    } else if (this.marketCap >= 2000000000) {
      this.marketCapCategory = 'mid-cap';
    } else if (this.marketCap >= 300000000) {
      this.marketCapCategory = 'small-cap';
    } else {
      this.marketCapCategory = 'micro-cap';
    }
  }
  return this;
};

stockSchema.pre('save', function(next) {
  this.calculateChange();
  this.updateMarketCapCategory();
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Stock', stockSchema);
