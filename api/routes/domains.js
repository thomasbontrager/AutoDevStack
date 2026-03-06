const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const {
  getDomainsByOwner,
  getDomainByName,
  createDomain,
  deleteDomain,
  getProjectById,
  getProjects,
} = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const domainsLimiter = rateLimit({ windowMs: 60_000, max: 60 });

// GET /api/domains  – list domains for the authenticated user
router.get('/', domainsLimiter, authenticateToken, (req, res) => {
  const domains = getDomainsByOwner(req.user.username);
  res.json({ domains });
});

// POST /api/domains  – connect a custom domain to a project
router.post('/', domainsLimiter, authenticateToken, (req, res) => {
  const { domain, projectId } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain name is required' });
  }

  if (!DOMAIN_REGEX.test(domain)) {
    return res.status(400).json({ error: `"${domain}" is not a valid domain name` });
  }

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  // Verify the project exists and belongs to the user
  const project = getProjectById(projectId);
  if (!project || project.owner !== req.user.username) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Check for duplicate domain (globally – a domain can only point to one project)
  const existing = getDomainByName(domain);
  if (existing) {
    return res.status(409).json({ error: `Domain "${domain}" is already configured` });
  }

  const record = {
    id: `dom_${crypto.randomUUID()}`,
    domain,
    projectId,
    projectName: project.name,
    owner: req.user.username,
    addedAt: new Date().toISOString(),
  };

  createDomain(record);

  res.status(201).json({
    message: `Domain "${domain}" connected to project "${project.name}"`,
    domain: record,
    dns: {
      instructions: 'Add the following DNS records at your registrar:',
      records: [
        { type: 'CNAME', name: '@', value: `${project.name}.autodevstack.app` },
        { type: 'CNAME', name: 'www', value: `${project.name}.autodevstack.app` },
      ],
    },
  });
});

// DELETE /api/domains/:domain  – remove a domain mapping
router.delete('/:domain', domainsLimiter, authenticateToken, (req, res) => {
  const domainName = req.params.domain;
  const removed = deleteDomain(domainName, req.user.username);

  if (!removed) {
    return res.status(404).json({ error: `Domain "${domainName}" not found` });
  }

  res.json({ message: `Domain "${domainName}" removed successfully`, domain: removed });
});

module.exports = router;
