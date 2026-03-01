const express = require('express');
const router = express.Router();
const { getBalances, getHistory } = require('../controllers/balanceController');
const { protect, requireGroup } = require('../middleware/auth');

router.use(protect, requireGroup);
router.get('/', getBalances);
router.get('/history', getHistory);
module.exports = router;
