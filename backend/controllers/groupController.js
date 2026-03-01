// controllers/groupController.js - Group management
const Group = require('../models/Group');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get group details with members
// @route   GET /api/group
// @access  Private
const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.user.groupId)
      .populate('admin', 'name email')
      .populate('members', 'name email role balance');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add member to group (admin creates account for member)
// @route   POST /api/group/members
// @access  Private (Admin)
const addMember = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create member account
    const member = await User.create({
      name,
      email,
      password,
      role: 'member',
      groupId: req.user.groupId,
    });

    // Add to group
    await Group.findByIdAndUpdate(req.user.groupId, {
      $addToSet: { members: member._id },
    });

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      member: {
        _id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        balance: member.balance,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove member from group
// @route   DELETE /api/group/members/:memberId
// @access  Private (Admin)
const removeMember = async (req, res) => {
  try {
    const member = await User.findById(req.params.memberId);

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (member.balance !== 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot remove member with outstanding balance of Rs. ${member.balance}`,
      });
    }

    // Remove from group
    await Group.findByIdAndUpdate(req.user.groupId, {
      $pull: { members: member._id },
    });

    member.groupId = null;
    member.isActive = false;
    await member.save();

    res.json({ success: true, message: 'Member removed from group' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update group name
// @route   PUT /api/group
// @access  Private (Admin)
const updateGroup = async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.user.groupId,
      { name: req.body.name },
      { new: true, runValidators: true }
    );
    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Monthly reset - archive balances
// @route   POST /api/group/reset
// @access  Private (Admin)
const monthlyReset = async (req, res) => {
  try {
    // Reset all member balances to 0
    await User.updateMany(
      { groupId: req.user.groupId },
      { balance: 0 }
    );

    // Reset group total expenses
    await Group.findByIdAndUpdate(req.user.groupId, { totalExpenses: 0 });

    res.json({ success: true, message: 'Monthly reset completed. All balances cleared.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getGroup, addMember, removeMember, updateGroup, monthlyReset };
