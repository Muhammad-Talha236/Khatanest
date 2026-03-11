// controllers/expenseController.js
const Expense  = require('../models/Expense');
const User     = require('../models/User');
const Group    = require('../models/Group');
const Activity = require('../models/Activity');

// ─── Helper: apply balance changes ───────────────────────────────────────────
const applyBalanceChanges = async (adminId, dividedAmong, splitAmount, direction = 1) => {
  // direction: +1 = add expense, -1 = reverse
  const nonAdminIds = dividedAmong.filter(id => id.toString() !== adminId.toString());

  // ✅ FIX: single updateMany instead of N+1 loop
  if (nonAdminIds.length > 0) {
    await User.updateMany(
      { _id: { $in: nonAdminIds } },
      { $inc: { balance: -splitAmount * direction } }
    );
  }

  const adminReceivable = parseFloat((splitAmount * nonAdminIds.length).toFixed(2));
  const adminIncluded   = dividedAmong.map(id => id.toString()).includes(adminId.toString());
  const adminUpdate     = { $inc: { balance: adminReceivable * direction } };
  if (adminIncluded) adminUpdate.$inc.adminShareOwed = splitAmount * direction;

  await User.findByIdAndUpdate(adminId, adminUpdate);
  return { adminReceivable, nonAdminIds };
};

// ─── Helper: check budget alert ──────────────────────────────────────────────
const checkBudgetAlert = async (groupId, category, actorId) => {
  try {
    const group = await Group.findById(groupId).select('budgets settings');
    if (!group?.budgets?.length) return;

    const budget = group.budgets.find(b => b.category === category);
    if (!budget) return;

    const now        = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const result     = await Expense.aggregate([
      { $match: { groupId, category, date: { $gte: startMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthTotal = result[0]?.total || 0;
    const pct        = Math.round((monthTotal / budget.limit) * 100);

    if (pct >= budget.alertAt) {
      await Activity.create({
        groupId, actor: actorId, type: 'budget_alert',
        meta: { category, amount: monthTotal, extra: { pct, limit: budget.limit } },
      });
    }
  } catch (_) {}
};

// ─── Get Expenses ─────────────────────────────────────────────────────────────
const getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, startDate, endDate } = req.query;
    const query = { groupId: req.user.groupId };

    if (search)                      query.title    = { $regex: search, $options: 'i' };
    if (category && category !== 'all') query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate)   query.date.$lte = new Date(endDate);
    }

    const total    = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('paidBy', 'name avatarColor')
      .populate('dividedAmong', 'name avatarColor')
      .populate('comments.author', 'name avatarColor')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ success: true, expenses, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit), limit: parseInt(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Add Expense ──────────────────────────────────────────────────────────────
const addExpense = async (req, res) => {
  try {
    const { title, description, dividedAmong, date, category, splitType, customSplits } = req.body;
    const amount = parseFloat(req.body.amount);

    if (isNaN(amount) || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount is required' });
    if (!dividedAmong?.length)        return res.status(400).json({ success: false, message: 'Select at least one member' });

    // Validate members belong to group
    const members = await User.find({ _id: { $in: dividedAmong }, groupId: req.user.groupId });
    if (members.length !== dividedAmong.length) {
      return res.status(400).json({ success: false, message: 'One or more members do not belong to this group' });
    }

    const resolvedSplitType = splitType || 'equal';
    let splitAmount = parseFloat((amount / dividedAmong.length).toFixed(2));
    let resolvedCustomSplits = [];

    // ── Custom splits ────────────────────────────────────────────
    if (resolvedSplitType === 'percentage' && customSplits?.length) {
      const total = customSplits.reduce((s, c) => s + c.value, 0);
      if (Math.abs(total - 100) > 0.01) return res.status(400).json({ success: false, message: 'Percentages must sum to 100' });
      resolvedCustomSplits = customSplits.map(c => ({ ...c, finalAmount: parseFloat(((c.value / 100) * amount).toFixed(2)) }));
    } else if (resolvedSplitType === 'shares' && customSplits?.length) {
      const totalShares = customSplits.reduce((s, c) => s + c.value, 0);
      resolvedCustomSplits = customSplits.map(c => ({ ...c, finalAmount: parseFloat(((c.value / totalShares) * amount).toFixed(2)) }));
    } else if (resolvedSplitType === 'fixed' && customSplits?.length) {
      const totalFixed = customSplits.reduce((s, c) => s + c.value, 0);
      if (Math.abs(totalFixed - amount) > 0.01) return res.status(400).json({ success: false, message: 'Fixed amounts must sum to total expense amount' });
      resolvedCustomSplits = customSplits.map(c => ({ ...c, finalAmount: c.value }));
    }

    const expense = await Expense.create({
      title, description: description || '',
      amount, paidBy: req.user._id,
      dividedAmong, groupId: req.user.groupId,
      date: date || Date.now(), category: category || 'other',
      splitAmount, splitType: resolvedSplitType,
      customSplits: resolvedCustomSplits,
    });

    // ── Balance updates ──────────────────────────────────────────
    if (resolvedSplitType === 'equal') {
      await applyBalanceChanges(req.user._id, dividedAmong, splitAmount, 1);
    } else {
      // Custom splits: each member gets their own finalAmount
      const adminId = req.user._id.toString();
      for (const split of resolvedCustomSplits) {
        if (split.member.toString() !== adminId) {
          await User.findByIdAndUpdate(split.member, { $inc: { balance: -split.finalAmount } });
        } else {
          await User.findByIdAndUpdate(split.member, { $inc: { adminShareOwed: split.finalAmount } });
        }
      }
      const adminReceivable = resolvedCustomSplits
        .filter(s => s.member.toString() !== adminId)
        .reduce((sum, s) => sum + s.finalAmount, 0);
      await User.findByIdAndUpdate(adminId, { $inc: { balance: adminReceivable } });
    }

    await Group.findByIdAndUpdate(req.user.groupId, { $inc: { totalExpenses: amount } });

    // Activity log
    await Activity.create({
      groupId: req.user.groupId, actor: req.user._id, type: 'expense_added',
      meta: { title, amount, category: category || 'other', targetId: expense._id },
    });

    // Budget check
    await checkBudgetAlert(req.user.groupId, category || 'other', req.user._id);

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name avatarColor')
      .populate('dividedAmong', 'name avatarColor');

    res.status(201).json({ success: true, message: 'Expense added & balances updated', expense: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update Expense ───────────────────────────────────────────────────────────
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    if (expense.groupId.toString() !== req.user.groupId.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });

    const adminId = expense.paidBy.toString();

    // ── Reverse old balances ──────────────────────────────────────
    const oldSplit = parseFloat((expense.amount / expense.dividedAmong.length).toFixed(2));
    await applyBalanceChanges(adminId, expense.dividedAmong.map(id => id.toString()), oldSplit, -1);
    await Group.findByIdAndUpdate(req.user.groupId, { $inc: { totalExpenses: -expense.amount } });

    // ── Validate new dividedAmong ────────────────────────────────
    const newDividedAmong = req.body.dividedAmong || expense.dividedAmong;
    const validMembers = await User.find({ _id: { $in: newDividedAmong }, groupId: req.user.groupId });
    if (validMembers.length !== newDividedAmong.length) {
      return res.status(400).json({ success: false, message: 'One or more members do not belong to this group' });
    }

    // ── Update expense ────────────────────────────────────────────
    const newAmount = req.body.amount ? parseFloat(req.body.amount) : expense.amount;
    expense.title        = req.body.title        || expense.title;
    expense.description  = req.body.description !== undefined ? req.body.description : expense.description;
    expense.amount       = newAmount;
    expense.dividedAmong = newDividedAmong;
    expense.date         = req.body.date         || expense.date;
    expense.category     = req.body.category     || expense.category;
    expense.splitAmount  = parseFloat((expense.amount / expense.dividedAmong.length).toFixed(2));
    await expense.save();

    // ── Apply new balances ────────────────────────────────────────
    await applyBalanceChanges(req.user._id, expense.dividedAmong.map(id => id.toString()), expense.splitAmount, 1);
    await Group.findByIdAndUpdate(req.user.groupId, { $inc: { totalExpenses: expense.amount } });

    await Activity.create({
      groupId: req.user.groupId, actor: req.user._id, type: 'expense_updated',
      meta: { title: expense.title, amount: expense.amount, targetId: expense._id },
    });

    res.json({ success: true, message: 'Expense updated', expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete Expense ───────────────────────────────────────────────────────────
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    if (expense.groupId.toString() !== req.user.groupId.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });

    const splitAmount = parseFloat((expense.amount / expense.dividedAmong.length).toFixed(2));
    await applyBalanceChanges(expense.paidBy.toString(), expense.dividedAmong.map(id => id.toString()), splitAmount, -1);
    await Group.findByIdAndUpdate(req.user.groupId, { $inc: { totalExpenses: -expense.amount } });

    await Activity.create({
      groupId: req.user.groupId, actor: req.user._id, type: 'expense_deleted',
      meta: { title: expense.title, amount: expense.amount },
    });

    await expense.deleteOne();
    res.json({ success: true, message: 'Expense deleted and balances reversed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Stats ────────────────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const groupId      = req.user.groupId;
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const last7Days    = new Date(); last7Days.setDate(last7Days.getDate() - 6);

    const [monthlyExpenses, lastMonthExpenses, weeklyData, categoryData, members] = await Promise.all([
      Expense.aggregate([{ $match: { groupId, date: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { groupId, date: { $gte: lastMonth, $lte: endLastMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([
        { $match: { groupId, date: { $gte: last7Days } } },
        { $group: { _id: { $dayOfWeek: '$date' }, total: { $sum: '$amount' }, day: { $first: '$date' } } },
        { $sort: { '_id': 1 } },
      ]),
      Expense.aggregate([{ $match: { groupId, date: { $gte: startOfMonth } } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }]),
      User.find({ groupId }).select('name balance role adminShareOwed adminSharePaid avatarColor'),
    ]);

    const thisMonth = monthlyExpenses[0]?.total || 0;
    const prevMonth = lastMonthExpenses[0]?.total || 0;
    const monthChange = prevMonth > 0 ? Math.round(((thisMonth - prevMonth) / prevMonth) * 100) : 0;

    const totalReceivable = members.filter(m => m.role !== 'admin' && m.balance < 0).reduce((sum, m) => sum + Math.abs(m.balance), 0);
    const adminMember     = members.find(m => m.role === 'admin');
    const adminShareStats = adminMember ? {
      totalOwed: adminMember.adminShareOwed || 0,
      totalPaid: adminMember.adminSharePaid || 0,
      remaining: Math.max(0, (adminMember.adminShareOwed || 0) - (adminMember.adminSharePaid || 0)),
    } : null;

    // Budget usage
    const group   = await require('../models/Group').findById(groupId).select('budgets');
    const budgetStatus = (group?.budgets || []).map(b => {
      const cat = categoryData.find(c => c._id === b.category);
      const spent = cat?.total || 0;
      const pct   = Math.round((spent / b.limit) * 100);
      return { category: b.category, limit: b.limit, spent, pct, alertAt: b.alertAt, overBudget: pct >= 100 };
    });

    if (req.user.role !== 'admin') {
      const myBalance = members.find(m => m._id.toString() === req.user._id.toString());
      return res.json({ success: true, stats: { weeklyData, memberBalances: myBalance ? [myBalance] : [] } });
    }

    res.json({
      success: true,
      stats: {
        monthlyTotal: thisMonth, prevMonthTotal: prevMonth, monthChange,
        totalMembers: members.length, totalReceivable, adminShareStats,
        weeklyData, categoryData, memberBalances: members, budgetStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW: Add Comment to Expense ──────────────────────────────────────────────
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text required' });

    const expense = await Expense.findOne({ _id: req.params.id, groupId: req.user.groupId });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    expense.comments.push({ author: req.user._id, text: text.trim() });
    await expense.save();

    await Activity.create({
      groupId: req.user.groupId, actor: req.user._id, type: 'comment_added',
      meta: { targetId: expense._id, targetName: expense.title },
    });

    const updated = await Expense.findById(expense._id).populate('comments.author', 'name avatarColor');
    res.json({ success: true, comments: updated.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW: Delete Comment ──────────────────────────────────────────────────────
const deleteComment = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, groupId: req.user.groupId });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const comment = expense.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const isOwner = comment.author.toString() === req.user._id.toString();
    if (!isOwner && req.user.role === 'member') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    comment.deleteOne();
    await expense.save();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW: Export CSV ──────────────────────────────────────────────────────────
const exportCSV = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const query = { groupId: req.user.groupId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate)   query.date.$lte = new Date(endDate);
    }
    if (category && category !== 'all') query.category = category;

    const expenses = await Expense.find(query)
      .populate('paidBy', 'name')
      .populate('dividedAmong', 'name')
      .sort({ date: -1 });

    const header = 'Date,Title,Category,Amount,Per Person,Split Count,Paid By,Members\n';
    const rows   = expenses.map(e => [
      new Date(e.date).toISOString().split('T')[0],
      `"${e.title.replace(/"/g, '""')}"`,
      e.category,
      e.amount,
      e.splitAmount?.toFixed(2) || '',
      e.dividedAmong.length,
      `"${e.paidBy?.name || ''}"`,
      `"${e.dividedAmong.map(m => m.name).join('; ')}"`,
    ].join(','));

    const csv = header + rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getExpenses, addExpense, updateExpense, deleteExpense, getStats, addComment, deleteComment, exportCSV };