const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountType: {
    type: String,
    enum: ['us', 'indian'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  holdings: [{
    symbol: {
      type: String,
      required: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['stock', 'etf', 'mutual_fund', 'bond', 'commodity'],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    averagePrice: {
      type: Number,
      required: true,
      min: 0
    },
    currentPrice: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      enum: ['USD', 'INR'],
      required: true
    },
    sector: String,
    country: String,
    exchange: String,
    purchaseDate: {
      type: Date,
      required: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    dividends: [{
      amount: Number,
      date: Date,
      currency: String
    }],
    splits: [{
      ratio: Number,
      date: Date,
      adjustedQuantity: Number
    }]
  }],
  transactions: [{
    type: {
      type: String,
      enum: ['buy', 'sell', 'dividend', 'split'],
      required: true
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      enum: ['USD', 'INR'],
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    fees: {
      type: Number,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    notes: String
  }],
  performance: {
    totalInvested: {
      type: Number,
      default: 0
    },
    currentValue: {
      type: Number,
      default: 0
    },
    totalReturns: {
      type: Number,
      default: 0
    },
    totalReturnsPercentage: {
      type: Number,
      default: 0
    },
    dayChange: {
      type: Number,
      default: 0
    },
    dayChangePercentage: {
      type: Number,
      default: 0
    },
    totalDividends: {
      type: Number,
      default: 0
    }
  },
  allocation: {
    sectors: [{
      name: String,
      percentage: Number,
      value: Number
    }],
    countries: [{
      name: String,
      percentage: Number,
      value: Number
    }],
    assets: [{
      type: String,
      percentage: Number,
      value: Number
    }]
  },
  risk: {
    beta: Number,
    volatility: Number,
    sharpeRatio: Number,
    maxDrawdown: Number,
    valueAtRisk: Number
  },
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

portfolioSchema.methods.calculatePerformance = function() {
  let totalInvested = 0;
  let currentValue = 0;
  let totalDividends = 0;

  this.holdings.forEach(holding => {
    const invested = holding.quantity * holding.averagePrice;
    const current = holding.quantity * holding.currentPrice;
    
    totalInvested += invested;
    currentValue += current;
    
    holding.dividends.forEach(dividend => {
      totalDividends += dividend.amount;
    });
  });

  this.performance.totalInvested = totalInvested;
  this.performance.currentValue = currentValue;
  this.performance.totalReturns = currentValue - totalInvested;
  this.performance.totalReturnsPercentage = totalInvested > 0 ? 
    ((currentValue - totalInvested) / totalInvested) * 100 : 0;
  this.performance.totalDividends = totalDividends;

  this.lastUpdated = new Date();
  return this.performance;
};

portfolioSchema.pre('save', function(next) {
  this.calculatePerformance();
  next();
});

module.exports = mongoose.model('Portfolio', portfolioSchema);
