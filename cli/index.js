#!/usr/bin/env node
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);
const { version: CLI_VERSION } = _require('../package.json');

// Built-in stacks
const stacks = {
  "React + TypeScript + Vite": "default",
  "Node + Express + TypeScript": "node",
  "Next.js": "next",
  "T3 Stack (Next.js + Tailwind + tRPC + Prisma)": "t3",
  "SaaS Starter (Next.js + Prisma + Stripe + tRPC + Tailwind)": "saas",
  "Monorepo (apps + services + packages)": "monorepo",
};

// Map CLI flags to template keys
const stackAliases = {
  'default': 'default',
  'react': 'default',
  'node': 'node',
  'express': 'node',
  'next': 'next',
  'nextjs': 'next',
  't3': 't3',
  'saas': 'saas',
  'monorepo': 'monorepo',
};

// Plugin registry – populated at startup from plugins/<name>/plugin.json
const pluginTemplates = {};  // displayName -> { key, path, plugin }
const pluginAliases = {};    // key.toLowerCase() -> key

// Load plugins from the plugins/ directory
function loadPlugins() {
  const pluginsDir = path.join(__dirname, '..', 'plugins');
  if (!fs.existsSync(pluginsDir)) return;

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(pluginsDir, entry.name, 'plugin.json');
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = fs.readJsonSync(manifestPath);
      const templates = manifest.templates || [];
      for (const tpl of templates) {
        const tplPath = path.resolve(
          pluginsDir,
          entry.name,
          tpl.path || `templates/${tpl.key}`
        );
        if (fs.existsSync(tplPath)) {
          pluginTemplates[tpl.name] = { key: tpl.key, path: tplPath, plugin: manifest.name };
          pluginAliases[tpl.key.toLowerCase()] = tpl.key;
        }
      }
    } catch {
      // Skip plugins with invalid manifests
    }
  }
}

// ─── Help ────────────────────────────────────────────────────────────────────

function showHelp() {
  console.log(chalk.green.bold(`\n🚀 AutoDevStack v${CLI_VERSION} CLI\n`));
  console.log(chalk.white("Scaffold production-ready full-stack projects in seconds.\n"));

  console.log(chalk.yellow.bold("USAGE:"));
  console.log(chalk.white("  autodevstack <subcommand> [options]\n"));

  console.log(chalk.yellow.bold("SUBCOMMANDS:"));
  console.log(chalk.white("  create   [name] [opts]   Scaffold a new project (default when no subcommand)"));
  console.log(chalk.white("  template <subcommand>    Manage and list available templates"));
  console.log(chalk.white("  ai       [description]   AI-powered app generation (coming soon)"));
  console.log(chalk.white("  plugin   <subcommand>    Manage plugins\n"));

  console.log(chalk.yellow.bold("CREATE OPTIONS:"));
  console.log(chalk.white("  --stack, -s <name>   Specify stack (react, node, next, t3, saas, monorepo)"));
  console.log(chalk.white("  --template, -t <n>   Alias for --stack"));
  console.log(chalk.white("  --git                Initialize a Git repository after scaffolding"));
  console.log(chalk.white("  --docker             Add Docker support (Dockerfile + docker-compose.yml)"));
  console.log(chalk.white("  --help, -h           Show this help message\n"));

  console.log(chalk.yellow.bold("PLUGIN SUBCOMMANDS:"));
  console.log(chalk.white("  plugin add <name>    Install a plugin from npm or a local path"));
  console.log(chalk.white("  plugin list          List installed plugins"));
  console.log(chalk.white("  plugin remove <name> Remove an installed plugin\n"));

  console.log(chalk.yellow.bold("TEMPLATE SUBCOMMANDS:"));
  console.log(chalk.white("  template list        List all available templates (built-in + plugins)\n"));

  console.log(chalk.yellow.bold("EXAMPLES:"));
  console.log(chalk.cyan("  autodevstack my-app"));
  console.log(chalk.cyan("  autodevstack create my-app --stack next"));
  console.log(chalk.cyan("  autodevstack create my-saas --template saas --git --docker"));
  console.log(chalk.cyan("  autodevstack template list"));
  console.log(chalk.cyan("  autodevstack plugin add autodevstack-plugin-svelte"));
  console.log(chalk.cyan("  autodevstack plugin list\n"));

  console.log(chalk.yellow.bold("AVAILABLE STACKS:"));
  Object.entries(stacks).forEach(([name, key]) => {
    console.log(chalk.white(`  ${key.padEnd(12)} - ${name}`));
  });

  if (Object.keys(pluginTemplates).length > 0) {
    console.log(chalk.yellow.bold("\nPLUGIN STACKS:"));
    Object.entries(pluginTemplates).forEach(([name, info]) => {
      console.log(chalk.white(`  ${info.key.padEnd(12)} - ${name} (plugin: ${info.plugin})`));
    });
  }

  console.log();
}

// ─── Docker support ───────────────────────────────────────────────────────────

function addDockerSupport(projectDir, templateKey) {
  let dockerfile = '';
  let dockerCompose = '';

  if (templateKey === 'node' || templateKey === 'saas' || templateKey === 'next' || templateKey === 't3') {
    const hasBuildStep = templateKey === 'next' || templateKey === 't3' || templateKey === 'saas';
    dockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

${hasBuildStep ? 'RUN npm run build\n\n' : ''}EXPOSE 3000

CMD ["npm", "run", "start"]
`;

    const dbService = templateKey === 'saas' ? `
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:` : '';

    dockerCompose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
${dbService}
`;
  } else if (templateKey === 'default') {
    dockerfile = `FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;

    dockerCompose = `version: '3.8'

services:
  web:
    build: .
    ports:
      - "80:80"
`;
  } else {
    // Generic fallback for plugin templates
    dockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]
`;

    dockerCompose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
`;
  }

  fs.writeFileSync(path.join(projectDir, 'Dockerfile'), dockerfile);
  fs.writeFileSync(path.join(projectDir, 'docker-compose.yml'), dockerCompose);

  const dockerignore = `node_modules
npm-debug.log
.env
.git
.gitignore
README.md
.DS_Store
dist
build
`;
  fs.writeFileSync(path.join(projectDir, '.dockerignore'), dockerignore);
}

// ─── Git initialization ───────────────────────────────────────────────────────

function initGit(projectDir) {
  const gitSpinner = ora('Initializing Git repository...').start();
  const originalDir = process.cwd();
  try {
    process.chdir(projectDir);
    execSync('git init', { stdio: 'ignore' });
    execSync('git add .', { stdio: 'ignore' });
    try {
      execSync('git commit -m "Initial commit"', { stdio: 'ignore' });
    } catch {
      // Commit may fail if git user is not configured; configure locally and retry
      try {
        execSync('git config user.email "autodevstack@example.com"', { stdio: 'ignore' });
        execSync('git config user.name "AutoDevStack"', { stdio: 'ignore' });
        execSync('git commit -m "Initial commit"', { stdio: 'ignore' });
      } catch {
        gitSpinner.warn(chalk.yellow('Git initialized but commit failed. You may need to configure git.'));
        process.chdir(originalDir);
        return;
      }
    }
    process.chdir(originalDir);
    gitSpinner.succeed(chalk.green('Git repository initialized!'));
  } catch (err) {
    process.chdir(originalDir);
    gitSpinner.fail(chalk.red('Failed to initialize Git.'));
    console.error(chalk.gray(err.message));
  }
}

// ─── Argument parsing (create subcommand) ────────────────────────────────────

function parseCreateArgs(args) {
  const flags = {
    projectName: null,
    stack: null,
    template: null,
    git: false,
    docker: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if ((arg === '--stack' || arg === '-s') && args[i + 1]) {
      flags.stack = args[i + 1];
      i++;
    } else if ((arg === '--template' || arg === '-t') && args[i + 1]) {
      flags.template = args[i + 1];
      i++;
    } else if (arg === '--git') {
      flags.git = true;
    } else if (arg === '--docker') {
      flags.docker = true;
    } else if (!arg.startsWith('-') && !flags.projectName) {
      flags.projectName = arg;
    }
  }

  return flags;
}

// ─── Subcommand: create ───────────────────────────────────────────────────────

async function handleCreate(args) {
  const flags = parseCreateArgs(args);

  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  console.log(chalk.green.bold("\n🚀 Welcome to AutoDevStack! 🚀"));
  console.log(chalk.gray("Scaffold your next project in seconds.\n"));

  // Build all available stack choices (built-in + plugins)
  const allStackChoices = [
    ...Object.keys(stacks),
    ...Object.keys(pluginTemplates),
  ];

  const questions = [];

  if (!flags.projectName) {
    questions.push({
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      validate: (input) => {
        if (!input.trim()) return 'Project name cannot be empty.';
        if (!/^[a-z0-9-_]+$/i.test(input.trim())) return 'Project name can only contain letters, numbers, dashes, and underscores.';
        return true;
      },
    });
  }

  const stackFlag = flags.template || flags.stack;
  if (!stackFlag) {
    questions.push({
      type: 'list',
      name: 'stack',
      message: 'Choose a stack:',
      choices: allStackChoices,
    });
  }

  const answers = questions.length > 0 ? await inquirer.prompt(questions) : {};
  const projectName = (flags.projectName || answers.projectName).trim();

  let selectedStack;
  let templateKey;
  let templatePath;

  if (stackFlag) {
    const alias = stackFlag.toLowerCase();
    if (stackAliases[alias]) {
      templateKey = stackAliases[alias];
      selectedStack = Object.keys(stacks).find(k => stacks[k] === templateKey);
      templatePath = path.join(__dirname, '..', 'templates', templateKey);
    } else if (pluginAliases[alias]) {
      templateKey = pluginAliases[alias];
      const info = Object.values(pluginTemplates).find(t => t.key === templateKey);
      selectedStack = Object.keys(pluginTemplates).find(k => pluginTemplates[k].key === templateKey);
      templatePath = info.path;
    } else {
      console.log(chalk.red(`\n❌ Unknown stack "${stackFlag}". Use --help to see available stacks.\n`));
      process.exit(1);
    }
  } else {
    selectedStack = answers.stack;
    if (stacks[selectedStack]) {
      templateKey = stacks[selectedStack];
      templatePath = path.join(__dirname, '..', 'templates', templateKey);
    } else if (pluginTemplates[selectedStack]) {
      templateKey = pluginTemplates[selectedStack].key;
      templatePath = pluginTemplates[selectedStack].path;
    } else {
      console.log(chalk.red(`\n❌ Unknown stack "${selectedStack}".\n`));
      process.exit(1);
    }
  }

  const projectDir = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectDir)) {
    console.log(chalk.red(`\n❌ Folder "${projectName}" already exists. Choose a different name.\n`));
    process.exit(1);
  }

  if (!fs.existsSync(templatePath)) {
    console.log(chalk.red(`\n❌ Template for "${selectedStack}" not found.\n`));
    process.exit(1);
  }

  const spinner = ora(`Creating project "${projectName}"...`).start();
  try {
    fs.copySync(templatePath, projectDir);

    // Rename _gitignore → .gitignore if present
    const gitignoreFrom = path.join(projectDir, '_gitignore');
    const gitignoreTo   = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignoreFrom)) {
      fs.moveSync(gitignoreFrom, gitignoreTo);
    }

    // Inject the project name into package.json
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = fs.readJsonSync(pkgPath);
      pkg.name = projectName;
      fs.writeJsonSync(pkgPath, pkg, { spaces: 2 });
    }

    spinner.succeed(chalk.green(`Project "${projectName}" created successfully!`));
  } catch (err) {
    spinner.fail(chalk.red('Failed to create project.'));
    throw err;
  }

  if (flags.docker) {
    const dockerSpinner = ora('Adding Docker support...').start();
    try {
      addDockerSupport(projectDir, templateKey);
      dockerSpinner.succeed(chalk.green('Docker support added!'));
    } catch (err) {
      dockerSpinner.fail(chalk.red('Failed to add Docker support.'));
      console.error(err.message);
    }
  }

  if (flags.git) {
    initGit(projectDir);
  }

  console.log(chalk.blue(`\n✨ Stack: ${selectedStack}\n`));
  console.log(chalk.bold('Next steps:'));
  console.log(chalk.cyan(`  cd ${projectName}`));
  console.log(chalk.cyan('  npm install'));
  if (flags.docker) {
    console.log(chalk.cyan('  docker-compose up'));
  } else {
    console.log(chalk.cyan('  npm run dev'));
  }
  console.log(chalk.green.bold('\nHappy coding! 🎉\n'));
}

// ─── Subcommand: template ─────────────────────────────────────────────────────

async function handleTemplate(args) {
  const sub = args[0];

  if (!sub || sub === 'list') {
    console.log(chalk.green.bold('\n📦 Available Templates\n'));

    console.log(chalk.yellow.bold('Built-in:'));
    Object.entries(stacks).forEach(([name, key]) => {
      console.log(chalk.white(`  ${key.padEnd(12)} - ${name}`));
    });

    if (Object.keys(pluginTemplates).length > 0) {
      console.log(chalk.yellow.bold('\nFrom plugins:'));
      Object.entries(pluginTemplates).forEach(([name, info]) => {
        console.log(chalk.white(`  ${info.key.padEnd(12)} - ${name} (plugin: ${info.plugin})`));
      });
    }

    console.log();
    return;
  }

  console.log(chalk.red(`\n❌ Unknown template subcommand "${sub}". Try: template list\n`));
  process.exit(1);
}

// ─── Subcommand: ai ───────────────────────────────────────────────────────────

async function handleAi(args) {
  const description = args.filter(a => !a.startsWith('-')).join(' ');
  console.log(chalk.yellow('\n⚠️  AI-powered app generation is coming soon!'));
  if (description) {
    console.log(chalk.gray(`  Your description: "${description}"`));
  }
  console.log(chalk.gray('This feature will allow you to describe your app and generate a custom stack.\n'));
}

// ─── Subcommand: plugin ───────────────────────────────────────────────────────

async function handlePlugin(args) {
  const sub = args[0];

  if (!sub || sub === '--help' || sub === '-h') {
    console.log(chalk.green.bold('\n🔌 AutoDevStack Plugin Manager\n'));
    console.log(chalk.yellow.bold('USAGE:'));
    console.log(chalk.white('  autodevstack plugin add <name>     Install a plugin'));
    console.log(chalk.white('  autodevstack plugin list           List installed plugins'));
    console.log(chalk.white('  autodevstack plugin remove <name>  Remove a plugin\n'));
    return;
  }

  if (sub === 'list') {
    await handlePluginList();
    return;
  }

  if (sub === 'add') {
    const pluginName = args[1];
    if (!pluginName) {
      console.log(chalk.red('\n❌ Please specify a plugin name.\n'));
      console.log(chalk.gray('  Usage: autodevstack plugin add <name>\n'));
      process.exit(1);
    }
    await handlePluginAdd(pluginName);
    return;
  }

  if (sub === 'remove') {
    const pluginName = args[1];
    if (!pluginName) {
      console.log(chalk.red('\n❌ Please specify a plugin name.\n'));
      console.log(chalk.gray('  Usage: autodevstack plugin remove <name>\n'));
      process.exit(1);
    }
    await handlePluginRemove(pluginName);
    return;
  }

  console.log(chalk.red(`\n❌ Unknown plugin subcommand "${sub}". Try: plugin add, plugin list, plugin remove\n`));
  process.exit(1);
}

async function handlePluginList() {
  const pluginsDir = path.join(__dirname, '..', 'plugins');
  const installed = [];

  if (fs.existsSync(pluginsDir)) {
    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(pluginsDir, entry.name, 'plugin.json');
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const manifest = fs.readJsonSync(manifestPath);
        installed.push(manifest);
      } catch {
        installed.push({ name: entry.name, version: '(unknown)', description: '' });
      }
    }
  }

  if (installed.length === 0) {
    console.log(chalk.yellow('\n📭 No plugins installed.\n'));
    console.log(chalk.gray('  Install one with: autodevstack plugin add <name>\n'));
    return;
  }

  console.log(chalk.green.bold(`\n🔌 Installed Plugins (${installed.length})\n`));
  installed.forEach(p => {
    console.log(chalk.white(`  ${(p.name || '(unnamed)').padEnd(30)} v${p.version || '?'}  ${p.description || ''}`));
  });
  console.log();
}

async function handlePluginAdd(pluginName) {
  const pluginsDir = path.join(__dirname, '..', 'plugins');
  fs.ensureDirSync(pluginsDir);

  // Determine if this is a local path or an npm package name
  const isLocalPath = pluginName.startsWith('.') || pluginName.startsWith('/');

  if (isLocalPath) {
    const sourcePath = path.resolve(process.cwd(), pluginName);
    if (!fs.existsSync(sourcePath)) {
      console.log(chalk.red(`\n❌ Local path "${sourcePath}" does not exist.\n`));
      process.exit(1);
    }

    const manifestPath = path.join(sourcePath, 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      console.log(chalk.red(`\n❌ No plugin.json found at "${sourcePath}".\n`));
      process.exit(1);
    }

    let manifest;
    try {
      manifest = fs.readJsonSync(manifestPath);
    } catch {
      console.log(chalk.red('\n❌ plugin.json is not valid JSON.\n'));
      process.exit(1);
    }

    const destName = manifest.name || path.basename(sourcePath);
    const destPath = path.join(pluginsDir, destName);

    if (fs.existsSync(destPath)) {
      console.log(chalk.yellow(`\n⚠️  Plugin "${destName}" is already installed. Updating...\n`));
      fs.removeSync(destPath);
    }

    const spinner = ora(`Installing plugin "${destName}" from local path...`).start();
    try {
      fs.copySync(sourcePath, destPath);
      spinner.succeed(chalk.green(`Plugin "${destName}" installed successfully!`));
    } catch (err) {
      spinner.fail(chalk.red(`Failed to install plugin "${destName}".`));
      console.error(err.message);
      process.exit(1);
    }
  } else {
    // npm package
    const spinner = ora(`Installing plugin "${pluginName}" from npm...`).start();
    const tempDir = path.join(pluginsDir, '.tmp-install');
    try {
      fs.ensureDirSync(tempDir);
      // Install npm package into a temporary location
      execSync(`npm install "${pluginName}" --prefix "${tempDir}" --no-save`, { stdio: 'ignore' });

      const pkgDir = path.join(tempDir, 'node_modules', pluginName);
      if (!fs.existsSync(pkgDir)) {
        throw new Error(`Package directory not found after install: ${pkgDir}`);
      }

      const manifestPath = path.join(pkgDir, 'plugin.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error(`"${pluginName}" does not appear to be a valid AutoDevStack plugin (missing plugin.json).`);
      }

      const manifest = fs.readJsonSync(manifestPath);
      const destName = manifest.name || pluginName;
      const destPath = path.join(pluginsDir, destName);

      if (fs.existsSync(destPath)) {
        fs.removeSync(destPath);
      }

      fs.copySync(pkgDir, destPath);
      spinner.succeed(chalk.green(`Plugin "${destName}" installed successfully!`));
    } catch (err) {
      spinner.fail(chalk.red(`Failed to install plugin "${pluginName}".`));
      console.error(chalk.gray(err.message));
      process.exit(1);
    } finally {
      fs.removeSync(tempDir);
    }
  }
}

async function handlePluginRemove(pluginName) {
  const pluginsDir = path.join(__dirname, '..', 'plugins');
  const pluginPath = path.join(pluginsDir, pluginName);

  if (!fs.existsSync(pluginPath)) {
    console.log(chalk.red(`\n❌ Plugin "${pluginName}" is not installed.\n`));
    process.exit(1);
  }

  const spinner = ora(`Removing plugin "${pluginName}"...`).start();
  try {
    fs.removeSync(pluginPath);
    spinner.succeed(chalk.green(`Plugin "${pluginName}" removed successfully!`));
  } catch (err) {
    spinner.fail(chalk.red(`Failed to remove plugin "${pluginName}".`));
    console.error(err.message);
    process.exit(1);
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

(async function main() {
  loadPlugins();

  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const firstArg = args[0];

  // Top-level help
  if (firstArg === '--help' || firstArg === '-h') {
    showHelp();
    process.exit(0);
  }

  try {
    if (firstArg === 'create') {
      await handleCreate(args.slice(1));
    } else if (firstArg === 'template') {
      await handleTemplate(args.slice(1));
    } else if (firstArg === 'ai') {
      await handleAi(args.slice(1));
    } else if (firstArg === 'plugin') {
      await handlePlugin(args.slice(1));
    } else {
      // Legacy / default mode: no subcommand → behave as 'create'
      await handleCreate(args);
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\nAborted.\n'));
      process.exit(0);
    }
    console.error(chalk.red('\n❌ Something went wrong:'), error.message);
    process.exit(1);
  }
})();
