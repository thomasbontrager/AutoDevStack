/**
 * qa.js — Config Validation Script
 * Validates generated JSON configs for required fields and structure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configDir = path.resolve(__dirname, '..', 'config');

const REQUIRED_FIELDS = {
  dev: ['apiBaseUrl', 'logLevel', 'openaiModel', 'maxAgents'],
  prod: ['apiBaseUrl', 'logLevel', 'openaiModel', 'maxAgents'],
  copilot: ['openaiModel', 'maxAgents'],
};

function validateConfig(env) {
  const cfgPath = path.join(configDir, `${env}.json`);
  const issues = [];

  // 1. File existence
  if (!fs.existsSync(cfgPath)) {
    issues.push(`File missing: ${cfgPath}`);
    return { env, ok: false, issues };
  }

  // 2. Valid JSON
  let config;
  try {
    config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  } catch (err) {
    issues.push(`Invalid JSON: ${err.message}`);
    return { env, ok: false, issues };
  }

  // 3. Parse error flag from run-ai.js
  if (config._parseError) {
    issues.push('Config contains _parseError flag — OpenAI response could not be parsed.');
  }

  // 4. Required fields
  const required = REQUIRED_FIELDS[env] || [];
  for (const field of required) {
    if (!(field in config)) {
      issues.push(`Missing required field: "${field}"`);
    }
  }

  // 5. Type checks
  if ('maxAgents' in config && typeof config.maxAgents !== 'number') {
    issues.push('"maxAgents" must be a number');
  }
  if ('debug' in config && typeof config.debug !== 'boolean') {
    issues.push('"debug" must be a boolean');
  }

  return { env, ok: issues.length === 0, issues };
}

function main() {
  const envs = ['dev', 'prod', 'copilot'];
  let allPassed = true;

  console.log('🔍  AI Swarm Platform — Config QA\n');

  for (const env of envs) {
    const result = validateConfig(env);
    if (result.ok) {
      console.log(`  ✅  ${env} — OK`);
    } else {
      allPassed = false;
      console.log(`  ❌  ${env} — FAILED`);
      result.issues.forEach((issue) => console.log(`       • ${issue}`));
    }
  }

  console.log('');
  if (allPassed) {
    console.log('🎉  All configs passed QA.');
  } else {
    console.error('⚠️  Some configs failed QA. Run `npm run generate` to regenerate them.');
    process.exit(1);
  }
}

main();
