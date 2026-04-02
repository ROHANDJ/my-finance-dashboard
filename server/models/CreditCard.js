const mongoose = require('mongoose');

// Mongoose schema for future MongoDB integration
// Currently the server runs in demo mode; actual data is stored in in-memory arrays in routes/creditcards.js

const transactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'shopping', 'entertainment', 'utilities', 'health', 'education', 'other'],
    default: 'other'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['debit', 'credit'],
    required: true
  },
  merchantName: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: true });

const creditCardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  cardName: {
    type: String,
    required: true,
    trim: true
  },
  last4Digits: {
    type: String,
    required: true,
    match: /^\d{4}$/
  },
  cardType: {
    type: String,
    enum: ['visa', 'mastercard', 'rupay', 'amex'],
    required: true
  },
  creditLimit: {
    type: Number,
    required: true,
    min: 0
  },
  availableCredit: {
    type: Number,
    required: true,
    min: 0
  },
  billingCycleDate: {
    type: Number,
    min: 1,
    max: 31,
    required: true
  },
  dueDate: {
    type: Number,
    min: 1,
    max: 31,
    required: true
  },
  minimumPayment: {
    type: Number,
    default: 0,
    min: 0
  },
  currentBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  color: {
    type: String,
    match: /^#[0-9A-Fa-f]{6}$/,
    default: '#6366f1'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  transactions: {
    type: [transactionSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

creditCardSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('CreditCard', creditCardSchema);
