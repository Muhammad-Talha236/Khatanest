// models/User.js - User/Member schema
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type    : String,
      required: [true, 'Name is required'],
      trim    : true,
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
      type    : String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select  : false, // Never return password in queries
    },
    role: {
      type   : String,
      enum   : ['admin', 'member'],
      default: 'member',
    },
    // For MEMBERS: negative = owes admin, positive = admin owes member, 0 = settled
    // For ADMIN:   positive = total receivable from members, negative = admin overpaid
    balance: {
      type   : Number,
      default: 0,
    },
    // ADMIN ONLY: Total of admin's OWN share across all expenses he was included in.
    // This is separate from balance (which tracks member receivables only).
    adminShareOwed: {
      type   : Number,
      default: 0,
    },
    // ADMIN ONLY: Total amount admin has actually paid for his own share.
    // Set via "Record My Share" payments with isAdminSelfPayment = true.
    adminSharePaid: {
      type   : Number,
      default: 0,
    },
    groupId: {
      type   : mongoose.Schema.Types.ObjectId,
      ref    : 'Group',
      default: null,
    },
    isActive: {
      type   : Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.index({ groupId: 1, role: 1 });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ groupId: 1, balance: 1 });

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);