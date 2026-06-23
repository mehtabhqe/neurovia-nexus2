require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const path      = require('path');
const rateLimit = require('express-rate-limit');

const app = express();

// ── SECURITY MIDDLEWARE ────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false
}));

// ── CORS ───────────────────────────────────────────────────
// Accepts all origins listed in ALLOWED_ORIGINS env var
// plus localhost for local development
const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '';
const extraOrigins = rawOrigins
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...extraOrigins,
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000'
];

console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any vercel.app subdomain automatically
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow any render.com subdomain automatically
    if (origin.endsWith('.onrender.com')) return callback(null, true);
    console.warn(`CORS blocked: ${origin}`);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── BODY PARSERS ───────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── RATE LIMITING ──────────────────────────────────────────
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes.'
  }
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests.' }
});

// ── SERVE ADMIN DASHBOARD ──────────────────────────────────
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ── API ROUTES ─────────────────────────────────────────────
app.use('/api/technician', formLimiter,  require('./routes/technician'));
app.use('/api/booking',    formLimiter,  require('./routes/booking'));
app.use('/api/waitlist',   formLimiter,  require('./routes/waitlist'));
app.use('/api/admin',      adminLimiter, require('./routes/admin'));

// ── HEALTH CHECK ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status:  'ok',
    service: 'Neurovia Nexus API',
    version: '1.0.0',
    time:    new Date().toISOString(),
    env:     process.env.NODE_ENV || 'development'
  });
});

// ── API ROOT ───────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Neurovia Nexus API v1.0.0',
    endpoints: {
      health:     'GET  /health',
      technician: 'POST /api/technician/register',
      booking:    'POST /api/booking/submit',
      waitlist:   'POST /api/waitlist/join',
      waitlistCt: 'GET  /api/waitlist/count',
      adminLogin: 'POST /api/admin/login',
      adminDash:  'GET  /admin'
    }
  });
});

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ── GLOBAL ERROR HANDLER ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Internal server error'
  });
});

// ── START ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   Neurovia Nexus API                         ║
║   Port: ${PORT}                                  ║
║   Env:  ${(process.env.NODE_ENV || 'development').padEnd(36)}║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;