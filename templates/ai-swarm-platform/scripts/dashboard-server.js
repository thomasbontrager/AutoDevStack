/**
 * dashboard-server.js — Express + Socket.IO dashboard server
 *
 * Routes:
 *   GET /api/history   — swarm run history
 *   GET /api/analytics — analytics metrics
 *   GET /api/viral     — viral repo list
 *
 * Socket.IO: broadcasts live updates every 30 seconds.
 * Serves static dashboard files from scripts/dashboard/.
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configDir = path.resolve(__dirname, '..', 'config');
const historyDir = path.join(configDir, 'history');
const analyticsPath = path.join(configDir, 'analytics.json');
const viralReposPath = path.join(configDir, 'viral-repos.json');
const dashboardDir = path.join(__dirname, 'dashboard');

const PORT = process.env.PORT || 4000;
const BROADCAST_INTERVAL_MS = parseInt(process.env.BROADCAST_INTERVAL_MS || '30000', 10);

// ─── Simple in-memory rate limiter ───────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000;  // 1 minute
const RATE_LIMIT_MAX = 60;            // requests per window per IP

const rateLimitStore = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitStore.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  entry.count += 1;
  rateLimitStore.set(ip, entry);

  if (entry.count > RATE_LIMIT_MAX) {
    res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Too many requests — please slow down.' });
  }
  return next();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJson(filePath, defaultValue = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return defaultValue;
  }
}

function readHistory() {
  if (!fs.existsSync(historyDir)) return [];
  return fs
    .readdirSync(historyDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 50)
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(historyDir, f), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, { cors: { origin: '*' } });

app.use(express.json());

// Rate limit all API routes
app.use('/api', rateLimit);

// Serve static dashboard
app.use(express.static(dashboardDir));

// ─── API routes ───────────────────────────────────────────────────────────────

app.get('/api/history', (_req, res) => {
  res.json(readHistory());
});

app.get('/api/analytics', (_req, res) => {
  res.json(readJson(analyticsPath, {
    reposCreated: 0,
    prsOpened: 0,
    agentRuns: 0,
    lastRun: null,
    history: [],
  }));
});

app.get('/api/viral', (_req, res) => {
  res.json(readJson(viralReposPath, { repos: [] }));
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Socket.IO live updates ───────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`🔌  Client connected: ${socket.id}`);

  // Send initial data on connect
  socket.emit('analytics', readJson(analyticsPath, {}));
  socket.emit('viral', readJson(viralReposPath, { repos: [] }));
  socket.emit('history', readHistory().slice(0, 10));

  socket.on('disconnect', () => {
    console.log(`🔌  Client disconnected: ${socket.id}`);
  });
});

// Broadcast updates every 30 seconds
setInterval(() => {
  io.emit('analytics', readJson(analyticsPath, {}));
  io.emit('viral', readJson(viralReposPath, { repos: [] }));
  io.emit('history', readHistory().slice(0, 10));
}, BROADCAST_INTERVAL_MS);

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`\n🌐  AI Swarm Dashboard running at http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/analytics`);
  console.log(`   Press Ctrl+C to stop.\n`);
});

export default app;
