'use strict';

/**
 * Compression API routes
 *
 * POST /api/compression/analyze   – analyse a project's workspace size
 * POST /api/compression/compress  – trigger auto-compression for a project
 * GET  /api/compression/:projectId – list compression records for a project
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('node:crypto');
const { authenticateToken } = require('../middleware/auth');
const {
  getProjectById,
  getCompressionRecordsByProject,
  upsertCompressionRecord,
} = require('../data/store');
const {
  analyzeProject,
  shouldAutoCompress,
  AUTO_COMPRESS_THRESHOLD_BYTES,
  TARGET_SIZE_BYTES,
} = require('../services/compression');

const router = express.Router();
const compressionLimiter = rateLimit({ windowMs: 60_000, max: 30 });

// ─── POST /api/compression/analyze ───────────────────────────────────────────

router.post('/analyze', compressionLimiter, authenticateToken, (req, res) => {
  const { projectId, projectDir } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const project = getProjectById(projectId);
  if (!project || project.owner !== req.user.username) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // In production the workspace path is resolved from the project record.
  // In dev / test environments the directory may not exist; fall back to the
  // size stored on the project record (0 if never set).
  const dir = projectDir || `/workspaces/${project.id}`;
  let analysis;
  try {
    analysis = analyzeProject(dir);
  } catch {
    const estimatedBytes = project.sizeBytes || 0;
    analysis = {
      sizeBytes: estimatedBytes,
      sizeMB: parseFloat((estimatedBytes / (1024 * 1024)).toFixed(2)),
      sizeGB: parseFloat((estimatedBytes / (1024 * 1024 * 1024)).toFixed(4)),
      needsCompression: shouldAutoCompress(estimatedBytes),
      thresholdBytes: AUTO_COMPRESS_THRESHOLD_BYTES,
      targetBytes: TARGET_SIZE_BYTES,
      estimated: true,
    };
  }

  res.json({ projectId, projectName: project.name, analysis });
});

// ─── POST /api/compression/compress ──────────────────────────────────────────

router.post('/compress', compressionLimiter, authenticateToken, async (req, res) => {
  const { projectId, force } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const project = getProjectById(projectId);
  if (!project || project.owner !== req.user.username) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const estimatedBytes = project.sizeBytes || 0;
  if (!force && !shouldAutoCompress(estimatedBytes)) {
    return res.status(400).json({
      error: `Project size (${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB) is below the ` +
        `auto-compression threshold (${(AUTO_COMPRESS_THRESHOLD_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB). ` +
        'Pass force=true to compress anyway.',
    });
  }

  const record = {
    id: `comp_${crypto.randomUUID()}`,
    projectId,
    projectName: project.name,
    triggeredBy: req.user.username,
    status: 'queued',
    originalBytes: estimatedBytes,
    compressedBytes: null,
    ratio: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  upsertCompressionRecord(record);

  // Kick off compression asynchronously so we can return 202 immediately.
  // In production a background worker / message queue would handle this.
  setImmediate(() => {
    // Simulate compression: target ~0.1% of the original size (1000:1 ratio),
    // capped at TARGET_SIZE_BYTES. For empty projects use TARGET_SIZE_BYTES.
    const compressedBytes = estimatedBytes > 0
      ? Math.min(Math.max(Math.floor(estimatedBytes * 0.001), 1024), TARGET_SIZE_BYTES)
      : TARGET_SIZE_BYTES;
    const ratio = estimatedBytes > 0 ? compressedBytes / estimatedBytes : 0;
    upsertCompressionRecord({
      ...record,
      status: 'completed',
      compressedBytes,
      ratio: parseFloat(ratio.toFixed(6)),
      completedAt: new Date().toISOString(),
    });
  });

  res.status(202).json({
    message: `Compression job accepted for project "${project.name}"`,
    compressionId: record.id,
    status: 'queued',
  });
});

// ─── GET /api/compression/:projectId ─────────────────────────────────────────

router.get('/:projectId', compressionLimiter, authenticateToken, (req, res) => {
  const project = getProjectById(req.params.projectId);
  if (!project || project.owner !== req.user.username) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const records = getCompressionRecordsByProject(req.params.projectId);
  res.json({ projectId: req.params.projectId, records });
});

module.exports = router;
