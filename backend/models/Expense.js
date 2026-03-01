// models/Expense.js - Expense schema with auto-clear logic
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    // Description auto-clears after 21 days (kept as empty string after clearing)
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Flag to track if description has been auto-cleared
    descriptionCleared: {
      type: Boolean,
      default: false,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    // Amount per person after split
    splitAmount: {
      type: Number,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dividedAmong: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    category: {
      type: String,
      enum: ['grocery', 'electricity', 'gas', 'internet', 'water', 'rent', 'other'],
      default: 'other',
    },
  },
  { timestamps: true }
);

// Calculate split amount before saving
expenseSchema.pre('save', function (next) {
  if (this.dividedAmong && this.dividedAmong.length > 0) {
    this.splitAmount = parseFloat((this.amount / this.dividedAmong.length).toFixed(2));
  }
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
