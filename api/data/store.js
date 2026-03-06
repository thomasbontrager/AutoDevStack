const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH_OVERRIDE || path.join(__dirname, 'db.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: [], projects: [], deployments: [] };
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

function updateDeployment(id, fields) {
  const db = read();
  const idx = db.deployments.findIndex(d => d.id === id);
  if (idx !== -1) {
    db.deployments[idx] = { ...db.deployments[idx], ...fields };
    write(db);
    return db.deployments[idx];
  }
  return null;
}

module.exports = {
  getUsers,
  getUserByUsername,
  getProjects,
  getProjectById,
  createProject,
  getDeployments,
  createDeployment,
  updateDeployment,
};
