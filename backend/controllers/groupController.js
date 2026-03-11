// controllers/groupController.js
const Group          = require('../models/Group');
const User           = require('../models/User');
const Expense        = require('../models/Expense');
const Payment        = require('../models/Payment');
const MonthlyArchive = require('../models/MonthlyArchive');
const Activity       = require('../models/Activity');
const { format }     = require('date-fns');

// ─── Get Group ───────────────────────────────────────────────────────────────
const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.user.groupId)
      .populate('admin', 'name email avatarColor')
      .populate('members', 'name email role balance avatarColor lastSeen');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update Group ────────────────────────────────────────────────────────────
const updateGroup = async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(req.user.groupId, { name: req.body.name }, { new: true, runValidators: true });
    await Activity.create({ groupId: req.user.groupId, actor: req.user._id, type: 'group_updated', meta: { targetName: req.body.name } });
    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Add Member ──────────────────────────────────────────────────────────────
const addMember = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const COLORS = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];
    const member  = await User.create({
      name, email, password,
      role       : 'member',
      groupId    : req.user.groupId,
      avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
    await Group.findByIdAndUpdate(req.user.groupId, { $addToSet: { members: member._id } });
    await Activity.create({ groupId: req.user.groupId, actor: req.user._id, type: 'member_joined', meta: { targetName: member.name } });

    res.status(201).json({ success: true, message: 'Member added', member: { _id: member._id, name: member.name, email: member.email, role: member.role, balance: member.balance, avatarColor: member.avatarColor } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Remove Member ───────────────────────────────────────────────────────────
const removeMember = async (req, res) => {
  try {
    const member = await User.findById(req.params.memberId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    // ✅ FIX: use tolerance instead of strict equality
    if (Math.abs(member.balance) > 0.01) {
      return res.status(400).json({ success: false, message: `Cannot remove member with outstanding balance of Rs. ${member.balance}` });
    }

    await Group.findByIdAndUpdate(req.user.groupId, { $pull: { members: member._id } });
    member.groupId  = null;
    member.isActive = false;
    await member.save();

    await Activity.create({ groupId: req.user.groupId, actor: req.user._id, type: 'member_removed', meta: { targetName: member.name } });
    res.json({ success: true, message: 'Member removed from group' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW: Promote / Demote Member ────────────────────────────────────────────
const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['member', 'co-admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be member or co-admin' });
    }

    const member = await User.findOne({ _id: req.params.memberId, groupId: req.user.groupId });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    if (member.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot change admin role' });

    member.role = role;
    await member.save();

    await Activity.create({
      groupId: req.user.groupId,
      actor  : req.user._id,
      type   : 'member_promoted',
      meta   : { targetName: member.name, extra: { role } },
    });

    res.json({ success: true, message: `${member.name} is now ${role}`, member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW: Update Group Settings ───────────────────────────────────────────────
const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const group = await Group.findByIdAndUpdate(
      req.user.groupId,
      { $set: { settings } },
      { new: true }
    );
    res.json({ success: true, message: 'Settings updated', settings: group.settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW: Update Budgets ──────────────────────────────────────────────────────
const updateBudgets = async (req, res) => {
  try {
    const { budgets } = req.body;
    const group = await Group.findByIdAndUpdate(
      req.user.groupId,
      { budgets },
      { new: true }
    );
    res.json({ success: true, message: 'Budgets updated', budgets: group.budgets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Monthly Reset WITH Archive ───────────────────────────────────────────────
const monthlyReset = async (req, res) => {
  try {
    const groupId = req.user.groupId;
    const group   = await Group.findById(groupId);
    const members = await User.find({ groupId }).select('name email role balance adminShareOwed adminSharePaid');

    // ── Build archive ────────────────────────────────────────────
    const now           = new Date();
    const monthStr      = format(now, 'yyyy-MM');
    const monthName     = format(now, 'MMMM yyyy');

    // Category breakdown for the month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const categoryData = await Expense.aggregate([
      { $match: { groupId, date: { $gte: startOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const totalExp = categoryData.reduce((s, c) => s + c.total, 0);

    const [expenseStats, paymentStats] = await Promise.all([
      Expense.aggregate([{ $match: { groupId, date: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { groupId, date: { $gte: startOfMonth }, isAdminSelfPayment: { $ne: true } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);

    await MonthlyArchive.create({
      groupId, groupName: group.name,
      month: monthStr, year: now.getFullYear(), monthName,
      totalExpenses: expenseStats[0]?.total || 0,
      totalPayments: paymentStats[0]?.total || 0,
      expenseCount : expenseStats[0]?.count  || 0,
      paymentCount : paymentStats[0]?.count  || 0,
      memberSnapshots: members.map(m => ({
        memberId      : m._id,
        name          : m.name,
        email         : m.email,
        role          : m.role,
        balance       : m.balance,
        totalOwed     : m.adminShareOwed || 0,
        totalPaid     : m.adminSharePaid || 0,
        adminShareOwed: m.adminShareOwed || 0,
        adminSharePaid: m.adminSharePaid || 0,
      })),
      categoryBreakdown: categoryData.map(c => ({
        category: c._id,
        total   : c.total,
        count   : c.count,
        percent : totalExp ? Math.round((c.total / totalExp) * 100) : 0,
      })),
      resetBy: req.user._id,
    });

    // ── Reset all balances ───────────────────────────────────────
    // ✅ FIX: also reset adminShareOwed and adminSharePaid
    await User.updateMany(
      { groupId },
      { balance: 0, adminShareOwed: 0, adminSharePaid: 0 }
    );
    await Group.findByIdAndUpdate(groupId, { totalExpenses: 0 });

    await Activity.create({
      groupId,
      actor: req.user._id,
      type : 'balance_reset',
      meta : { targetName: monthName },
    });

    res.json({ success: true, message: `Monthly reset complete. Archive saved for ${monthName}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW: Get Archive List ────────────────────────────────────────────────────
const getArchives = async (req, res) => {
  try {
    const archives = await MonthlyArchive.find({ groupId: req.user.groupId })
      .sort({ createdAt: -1 })
      .select('month monthName year totalExpenses totalPayments expenseCount memberSnapshots.name memberSnapshots.balance resetAt');
    res.json({ success: true, archives });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── NEW: Get Single Archive ──────────────────────────────────────────────────
const getArchive = async (req, res) => {
  try {
    const archive = await MonthlyArchive.findOne({ _id: req.params.id, groupId: req.user.groupId });
    if (!archive) return res.status(404).json({ success: false, message: 'Archive not found' });
    res.json({ success: true, archive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getGroup, updateGroup,
  addMember, removeMember, updateMemberRole,
  updateSettings, updateBudgets,
  monthlyReset, getArchives, getArchive,
};