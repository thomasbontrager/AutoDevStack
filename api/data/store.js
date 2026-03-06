const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH_OVERRIDE || path.join(__dirname, 'db.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: [], projects: [], deployments: [], billing: [], invoices: [] };
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

function getBilling(userId) {
  const db = read();
  const billing = db.billing || [];
  return billing.find(b => b.userId === userId) || null;
}

function getAllBilling() {
  const db = read();
  return db.billing || [];
}

function updateBilling(userId, billingData) {
  const db = read();
  if (!db.billing) db.billing = [];
  const idx = db.billing.findIndex(b => b.userId === userId);
  if (idx >= 0) {
    db.billing[idx] = billingData;
  } else {
    db.billing.push(billingData);
  }
  write(db);
  return billingData;
}

function getInvoices(userId) {
  const db = read();
  const invoices = db.invoices || [];
  return invoices
    .filter(inv => inv.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function addInvoice(invoice) {
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
  getBilling,
  getAllBilling,
  updateBilling,
  getInvoices,
  addInvoice,
};
