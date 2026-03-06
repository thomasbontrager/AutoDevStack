/**
 * AutoDevStack Storage API
 *
 * Exposes REST endpoints for managing cloud workspace storage:
 *
 *   GET  /api/storage                    – list storage records for the user's projects
 *   GET  /api/storage/:projectId         – get storage record for a specific project
 *   POST /api/storage/:projectId/compress – request auto-compression for a project
 *
 * The compression endpoint records a compression job in the database.  Actual
 * on-disk compression is performed by the build server's workspace-compressor
 * module during the build pipeline.
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const {
  getProjectById,
  getStorageRecord,
  getStorageRecordsByOwner,
  updateStorageRecord,
} = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const storageLimiter = rateLimit({ windowMs: 60_000, max: 60 });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a byte count as a human-readable string. */
function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024)      return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

/** Default size threshold: 5 GiB. */
const DEFAULT_THRESHOLD_BYTES = parseInt(
  process.env.COMPRESSION_THRESHOLD || (5 * 1024 * 1024 * 1024),
  10,
);

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/storage  – list storage records for authenticated user's projects
router.get('/', storageLimiter, authenticateToken, (req, res) => {
  const records = getStorageRecordsByOwner(req.user.username);
  res.json({ storage: records });
});

// GET /api/storage/:projectId  – get storage record for a single project
router.get('/:projectId', storageLimiter, authenticateToken, (req, res) => {
  const project = getProjectById(req.params.projectId);
  if (!project || project.owner !== req.user.username) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const record = getStorageRecord(req.params.projectId) || {
    projectId: project.id,
    projectName: project.name,
    owner: project.owner,
    compressionEnabled: true,
    thresholdBytes: DEFAULT_THRESHOLD_BYTES,
    thresholdHuman: formatBytes(DEFAULT_THRESHOLD_BYTES),
    originalSizeBytes: 0,
    compressedSizeBytes: 0,
    ratio: 1,
    status: 'idle',
    lastCompressedAt: null,
  };

  res.json({ storage: record });
});

// POST /api/storage/:projectId/compress  – request compression for a project
router.post('/:projectId/compress', storageLimiter, authenticateToken, (req, res) => {
  const project = getProjectById(req.params.projectId);
  if (!project || project.owner !== req.user.username) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const existing = getStorageRecord(req.params.projectId);

  if (existing && existing.status === 'compressing') {
    return res.status(409).json({ error: 'Compression already in progress for this project' });
  }

  // Accept optional size override (useful for testing / manual triggers)
  const originalSizeBytes = (req.body && req.body.originalSizeBytes)
    ? Number(req.body.originalSizeBytes)
    : (existing ? existing.originalSizeBytes : 0);

  const thresholdBytes = (req.body && req.body.thresholdBytes)
    ? Number(req.body.thresholdBytes)
    : DEFAULT_THRESHOLD_BYTES;

  const jobId = `comp_${crypto.randomUUID()}`;

  const record = {
    projectId: project.id,
    projectName: project.name,
    owner: req.user.username,
    jobId,
    compressionEnabled: true,
    thresholdBytes,
    thresholdHuman: formatBytes(thresholdBytes),
    originalSizeBytes,
    originalSizeHuman: formatBytes(originalSizeBytes),
    compressedSizeBytes: originalSizeBytes,
    compressedSizeHuman: formatBytes(originalSizeBytes),
    ratio: 1,
    status: 'compressing',
    requestedAt: new Date().toISOString(),
    lastCompressedAt: null,
  };

  updateStorageRecord(project.id, record);

  res.status(202).json({
    message: `Compression job queued for project "${project.name}"`,
    jobId,
    storage: record,
  });
});

module.exports = router;
