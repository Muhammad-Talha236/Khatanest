// controllers/balanceController.js - Balance & settlement logic
const User = require('../models/User');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');

// @desc    Get all member balances with transaction history
// @route   GET /api/balances
// @access  Private
const getBalances = async (req, res) => {
  try {
    const members = await User.find({ groupId: req.user.groupId })
      .select('name email role balance');

    const totalReceivable = members
      .filter(m => m.balance < 0)
      .reduce((sum, m) => sum + Math.abs(m.balance), 0);

    const totalPayable = members
      .filter(m => m.balance > 0 && m.role !== 'admin')
      .reduce((sum, m) => sum + m.balance, 0);

    // Settlement suggestions using greedy algorithm
    const debtors = members.filter(m => m.balance < 0 && m.role !== 'admin')
      .map(m => ({ id: m._id, name: m.name, amount: Math.abs(m.balance) }));

    const creditors = members.filter(m => m.balance > 0 && m.role === 'admin')
      .map(m => ({ id: m._id, name: m.name, amount: m.balance }));

    const settlements = [];
    let i = 0, j = 0;
    const d = debtors.map(d => ({ ...d }));
    const c = creditors.map(c => ({ ...c }));

    while (i < d.length && j < c.length) {
      const amount = Math.min(d[i].amount, c[j].amount);
      if (amount > 0) {
        settlements.push({
          from: d[i].name,
          fromId: d[i].id,
          to: c[j].name,
          toId: c[j].id,
          amount: parseFloat(amount.toFixed(2)),
        });
      }
      d[i].amount -= amount;
      c[j].amount -= amount;
      if (d[i].amount === 0) i++;
      if (c[j].amount === 0) j++;
    }

    res.json({
      success: true,
      members,
      summary: { totalReceivable, totalPayable },
      settlements,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get transaction history (expenses + payments combined)
// @route   GET /api/balances/history
// @access  Private
const getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const groupId = req.user.groupId;

    // For members, only show their relevant transactions
    const expenseQuery = req.user.role === 'member'
      ? { groupId, dividedAmong: req.user._id }
      : { groupId };

    const paymentQuery = req.user.role === 'member'
      ? { groupId, member: req.user._id }
      : { groupId };

    const expenses = await Expense.find(expenseQuery)
      .populate('paidBy', 'name')
      .populate('dividedAmong', 'name')
      .select('title description descriptionCleared amount splitAmount date category dividedAmong paidBy');

    const payments = await Payment.find(paymentQuery)
      .populate('member', 'name')
      .populate('receivedBy', 'name');

    // Combine and sort by date
    const combined = [
      ...expenses.map(e => ({
        type: 'expense',
        _id: e._id,
        title: e.title,
        description: e.descriptionCleared ? '(Description cleared after 21 days)' : e.description,
        amount: e.amount,
        splitAmount: e.splitAmount,
        date: e.date,
        category: e.category,
        paidBy: e.paidBy,
        dividedAmong: e.dividedAmong,
      })),
      ...payments.map(p => ({
        type: 'payment',
        _id: p._id,
        title: `Payment from ${p.member?.name}`,
        description: p.note,
        amount: p.amount,
        date: p.date,
        member: p.member,
        receivedBy: p.receivedBy,
        paymentMethod: p.paymentMethod,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = combined.length;
    const paginated = combined.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      history: paginated,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBalances, getHistory };
