require('dotenv').config();
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const mongoose = require('mongoose');
const { initGameLogic } = require('./gameLogic');
const { getGlobalLeaderboard } = require('./playerDb');

// ─── Fault tolerance ─────────────────────────────────────────────────────────
process.on('uncaughtException',  (err)  => console.error('UNCAUGHT:', err));
process.on('unhandledRejection', (r)    => console.error('REJECTION:', r));

const Admin = require('./models/Admin');
const bcrypt = require('bcrypt');

// ─── MongoDB ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
      console.log('✅ MongoDB connected');
      // Seed default admin if not exists
      try {
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
          const defaultEmail = 'arc@gmail.com';
          const defaultPass = 'arcgame';
          const hash = await bcrypt.hash(defaultPass, 10);
          await Admin.create({ email: defaultEmail, passwordHash: hash });
          console.log(`👤 Default admin created: ${defaultEmail}`);
        }
      } catch (err) {
        console.warn('⚠️ Admin seed failed:', err.message);
      }
    })
    .catch(err => console.warn('⚠️  MongoDB connection failed (running without DB):', err.message));
} else {
  console.warn('⚠️  MONGODB_URI not set – running without persistent database.');
}

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express();
const rateLimit = require('express-rate-limit');

// Set up rate limiter: maximum of 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*';
app.use(cors({ origin: ALLOWED_ORIGIN, methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());

// ─── Static ───────────────────────────────────────────────────────────────────
app.use('/audio',  express.static(path.join(__dirname, 'public/audio')));
app.use('/public', express.static(path.join(__dirname, 'public')));

const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
app.use(express.static(FRONTEND_DIST));

// ─── REST API ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Admin login route
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  // Fallback check if DB is disconnected
  if (mongoose.connection.readyState !== 1) {
    if (email.trim().toLowerCase() === 'arc@gmail.com' && password === 'arcgame') {
      return res.json({ success: true, message: 'Admin authenticated (fallback)' });
    }
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  try {
    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    res.json({ success: true, message: 'Admin authenticated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error during authentication' });
  }
});

// Global all-time leaderboard
app.get('/api/leaderboard', async (_req, res) => {
  try {
    const data = await getGlobalLeaderboard(20);
    res.json({ success: true, leaderboard: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Fallback SPA ────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return;
  const indexPath = path.join(FRONTEND_DIST, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('<h1>Guess the Song – Backend Online</h1>');
  }
});

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingTimeout: 20000,
  pingInterval: 15000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6,
});

initGameLogic(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
});
