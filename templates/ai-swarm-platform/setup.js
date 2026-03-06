/**
 * setup.js — One-time setup script
 * Creates config directories, writes placeholder configs, validates environment.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DIRS = [
  path.join(__dirname, 'config'),
  path.join(__dirname, 'config', 'history'),
];

const PLACEHOLDER_CONFIGS = {
  'config/dev.json': {
    env: 'dev',
    apiBaseUrl: 'http://localhost:4000',
    logLevel: 'debug',
    dbUrl: 'postgresql://postgres:postgres@localhost:5432/swarm_dev',
    redisUrl: 'redis://localhost:6379',
    openaiModel: 'gpt-4o-mini',
    maxAgents: 3,
    swarmIntervalMs: 60000,
    debug: true,
    features: ['swarm', 'github-automation', 'analytics', 'dashboard'],
  },
  'config/prod.json': {
    env: 'prod',
    apiBaseUrl: 'https://api.example.com',
    logLevel: 'warn',
    dbUrl: 'postgresql://postgres:password@postgres:5432/swarm_prod',
    redisUrl: 'redis://redis:6379',
    openaiModel: 'gpt-4o',
    maxAgents: 10,
    swarmIntervalMs: 3600000,
    debug: false,
    features: ['swarm', 'github-automation', 'analytics', 'dashboard'],
  },
  'config/copilot.json': {
    env: 'copilot',
    githubOrg: 'your-org',
    defaultBranch: 'main',
    prLabels: ['ai-generated', 'automated'],
    reviewers: [],
    openaiModel: 'gpt-4o-mini',
    maxAgents: 5,
    commitPrefix: 'feat(swarm):',
    autoMerge: false,
    features: ['swarm', 'github-automation'],
  },
  'config/viral-repos.json': { repos: [] },
  'config/analytics.json': {
    reposCreated: 0,
    prsOpened: 0,
    agentRuns: 0,
    lastRun: null,
    history: [],
    githubMetrics: [],
  },
};

function main() {
  console.log('\n🔧  AI Swarm Platform — Setup\n');

  // Create directories
  for (const dir of DIRS) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ✅  Directory: ${path.relative(__dirname, dir)}`);
  }

  // Write placeholder configs (skip if already exist)
  for (const [relPath, data] of Object.entries(PLACEHOLDER_CONFIGS)) {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
      console.log(`  ✅  Created: ${relPath}`);
    } else {
      console.log(`  ⏭️   Exists:  ${relPath}`);
    }
  }

  // Warn about missing env variables
  console.log('');
  const required = ['OPENAI_API_KEY', 'GH_TOKEN'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.warn('  ⚠️  Missing environment variables (optional but recommended):');
    missing.forEach((k) => console.warn(`       • ${k}`));
    console.warn('     Copy .env.example → .env and fill in the values.\n');
  } else {
    console.log('  ✅  All required environment variables are set.\n');
  }

  console.log('🎉  Setup complete! Next steps:');
  console.log('   npm run generate   — generate AI configs');
  console.log('   npm run swarm      — run the swarm engine');
  console.log('   npm run dashboard  — start the live dashboard');
  console.log('   bash start-swarm.sh — start everything at once');
  console.log('');
}

main();
