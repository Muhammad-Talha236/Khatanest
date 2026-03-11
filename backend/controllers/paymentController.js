// controllers/paymentController.js
const Payment  = require('../models/Payment');
const User     = require('../models/User');
const Activity = require('../models/Activity');

const recordPayment = async (req, res) => {
  try {
    const { memberId, amount, note, paymentMethod, date } = req.body;
    const adminId            = req.user._id.toString();
    const isAdminSelfPayment = memberId === adminId;

    const payer = await User.findOne({ _id: memberId, groupId: req.user.groupId });
    if (!payer)   return res.status(404).json({ success: false, message: 'Person not found in your group' });
    if (amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });

    const payment = await Payment.create({
      member: memberId, receivedBy: req.user._id,
      amount, note: note || '', paymentMethod: paymentMethod || 'cash',
      groupId: req.user.groupId, date: date || Date.now(), isAdminSelfPayment,
    });

    if (isAdminSelfPayment) {
      await User.findByIdAndUpdate(adminId, { $inc: { adminSharePaid: amount } });
    } else {
      await User.findByIdAndUpdate(memberId, { $inc: { balance:  amount } });
      await User.findByIdAndUpdate(adminId,  { $inc: { balance: -amount } });
    }

    await Activity.create({
      groupId: req.user.groupId,
      actor  : req.user._id,
      type   : 'payment_recorded',
      meta   : {
        amount,
        targetName: payer.name,
        targetId  : payment._id,
        extra     : { isAdminSelfPayment },
      },
    });

    const populated    = await Payment.findById(payment._id).populate('member', 'name email role').populate('receivedBy', 'name');
    const updatedPayer = await User.findById(memberId).select('balance adminSharePaid adminShareOwed');

    res.status(201).json({
      success        : true,
      message        : isAdminSelfPayment ? `Share payment of Rs. ${amount} recorded` : `Payment of Rs. ${amount} from ${payer.name} recorded`,
      payment        : populated,
      newPayerBalance: updatedPayer.balance,
      adminShareInfo : isAdminSelfPayment ? { paid: updatedPayer.adminSharePaid, owed: updatedPayer.adminShareOwed } : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, memberId, type } = req.query;
    const query = { groupId: req.user.groupId };

    if (req.user.role === 'member') query.member = req.user._id;
    else if (memberId)              query.member = memberId;

    if (type === 'member') query.isAdminSelfPayment = { $ne: true };
    else if (type === 'self') query.isAdminSelfPayment = true;

    const total    = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('member', 'name email role avatarColor')
      .populate('receivedBy', 'name')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthlyAgg] = await Payment.aggregate([
      { $match: { groupId: req.user.groupId, date: { $gte: startOfMonth }, isAdminSelfPayment: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    let adminShareSummary = null;
    if (req.user.role === 'admin') {
      const admin = await User.findById(req.user._id).select('adminShareOwed adminSharePaid');
      adminShareSummary = {
        totalOwed: admin.adminShareOwed || 0,
        totalPaid: admin.adminSharePaid || 0,
        remaining: Math.max(0, (admin.adminShareOwed || 0) - (admin.adminSharePaid || 0)),
      };
    }

    res.json({
      success: true, payments,
      monthlyTotal: monthlyAgg?.total || 0,
      adminShareSummary,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.groupId.toString() !== req.user.groupId.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });

    if (payment.isAdminSelfPayment) {
      await User.findByIdAndUpdate(payment.receivedBy, { $inc: { adminSharePaid: -payment.amount } });
    } else {
      await User.findByIdAndUpdate(payment.member,     { $inc: { balance: -payment.amount } });
      await User.findByIdAndUpdate(payment.receivedBy, { $inc: { balance:  payment.amount } });
    }

    await Activity.create({
      groupId: req.user.groupId, actor: req.user._id, type: 'payment_reversed',
      meta: { amount: payment.amount, targetId: payment._id },
    });

    await payment.deleteOne();
    res.json({ success: true, message: 'Payment reversed and deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { recordPayment, getPayments, deletePayment };