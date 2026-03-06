#!/usr/bin/env node

/**
 * Dashboard Server
 *
 * Express server with Socket.IO for live swarm dashboard
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const DASHBOARD_DIR = path.join(__dirname, 'dashboard');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static(DASHBOARD_DIR));

// API Routes

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/history', async (req, res) => {
  try {
    const historyDir = path.join(CONFIG_DIR, 'history');
    const files = await fs.readdir(historyDir);

    const history = await Promise.all(
      files.map(async file => {
        const content = await fs.readFile(path.join(historyDir, file), 'utf-8');
        return {
          filename: file,
          config: JSON.parse(content),
        };
      })
    );

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const analyticsPath = path.join(CONFIG_DIR, 'analytics.json');
    const content = await fs.readFile(analyticsPath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (error) {
    res.json({
      message: 'No analytics available yet. Run the swarm first.',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api/viral', async (req, res) => {
  try {
    const viralPath = path.join(CONFIG_DIR, 'viral-repos.json');
    const content = await fs.readFile(viralPath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/config/:env', async (req, res) => {
  try {
    const { env } = req.params;
    const configPath = path.join(CONFIG_DIR, `${env}.json`);
    const content = await fs.readFile(configPath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (error) {
    res.status(404).json({ error: 'Config not found' });
  }
});

// Socket.IO for live updates

io.on('connection', socket => {
  console.log('📡 Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('📡 Client disconnected:', socket.id);
  });

  // Send initial data
  socket.emit('connected', { message: 'Connected to AI Swarm Platform' });
});

// Watch for file changes and emit updates
async function watchConfigChanges() {
  const analyticsPath = path.join(CONFIG_DIR, 'analytics.json');

  let lastMtime = null;

  setInterval(async () => {
    try {
      const stats = await fs.stat(analyticsPath);

      if (!lastMtime || stats.mtime.getTime() !== lastMtime) {
        lastMtime = stats.mtime.getTime();

        const content = await fs.readFile(analyticsPath, 'utf-8');
        const analytics = JSON.parse(content);

        io.emit('analytics-update', analytics);
        console.log('📊 Analytics update broadcast to clients');
      }
    } catch (error) {
      // File doesn't exist yet
    }
  }, 5000);
}

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🌐 AI Swarm Platform Dashboard');
  console.log('='.repeat(60));
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 API Endpoints:`);
  console.log(`   - GET  /api/health`);
  console.log(`   - GET  /api/analytics`);
  console.log(`   - GET  /api/history`);
  console.log(`   - GET  /api/viral`);
  console.log(`   - GET  /api/config/:env`);
  console.log(`\n💡 WebSocket enabled for live updates`);
  console.log('='.repeat(60) + '\n');

  watchConfigChanges();
});

export default app;
