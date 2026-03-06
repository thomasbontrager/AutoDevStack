/**
 * ColiCode API server
 *
 * Thin Express server that proxies GitHub and OpenAI calls on behalf of the
 * CLI so that API keys are never stored on the developer's machine — only in
 * this server's .env file (or environment).
 *
 * Endpoints:
 *   GET  /health              — liveness check
 *   GET  /api/pr/:owner/:repo/:number   — fetch PR metadata + diff
 *   POST /api/review          — AI-powered code review
 *   POST /api/suggest         — AI code-improvement suggestion
 *   GET  /api/pr/:owner/:repo/:number/insights — combined PR insights
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import prRoutes from './routes/pr.js';
import aiRoutes from './routes/ai.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3100;

// ── Global middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Protected routes ─────────────────────────────────────────────────────────
app.use('/api', authMiddleware);
app.use('/api/pr', prRoutes);
app.use('/api', aiRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ColiCode API]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ColiCode API listening on http://localhost:${PORT}`);
});

export default app;
