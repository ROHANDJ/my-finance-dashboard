const mongoose = require('mongoose');

const ipoSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  companyName: {
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
  status: {
    type: String,
    enum: ['upcoming', 'open', 'closed', 'listed', 'cancelled'],
    default: 'upcoming'
  },
  timeline: {
    announcementDate: Date,
    openDate: Date,
    closeDate: Date,
    listingDate: Date,
    allotmentDate: Date,
    refundDate: Date
  },
  offering: {
    totalShares: Number,
    priceRange: {
      min: Number,
      max: Number
    },
    finalPrice: Number,
    totalAmount: Number,
    marketCap: Number
  },
  details: {
    description: String,
    businessOverview: String,
    industry: String,
    sector: String,
    website: String,
    employees: Number,
    founded: Date,
    headquarters: String,
    promoters: [String],
    objectives: [String]
  },
  financials: {
    revenue: [{
      year: Number,
      amount: Number,
      currency: String
    }],
    profit: [{
      year: Number,
      amount: Number,
      currency: String
    }],
    expenses: [{
      year: Number,
      amount: Number,
      currency: String
    }],
    assets: Number,
    liabilities: Number,
    equity: Number
  },
  metrics: {
    pe: Number,
    pb: Number,
    roe: Number,
    debtToEquity: Number,
    eps: Number,
    bookValue: Number
  },
  underwriters: [{
    name: String,
    role: String,
    allocation: Number
  }],
  riskFactors: [String],
  strengths: [String],
  subscription: {
    retail: {
      subscribed: Number,
      total: Number,
      percentage: Number
    },
    nii: {
      subscribed: Number,
      total: Number,
      percentage: Number
    },
    qib: {
      subscribed: Number,
      total: Number,
      percentage: Number
    },
    total: {
      subscribed: Number,
      total: Number,
      percentage: Number
    }
  },
  listing: {
    listingPrice: Number,
    listingGain: Number,
    listingGainPercentage: Number,
    currentPrice: Number,
    dayHigh: Number,
    dayLow: Number,
    volume: Number
  },
  documents: {
    prospectus: String,
    redHerring: String,
    drhp: String,
    rhp: String
  },
  analysis: {
    recommendation: {
      type: String,
      enum: ['subscribe', 'avoid', 'neutral'],
      default: 'neutral'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    pros: [String],
    cons: [String],
    keyHighlights: [String],
    valuation: {
      type: String,
      enum: ['undervalued', 'fair', 'overvalued'],
      default: 'fair'
    }
  },
  news: [{
    title: String,
    url: String,
    source: String,
    publishedAt: Date,
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

ipoSchema.index({ symbol: 1, exchange: 1 }, { unique: true });
ipoSchema.index({ country: 1, status: 1 });
ipoSchema.index({ openDate: 1 });

ipoSchema.methods.calculateSubscriptionPercentage = function() {
  if (this.subscription.total.total > 0) {
    this.subscription.total.percentage = 
      (this.subscription.total.subscribed / this.subscription.total.total) * 100;
  }
  return this;
};

ipoSchema.methods.calculateListingGains = function() {
  if (this.listing.listingPrice && this.offering.finalPrice) {
    this.listing.listingGain = this.listing.listingPrice - this.offering.finalPrice;
    this.listing.listingGainPercentage = 
      (this.listing.listingGain / this.offering.finalPrice) * 100;
  }
  return this;
};

ipoSchema.pre('save', function(next) {
  this.calculateSubscriptionPercentage();
  this.calculateListingGains();
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('IPO', ipoSchema);
