require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initGameLogic } = require('./gameLogic');

// Prevent crashes from uncaught errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const app = express();

// ─── CORS ───
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*';
app.use(cors({ origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'] }));
app.use(express.json());

// ─── Serve audio files from /public ───
app.use('/audio', express.static(path.join(__dirname, 'public/audio')));

// ─── Serve built frontend in production ───
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
app.use(express.static(FRONTEND_DIST));

// ─── Health check endpoint ───
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Fallback: serve React app for all non-API routes ───
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return;
  const indexPath = path.join(FRONTEND_DIST, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('<h1>Guess the Song Backend</h1><p>Backend is online!</p>');
  }
});

const server = http.createServer(app);

// ─── Socket.IO with production-safe config ───
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST']
  },
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
