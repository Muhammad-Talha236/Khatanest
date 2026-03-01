const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register',
  [body('name').trim().notEmpty().withMessage('Name is required'),
   body('email').isEmail().withMessage('Valid email required'),
   body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')],
  validate, register);

router.post('/login',
  [body('email').isEmail().withMessage('Valid email required'),
   body('password').notEmpty().withMessage('Password required')],
  validate, login);

router.get('/me', protect, getMe);
module.exports = router;
