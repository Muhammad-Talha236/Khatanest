// routes/auth.js
const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  generateInvite,
  validateInvite,
  joinViaInvite,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect, adminOnly, requireGroup } = require('../middleware/auth');
const validate = require('../middleware/validate');

// ── Standard auth ──────────────────────────────────────────────────────────
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validate, register,
);

router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate, login,
);

router.get('/me', protect, getMe);

// ── Invite link ────────────────────────────────────────────────────────────
// Admin generates invite link
router.post('/invite', protect, requireGroup, adminOnly, generateInvite);

// Anyone can check if token is valid (GET = just validate, no side effects)
router.get('/join/:token', validateInvite);

// Member self-registers via invite link
router.post('/join/:token',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validate, joinViaInvite,
);

// ── Password reset (email-based — stub until email is configured) ──────────
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;