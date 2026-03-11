// models/MonthlyArchive.js — Snapshot saved before monthly reset
const mongoose = require('mongoose');

const monthlyArchiveSchema = new mongoose.Schema(
  {
    groupId  : { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    groupName: { type: String, required: true },
    month    : { type: String, required: true }, // "2025-01"
    year     : { type: Number, required: true },
    monthName: { type: String },                 // "January 2025"

    totalExpenses  : { type: Number, default: 0 },
    totalPayments  : { type: Number, default: 0 },
    expenseCount   : { type: Number, default: 0 },
    paymentCount   : { type: Number, default: 0 },

    memberSnapshots: [
      {
        memberId      : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name          : String,
        email         : String,
        role          : String,
        balance       : Number,
        totalOwed     : Number,
        totalPaid     : Number,
        adminShareOwed: Number,
        adminSharePaid: Number,
      },
    ],

    categoryBreakdown: [
      {
        category: String,
        total   : Number,
        count   : Number,
        percent : Number,
      },
    ],

    resetBy  : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resetAt  : { type: Date, default: Date.now },
    notes    : { type: String, default: '' },
  },
  { timestamps: true }
);

monthlyArchiveSchema.index({ groupId: 1, month: -1 });

module.exports = mongoose.model('MonthlyArchive', monthlyArchiveSchema);