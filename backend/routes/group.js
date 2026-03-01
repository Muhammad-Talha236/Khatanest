const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getGroup, addMember, removeMember, updateGroup, monthlyReset } = require('../controllers/groupController');
const { protect, adminOnly, requireGroup } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect, requireGroup);
router.get('/', getGroup);
router.put('/', adminOnly, updateGroup);
router.post('/reset', adminOnly, monthlyReset);
router.post('/members', adminOnly,
  [body('name').trim().notEmpty().withMessage('Name required'),
   body('email').isEmail().withMessage('Valid email required'),
   body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')],
  validate, addMember);
router.delete('/members/:memberId', adminOnly, removeMember);
module.exports = router;
