const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH_OVERRIDE || path.join(__dirname, 'db.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: [], projects: [], deployments: [], subscriptions: [], invoices: [] };
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

function getSubscriptionByUsername(username) {
  const db = read();
  const subs = db.subscriptions || [];
  return subs.find(s => s.username === username) || null;
}

function upsertSubscription(subscription) {
  const db = read();
  if (!db.subscriptions) db.subscriptions = [];
  const idx = db.subscriptions.findIndex(s => s.username === subscription.username);
  if (idx >= 0) {
    db.subscriptions[idx] = subscription;
  } else {
    db.subscriptions.push(subscription);
  }
  write(db);
  return subscription;
}

function getInvoicesByUsername(username) {
  const db = read();
  const invoices = db.invoices || [];
  return invoices.filter(i => i.username === username);
}

function createInvoice(invoice) {
  const db = read();
  if (!db.invoices) db.invoices = [];
  db.invoices.push(invoice);
  write(db);
  return invoice;
}

module.exports = {
  getUsers,
  getUserByUsername,
  getProjects,
  getProjectById,
  createProject,
  getDeployments,
  createDeployment,
  getSubscriptionByUsername,
  upsertSubscription,
  getInvoicesByUsername,
  createInvoice,
};
