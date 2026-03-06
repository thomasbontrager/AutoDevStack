const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH_OVERRIDE || path.join(__dirname, 'db.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: [], projects: [], deployments: [], domains: [] };
  }
}

function write(data) {
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

function getUsers() {
  return read().users;
}

function getUserByUsername(username) {
  return read().users.find(u => u.username === username) || null;
}

function getProjects() {
  return read().projects;
}

function getProjectById(id) {
  return read().projects.find(p => p.id === id) || null;
}

function createProject(project) {
  const db = read();
  db.projects.push(project);
  write(db);
  return project;
}

function getDeployments() {
  return read().deployments;
}

function createDeployment(deployment) {
  const db = read();
  db.deployments.push(deployment);
  write(db);
  return deployment;
}

function getDomains() {
  return read().domains || [];
}

function getDomainsByOwner(owner) {
  return getDomains().filter(d => d.owner === owner);
}

function getDomainByName(domain) {
  return getDomains().find(d => d.domain === domain) || null;
}

function createDomain(domain) {
  const db = read();
  if (!db.domains) db.domains = [];
  db.domains.push(domain);
  write(db);
  return domain;
}

function deleteDomain(domain, owner) {
  const db = read();
  if (!db.domains) db.domains = [];
  const index = db.domains.findIndex(d => d.domain === domain && d.owner === owner);
  if (index === -1) return null;
  const removed = db.domains.splice(index, 1)[0];
  write(db);
  return removed;
}

module.exports = {
  getUsers,
  getUserByUsername,
  getProjects,
  getProjectById,
  createProject,
  getDeployments,
  createDeployment,
  getDomains,
  getDomainsByOwner,
  getDomainByName,
  createDomain,
  deleteDomain,
};
