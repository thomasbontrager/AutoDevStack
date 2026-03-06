/**
 * deploy.js — Environment config deployment script
 * Detects DEPLOY_ENV and simulates / runs build steps.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configDir = path.resolve(__dirname, '..', 'config');

const DEPLOY_ENV = process.env.DEPLOY_ENV || 'dev';

function readConfig(env) {
  const cfgPath = path.join(configDir, `${env}.json`);
  if (!fs.existsSync(cfgPath)) {
    console.warn(`⚠️  Config not found for env "${env}" — using empty config.`);
    return {};
  }
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
}

function simulateDeploy(env, config) {
  console.log(`\n🚀  Deploying to environment: ${env}`);
  console.log('    Config preview:', JSON.stringify(config, null, 2).slice(0, 200), '…');
  console.log('    ✅  Deployment simulation complete.');
}

function runBuildSteps(env) {
  console.log(`\n🔨  Running build steps for ${env}…`);
  try {
    // In a real deployment you might run: npm run build, docker build, etc.
    const result = execSync('node --version', { encoding: 'utf8' });
    console.log(`    Node version: ${result.trim()}`);
    console.log(`    ✅  Build steps complete for ${env}.`);
  } catch (err) {
    console.error(`    ❌  Build step failed: ${err.message}`);
    process.exit(1);
  }
}

function main() {
  const config = readConfig(DEPLOY_ENV);

  if (DEPLOY_ENV === 'prod') {
    runBuildSteps(DEPLOY_ENV);
  }

  simulateDeploy(DEPLOY_ENV, config);

  // Write a deployment receipt
  const receipt = {
    deployedAt: new Date().toISOString(),
    env: DEPLOY_ENV,
    config,
  };
  const receiptPath = path.join(configDir, `deploy-receipt-${DEPLOY_ENV}.json`);
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  console.log(`\n📄  Deployment receipt saved → ${receiptPath}`);
}

main();
