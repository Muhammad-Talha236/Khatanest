// models/InviteToken.js - Invite link tokens for self-registration
const mongoose = require('mongoose');
const crypto   = require('crypto');

const inviteTokenSchema = new mongoose.Schema(
  {
    token: {
      type   : String,
      required: true,
      unique  : true,
      default : () => crypto.randomBytes(32).toString('hex'),
    },
    groupId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Group',
      required: true,
    },
    createdBy: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    expiresAt: {
      type   : Date,
      // Default: 7 days from now
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    used: {
      type   : Boolean,
      default: false,
    },
    usedBy: {
      type   : mongoose.Schema.Types.ObjectId,
      ref    : 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-delete expired tokens after expiry (TTL index)
inviteTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Check if token is still valid
inviteTokenSchema.methods.isValid = function () {
  return !this.used && this.expiresAt > new Date();
};

module.exports = mongoose.model('InviteToken', inviteTokenSchema);