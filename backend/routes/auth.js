// routes/auth.js
const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const {
  register, login, getMe,
  updateProfile, changePassword, updatePreferences,
  forgotPassword, resetPassword,
  generateInvite, validateInvite, joinViaInvite,
} = require('../controllers/authController');
const { protect, adminOnly, requireGroup } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// Public
router.post('/register',
  [body('name').trim().notEmpty().withMessage('Name required'), body('email').isEmail(), body('password').isLength({ min: 6 })],
  validate, register);

router.post('/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate, login);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token',
  [body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')],
  validate, resetPassword);

// Invite
router.get('/join/:token',  validateInvite);
router.post('/join/:token',
  [body('name').trim().notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 })],
  validate, joinViaInvite);

// Protected
router.get('/me', protect, getMe);
router.put('/profile',      protect, updateProfile);
router.put('/password',     protect, changePassword);
router.put('/preferences',  protect, updatePreferences);
router.post('/invite',      protect, requireGroup, adminOnly, generateInvite);

module.exports = router;