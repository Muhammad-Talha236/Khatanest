// models/Activity.js — Activity feed / notification log
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    groupId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Group',
      required: true,
    },
    actor: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'expense_added',
        'expense_updated',
        'expense_deleted',
        'payment_recorded',
        'payment_reversed',
        'member_joined',
        'member_removed',
        'member_promoted',
        'balance_reset',
        'group_updated',
        'budget_alert',
        'recurring_created',
        'comment_added',
      ],
      required: true,
    },
    // Flexible metadata
    meta: {
      title    : String,
      amount   : Number,
      category : String,
      targetId : mongoose.Schema.Types.ObjectId,
      targetName: String,
      extra    : mongoose.Schema.Types.Mixed,
    },
    // Who has seen this notification
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

activitySchema.index({ groupId: 1, createdAt: -1 });
activitySchema.index({ groupId: 1, seenBy: 1 });

// Auto-delete activities older than 90 days
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('Activity', activitySchema);