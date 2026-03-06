#!/usr/bin/env node

/**
 * QA Validator
 *
 * Validates generated configuration files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.join(__dirname, '..', 'config');

const REQUIRED_FIELDS = ['environment', 'version', 'swarm', 'repository', 'analytics', 'deployment'];

async function validateJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(content);
    return { valid: true, config };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function validateRequiredFields(config) {
  const missing = [];

  for (const field of REQUIRED_FIELDS) {
    if (!config[field]) {
      missing.push(field);
    }
  }

  return missing;
}

async function validateConfig(filename) {
  const filePath = path.join(CONFIG_DIR, filename);

  console.log(`\n🔍 Validating ${filename}...`);

  // Check if file exists
  try {
    await fs.access(filePath);
  } catch {
    console.error(`❌ File not found: ${filename}`);
    return false;
  }

  // Validate JSON
  const jsonResult = await validateJSON(filePath);
  if (!jsonResult.valid) {
    console.error(`❌ Invalid JSON: ${jsonResult.error}`);
    return false;
  }
  console.log('✅ Valid JSON');

  // Validate required fields
  const missing = validateRequiredFields(jsonResult.config);
  if (missing.length > 0) {
    console.error(`❌ Missing required fields: ${missing.join(', ')}`);
    return false;
  }
  console.log('✅ All required fields present');

  // Validate swarm config
  if (!jsonResult.config.swarm?.max_agents || jsonResult.config.swarm.max_agents < 1) {
    console.error('❌ Invalid swarm.max_agents');
    return false;
  }
  console.log('✅ Valid swarm configuration');

  console.log(`✅ ${filename} is valid`);
  return true;
}

async function main() {
  console.log('🔬 AI Swarm Platform - QA Validator\n');
  console.log('=' .repeat(50));

  const configs = ['dev.json', 'prod.json', 'copilot.json'];
  const results = [];

  for (const config of configs) {
    const valid = await validateConfig(config);
    results.push({ config, valid });
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));

  results.forEach(({ config, valid }) => {
    const status = valid ? '✅' : '❌';
    console.log(`${status} ${config}`);
  });

  const allValid = results.every(r => r.valid);

  if (allValid) {
    console.log('\n🎉 All configurations are valid!');
    process.exit(0);
  } else {
    console.log('\n❌ Some configurations are invalid');
    process.exit(1);
  }
}

main().catch(console.error);
