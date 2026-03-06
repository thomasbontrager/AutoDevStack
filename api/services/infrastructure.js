'use strict';

/**
 * AutoDevStack Infrastructure Service
 *
 * Manages cloud "tower" units – scalable infrastructure nodes that host
 * compressed project workspaces.  Each tower can be provisioned in ≤ 30 days
 * and supports auto-scaling and built-in compression.
 *
 * Tower tiers:
 *   micro      –  2 vCPU /   4 GB RAM /   100 GB storage /   10 projects
 *   standard   –  4 vCPU /  16 GB RAM /   500 GB storage /   50 projects
 *   pro        –  8 vCPU /  32 GB RAM / 2 000 GB storage /  200 projects
 *   enterprise – 32 vCPU / 128 GB RAM / 10 000 GB storage / 1000 projects
 *
 * Environment variables:
 *   TOWER_PROVISION_DAYS – maximum days to provision a new tower (default: 30)
 */

const TOWER_PROVISION_TIME_DAYS = parseInt(
  process.env.TOWER_PROVISION_DAYS || '30',
  10,
);

/** @type {Record<string, {name:string, cpu:number, ramGB:number, storageGB:number, maxProjects:number}>} */
const TOWER_PLANS = {
  micro: {
    name: 'Micro Tower',
    cpu: 2,
    ramGB: 4,
    storageGB: 100,
    maxProjects: 10,
  },
  standard: {
    name: 'Standard Tower',
    cpu: 4,
    ramGB: 16,
    storageGB: 500,
    maxProjects: 50,
  },
  pro: {
    name: 'Pro Tower',
    cpu: 8,
    ramGB: 32,
    storageGB: 2000,
    maxProjects: 200,
  },
  enterprise: {
    name: 'Enterprise Tower',
    cpu: 32,
    ramGB: 128,
    storageGB: 10000,
    maxProjects: 1000,
  },
};

/**
 * Build a new tower record ready for persistence.
 *
 * @param {string} plan   – one of the TOWER_PLANS keys
 * @param {string} region – cloud region (e.g. "us-east-1")
 * @param {string} owner  – username of the requesting user
 * @returns {object}
 */
function buildTowerRecord(plan, region, owner) {
  const tierConfig = TOWER_PLANS[plan] || TOWER_PLANS.standard;
  const now = Date.now();
  const readyAt = new Date(now + TOWER_PROVISION_TIME_DAYS * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: `tower_${now}_${Math.random().toString(36).slice(2, 8)}`,
    plan,
    region: region || 'us-east-1',
    owner,
    status: 'provisioning',
    name: tierConfig.name,
    cpu: tierConfig.cpu,
    ramGB: tierConfig.ramGB,
    storageGB: tierConfig.storageGB,
    maxProjects: tierConfig.maxProjects,
    compressionEnabled: true,
    autoScaleEnabled: true,
    provisionedAt: new Date(now).toISOString(),
    readyAt,
    estimatedReadyDays: TOWER_PROVISION_TIME_DAYS,
  };
}

module.exports = {
  TOWER_PLANS,
  TOWER_PROVISION_TIME_DAYS,
  buildTowerRecord,
};
