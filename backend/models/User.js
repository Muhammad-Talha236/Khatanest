// models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type     : String,
      required : [true, 'Name is required'],
      trim     : true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type     : String,
      required : [true, 'Email is required'],
      unique   : true,
      lowercase: true,
      trim     : true,
      match    : [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type     : String,
      required : [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select   : false,
    },
    role: {
      type   : String,
      enum   : ['admin', 'co-admin', 'member'],
      default: 'member',
    },
    // For MEMBERS: negative = owes admin, positive = admin owes member
    // For ADMIN:   positive = total receivable from members
    balance: { type: Number, default: 0 },

    // ADMIN ONLY: personal share tracking
    adminShareOwed: { type: Number, default: 0 },
    adminSharePaid: { type: Number, default: 0 },

    // Primary group
    groupId: {
      type   : mongoose.Schema.Types.ObjectId,
      ref    : 'Group',
      default: null,
    },

    isActive: { type: Boolean, default: true },

    // ── NEW: User preferences ─────────────────────────────────────
    preferences: {
      theme           : { type: String, enum: ['dark', 'light'], default: 'dark' },
      currency        : { type: String, default: 'Rs.' },
      emailNotifications: { type: Boolean, default: true },
      dashboardWidgets: {
        showWeeklyChart      : { type: Boolean, default: true },
        showCategoryBreakdown: { type: Boolean, default: true },
        showMemberBalances   : { type: Boolean, default: true },
        showShareTracker     : { type: Boolean, default: true },
      },
    },

    // ── NEW: Avatar color (chosen on register or randomly assigned) ─
    avatarColor: { type: String, default: '#2ECC9A' },

    // ── NEW: Password reset token ─────────────────────────────────
    resetPasswordToken : { type: String, select: false },
    resetPasswordExpire: { type: Date,   select: false },

    // ── NEW: Last seen (for activity) ─────────────────────────────
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt    = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.index({ groupId: 1, role: 1 });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ groupId: 1, balance: 1 });

userSchema.methods.comparePassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);