// server.js — KhataNest API (Production-ready)
require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cron         = require('node-cron');
const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const Expense      = require('./models/Expense');

// ─── Validate env ─────────────────────────────────────────────────────────────
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRE'];
const missingEnv  = requiredEnv.filter(k => !process.env[k]);
if (missingEnv.length) { console.error(`❌ Missing env: ${missingEnv.join(', ')}`); process.exit(1); }

if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 64) {
  console.error('❌ JWT_SECRET too short for production (min 64 chars)'); process.exit(1);
} else if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET should be at least 32 characters');
}

// ─── App init ─────────────────────────────────────────────────────────────────
const app = express();
connectDB();

// ─── Security middleware ──────────────────────────────────────────────────────
// ✅ NEW: helmet for HTTP headers
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

// ✅ NEW: mongo sanitize (prevent NoSQL injection)
app.use(mongoSanitize());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin     : (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error(`CORS: "${origin}" not allowed`)),
  credentials: true,
  optionsSuccessStatus: 200,
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
// ✅ NEW: auth rate limiter (10 requests per 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max     : 10,
  message : { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders  : false,
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max     : 120,
  message : { success: false, message: 'Too many requests. Please slow down.' },
});

app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/', apiLimiter);

// ─── Request timeout ─────────────────────────────────────────────────────────
app.use((req, res, next) => { req.setTimeout(30000, () => res.status(408).json({ success: false, message: 'Request timeout' })); next(); });

// ─── Logger ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use((req, _res, next) => { console.log(`${new Date().toISOString()} ${req.method} ${req.url}`); next(); });
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/',          (_req, res) => res.json({ message: 'KhataNest API running', status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'KhataNest API is running', environment: process.env.NODE_ENV || 'development', timestamp: new Date() }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/group',    require('./routes/group'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/balances', require('./routes/balances'));
app.use('/api/activity', require('./routes/activity'));  // ✅ NEW

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use(errorHandler);

// ─── Cron jobs ────────────────────────────────────────────────────────────────
const cronSchedule = process.env.CRON_SCHEDULE || '0 0 * * *';

// Auto-clear descriptions
cron.schedule(cronSchedule, async () => {
  try {
    // Use configurable days from group settings (default 21)
    const result = await Expense.aggregate([
      { $lookup: { from: 'groups', localField: 'groupId', foreignField: '_id', as: 'group' } },
      { $unwind: '$group' },
      { $match: { descriptionCleared: false, description: { $ne: '' } } },
      {
        $match: {
          $expr: {
            $lte: [
              '$createdAt',
              { $subtract: [new Date(), { $multiply: [{ $ifNull: ['$group.settings.descriptionClearDays', 21] }, 24 * 60 * 60 * 1000] }] },
            ],
          },
        },
      },
    ]);

    if (result.length > 0) {
      const ids = result.map(r => r._id);
      await Expense.updateMany({ _id: { $in: ids } }, { $set: { description: '', descriptionCleared: true } });
      console.log(`🧹 Auto-cleared ${ids.length} expense description(s)`);
    }

    // ── Auto-create recurring expenses ──────────────────────────
    const today = new Date();
    if (today.getDate() === 1) { // run on 1st of each month
      const recurring = await Expense.find({
        isRecurring: true,
        $or: [{ recurringEndDate: null }, { recurringEndDate: { $gte: today } }],
      }).populate('dividedAmong');

      for (const exp of recurring) {
        const newExp = await Expense.create({
          title       : exp.title,
          description : exp.description,
          amount      : exp.amount,
          paidBy      : exp.paidBy,
          dividedAmong: exp.dividedAmong.map(m => m._id),
          groupId     : exp.groupId,
          date        : new Date(),
          category    : exp.category,
          splitAmount : exp.splitAmount,
          parentExpenseId: exp._id,
        });

        // Apply balances (same as addExpense)
        const splitAmt   = exp.splitAmount;
        const adminId    = exp.paidBy.toString();
        const nonAdmins  = exp.dividedAmong.filter(m => m._id.toString() !== adminId).map(m => m._id);
        if (nonAdmins.length > 0) {
          await require('./models/User').updateMany({ _id: { $in: nonAdmins } }, { $inc: { balance: -splitAmt } });
        }
        const adminIncluded = exp.dividedAmong.some(m => m._id.toString() === adminId);
        const adminUpdate   = { $inc: { balance: parseFloat((splitAmt * nonAdmins.length).toFixed(2)) } };
        if (adminIncluded) adminUpdate.$inc.adminShareOwed = splitAmt;
        await require('./models/User').findByIdAndUpdate(adminId, adminUpdate);

        await require('./models/Group').findByIdAndUpdate(exp.groupId, { $inc: { totalExpenses: exp.amount } });
        await require('./models/Activity').create({ groupId: exp.groupId, actor: exp.paidBy, type: 'recurring_created', meta: { title: exp.title, amount: exp.amount, targetId: newExp._id } });
      }
      if (recurring.length > 0) console.log(`🔄 Created ${recurring.length} recurring expense(s)`);
    }
  } catch (err) {
    console.error('❌ Cron error:', err.message);
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 KhataNest running on port ${PORT}`);
  console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS: ${allowedOrigins.join(', ')}`);
});

module.exports = app;