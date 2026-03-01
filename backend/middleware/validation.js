const { body, validationResult } = require('express-validator');

/**
 * Middleware to check validation results and return errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

// ─── Validation Rule Sets ─────────────────────────────────────────

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }).withMessage('Name max 50 chars'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('groupName').optional().trim().notEmpty().withMessage('Group name cannot be empty'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const expenseRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }).withMessage('Title max 100 chars'),
  body('amount').isNumeric().withMessage('Amount must be a number').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  body('dividedAmong').isArray({ min: 1 }).withMessage('Select at least 1 member to split between'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
];

const paymentRules = [
  body('memberId').notEmpty().withMessage('Member is required'),
  body('amount').isNumeric().withMessage('Amount must be a number').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  expenseRules,
  paymentRules,
};
