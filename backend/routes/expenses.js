const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getExpenses, addExpense, updateExpense, deleteExpense, getStats } = require('../controllers/expenseController');
const { protect, adminOnly, requireGroup } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect, requireGroup);
router.get('/stats', getStats);
router.get('/', getExpenses);
router.post('/', adminOnly,
  [body('title').trim().notEmpty().withMessage('Title required'),
   body('amount').isFloat({ min: 1 }).withMessage('Valid amount required'),
   body('dividedAmong').isArray({ min: 1 }).withMessage('Select at least one member')],
  validate, addExpense);
router.put('/:id', adminOnly, updateExpense);
router.delete('/:id', adminOnly, deleteExpense);
module.exports = router;
