'use strict';

/**
 * Infrastructure API routes
 *
 * GET  /api/infrastructure/plans          – list available tower plans (public)
 * GET  /api/infrastructure/towers         – list towers owned by the user
 * POST /api/infrastructure/towers         – provision a new tower
 * GET  /api/infrastructure/towers/:id     – get a single tower
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');
const { getTowersByOwner, getTowerById, createTower } = require('../data/store');
const {
  TOWER_PLANS,
  TOWER_PROVISION_TIME_DAYS,
  buildTowerRecord,
} = require('../services/infrastructure');

const router = express.Router();
const infraLimiter = rateLimit({ windowMs: 60_000, max: 30 });

const VALID_REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

// ─── GET /api/infrastructure/plans ───────────────────────────────────────────

router.get('/plans', infraLimiter, (req, res) => {
  const plans = Object.entries(TOWER_PLANS).map(([id, config]) => ({ id, ...config }));
  res.json({ plans, provisionTimeDays: TOWER_PROVISION_TIME_DAYS });
});

// ─── GET /api/infrastructure/towers ──────────────────────────────────────────

router.get('/towers', infraLimiter, authenticateToken, (req, res) => {
  const towers = getTowersByOwner(req.user.username);
  res.json({ towers });
});

// ─── POST /api/infrastructure/towers ─────────────────────────────────────────

router.post('/towers', infraLimiter, authenticateToken, (req, res) => {
  const { plan, region } = req.body;

  if (!plan) {
    return res.status(400).json({ error: 'plan is required' });
  }

  if (!TOWER_PLANS[plan]) {
    return res.status(400).json({
      error: `Invalid plan "${plan}". Valid plans: ${Object.keys(TOWER_PLANS).join(', ')}`,
    });
  }

  if (region && !VALID_REGIONS.includes(region)) {
    return res.status(400).json({
      error: `Invalid region "${region}". Valid regions: ${VALID_REGIONS.join(', ')}`,
    });
  }

  const tower = buildTowerRecord(plan, region, req.user.username);
  createTower(tower);

  res.status(201).json({
    message: `Tower "${tower.name}" is being provisioned in ${tower.region}`,
    tower,
    estimatedReadyDays: TOWER_PROVISION_TIME_DAYS,
  });
});

// ─── GET /api/infrastructure/towers/:id ──────────────────────────────────────

router.get('/towers/:id', infraLimiter, authenticateToken, (req, res) => {
  const tower = getTowerById(req.params.id);
  if (!tower || tower.owner !== req.user.username) {
    return res.status(404).json({ error: 'Tower not found' });
  }
  res.json({ tower });
});

module.exports = router;
