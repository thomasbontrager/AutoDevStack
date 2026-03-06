const express = require('express');
const rateLimit = require('express-rate-limit');
const { createProject, getProjects, getProjectById } = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const VALID_STACKS = ['default', 'node', 'next', 't3', 'saas', 'monorepo'];

const projectsLimiter = rateLimit({ windowMs: 60_000, max: 60 });

// POST /api/projects/create  (authenticated)
router.post('/create', projectsLimiter, authenticateToken, (req, res) => {
  const { name, stack, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  if (!/^[a-z0-9-_]+$/i.test(name.trim())) {
    return res.status(400).json({
      error: 'Project name can only contain letters, numbers, dashes, and underscores',
    });
  }

  const normalizedStack = stack ? stack.toLowerCase() : 'default';
  if (!VALID_STACKS.includes(normalizedStack)) {
    return res.status(400).json({
      error: `Invalid stack "${stack}". Valid stacks: ${VALID_STACKS.join(', ')}`,
    });
  }

  const existing = getProjects().find(
    p => p.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (existing) {
    return res.status(409).json({ error: `Project "${name}" already exists` });
  }

  const project = {
    id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    stack: normalizedStack,
    description: description || '',
    owner: req.user.username,
    status: 'created',
    createdAt: new Date().toISOString(),
  };

  createProject(project);

  res.status(201).json({ message: 'Project created successfully', project });
});

// GET /api/projects  (authenticated)
router.get('/', projectsLimiter, authenticateToken, (req, res) => {
  const projects = getProjects().filter(p => p.owner === req.user.username);
  res.json({ projects });
});

// GET /api/projects/:id  (authenticated)
router.get('/:id', projectsLimiter, authenticateToken, (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project || project.owner !== req.user.username) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json({ project });
});

module.exports = router;
