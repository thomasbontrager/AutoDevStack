#!/usr/bin/env node

/**
 * Monitor Script
 *
 * Monitors swarm analytics and tracks metrics
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.join(__dirname, '..', 'config');

async function readAnalytics() {
  try {
    const analyticsPath = path.join(CONFIG_DIR, 'analytics.json');
    const data = await fs.readFile(analyticsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function readViralRepos() {
  try {
    const viralPath = path.join(CONFIG_DIR, 'viral-repos.json');
    const data = await fs.readFile(viralPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function updateAnalytics(analytics) {
  const analyticsPath = path.join(CONFIG_DIR, 'analytics.json');

  // Add monitoring metadata
  const updated = {
    ...analytics,
    last_monitored: new Date().toISOString(),
    monitoring_enabled: true,
  };

  await fs.writeFile(analyticsPath, JSON.stringify(updated, null, 2));
}

function displayMetrics(analytics) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SWARM ANALYTICS DASHBOARD');
  console.log('='.repeat(60));

  if (!analytics) {
    console.log('\n⚠️  No analytics data available');
    console.log('Run the swarm first: npm run swarm\n');
    return;
  }

  console.log(`\n📅 Last Update: ${new Date(analytics.timestamp).toLocaleString()}`);
  console.log(`🤖 Total Agents: ${analytics.totalAgents}`);
  console.log(`📦 Total Repositories: ${analytics.totalRepos}`);

  if (analytics.agents && analytics.agents.length > 0) {
    console.log('\n👥 Agent Performance:');
    analytics.agents.forEach(agent => {
      console.log(`\n  ${agent.id} (${agent.type}):`);
      console.log(`    ├─ Tasks Completed: ${agent.tasksCompleted}`);
      console.log(`    ├─ Repos Created: ${agent.reposCreated}`);
      console.log(`    └─ PRs Opened: ${agent.prsOpened}`);
    });
  }

  if (analytics.viralRepos && analytics.viralRepos.length > 0) {
    console.log('\n🌟 Recent Repositories:');
    analytics.viralRepos.slice(0, 5).forEach((repo, i) => {
      console.log(`  ${i + 1}. ${repo.name}`);
      console.log(`     URL: ${repo.url}`);
      console.log(`     Agent: ${repo.agent}`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

async function trackMetric(metric) {
  const analyticsPath = path.join(CONFIG_DIR, 'analytics.json');

  try {
    let analytics = await readAnalytics();

    if (!analytics) {
      analytics = {
        timestamp: new Date().toISOString(),
        metrics: [],
      };
    }

    if (!analytics.metrics) {
      analytics.metrics = [];
    }

    analytics.metrics.push({
      ...metric,
      recorded_at: new Date().toISOString(),
    });

    await fs.writeFile(analyticsPath, JSON.stringify(analytics, null, 2));
    console.log(`✅ Metric tracked: ${metric.type}`);
  } catch (error) {
    console.error('❌ Failed to track metric:', error.message);
  }
}

async function monitor() {
  console.log('🔍 AI Swarm Platform - Monitor\n');

  const analytics = await readAnalytics();
  const viralRepos = await readViralRepos();

  displayMetrics(analytics);

  if (analytics) {
    await updateAnalytics(analytics);
    console.log('✅ Analytics updated with monitoring timestamp');
  }

  // Track monitoring event
  await trackMetric({
    type: 'monitor_run',
    agent_count: analytics?.totalAgents || 0,
    repo_count: analytics?.totalRepos || 0,
  });

  console.log('✨ Monitoring complete\n');
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  monitor().catch(console.error);
}

export { readAnalytics, trackMetric, displayMetrics };
