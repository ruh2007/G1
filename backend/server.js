require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initGameLogic } = require('./gameLogic');

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
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

const server = http.createServer(app);

// ─── Socket.IO with production-safe config ───
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST']
  },
  // Optimised transport: try WebSocket first, fall back to polling
  transports: ['websocket', 'polling'],
  // Tuned for up to 500 concurrent clients
  pingTimeout: 20000,
  pingInterval: 15000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6, // 1 MB max message
});

initGameLogic(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
});
