// controllers/activityController.js
const Activity = require('../models/Activity');

// @route GET /api/activity
const getActivity = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const groupId = req.user.groupId;

    const total      = await Activity.countDocuments({ groupId });
    const activities = await Activity.find({ groupId })
      .populate('actor', 'name avatarColor role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Count unseen for this user
    const unseen = await Activity.countDocuments({ groupId, seenBy: { $ne: req.user._id } });

    res.json({
      success: true,
      activities,
      unseen,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/activity/mark-seen
const markSeen = async (req, res) => {
  try {
    await Activity.updateMany(
      { groupId: req.user.groupId, seenBy: { $ne: req.user._id } },
      { $addToSet: { seenBy: req.user._id } }
    );
    res.json({ success: true, message: 'All marked as seen' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/activity/unseen-count
const getUnseenCount = async (req, res) => {
  try {
    const count = await Activity.countDocuments({
      groupId: req.user.groupId,
      seenBy : { $ne: req.user._id },
    });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getActivity, markSeen, getUnseenCount };