const express = require('express');
const rateLimit = require('express-rate-limit');
const { getProjectById, createDeployment, getDeployments, updateDeployment } = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const deployLimiter = rateLimit({ windowMs: 60_000, max: 30 });

/** Validate that a string looks like a plausible Git URL. */
function isValidGitUrl(url) {
  return (
    /^https?:\/\/[\w./:@%-]+(\.git)?$/.test(url) ||
    /^git@[\w.-]+:[\w./-]+(\.git)?$/.test(url) ||
    /^git:\/\/[\w./:@-]+(\.git)?$/.test(url)
  );
}

// POST /api/deploy  (authenticated)
router.post('/', deployLimiter, authenticateToken, async (req, res) => {
  const { projectId, environment, gitUrl } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  if (gitUrl !== undefined && !isValidGitUrl(gitUrl)) {
    return res.status(400).json({ error: 'Invalid gitUrl format' });
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
    gitUrl: gitUrl || null,
    buildUrl: null,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };

  createDeployment(deployment);

  // If a gitUrl was provided, forward the job to the build server
  if (gitUrl) {
    const buildServerUrl = process.env.BUILD_SERVER_URL || 'http://localhost:5000';
    const buildSecret = process.env.BUILD_SECRET || 'dev-build-secret';

    // Fire-and-forget – don't block the HTTP response waiting for the build
    (async () => {
      try {
        const response = await fetch(`${buildServerUrl}/build`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-build-secret': buildSecret,
          },
          body: JSON.stringify({
            deploymentId: deployment.id,
            gitUrl,
            projectName: project.name,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          updateDeployment(deployment.id, { status: 'building', buildUrl: data.url || null });
        } else {
          updateDeployment(deployment.id, { status: 'failed' });
        }
      } catch {
        // Build server may not be running in development – keep status as 'queued'
      }
    })();
  }

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

// GET /api/deploy/:id  (authenticated) – get a single deployment
router.get('/:id', deployLimiter, authenticateToken, (req, res) => {
  const deployment = getDeployments().find(d => d.id === req.params.id);
  if (!deployment) return res.status(404).json({ error: 'Deployment not found' });

  const project = getProjectById(deployment.projectId);
  if (!project || project.owner !== req.user.username) {
    return res.status(404).json({ error: 'Deployment not found' });
  }

  res.json({ deployment });
});

module.exports = router;
