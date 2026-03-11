// routes/group.js
const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const {
  getGroup, updateGroup,
  addMember, removeMember, updateMemberRole,
  updateSettings, updateBudgets,
  monthlyReset, getArchives, getArchive,
} = require('../controllers/groupController');
const { protect, adminOnly, requireGroup } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.use(protect, requireGroup);

router.get('/',           getGroup);
router.put('/',           adminOnly, updateGroup);
router.put('/settings',   adminOnly, updateSettings);
router.put('/budgets',    adminOnly, updateBudgets);
router.post('/reset',     adminOnly, monthlyReset);

// Archives
router.get('/archives',    adminOnly, getArchives);
router.get('/archives/:id', adminOnly, getArchive);

// Members
router.post('/members', adminOnly,
  [body('name').trim().notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 })],
  validate, addMember);
router.delete('/members/:memberId', adminOnly, removeMember);
router.put('/members/:memberId/role', adminOnly,
  [body('role').isIn(['member', 'co-admin']).withMessage('Invalid role')],
  validate, updateMemberRole);

module.exports = router;