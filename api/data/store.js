const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH_OVERRIDE || path.join(__dirname, 'db.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: [], projects: [], deployments: [], billing: [], invoices: [], storage: [], towers: [], domains: [] };
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
  const idx = (db.deployments || []).findIndex(d => d.id === id);
  if (idx >= 0) {
    db.deployments[idx] = { ...db.deployments[idx], ...fields };
    write(db);
    return db.deployments[idx];
  }
  return null;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function getStorageRecord(projectId) {
  const db = read();
  return (db.storage || []).find(s => s.projectId === projectId) || null;
}

function getStorageRecordsByOwner(owner) {
  const db = read();
  return (db.storage || []).filter(s => s.owner === owner);
}

function updateStorageRecord(projectId, data) {
  const db = read();
  if (!db.storage) db.storage = [];
  const idx = db.storage.findIndex(s => s.projectId === projectId);
  if (idx >= 0) {
    db.storage[idx] = { ...db.storage[idx], ...data };
  } else {
    db.storage.push(data);
  }
  write(db);
  return db.storage.find(s => s.projectId === projectId);
}

// ─── Towers ───────────────────────────────────────────────────────────────────

function getTowers() {
  return read().towers || [];
}

function getTowerById(id) {
  return (read().towers || []).find(t => t.id === id) || null;
}

function registerTower(tower) {
  const db = read();
  if (!db.towers) db.towers = [];
  db.towers.push(tower);
  write(db);
  return tower;
}

function updateTower(id, fields) {
  const db = read();
  if (!db.towers) db.towers = [];
  const idx = db.towers.findIndex(t => t.id === id);
  if (idx >= 0) {
    db.towers[idx] = { ...db.towers[idx], ...fields };
    write(db);
    return db.towers[idx];
  }
  return null;
}

function deregisterTower(id) {
  const db = read();
  if (!db.towers) return null;
  const idx = db.towers.findIndex(t => t.id === id);
  if (idx < 0) return null;
  const [removed] = db.towers.splice(idx, 1);
  write(db);
  return removed;
}

// ─── Domains ──────────────────────────────────────────────────────────────────

function getDomainsByOwner(owner) {
  return (read().domains || []).filter(d => d.owner === owner);
}

function getDomainByName(domain) {
  return (read().domains || []).find(d => d.domain === domain) || null;
}

function createDomain(record) {
  const db = read();
  if (!db.domains) db.domains = [];
  db.domains.push(record);
  write(db);
  return record;
}

function deleteDomain(domain, owner) {
  const db = read();
  if (!db.domains) return null;
  const idx = db.domains.findIndex(d => d.domain === domain && d.owner === owner);
  if (idx < 0) return null;
  const [removed] = db.domains.splice(idx, 1);
  write(db);
  return removed;
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

// ─── Domains ──────────────────────────────────────────────────────────────────

function getDomainsByOwner(owner) {
  const db = read();
  return (db.domains || []).filter(d => d.owner === owner);
}

function getDomainByName(domain) {
  return (read().domains || []).find(d => d.domain === domain) || null;
}

function createDomain(record) {
  const db = read();
  if (!db.domains) db.domains = [];
  db.domains.push(record);
  write(db);
  return record;
}

function deleteDomain(domain, owner) {
  const db = read();
  if (!db.domains) db.domains = [];
  const idx = db.domains.findIndex(d => d.domain === domain && d.owner === owner);
  if (idx < 0) return null;
  const [removed] = db.domains.splice(idx, 1);
  write(db);
  return removed;
}

// ─── Compression records ──────────────────────────────────────────────────────

function getCompressionRecordsByProject(projectId) {
  return (read().compressionRecords || []).filter(r => r.projectId === projectId);
}

function upsertCompressionRecord(record) {
  const db = read();
  if (!db.compressionRecords) db.compressionRecords = [];
  const idx = db.compressionRecords.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    db.compressionRecords[idx] = record;
  } else {
    db.compressionRecords.push(record);
  }
  write(db);
  return record;
}

// ─── Infrastructure towers ────────────────────────────────────────────────────

function getTowersByOwner(owner) {
  return (read().towers || []).filter(t => t.owner === owner);
}

function getTowerById(id) {
  return (read().towers || []).find(t => t.id === id) || null;
}

function createTower(tower) {
  const db = read();
  if (!db.towers) db.towers = [];
  db.towers.push(tower);
  write(db);
  return tower;
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
  getBilling,
  getAllBilling,
  updateBilling,
  getInvoices,
  addInvoice,
  getStorageRecord,
  getStorageRecordsByOwner,
  updateStorageRecord,
  getTowers,
  getTowerById,
  registerTower,
  updateTower,
  deregisterTower,
  getDomainsByOwner,
  getDomainByName,
  createDomain,
  deleteDomain,
};
