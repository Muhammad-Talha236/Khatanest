// models/Expense.js
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type     : String,
      required : [true, 'Expense title is required'],
      trim     : true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type    : String,
      default : '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    descriptionCleared: { type: Boolean, default: false },

    amount    : { type: Number, required: [true, 'Amount is required'], min: [1, 'Amount > 0'] },
    splitAmount: { type: Number },

    // ── NEW: Custom split support ─────────────────────────────────
    splitType: {
      type   : String,
      enum   : ['equal', 'percentage', 'shares', 'fixed'],
      default: 'equal',
    },
    customSplits: [
      {
        member    : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        value     : Number,   // percent / shares / fixed amount depending on splitType
        finalAmount: Number,  // computed final Rs. amount for this member
      },
    ],

    paidBy      : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dividedAmong: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    groupId     : { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    date        : { type: Date, default: Date.now },
    category    : {
      type   : String,
      enum   : ['grocery', 'electricity', 'gas', 'internet', 'water', 'rent', 'other'],
      default: 'other',
    },

    // ── NEW: Receipt attachment ───────────────────────────────────
    receiptUrl : { type: String, default: null },
    receiptKey : { type: String, default: null }, // for cloud storage deletion

    // ── NEW: Recurring expense fields ─────────────────────────────
    isRecurring     : { type: Boolean, default: false },
    recurringDay    : { type: Number, min: 1, max: 28 }, // day of month
    recurringEndDate: { type: Date },
    parentExpenseId : { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },

    // ── NEW: Comments ─────────────────────────────────────────────
    comments: [
      {
        author   : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text     : { type: String, required: true, maxlength: 300 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Calculate equal split amount before saving
expenseSchema.pre('save', function (next) {
  if (this.splitType === 'equal' && this.dividedAmong?.length > 0) {
    this.splitAmount = parseFloat((this.amount / this.dividedAmong.length).toFixed(2));
  }
  next();
});

expenseSchema.index({ groupId: 1, date: -1 });
expenseSchema.index({ groupId: 1, category: 1 });
expenseSchema.index({ groupId: 1, isRecurring: 1 });

module.exports = mongoose.model('Expense', expenseSchema);