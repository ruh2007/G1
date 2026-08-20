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

// ─── MongoDB ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.warn('⚠️  MongoDB connection failed (running without DB):', err.message));
} else {
  console.warn('⚠️  MONGODB_URI not set – running without persistent database.');
}

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express();
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
