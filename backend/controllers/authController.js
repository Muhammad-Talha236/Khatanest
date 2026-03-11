// controllers/authController.js
const jwt         = require('jsonwebtoken');
const crypto      = require('crypto');
const User        = require('../models/User');
const Group       = require('../models/Group');
const InviteToken = require('../models/InviteToken');
const Activity    = require('../models/Activity');
const { sendPasswordResetEmail } = require('../utils/emailService');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// ─── Register ────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, groupName } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const COLORS = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];
    const avatarColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    const user = await User.create({ name, email, password, role: 'admin', avatarColor });

    const group = await Group.create({
      name   : groupName || `${name}'s Hostel`,
      admin  : user._id,
      members: [user._id],
    });

    user.groupId = group._id;
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    user.lastSeen = new Date();
    await user.save();

    res.json({ success: true, message: 'Login successful', token: generateToken(user._id), user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Me ──────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('groupId', 'name settings');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW: Update Profile ─────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, avatarColor } = req.body;
    const updates = {};
    if (name)        updates.name        = name.trim();
    if (avatarColor) updates.avatarColor = avatarColor;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, message: 'Profile updated', user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW: Change Password ─────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW: Update Preferences ──────────────────────────────────────────────────
const updatePreferences = async (req, res) => {
  try {
    const { theme, emailNotifications, dashboardWidgets } = req.body;
    const updates = {};

    if (theme)               updates['preferences.theme']               = theme;
    if (emailNotifications !== undefined) updates['preferences.emailNotifications'] = emailNotifications;
    if (dashboardWidgets)    updates['preferences.dashboardWidgets']    = dashboardWidgets;

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
    res.json({ success: true, message: 'Preferences saved', preferences: user.preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Forgot Password // ─── Forgot Password ─────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Security: always return same message
    const successMsg = 'If that email is registered, a reset link has been sent.';

    if (!user) {
      return res.json({ success: true, message: successMsg });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken  = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await user.save();

    const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:3000';
    const resetUrl  = `${clientUrl}/reset-password/${resetToken}`;

    // Send email
    try {
      await sendPasswordResetEmail({
        toEmail: user.email,
        toName : user.name,
        resetUrl,
      });
      console.log(`📧 Password reset email sent to ${user.email}`);
    } catch (emailErr) {
      // If email fails, clear the token so user can try again
      user.resetPasswordToken  = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      console.error('❌ Email send failed:', emailErr.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please check your email configuration.',
        ...(process.env.NODE_ENV === 'development' && { error: emailErr.message }),
      });
    }

    res.json({ success: true, message: successMsg });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// ─── Reset Password ───────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user   = await User.findOne({
      resetPasswordToken : hashed,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    user.password           = password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Invite System ───────────────────────────────────────────────────────────
const generateInvite = async (req, res) => {
  try {
    await InviteToken.deleteMany({ groupId: req.user.groupId, used: false });
    const invite    = await InviteToken.create({ groupId: req.user.groupId, createdBy: req.user._id });
    const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:3000';

    res.status(201).json({
      success  : true,
      message  : 'Invite link generated (valid for 7 days)',
      token    : invite.token,
      link     : `${clientUrl}/join/${invite.token}`,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const validateInvite = async (req, res) => {
  try {
    const invite = await InviteToken.findOne({ token: req.params.token })
      .populate('groupId', 'name')
      .populate('createdBy', 'name');

    if (!invite || !invite.isValid()) {
      return res.status(400).json({
        success: false,
        message: invite?.used ? 'This invite link has already been used.' : 'Invalid or expired invite link.',
      });
    }
    res.json({ success: true, groupName: invite.groupId?.name, invitedBy: invite.createdBy?.name, expiresAt: invite.expiresAt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const joinViaInvite = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const invite = await InviteToken.findOne({ token: req.params.token }).populate('groupId');
    if (!invite || !invite.isValid()) {
      return res.status(400).json({ success: false, message: invite?.used ? 'Link already used.' : 'Invalid or expired link.' });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please login instead.' });
    }

    const COLORS = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];
    const member  = await User.create({
      name, email, password,
      role       : 'member',
      groupId    : invite.groupId._id,
      avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    });

    await Group.findByIdAndUpdate(invite.groupId._id, { $addToSet: { members: member._id } });

    // Log activity
    await Activity.create({
      groupId: invite.groupId._id,
      actor  : member._id,
      type   : 'member_joined',
      meta   : { targetName: member.name },
    });

    invite.used   = true;
    invite.usedBy = member._id;
    await invite.save();

    res.status(201).json({
      success: true,
      message: `Welcome to ${invite.groupId.name}!`,
      token  : generateToken(member._id),
      user   : sanitizeUser(member),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const sanitizeUser = (user) => ({
  _id        : user._id,
  name       : user.name,
  email      : user.email,
  role       : user.role,
  balance    : user.balance,
  groupId    : user.groupId,
  avatarColor: user.avatarColor,
  preferences: user.preferences,
  adminShareOwed: user.adminShareOwed,
  adminSharePaid: user.adminSharePaid,
});

module.exports = {
  register, login, getMe,
  updateProfile, changePassword, updatePreferences,
  forgotPassword, resetPassword,
  generateInvite, validateInvite, joinViaInvite,
};