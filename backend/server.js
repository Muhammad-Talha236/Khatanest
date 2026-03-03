// server.js - Production-ready KhataNest API
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const Expense = require('./models/Expense');

// ─── Validate Required Environment Variables ──────────────────────────────
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRE'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required env vars: ${missingEnv.join(', ')}`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET should be at least 32 characters for security');
}

// ─── App Init ─────────────────────────────────────────────────────────────
const app = express();

// ─── Connect to MongoDB ───────────────────────────────────────────────────
connectDB();

// ─── CORS Configuration ───────────────────────────────────────────────────
// CLIENT_URL can be a comma-separated list of allowed origins:
//   e.g.  https://khatanest.vercel.app,https://khatanest-git-main.vercel.app
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or tool requests that send no Origin header
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin "${origin}" not allowed`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ─── Core Middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Timeout (30 s) ───────────────────────────────────────────────
app.use((req, res, next) => {
  req.setTimeout(30000, () =>
    res.status(408).json({ success: false, message: 'Request timeout' })
  );
  next();
});

// ─── Request Logger ───────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// ─── Root Health Check (Render pings this to confirm the app is up) ───────
app.get('/', (_req, res) => {
  res.json({ message: 'API is running', status: 'ok' });
});

// ─── API Routes ───────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/group',    require('./routes/group'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/balances', require('./routes/balances'));

// ─── API Health Check ─────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'KhataNest API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date(),
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);

// ─── Cron: Auto-clear expense descriptions older than 21 days ────────────
const cronSchedule = process.env.CRON_SCHEDULE || '0 0 * * *';
cron.schedule(cronSchedule, async () => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 21);
    const result = await Expense.updateMany(
      { createdAt: { $lte: cutoff }, descriptionCleared: false, description: { $ne: '' } },
      { $set: { description: '', descriptionCleared: true } }
    );
    if (result.modifiedCount > 0) {
      console.log(`🧹 Auto-cleared ${result.modifiedCount} expense description(s) (21-day rule)`);
    }
  } catch (err) {
    console.error('❌ Cron job error:', err.message);
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────
// process.env.PORT is injected by Render automatically — never hardcode this
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 KhataNest running on port ${PORT}`);
  console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS origins: ${allowedOrigins.join(', ')}`);
});

module.exports = app;