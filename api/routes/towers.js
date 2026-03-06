/**
 * AutoDevStack Tower Registry
 *
 * A "tower" is a build-server node that can accept build jobs.  Multiple
 * towers form the scalable build infrastructure – adding a new tower makes
 * the cluster immediately larger without downtime.
 *
 * Endpoints:
 *   GET    /api/towers               – list healthy towers (authenticated users)
 *   POST   /api/towers/register      – register a new tower (x-build-secret)
 *   POST   /api/towers/:id/heartbeat – update a tower's heartbeat (x-build-secret)
 *   DELETE /api/towers/:id           – deregister a tower (x-build-secret)
 *
 * Towers authenticate using the same shared BUILD_SECRET used by the build
 * server (x-build-secret header), keeping the user-facing JWT separate from
 * the internal service credential.
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const {
  getTowers,
  getTowerById,
  registerTower,
  updateTower,
  deregisterTower,
} = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const towersLimiter = rateLimit({ windowMs: 60_000, max: 120 });

const BUILD_SECRET = process.env.BUILD_SECRET || 'dev-build-secret';

/** Validate the x-build-secret header using a constant-time comparison. */
function validateBuildSecret(req, res) {
  const provided = req.headers['x-build-secret'] || '';
  const expected = BUILD_SECRET;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Unauthorized – invalid build secret' });
    return false;
  }
  return true;
}

/** Mark towers as unhealthy if their last heartbeat is too old (> 2 minutes). */
function applyHealthCheck(towers) {
  const cutoff = Date.now() - 2 * 60 * 1000;
  return towers.map(t => ({
    ...t,
    healthy: t.lastHeartbeatAt
      ? new Date(t.lastHeartbeatAt).getTime() > cutoff
      : false,
  }));
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/towers  – list all towers (authenticated)
router.get('/', towersLimiter, authenticateToken, (req, res) => {
  const towers = applyHealthCheck(getTowers());
  res.json({ towers });
});

// POST /api/towers/register  – register a new tower (x-build-secret)
router.post('/register', towersLimiter, (req, res) => {
  if (!validateBuildSecret(req, res)) return;

  const { url, region, metadata } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  // Validate URL format
  try {
    new URL(url); // throws if invalid
  } catch {
    return res.status(400).json({ error: 'url must be a valid URL' });
  }

  const tower = {
    id: `tower_${crypto.randomUUID()}`,
    url,
    region: region || 'default',
    metadata: metadata || {},
    status: 'healthy',
    activeJobs: 0,
    registeredAt: new Date().toISOString(),
    lastHeartbeatAt: new Date().toISOString(),
  };

  registerTower(tower);

  res.status(201).json({
    message: 'Tower registered successfully',
    tower,
  });
});

// POST /api/towers/:id/heartbeat  – update a tower's heartbeat (x-build-secret)
router.post('/:id/heartbeat', towersLimiter, (req, res) => {
  if (!validateBuildSecret(req, res)) return;

  const tower = getTowerById(req.params.id);
  if (!tower) {
    return res.status(404).json({ error: 'Tower not found' });
  }

  const { activeJobs, status } = req.body || {};

  const updated = updateTower(tower.id, {
    lastHeartbeatAt: new Date().toISOString(),
    ...(activeJobs !== undefined ? { activeJobs: Number(activeJobs) } : {}),
    ...(status ? { status } : {}),
  });

  res.json({ message: 'Heartbeat recorded', tower: updated });
});

// DELETE /api/towers/:id  – deregister a tower (x-build-secret)
router.delete('/:id', towersLimiter, (req, res) => {
  if (!validateBuildSecret(req, res)) return;

  const removed = deregisterTower(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: 'Tower not found' });
  }

  res.json({ message: `Tower "${removed.id}" deregistered`, tower: removed });
});

module.exports = router;
