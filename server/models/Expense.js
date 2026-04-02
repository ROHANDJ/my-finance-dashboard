const mongoose = require('mongoose');

// Mongoose schema for future MongoDB integration
// Currently the server runs in demo mode; actual data is stored in in-memory arrays in routes/expenses.js

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'shopping', 'entertainment', 'utilities', 'health', 'education', 'other'],
    required: true,
    default: 'other'
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'netbanking'],
    default: 'upi'
  },
  tags: {
    type: [String],
    default: []
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
