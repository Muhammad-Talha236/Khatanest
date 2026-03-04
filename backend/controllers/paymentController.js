// controllers/paymentController.js
//
// BALANCE LOGIC SUMMARY:
// ─────────────────────────────────────────────────────────────────────────────
// When an EXPENSE is added (expenseController.js):
//   - Each non-admin member's balance -= splitAmount  (they owe admin)
//   - Admin's balance += (total - his own share)      (receivable from members)
//
// When a MEMBER pays admin back:
//   - Member balance += amount  (debt reduces toward 0)
//   - Admin balance  -= amount  (receivable reduces — he collected it)
//
// When ADMIN records his OWN SHARE payment:
//   - NO balance change at all.
//   - Admin's own share was NEVER counted in his balance at expense creation
//     (adminOwed = total - splitAmount, his share excluded).
//   - Recording it is purely an audit trail entry.
// ─────────────────────────────────────────────────────────────────────────────

const Payment = require('../models/Payment');
const User    = require('../models/User');

// ─── Record a payment ─────────────────────────────────────────────────────────
// @route   POST /api/payments
// @access  Private (Admin)
const recordPayment = async (req, res) => {
  try {
    const { memberId, amount, note, paymentMethod, date } = req.body;

    const adminId            = req.user._id.toString();
    const isAdminSelfPayment = memberId === adminId;

    const payer = await User.findOne({ _id: memberId, groupId: req.user.groupId });
    if (!payer) {
      return res.status(404).json({ success: false, message: 'Person not found in your group' });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    const payment = await Payment.create({
      member            : memberId,
      receivedBy        : req.user._id,
      amount,
      note              : note || '',
      paymentMethod     : paymentMethod || 'cash',
      groupId           : req.user.groupId,
      date              : date || Date.now(),
      isAdminSelfPayment,
    });

    if (isAdminSelfPayment) {
      // ✅ Admin's own share — no balance update needed.
      // His share was already excluded from his balance when the expense was created.
    } else {
      // ✅ Member paying admin back:
      //    member's debt clears, admin's receivable reduces
      await User.findByIdAndUpdate(memberId, { $inc: { balance:  amount } });
      await User.findByIdAndUpdate(adminId,  { $inc: { balance: -amount } });
    }

    const populatedPayment = await Payment
      .findById(payment._id)
      .populate('member',     'name email role')
      .populate('receivedBy', 'name');

    const updatedPayer = await User.findById(memberId).select('balance');

    res.status(201).json({
      success        : true,
      message        : isAdminSelfPayment
        ? `Your share payment of Rs. ${amount} recorded`
        : `Payment of Rs. ${amount} recorded from ${payer.name}`,
      payment        : populatedPayment,
      newPayerBalance: updatedPayer.balance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get all payments ─────────────────────────────────────────────────────────
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, memberId } = req.query;

    const query = { groupId: req.user.groupId };

    if (req.user.role === 'member') {
      query.member = req.user._id;
    } else if (memberId) {
      query.member = memberId;
    }

    const total    = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('member',     'name email role')
      .populate('receivedBy', 'name')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ✅ Monthly total = only actual member payments received, NOT admin self-payments
    const monthlyTotal = await Payment.aggregate([
      {
        $match: {
          groupId           : req.user.groupId,
          date              : { $gte: startOfMonth },
          isAdminSelfPayment: { $ne: true },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success     : true,
      payments,
      monthlyTotal: monthlyTotal[0]?.total || 0,
      pagination  : { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete / reverse a payment ───────────────────────────────────────────────
// @route   DELETE /api/payments/:id
// @access  Private (Admin)
const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.groupId.toString() !== req.user.groupId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (payment.isAdminSelfPayment) {
      // ✅ Admin self-payment was recorded without touching balances,
      //    so reversal also needs no balance change.
    } else {
      // ✅ Reverse a member payment — restore member debt & admin receivable
      await User.findByIdAndUpdate(payment.member,     { $inc: { balance: -payment.amount } });
      await User.findByIdAndUpdate(payment.receivedBy, { $inc: { balance:  payment.amount } });
    }

    await payment.deleteOne();

    res.json({ success: true, message: 'Payment reversed and deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { recordPayment, getPayments, deletePayment };