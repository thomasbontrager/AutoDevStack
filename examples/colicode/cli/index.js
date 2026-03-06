#!/usr/bin/env node
/**
 * ColiCode CLI
 *
 * An AI coding assistant that analyzes GitHub pull requests, provides
 * code-review insights, and generates improvement suggestions — all powered
 * by the ColiCode API (which keeps your keys server-side).
 *
 * Usage:
 *   colicode pr <owner>/<repo>#<number>         — show PR summary
 *   colicode pr <owner>/<repo>#<number> --ai    — show PR + AI insights
 *   colicode review <file>                      — AI code review of a local file
 *   colicode suggest <file> "<instruction>"     — AI improvement suggestion
 *   colicode --help                             — show help
 *   colicode --version                          — show version
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import ora from 'ora';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

// ── Configuration ─────────────────────────────────────────────────────────────

const API_BASE = process.env.COLICODE_API_URL || 'http://localhost:3100';
const API_SECRET = process.env.API_SECRET || '';

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(API_SECRET ? { 'X-API-Secret': API_SECRET } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error(
      `Cannot reach the ColiCode API at ${API_BASE}.\n` +
      `Make sure the server is running: cd api && npm start\n` +
      `(${err.message})`,
    );
  }

  const body = await res.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(`Unexpected response from API (status ${res.status}): ${body.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`);
  }

  return data;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function header(text) {
  const line = '─'.repeat(Math.min(process.stdout.columns || 80, 80));
  console.log(`\n${chalk.cyan(line)}`);
  console.log(chalk.bold.white(text));
  console.log(chalk.cyan(line));
}

function kv(key, value) {
  if (value === undefined || value === null || value === '') return;
  console.log(`  ${chalk.dim(key.padEnd(16))} ${chalk.white(value)}`);
}

function badge(label, value, colorFn) {
  return colorFn(`[${label}: ${value}]`);
}

function stateColor(state) {
  if (!state) return chalk.dim;
  const s = state.toLowerCase();
  if (s === 'open') return chalk.green;
  if (s === 'closed') return chalk.red;
  if (s === 'merged') return chalk.magenta;
  return chalk.dim;
}

function conclusionColor(conclusion) {
  if (!conclusion) return chalk.yellow;
  if (conclusion === 'success') return chalk.green;
  if (['failure', 'timed_out', 'cancelled'].includes(conclusion)) return chalk.red;
  return chalk.yellow;
}

function printPR(pr) {
  header(`PR #${pr.number} — ${pr.title}`);
  kv('Author', pr.author);
  kv('State', stateColor(pr.state)(pr.state?.toUpperCase()));
  kv('Draft', pr.draft ? chalk.yellow('yes') : 'no');
  kv('Branch', `${chalk.dim(pr.base)} ← ${chalk.cyan(pr.head)}`);
  kv('Labels', pr.labels?.length ? pr.labels.map(l => chalk.blue(`#${l}`)).join(' ') : chalk.dim('none'));
  kv('Changes', `${chalk.green(`+${pr.additions}`)}  ${chalk.red(`-${pr.deletions}`)}  across ${pr.changedFiles} file(s)`);
  kv('Created', new Date(pr.createdAt).toLocaleString());
  kv('Updated', new Date(pr.updatedAt).toLocaleString());
  kv('URL', chalk.underline(pr.url));
  if (pr.body) {
    console.log(`\n  ${chalk.dim('Description:')}`);
    const lines = pr.body.split('\n').slice(0, 10);
    lines.forEach(l => console.log(`  ${chalk.dim('│')} ${l}`));
    if (pr.body.split('\n').length > 10) {
      console.log(`  ${chalk.dim('│')} ${chalk.italic('…(truncated)')}`);
    }
  }
}

function printChecks(checks) {
  if (!checks?.length) {
    console.log(`\n  ${chalk.dim('No CI checks found.')}`);
    return;
  }
  console.log(`\n${chalk.bold('  CI Checks:')}`);
  for (const c of checks) {
    const icon = c.conclusion === 'success' ? '✓' : c.conclusion ? '✗' : '○';
    const color = conclusionColor(c.conclusion);
    console.log(`  ${color(icon)} ${c.name}  ${chalk.dim(c.status)}${c.conclusion ? chalk.dim(` → ${c.conclusion}`) : ''}`);
  }
}

function printReviews(reviews) {
  if (!reviews?.length) {
    console.log(`\n  ${chalk.dim('No reviews yet.')}`);
    return;
  }
  console.log(`\n${chalk.bold('  Reviews:')}`);
  for (const r of reviews) {
    const stateLabel =
      r.state === 'APPROVED' ? chalk.green('✓ APPROVED') :
      r.state === 'CHANGES_REQUESTED' ? chalk.red('✗ CHANGES_REQUESTED') :
      chalk.dim(r.state);
    console.log(`  ${stateLabel}  ${chalk.white(r.reviewer)}  ${chalk.dim(new Date(r.submittedAt).toLocaleDateString())}`);
    if (r.body) console.log(`    ${chalk.dim(r.body.slice(0, 120))}${r.body.length > 120 ? '…' : ''}`);
  }
}

// ── Commands ──────────────────────────────────────────────────────────────────

async function cmdPR(ref, { ai = false } = {}) {
  // Parse owner/repo#number or owner/repo/number
  const match = ref.match(/^([^/]+)\/([^#/]+)[#/](\d+)$/);
  if (!match) {
    console.error(chalk.red(`✗ Invalid PR reference "${ref}". Expected format: owner/repo#number`));
    process.exit(1);
  }
  const [, owner, repo, number] = match;

  const spinner = ora('Fetching PR data from GitHub…').start();
  try {
    const endpoint = ai
      ? `/api/pr/${owner}/${repo}/${number}/insights`
      : `/api/pr/${owner}/${repo}/${number}`;
    const data = await apiFetch(endpoint);
    spinner.stop();

    printPR(data.pr);
    printChecks(data.checks);
    printReviews(data.reviews);

    if (ai && data.insights) {
      header('AI Insights');
      console.log(data.insights);
    }
    console.log();
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}

async function cmdReview(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(chalk.red(`✗ File not found: ${resolved}`));
    process.exit(1);
  }

  const code = fs.readFileSync(resolved, 'utf8');
  const filename = path.basename(resolved);
  const ext = path.extname(filename).slice(1);

  const spinner = ora(`Requesting AI code review for ${chalk.bold(filename)}…`).start();
  try {
    const { review } = await apiFetch('/api/review', {
      method: 'POST',
      body: JSON.stringify({ code, filename, language: ext }),
    });
    spinner.stop();
    header(`Code Review — ${filename}`);
    console.log(review);
    console.log();
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}

async function cmdSuggest(filePath, instruction) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(chalk.red(`✗ File not found: ${resolved}`));
    process.exit(1);
  }

  const code = fs.readFileSync(resolved, 'utf8');
  const filename = path.basename(resolved);

  const spinner = ora(`Generating suggestion for ${chalk.bold(filename)}…`).start();
  try {
    const { suggestion } = await apiFetch('/api/suggest', {
      method: 'POST',
      body: JSON.stringify({ code, instruction, filename }),
    });
    spinner.stop();
    header(`Suggestion — ${filename}`);
    console.log(chalk.dim('Instruction: ') + instruction);
    console.log();
    console.log(suggestion);
    console.log();
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}

// ── Help ──────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${chalk.bold.cyan('ColiCode')} ${chalk.dim(`v${pkg.version}`)} — AI-powered PR analysis & code assistant

${chalk.bold('Usage:')}
  ${chalk.cyan('colicode')} ${chalk.yellow('<command>')} [options]

${chalk.bold('Commands:')}
  ${chalk.yellow('pr')} <owner/repo#number>          Show pull-request summary (checks, reviews)
  ${chalk.yellow('pr')} <owner/repo#number> ${chalk.green('--ai')}    PR summary + AI-generated insights
  ${chalk.yellow('review')} <file>                   AI code review of a local file
  ${chalk.yellow('suggest')} <file> "<instruction>"  AI improvement suggestion for a file

${chalk.bold('Options:')}
  ${chalk.green('--ai')}                             Enrich PR output with AI insights
  ${chalk.green('--help')}, ${chalk.green('-h')}                       Show this help message
  ${chalk.green('--version')}, ${chalk.green('-v')}                    Print version number

${chalk.bold('Environment variables:')} ${chalk.dim('(set in .env or shell)')}
  COLICODE_API_URL   Base URL of the ColiCode API  ${chalk.dim('[default: http://localhost:3100]')}
  API_SECRET         Shared secret (must match the server's API_SECRET)

${chalk.bold('Examples:')}
  ${chalk.dim('# Analyse a PR')}
  colicode pr facebook/react#12345

  ${chalk.dim('# PR with AI insights')}
  colicode pr facebook/react#12345 --ai

  ${chalk.dim('# Review a local file')}
  colicode review src/utils/auth.js

  ${chalk.dim('# Get an improvement suggestion')}
  colicode suggest src/utils/auth.js "add input validation and JSDoc comments"

${chalk.bold('Getting started:')}
  1. ${chalk.cyan('cd api && npm install && npm start')}    ${chalk.dim('# start the API server')}
  2. ${chalk.cyan('cd cli && npm install')}                 ${chalk.dim('# install CLI deps')}
  3. ${chalk.cyan('cp ../.env.example ../.env')}            ${chalk.dim('# set GITHUB_TOKEN and OPENAI_API_KEY')}
  4. Run any command above 🚀
`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(pkg.version);
    process.exit(0);
  }

  const [command, ...rest] = args;

  switch (command) {
    case 'pr': {
      if (!rest[0]) {
        console.error(chalk.red('✗ Missing PR reference. Usage: colicode pr <owner/repo#number>'));
        process.exit(1);
      }
      const aiFlag = rest.includes('--ai');
      await cmdPR(rest[0], { ai: aiFlag });
      break;
    }
    case 'review': {
      if (!rest[0]) {
        console.error(chalk.red('✗ Missing file path. Usage: colicode review <file>'));
        process.exit(1);
      }
      await cmdReview(rest[0]);
      break;
    }
    case 'suggest': {
      if (!rest[0]) {
        console.error(chalk.red('✗ Missing file path. Usage: colicode suggest <file> "<instruction>"'));
        process.exit(1);
      }
      if (!rest[1]) {
        console.error(chalk.red('✗ Missing instruction. Usage: colicode suggest <file> "<instruction>"'));
        process.exit(1);
      }
      await cmdSuggest(rest[0], rest[1]);
      break;
    }
    default:
      console.error(chalk.red(`✗ Unknown command "${command}". Run colicode --help for usage.`));
      process.exit(1);
  }
}

main();
