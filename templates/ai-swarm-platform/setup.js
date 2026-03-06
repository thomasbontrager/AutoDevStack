#!/usr/bin/env node

/**
 * Setup Script
 *
 * Initializes the AI Swarm Platform
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createEnvFile() {
  console.log('\n📝 Setting up environment configuration...\n');

  const envPath = path.join(__dirname, '.env');

  if (await fileExists(envPath)) {
    const overwrite = await question('.env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Skipping .env creation');
      return;
    }
  }

  console.log('Please provide the following information:\n');

  const openaiKey = await question('OpenAI API Key: ');
  const ghToken = await question('GitHub Token: ');
  const ghUsername = await question('GitHub Username: ');

  const envContent = `# AI Swarm Platform Environment Configuration

# ========== AI Provider ==========
OPENAI_API_KEY=${openaiKey || 'your-openai-api-key'}

# ========== GitHub ==========
GH_TOKEN=${ghToken || 'your-github-token'}
GH_USERNAME=${ghUsername || 'your-github-username'}

# ========== Server ==========
NODE_ENV=development
PORT=4000

# ========== Database ==========
POSTGRES_DB=swarm
POSTGRES_USER=swarm
POSTGRES_PASSWORD=swarm_password

# ========== Deployment (Optional) ==========
SERVER_HOST=
SERVER_USER=
DOMAIN=
DEPLOY_KEY=
`;

  await fs.writeFile(envPath, envContent);
  console.log('\n✅ .env file created');
}

async function createDirectories() {
  console.log('\n📁 Creating required directories...\n');

  const dirs = ['config/history', 'data', 'logs'];

  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`✅ Created ${dir}/`);
  }
}

async function checkDependencies() {
  console.log('\n📦 Checking dependencies...\n');

  const packageJsonPath = path.join(__dirname, 'package.json');

  if (!(await fileExists(packageJsonPath))) {
    console.log('❌ package.json not found');
    return false;
  }

  const nodeModulesPath = path.join(__dirname, 'node_modules');

  if (!(await fileExists(nodeModulesPath))) {
    console.log('⚠️  Dependencies not installed');
    console.log('Please run: npm install');
    return false;
  }

  console.log('✅ Dependencies are installed');
  return true;
}

async function displayWelcome() {
  console.log('\n' + '='.repeat(70));
  console.log('🌊 Welcome to AI Swarm Platform Setup');
  console.log('='.repeat(70));
  console.log('\nThis script will help you set up your AI Swarm Platform.\n');
}

async function displayCompletion() {
  console.log('\n' + '='.repeat(70));
  console.log('✨ Setup Complete!');
  console.log('='.repeat(70));
  console.log('\nNext steps:\n');
  console.log('  1. Review .env and configure your API keys');
  console.log('  2. Install dependencies: npm install');
  console.log('  3. Generate AI configs: npm run generate');
  console.log('  4. Start the dashboard: npm start');
  console.log('  5. Run the swarm: npm run swarm');
  console.log('\nDocumentation: README.md');
  console.log('Dashboard: http://localhost:4000');
  console.log('\n' + '='.repeat(70) + '\n');
}

async function main() {
  try {
    await displayWelcome();
    await createEnvFile();
    await createDirectories();
    await checkDependencies();
    await displayCompletion();
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
