/**
 * monitor.js — Swarm Analytics Monitor
 * Tracks repo creation, PR activity, and stores metrics in config/analytics.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from '@octokit/rest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configDir = path.resolve(__dirname, '..', 'config');
const analyticsPath = path.join(configDir, 'analytics.json');
const viralReposPath = path.join(configDir, 'viral-repos.json');

function readJson(filePath, defaultValue = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function collectGitHubMetrics(octokit, owner, repos) {
  const metrics = [];
  for (const repo of repos.slice(0, 10)) {
    // Limit to avoid rate limiting
    try {
      const { data: pulls } = await octokit.pulls.list({
        owner,
        repo: repo.name,
        state: 'all',
        per_page: 5,
      });
      metrics.push({
        repo: repo.name,
        openPRs: pulls.filter((p) => p.state === 'open').length,
        closedPRs: pulls.filter((p) => p.state === 'closed').length,
        collectedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`  ⚠️  Could not fetch metrics for ${repo.name}: ${err.message}`);
    }
  }
  return metrics;
}

async function main() {
  console.log('📊  AI Swarm Platform — Monitor\n');

  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

  const analytics = readJson(analyticsPath, {
    reposCreated: 0,
    prsOpened: 0,
    agentRuns: 0,
    lastRun: null,
    history: [],
    githubMetrics: [],
  });

  const viralData = readJson(viralReposPath, { repos: [] });

  // Collect live GitHub metrics if token available
  if (process.env.GH_TOKEN) {
    const octokit = new Octokit({ auth: process.env.GH_TOKEN });
    try {
      const { data: user } = await octokit.users.getAuthenticated();
      console.log(`🔑  Authenticated as: ${user.login}`);
      const liveMetrics = await collectGitHubMetrics(octokit, user.login, viralData.repos);
      analytics.githubMetrics = liveMetrics;
      console.log(`  Collected metrics for ${liveMetrics.length} repo(s).`);
    } catch (err) {
      console.warn(`  ⚠️  GitHub metrics collection failed: ${err.message}`);
    }
  } else {
    console.log('  GH_TOKEN not set — skipping live GitHub metric collection.');
  }

  // Summary
  analytics.monitoredAt = new Date().toISOString();
  analytics.summary = {
    totalRepos: viralData.repos.length,
    totalAgentRuns: analytics.agentRuns,
    totalReposCreated: analytics.reposCreated,
    totalPrsOpened: analytics.prsOpened,
  };

  writeJson(analyticsPath, analytics);

  console.log('\n📈  Analytics snapshot:');
  console.log(`   Repos tracked   : ${analytics.summary.totalRepos}`);
  console.log(`   Agent runs      : ${analytics.summary.totalAgentRuns}`);
  console.log(`   Repos created   : ${analytics.summary.totalReposCreated}`);
  console.log(`   PRs opened      : ${analytics.summary.totalPrsOpened}`);
  console.log(`\n✅  Analytics saved → ${analyticsPath}`);
}

main().catch((err) => {
  console.error('Monitor error:', err.message);
  process.exit(1);
});
