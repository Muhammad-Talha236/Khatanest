// controllers/authController.js - Authentication logic
const jwt          = require('jsonwebtoken');
const User         = require('../models/User');
const Group        = require('../models/Group');
const InviteToken  = require('../models/InviteToken');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register admin & create group
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, groupName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role: 'admin' });

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
      user: {
        _id    : user._id,
        name   : user.name,
        email  : user.email,
        role   : user.role,
        balance: user.balance,
        groupId: user.groupId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id    : user._id,
        name   : user.name,
        email  : user.email,
        role   : user.role,
        balance: user.balance,
        groupId: user.groupId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('groupId', 'name');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// INVITE LINK SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Admin generates a new invite link
// @route   POST /api/auth/invite
// @access  Private (Admin)
const generateInvite = async (req, res) => {
  try {
    // Invalidate any previous unused tokens for this group
    // (optional: you can allow multiple active tokens)
    await InviteToken.deleteMany({
      groupId : req.user.groupId,
      used    : false,
    });

    const invite = await InviteToken.create({
      groupId  : req.user.groupId,
      createdBy: req.user._id,
    });

    const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:3000';
    const link      = `${clientUrl}/join/${invite.token}`;

    res.status(201).json({
      success  : true,
      message  : 'Invite link generated (valid for 7 days)',
      token    : invite.token,
      link,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Validate invite token (member calls before showing form)
// @route   GET /api/auth/join/:token
// @access  Public
const validateInvite = async (req, res) => {
  try {
    const invite = await InviteToken.findOne({ token: req.params.token })
      .populate('groupId', 'name')
      .populate('createdBy', 'name');

    if (!invite || !invite.isValid()) {
      return res.status(400).json({
        success: false,
        message: invite?.used
          ? 'This invite link has already been used.'
          : 'This invite link is invalid or has expired.',
      });
    }

    res.json({
      success  : true,
      groupName: invite.groupId?.name,
      invitedBy: invite.createdBy?.name,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Member self-registers via invite link
// @route   POST /api/auth/join/:token
// @access  Public
const joinViaInvite = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const invite = await InviteToken.findOne({ token: req.params.token })
      .populate('groupId');

    if (!invite || !invite.isValid()) {
      return res.status(400).json({
        success: false,
        message: invite?.used
          ? 'This invite link has already been used.'
          : 'This invite link is invalid or has expired.',
      });
    }

    // Check email not already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please login instead.' });
    }

    // Create member account
    const member = await User.create({
      name,
      email,
      password,
      role   : 'member',
      groupId: invite.groupId._id,
    });

    // Add to group
    await Group.findByIdAndUpdate(invite.groupId._id, {
      $addToSet: { members: member._id },
    });

    // Mark token as used
    invite.used   = true;
    invite.usedBy = member._id;
    await invite.save();

    const token = generateToken(member._id);

    res.status(201).json({
      success: true,
      message: `Welcome to ${invite.groupId.name}! Account created.`,
      token,
      user: {
        _id    : member._id,
        name   : member.name,
        email  : member.email,
        role   : member.role,
        balance: member.balance,
        groupId: member.groupId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD RESET (Email-based — to be wired up when email is configured)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Request password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    // Email service not configured yet — return friendly message
    // TODO: wire up Nodemailer / SendGrid here when ready
    return res.status(503).json({
      success: false,
      message: 'Email service is not configured yet. Please contact your group admin to reset your password.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password via token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    return res.status(503).json({
      success: false,
      message: 'Email service is not configured yet.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  generateInvite,
  validateInvite,
  joinViaInvite,
  forgotPassword,
  resetPassword,
};