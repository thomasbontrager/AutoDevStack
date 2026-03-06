const express = require('express');
const rateLimit = require('express-rate-limit');
const { getProjectById, createDeployment, getDeployments } = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const deployLimiter = rateLimit({ windowMs: 60_000, max: 30 });

// POST /api/deploy  (authenticated)
router.post('/', deployLimiter, authenticateToken, (req, res) => {
  const { projectId, environment } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const project = getProjectById(projectId);
  if (!project || project.owner !== req.user.username) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const env = environment || 'production';
  const VALID_ENVS = ['development', 'staging', 'production'];
  if (!VALID_ENVS.includes(env)) {
    return res.status(400).json({
      error: `Invalid environment "${env}". Valid values: ${VALID_ENVS.join(', ')}`,
    });
  }

  const deployment = {
    id: `deploy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    projectName: project.name,
    environment: env,
    triggeredBy: req.user.username,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };

  createDeployment(deployment);

  res.status(201).json({
    message: `Deployment triggered for project "${project.name}" in ${env}`,
    deployment,
  });
});

// GET /api/deploy  (authenticated) – list deployments for the user's projects
router.get('/', deployLimiter, authenticateToken, (req, res) => {
  const deployments = getDeployments().filter(
    d => {
      const project = getProjectById(d.projectId);
      return project && project.owner === req.user.username;
    }
  );
  res.json({ deployments });
});

module.exports = router;
