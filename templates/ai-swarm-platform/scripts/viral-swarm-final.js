/**
 * viral-swarm-final.js — Autonomous AI Swarm Engine
 *
 * Capabilities:
 *  • Spawns multiple AI agents concurrently
 *  • Reads config history to avoid duplicate work
 *  • Optimises configs using OpenAI
 *  • Generates repository ideas
 *  • Creates GitHub repos via Octokit
 *  • Pushes initial files
 *  • Opens pull requests
 */

import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configDir = path.resolve(__dirname, '..', 'config');
const historyDir = path.join(configDir, 'history');
const viralReposPath = path.join(configDir, 'viral-repos.json');
const analyticsPath = path.join(configDir, 'analytics.json');

// ── Configuration ─────────────────────────────────────────────────────────────
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || '0.6');
const OPENAI_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || '800', 10);

// Geographic bounds for random marker placement
const LAT_MIN = -70;
const LAT_MAX = 70;
const LNG_MIN = -180;
const LNG_MAX = 180;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDirs() {
  [configDir, historyDir].forEach((d) => fs.mkdirSync(d, { recursive: true }));
}

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

function saveHistory(entry) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  writeJson(path.join(historyDir, `${ts}.json`), entry);
}

function loadViralRepos() {
  return readJson(viralReposPath, { repos: [] });
}

function saveViralRepos(data) {
  writeJson(viralReposPath, data);
}

function loadAnalytics() {
  return readJson(analyticsPath, {
    reposCreated: 0,
    prsOpened: 0,
    agentRuns: 0,
    lastRun: null,
    history: [],
  });
}

function saveAnalytics(data) {
  writeJson(analyticsPath, data);
}

// ─── OpenAI helpers ───────────────────────────────────────────────────────────

async function aiComplete(client, prompt, systemMsg = 'You are an expert software architect. Reply with raw valid JSON only.') {
  const resp = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: prompt },
    ],
    temperature: OPENAI_TEMPERATURE,
    max_tokens: OPENAI_MAX_TOKENS,
  });
  const raw = resp.choices[0].message.content.trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '');
  return JSON.parse(raw);
}

// ─── Swarm tasks ─────────────────────────────────────────────────────────────

async function optimiseConfig(client, env) {
  console.log(`  [agent] Optimising ${env} config…`);
  const current = readJson(path.join(configDir, `${env}.json`), { env });
  const updated = await aiComplete(
    client,
    `Here is the current ${env} config:\n${JSON.stringify(current, null, 2)}\n\nImprove it for production-readiness, security, and performance. Return the updated JSON object only.`,
  );
  writeJson(path.join(configDir, `${env}.json`), updated);
  console.log(`  [agent] ✅  ${env} config optimised`);
  return updated;
}

async function generateRepoIdeas(client, count = 3) {
  console.log(`  [agent] Generating ${count} repository ideas…`);
  const ideas = await aiComplete(
    client,
    `Generate ${count} creative open-source GitHub repository ideas for an AI-powered developer productivity platform.
Return a JSON array of objects, each with: name (kebab-case), description (1 sentence), topics (array of 3 strings).`,
    'You are a creative open-source project ideator. Return raw valid JSON array only.',
  );
  console.log(`  [agent] 💡  Ideas: ${ideas.map((i) => i.name).join(', ')}`);
  return ideas;
}

// ─── GitHub automation ────────────────────────────────────────────────────────

async function createRepo(octokit, owner, idea) {
  console.log(`  [github] Creating repo: ${idea.name}…`);
  try {
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: idea.name,
      description: idea.description,
      auto_init: true,
      private: false,
    });
    console.log(`  [github] ✅  Repo created: ${repo.html_url}`);
    return repo;
  } catch (err) {
    if (err.status === 422) {
      console.log(`  [github] ⚠️  Repo ${idea.name} already exists — skipping creation.`);
      const { data: repo } = await octokit.repos.get({ owner, repo: idea.name });
      return repo;
    }
    throw err;
  }
}

async function pushInitialFiles(octokit, owner, repoName, idea) {
  console.log(`  [github] Pushing initial files to ${repoName}…`);

  const readmeContent = Buffer.from(
    `# ${repoName}\n\n${idea.description}\n\n## Topics\n${idea.topics.map((t) => `- ${t}`).join('\n')}\n\n_Generated by AI Swarm Platform_\n`,
  ).toString('base64');

  // Get the default branch SHA
  const { data: repoData } = await octokit.repos.get({ owner, repo: repoName });
  const defaultBranch = repoData.default_branch;
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo: repoName,
    ref: `heads/${defaultBranch}`,
  });
  const baseSha = ref.object.sha;

  // Create feature branch
  const featureBranch = 'feature/ai-swarm-init';
  try {
    await octokit.git.createRef({
      owner,
      repo: repoName,
      ref: `refs/heads/${featureBranch}`,
      sha: baseSha,
    });
  } catch (err) {
    if (err.status !== 422) throw err;
    console.log(`  [github] ⚠️  Branch already exists — continuing.`);
  }

  // Update README on feature branch
  try {
    const { data: existing } = await octokit.repos.getContent({
      owner,
      repo: repoName,
      path: 'README.md',
      ref: featureBranch,
    });
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: 'README.md',
      message: 'feat: AI Swarm Platform initial setup',
      content: readmeContent,
      sha: existing.sha,
      branch: featureBranch,
    });
  } catch {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: 'README.md',
      message: 'feat: AI Swarm Platform initial setup',
      content: readmeContent,
      branch: featureBranch,
    });
  }

  console.log(`  [github] ✅  Files pushed to branch ${featureBranch}`);
  return featureBranch;
}

async function openPullRequest(octokit, owner, repoName, featureBranch) {
  console.log(`  [github] Opening PR in ${repoName}…`);
  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo: repoName });
    const { data: pr } = await octokit.pulls.create({
      owner,
      repo: repoName,
      title: '🤖 AI Swarm: Initial platform setup',
      body: '> Auto-generated by [AI Swarm Platform](https://github.com/ai-swarm-platform)\n\nThis PR bootstraps the repository with AI-generated scaffolding.',
      head: featureBranch,
      base: repoData.default_branch,
    });
    console.log(`  [github] ✅  PR opened: ${pr.html_url}`);
    return pr;
  } catch (err) {
    if (err.status === 422) {
      console.log(`  [github] ⚠️  PR already exists — skipping.`);
      return null;
    }
    throw err;
  }
}

// ─── Agent runner ─────────────────────────────────────────────────────────────

async function runAgent(id, { client, octokit, owner, analytics, viralData }) {
  console.log(`\n🚀  Agent #${id} started`);
  const agentLog = { agentId: id, startedAt: new Date().toISOString(), actions: [] };

  // 1. Optimise a random config
  const envs = ['dev', 'prod', 'copilot'];
  if (client) {
    const env = envs[id % envs.length];
    try {
      await optimiseConfig(client, env);
      agentLog.actions.push({ type: 'optimise-config', env });
    } catch (err) {
      console.warn(`  [agent #${id}] Config optimisation skipped: ${err.message}`);
    }

    // 2. Generate repo ideas
    try {
      const ideas = await generateRepoIdeas(client, 2);

      if (octokit && owner) {
        for (const idea of ideas) {
          try {
            const repo = await createRepo(octokit, owner, idea);
            const branch = await pushInitialFiles(octokit, owner, repo.name, idea);
            const pr = await openPullRequest(octokit, owner, repo.name, branch);

            viralData.repos.push({
              name: repo.name,
              url: repo.html_url,
              createdAt: new Date().toISOString(),
              lat: (Math.random() * (LAT_MAX - LAT_MIN)) + LAT_MIN,
              lng: (Math.random() * (LNG_MAX - LNG_MIN)) + LNG_MIN,
            });
            analytics.reposCreated += 1;
            if (pr) analytics.prsOpened += 1;
            agentLog.actions.push({ type: 'create-repo', repo: repo.name, pr: pr?.html_url });
          } catch (err) {
            console.warn(`  [agent #${id}] GitHub action failed: ${err.message}`);
          }
        }
      } else {
        console.log('  [agent] GH_TOKEN / owner not set — skipping GitHub automation.');
      }
    } catch (err) {
      console.warn(`  [agent #${id}] Idea generation skipped: ${err.message}`);
    }
  } else {
    console.log('  [agent] OPENAI_API_KEY not set — running in demo mode.');
    agentLog.actions.push({ type: 'demo-mode' });
  }

  agentLog.completedAt = new Date().toISOString();
  saveHistory(agentLog);
  console.log(`✅  Agent #${id} completed`);
  return agentLog;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  ensureDirs();

  const AGENT_COUNT = parseInt(process.env.AGENT_COUNT || '3', 10);
  const GH_TOKEN = process.env.GH_TOKEN;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const client = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

  let octokit = null;
  let owner = null;
  if (GH_TOKEN) {
    octokit = new Octokit({ auth: GH_TOKEN });
    try {
      const { data: user } = await octokit.users.getAuthenticated();
      owner = user.login;
      console.log(`🔑  GitHub authenticated as: ${owner}`);
    } catch (err) {
      console.warn('⚠️  GitHub auth failed:', err.message);
      octokit = null;
    }
  }

  const analytics = loadAnalytics();
  const viralData = loadViralRepos();

  analytics.agentRuns += AGENT_COUNT;
  analytics.lastRun = new Date().toISOString();

  console.log(`\n🌐  AI Swarm Platform — launching ${AGENT_COUNT} agents\n`);

  // Run agents concurrently
  const agents = Array.from({ length: AGENT_COUNT }, (_, i) => i + 1);
  await Promise.allSettled(
    agents.map((id) => runAgent(id, { client, octokit, owner, analytics, viralData })),
  );

  // Persist analytics & viral repo list
  analytics.history.push({
    runAt: analytics.lastRun,
    reposCreated: analytics.reposCreated,
    prsOpened: analytics.prsOpened,
  });
  saveAnalytics(analytics);
  saveViralRepos(viralData);

  console.log('\n🎉  Swarm run complete!');
  console.log(`   Repos created : ${analytics.reposCreated}`);
  console.log(`   PRs opened    : ${analytics.prsOpened}`);
  console.log(`   Total runs    : ${analytics.agentRuns}`);
}

main().catch((err) => {
  console.error('Fatal swarm error:', err.message);
  process.exit(1);
});
