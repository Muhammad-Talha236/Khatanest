// models/Group.js
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type     : String,
      required : [true, 'Group name is required'],
      trim     : true,
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    admin: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    totalExpenses: { type: Number, default: 0 },
    isActive     : { type: Boolean, default: true },

    // ── NEW: Group settings ───────────────────────────────────────
    settings: {
      currency              : { type: String, default: 'PKR' },
      currencySymbol        : { type: String, default: 'Rs.' },
      descriptionClearDays  : { type: Number, default: 21 },
      paymentGraceDays      : { type: Number, default: 7 },
      allowMemberToSeeOthers: { type: Boolean, default: false },
      allowCoAdminExpenses  : { type: Boolean, default: true },
    },

    // ── NEW: Category budgets ─────────────────────────────────────
    budgets: [
      {
        category: {
          type: String,
          enum: ['grocery', 'electricity', 'gas', 'internet', 'water', 'rent', 'other'],
        },
        limit  : { type: Number, required: true },
        alertAt: { type: Number, default: 80 }, // % threshold
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);