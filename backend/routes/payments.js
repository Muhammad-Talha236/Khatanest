const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { recordPayment, getPayments, deletePayment } = require('../controllers/paymentController');
const { protect, adminOnly, requireGroup } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect, requireGroup);
router.get('/', getPayments);
router.post('/', adminOnly,
  [body('memberId').notEmpty().withMessage('Member required'),
   body('amount').isFloat({ min: 1 }).withMessage('Valid amount required')],
  validate, recordPayment);
router.delete('/:id', adminOnly, deletePayment);
module.exports = router;
