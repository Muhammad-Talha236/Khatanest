// routes/activity.js
const express = require('express');
const router  = express.Router();
const { getActivity, markSeen, getUnseenCount } = require('../controllers/activityController');
const { protect, requireGroup } = require('../middleware/auth');

router.use(protect, requireGroup);
router.get('/',            getActivity);
router.get('/unseen',      getUnseenCount);
router.put('/mark-seen',   markSeen);

module.exports = router;