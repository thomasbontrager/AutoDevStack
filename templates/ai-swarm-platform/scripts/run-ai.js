/**
 * run-ai.js — AI Config Generator
 * Uses OpenAI to generate optimised JSON configs for dev / prod / copilot
 * and writes them to /config.
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configDir = path.resolve(__dirname, '..', 'config');

if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

// ── Configuration ─────────────────────────────────────────────────────────────
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || '0.4');
const OPENAI_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || '600', 10);

const ENVIRONMENTS = ['dev', 'prod', 'copilot'];

const PROMPTS = {
  dev: `Generate a JSON configuration object for a LOCAL DEVELOPMENT environment of an AI swarm platform.
Include: apiBaseUrl, logLevel, dbUrl, redisUrl, openaiModel, maxAgents, swarmIntervalMs, debug, features.
Return ONLY valid JSON — no markdown, no prose.`,

  prod: `Generate a JSON configuration object for a PRODUCTION environment of an AI swarm platform.
Include: apiBaseUrl, logLevel, dbUrl, redisUrl, openaiModel, maxAgents, swarmIntervalMs, debug, features, rateLimit, retryPolicy.
Return ONLY valid JSON — no markdown, no prose.`,

  copilot: `Generate a JSON configuration object for a GITHUB COPILOT / CI integration of an AI swarm platform.
Include: githubOrg, defaultBranch, prLabels, reviewers, openaiModel, maxAgents, commitPrefix, autoMerge, features.
Return ONLY valid JSON — no markdown, no prose.`,
};

async function generateConfig(env, client) {
  console.log(`🤖  Generating ${env} config via OpenAI…`);
  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert DevOps engineer. Always respond with raw valid JSON only.',
      },
      { role: 'user', content: PROMPTS[env] },
    ],
    temperature: OPENAI_TEMPERATURE,
    max_tokens: OPENAI_MAX_TOKENS,
  });

  const raw = response.choices[0].message.content.trim();

  // Strip code fences if the model adds them despite instructions
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error(`⚠️  Could not parse ${env} response — saving raw string.`);
    parsed = { _raw: cleaned, _parseError: true };
  }

  const outPath = path.join(configDir, `${env}.json`);
  fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
  console.log(`✅  Saved ${env} config → ${outPath}`);
  return parsed;
}

async function run() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌  OPENAI_API_KEY is not set. Generating placeholder configs instead.');
    for (const env of ENVIRONMENTS) {
      const placeholder = {
        env,
        _placeholder: true,
        apiBaseUrl: env === 'prod' ? 'https://api.example.com' : 'http://localhost:4000',
        logLevel: env === 'prod' ? 'warn' : 'debug',
        openaiModel: 'gpt-4o-mini',
        maxAgents: 5,
        swarmIntervalMs: 60000,
        debug: env !== 'prod',
        features: ['swarm', 'github-automation', 'analytics'],
      };
      fs.writeFileSync(
        path.join(configDir, `${env}.json`),
        JSON.stringify(placeholder, null, 2),
      );
    }
    console.log('✅  Placeholder configs written to /config');
    return;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  for (const env of ENVIRONMENTS) {
    await generateConfig(env, client);
  }
  console.log('\n🎉  All configs generated successfully.');
}

run().catch((err) => {
  console.error('Fatal error in run-ai.js:', err.message);
  process.exit(1);
});
