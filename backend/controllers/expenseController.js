// controllers/expenseController.js - Expense CRUD + balance management
const Expense = require('../models/Expense');
const User = require('../models/User');
const Group = require('../models/Group');

// @desc    Get all expenses for group
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, startDate, endDate } = req.query;

    const query = { groupId: req.user.groupId };

    // Search by title
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('paidBy', 'name')
      .populate('dividedAmong', 'name')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      expenses,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add new expense
// @route   POST /api/expenses
// @access  Private (Admin)
const addExpense = async (req, res) => {
  try {
    const { title, description, amount, dividedAmong, date, category } = req.body;

    // Validate members belong to same group
    const members = await User.find({
      _id: { $in: dividedAmong },
      groupId: req.user.groupId,
    });

    if (members.length !== dividedAmong.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected members do not belong to this group',
      });
    }

    // Create expense
    const expense = await Expense.create({
      title,
      description: description || '',
      amount,
      paidBy: req.user._id,
      dividedAmong,
      groupId: req.user.groupId,
      date: date || Date.now(),
      category: category || 'other',
    });

    // Update each member's balance (they owe their split amount)
    const splitAmount = parseFloat((amount / dividedAmong.length).toFixed(2));

    for (const memberId of dividedAmong) {
      // Skip if paidBy is also in dividedAmong (admin's own share)
      if (memberId.toString() === req.user._id.toString()) continue;

      await User.findByIdAndUpdate(memberId, {
        $inc: { balance: -splitAmount }, // Member owes more
      });
    }

    // Admin balance increases (they're owed the total minus their own share)
    const adminShareCount = dividedAmong.includes(req.user._id.toString()) ? 1 : 0;
    const adminOwed = amount - (adminShareCount * splitAmount);
    if (adminOwed > 0) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { balance: adminOwed },
      });
    }

    // Update group total expenses
    await Group.findByIdAndUpdate(req.user.groupId, {
      $inc: { totalExpenses: amount },
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name')
      .populate('dividedAmong', 'name');

    res.status(201).json({
      success: true,
      message: 'Expense added and balances updated',
      expense: populatedExpense,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private (Admin)
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (expense.groupId.toString() !== req.user.groupId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Reverse old balance changes
    const oldSplit = parseFloat((expense.amount / expense.dividedAmong.length).toFixed(2));

    for (const memberId of expense.dividedAmong) {
      if (memberId.toString() === expense.paidBy.toString()) continue;
      await User.findByIdAndUpdate(memberId, { $inc: { balance: oldSplit } });
    }

    const oldAdminShareCount = expense.dividedAmong.includes(expense.paidBy) ? 1 : 0;
    const oldAdminOwed = expense.amount - (oldAdminShareCount * oldSplit);
    if (oldAdminOwed > 0) {
      await User.findByIdAndUpdate(expense.paidBy, { $inc: { balance: -oldAdminOwed } });
    }

    await Group.findByIdAndUpdate(req.user.groupId, {
      $inc: { totalExpenses: -expense.amount },
    });

    // Update expense fields
    const { title, description, amount, dividedAmong, date, category } = req.body;
    expense.title = title || expense.title;
    expense.description = description !== undefined ? description : expense.description;
    expense.amount = amount || expense.amount;
    expense.dividedAmong = dividedAmong || expense.dividedAmong;
    expense.date = date || expense.date;
    expense.category = category || expense.category;
    await expense.save();

    // Apply new balance changes
    const newSplit = parseFloat((expense.amount / expense.dividedAmong.length).toFixed(2));

    for (const memberId of expense.dividedAmong) {
      if (memberId.toString() === req.user._id.toString()) continue;
      await User.findByIdAndUpdate(memberId, { $inc: { balance: -newSplit } });
    }

    const newAdminShareCount = expense.dividedAmong.includes(req.user._id.toString()) ? 1 : 0;
    const newAdminOwed = expense.amount - (newAdminShareCount * newSplit);
    if (newAdminOwed > 0) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { balance: newAdminOwed } });
    }

    await Group.findByIdAndUpdate(req.user.groupId, {
      $inc: { totalExpenses: expense.amount },
    });

    res.json({ success: true, message: 'Expense updated', expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin)
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (expense.groupId.toString() !== req.user.groupId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Reverse balance changes
    const splitAmount = parseFloat((expense.amount / expense.dividedAmong.length).toFixed(2));

    for (const memberId of expense.dividedAmong) {
      if (memberId.toString() === expense.paidBy.toString()) continue;
      await User.findByIdAndUpdate(memberId, { $inc: { balance: splitAmount } });
    }

    const adminShareCount = expense.dividedAmong.includes(expense.paidBy) ? 1 : 0;
    const adminOwed = expense.amount - (adminShareCount * splitAmount);
    if (adminOwed > 0) {
      await User.findByIdAndUpdate(expense.paidBy, { $inc: { balance: -adminOwed } });
    }

    await Group.findByIdAndUpdate(req.user.groupId, {
      $inc: { totalExpenses: -expense.amount },
    });

    await expense.deleteOne();

    res.json({ success: true, message: 'Expense deleted and balances reversed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get expense stats for dashboard
// @route   GET /api/expenses/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    const groupId = req.user.groupId;

    // Total expenses this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyExpenses = await Expense.aggregate([
      { $match: { groupId: groupId, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Weekly breakdown (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 6);

    const weeklyData = await Expense.aggregate([
      { $match: { groupId: groupId, date: { $gte: last7Days } } },
      {
        $group: {
          _id: { $dayOfWeek: '$date' },
          total: { $sum: '$amount' },
          day: { $first: '$date' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    // Category breakdown
    const categoryData = await Expense.aggregate([
      { $match: { groupId: groupId, date: { $gte: startOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);

    // Member balances
    const members = await User.find({ groupId }).select('name balance role');

    // Total receivable (sum of negative balances = what members owe admin)
    const totalReceivable = members
      .filter((m) => m.balance < 0)
      .reduce((sum, m) => sum + Math.abs(m.balance), 0);

    res.json({
      success: true,
      stats: {
        monthlyTotal: monthlyExpenses[0]?.total || 0,
        totalMembers: members.length,
        totalReceivable,
        weeklyData,
        categoryData,
        memberBalances: members,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getExpenses, addExpense, updateExpense, deleteExpense, getStats };
