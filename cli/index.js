#!/usr/bin/env node
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');

// Built-in stacks (display name → template key)
export const stacks = {
  "React + TypeScript + Vite": "default",
  "Node + Express + TypeScript": "node",
  "Next.js": "next",
  "T3 Stack (Next.js + Tailwind + tRPC + Prisma)": "t3",
  "SaaS Starter (Next.js + Prisma + Stripe + tRPC + Tailwind)": "saas",
  "Monorepo (apps + services + packages)": "monorepo",
};

// Map CLI flag values to template keys
export const stackAliases = {
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

// ---------------------------------------------------------------------------
// Plugin system
// ---------------------------------------------------------------------------

/**
 * load plugins from the plugins/ directory at startup. Each plugin must be a
 * subdirectory containing a **`plugin.json`** manifest file that follows the
 * plugin API:
 *   { name, version, templates: { "Display Name": "template-key" }, templatePaths: { "template-key": "/abs/path" } }
 *
 * Returns an array of loaded plugin objects.
 */
export function loadPlugins() {
  const plugins = [];

  if (!fs.existsSync(PLUGINS_DIR)) return plugins;

  const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pluginDir = path.join(PLUGINS_DIR, entry.name);
    const manifestPath = path.join(pluginDir, 'plugin.json');

    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = fs.readJsonSync(manifestPath);
      // Resolve any relative template paths to absolute paths
      if (manifest.templatePaths) {
        for (const [key, relPath] of Object.entries(manifest.templatePaths)) {
          manifest.templatePaths[key] = path.resolve(pluginDir, relPath);
        }
      }
      plugins.push({ ...manifest, _dir: pluginDir });
    } catch (err) {
      console.warn(chalk.yellow(`⚠  Failed to load plugin "${entry.name}": ${err.message}`));
    }
  }

  return plugins;
}

/**
 * Merge plugin-contributed templates into the stacks and stackAliases objects.
 */
export function applyPlugins(plugins, stacksMap, aliasesMap) {
  for (const plugin of plugins) {
    if (!plugin.templates) continue;
    for (const [displayName, key] of Object.entries(plugin.templates)) {
      stacksMap[displayName] = key;
      aliasesMap[key] = key;
    }
  }
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const SUBCOMMANDS = ['create', 'template', 'ai', 'plugin'];

/**
 * Parse process.argv (or a provided array) into a structured result:
 *   { subcommand, subArgs, flags }
 *
 * Recognised subcommands: create, template, ai, plugin
 * Falls back to "create" for legacy invocations (no subcommand prefix).
 */
export function parseArgs(argv = process.argv) {
  const args = argv.slice(2);

  const result = {
    subcommand: null,
    subArgs: [],
    flags: {
      projectName: null,
      stack: null,
      template: null,
      git: false,
      docker: false,
      ai: false,
      help: false,
    },
  };

  // Detect subcommand
  if (args.length > 0 && SUBCOMMANDS.includes(args[0])) {
    result.subcommand = args[0];
    parseSubArgs(result, args.slice(1));
  } else {
    // Legacy / default: treat as implicit "create"
    result.subcommand = 'create';
    parseSubArgs(result, args);
  }

  return result;
}

function parseSubArgs(result, args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.flags.help = true;
    } else if ((arg === '--stack' || arg === '-s') && args[i + 1]) {
      result.flags.stack = args[++i];
    } else if ((arg === '--template' || arg === '-t') && args[i + 1]) {
      result.flags.template = args[++i];
    } else if (arg === '--git') {
      result.flags.git = true;
    } else if (arg === '--docker') {
      result.flags.docker = true;
    } else if (arg === '--ai') {
      result.flags.ai = true;
    } else if (!arg.startsWith('-')) {
      result.subArgs.push(arg);
    }
  }

  if (result.subArgs[0] && result.subcommand === 'create') {
    result.flags.projectName = result.subArgs[0];
  }
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

export function showHelp(stacksMap = stacks) {
  console.log(chalk.green.bold("\n🚀 AutoDevStack v2.0 CLI\n"));
  console.log(chalk.white("Scaffold production-ready full-stack projects in seconds.\n"));

  console.log(chalk.yellow.bold("USAGE:"));
  console.log(chalk.white("  autodevstack <subcommand> [args] [options]\n"));

  console.log(chalk.yellow.bold("SUBCOMMANDS:"));
  console.log(chalk.white("  create [project-name]        Scaffold a new project (default)"));
  console.log(chalk.white("  template [list]              List available templates"));
  console.log(chalk.white("  ai [prompt]                  AI-powered generation (coming soon)"));
  console.log(chalk.white("  plugin add <name>            Install a community plugin"));
  console.log(chalk.white("  plugin list                  List installed plugins\n"));

  console.log(chalk.yellow.bold("CREATE OPTIONS:"));
  console.log(chalk.white("  --stack, -s <name>           Specify stack (react, node, next, t3, saas, monorepo)"));
  console.log(chalk.white("  --template, -t <name>        Alias for --stack"));
  console.log(chalk.white("  --git                        Initialize Git repository"));
  console.log(chalk.white("  --docker                     Add Docker support (Dockerfile + docker-compose.yml)"));
  console.log(chalk.white("  --help, -h                   Show this help message\n"));

  console.log(chalk.yellow.bold("EXAMPLES:"));
  console.log(chalk.cyan("  autodevstack create my-app"));
  console.log(chalk.cyan("  autodevstack create my-app --stack next --git"));
  console.log(chalk.cyan("  autodevstack create my-saas --template saas --git --docker"));
  console.log(chalk.cyan("  autodevstack template list"));
  console.log(chalk.cyan("  autodevstack plugin add autodevstack-plugin-firebase\n"));

  console.log(chalk.yellow.bold("AVAILABLE STACKS:"));
  Object.entries(stacksMap).forEach(([name, key]) => {
    console.log(chalk.white(`  ${key.padEnd(12)} - ${name}`));
  });
  console.log();
}

// ---------------------------------------------------------------------------
// Docker support
// ---------------------------------------------------------------------------

export function addDockerSupport(projectDir, templateKey) {
  let dockerfile = '';
  let dockerCompose = '';

  if (templateKey === 'node' || templateKey === 'saas' || templateKey === 'next' || templateKey === 't3') {
    dockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

${templateKey === 'next' || templateKey === 't3' || templateKey === 'saas' ? 'RUN npm run build\n' : ''}
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
${templateKey === 'saas' ? `  database:
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
  postgres_data:` : ''}
`;
  } else if (templateKey === 'monorepo') {
    // Monorepo: copy docker-compose.yml from the infrastructure/docker directory that was
    // already scaffolded as part of the template; just create a root convenience file.
    const infraDockerDir = path.join(projectDir, 'infrastructure', 'docker');
    const srcCompose = path.join(infraDockerDir, 'docker-compose.yml');
    if (fs.existsSync(srcCompose)) {
      // Copy docker-compose.yml to project root for convenience
      fs.copyFileSync(srcCompose, path.join(projectDir, 'docker-compose.yml'));
    }
    // Copy .dockerignore from the template's infrastructure/docker directory to avoid duplication
    const srcDockerignore = path.join(infraDockerDir, '.dockerignore');
    if (fs.existsSync(srcDockerignore)) {
      fs.copyFileSync(srcDockerignore, path.join(projectDir, '.dockerignore'));
    }
    return;
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

// ---------------------------------------------------------------------------
// Subcommand: create
// ---------------------------------------------------------------------------

(async function main() {
  try {
    fs.copySync(templatePath, projectDir);

    // Rename _gitignore → .gitignore if present
    const gitignoreFrom = path.join(projectDir, '_gitignore');
    const gitignoreTo   = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignoreFrom)) {
      fs.moveSync(gitignoreFrom, gitignoreTo);
    }

    // Inject project name into package.json
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

  // Docker support
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

  // Git initialization
  if (flags.git) {
    const gitSpinner = ora('Initializing Git repository...').start();
    try {
      const originalDir = process.cwd();
      process.chdir(projectDir);

      execSync('git init', { stdio: 'ignore' });
      execSync('git add .', { stdio: 'ignore' });

      try {
        execSync('git commit -m "Initial commit"', { stdio: 'ignore' });
      } catch {
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
      gitSpinner.fail(chalk.red('Failed to initialize Git.'));
      console.error(chalk.gray(err.message));
    }
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

// ---------------------------------------------------------------------------
// Subcommand: template
// ---------------------------------------------------------------------------

export function handleTemplate(subArgs, stacksMap) {
  const action = subArgs[0] || 'list';

  if (action !== 'list') {
    console.log(chalk.red(`\n❌ Unknown template action "${action}". Try: template list\n`));
    process.exit(1);
  }

  console.log(chalk.green.bold("\n📦 Available Templates\n"));
  Object.entries(stacksMap).forEach(([name, key]) => {
    console.log(chalk.white(`  ${chalk.cyan(key.padEnd(12))} ${name}`));
  });
  console.log();
}

// ---------------------------------------------------------------------------
// Subcommand: ai
// ---------------------------------------------------------------------------

export function handleAI() {
  console.log(chalk.yellow("\n⚠️  AI-powered app generation is coming soon!"));
  console.log(chalk.gray("This feature will allow you to describe your app and generate a custom stack.\n"));
}

// ---------------------------------------------------------------------------
// Subcommand: plugin
// ---------------------------------------------------------------------------

export function handlePlugin(subArgs) {
  const action = subArgs[0];

  if (!action || action === 'list') {
    listPlugins();
    return;
  }

  if (action === 'add') {
    const pluginName = subArgs[1];
    if (!pluginName) {
      console.log(chalk.red('\n❌ Please specify a plugin name: autodevstack plugin add <name>\n'));
      process.exit(1);
    }
    addPlugin(pluginName);
    return;
  }

  if (action === 'remove') {
    const pluginName = subArgs[1];
    if (!pluginName) {
      console.log(chalk.red('\n❌ Please specify a plugin name: autodevstack plugin remove <name>\n'));
      process.exit(1);
    }
    removePlugin(pluginName);
    return;
  }

  console.log(chalk.red(`\n❌ Unknown plugin action "${action}". Try: plugin add <name> | plugin list | plugin remove <name>\n`));
  process.exit(1);
}

function listPlugins() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    console.log(chalk.gray('\nNo plugins installed.\n'));
    return;
  }

  const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory());

  if (entries.length === 0) {
    console.log(chalk.gray('\nNo plugins installed.\n'));
    return;
  }

  console.log(chalk.green.bold('\n🔌 Installed Plugins\n'));
  for (const entry of entries) {
    const manifestPath = path.join(PLUGINS_DIR, entry.name, 'plugin.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = fs.readJsonSync(manifestPath);
        const version = manifest.version ? chalk.gray(`v${manifest.version}`) : '';
        const desc = manifest.description ? chalk.gray(` - ${manifest.description}`) : '';
        console.log(chalk.white(`  ${chalk.cyan(manifest.name || entry.name)} ${version}${desc}`));
      } catch {
        console.log(chalk.white(`  ${entry.name}`));
      }
    } else {
      console.log(chalk.white(`  ${entry.name}`));
    }
  }
  console.log();
}

function addPlugin(pluginName) {
  // Sanitize plugin name to prevent path traversal.
  // For scoped packages like @scope/name, use only the "name" portion as the directory name.
  const safeName = pluginName.replace(/^@[^/]+\//, '').replace(/[/\\]/g, '-');
  if (!safeName) {
    console.log(chalk.red('\n❌ Invalid plugin name.\n'));
    process.exit(1);
  }

  const pluginDir = path.join(PLUGINS_DIR, safeName);

  if (fs.existsSync(pluginDir)) {
    console.log(chalk.yellow(`\n⚠  Plugin "${safeName}" is already installed.\n`));
    return;
  }

  const spinner = ora(`Installing plugin "${pluginName}"...`).start();

  try {
    // Ensure plugins directory exists
    fs.ensureDirSync(PLUGINS_DIR);

    // Install via npm into a temporary location then move to plugins dir
    const tmpDir = path.join(PLUGINS_DIR, '.tmp-install');
    fs.ensureDirSync(tmpDir);

    execSync(`npm install --prefix "${tmpDir}" "${pluginName}" --save`, {
      stdio: 'ignore',
    });

    // Move installed package into plugins/<name>
    const installedPkgDir = path.join(tmpDir, 'node_modules', pluginName);
    if (!fs.existsSync(installedPkgDir)) {
      throw new Error(`Package "${pluginName}" could not be found after installation.`);
    }

    fs.copySync(installedPkgDir, pluginDir);
    fs.removeSync(tmpDir);

    // Validate plugin structure
    const manifestPath = path.join(pluginDir, 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      // Create a minimal manifest so it appears in plugin list
      const pkgJsonPath = path.join(pluginDir, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        const pkg = fs.readJsonSync(pkgJsonPath);
        fs.writeJsonSync(manifestPath, {
          name: pkg.name || pluginName,
          version: pkg.version || '0.0.0',
          description: pkg.description || '',
          templates: {},
          templatePaths: {},
        }, { spaces: 2 });
      }
    }

    spinner.succeed(chalk.green(`Plugin "${pluginName}" installed successfully!`));
    console.log(chalk.gray(`  Installed to: ${pluginDir}\n`));
  } catch (err) {
    spinner.fail(chalk.red(`Failed to install plugin "${pluginName}".`));
    console.error(chalk.gray(err.message));
    // Clean up failed install
    if (fs.existsSync(pluginDir)) fs.removeSync(pluginDir);
    const tmpDir = path.join(PLUGINS_DIR, '.tmp-install');
    if (fs.existsSync(tmpDir)) fs.removeSync(tmpDir);
  }
}

function removePlugin(pluginName) {
  const safeName = path.basename(pluginName);
  const pluginDir = path.join(PLUGINS_DIR, safeName);

  if (!fs.existsSync(pluginDir)) {
    console.log(chalk.red(`\n❌ Plugin "${safeName}" is not installed.\n`));
    process.exit(1);
  }

  fs.removeSync(pluginDir);
  console.log(chalk.green(`\n✅ Plugin "${safeName}" removed.\n`));
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

(async function main() {
  try {
    const { subcommand, subArgs, flags } = parseArgs();

    // Load and apply plugins
    const plugins = loadPlugins();
    const pluginTemplatePaths = {};
    applyPlugins(plugins, stacks, stackAliases);
    for (const plugin of plugins) {
      if (plugin.templatePaths) {
        Object.assign(pluginTemplatePaths, plugin.templatePaths);
      }
    }

    // Global --help
    if (flags.help && subcommand !== 'plugin' && subcommand !== 'template') {
      showHelp(stacks);
      process.exit(0);
    }

    switch (subcommand) {
      case 'create':
        if (flags.help) {
          showHelp(stacks);
          process.exit(0);
        }
        await handleCreate(flags, stacks, stackAliases, pluginTemplatePaths);
        break;

      case 'template':
        handleTemplate(subArgs, stacks);
        break;

      case 'ai':
        handleAI();
        break;

      case 'plugin':
        handlePlugin(subArgs);
        break;

      default:
        showHelp(stacks);
        process.exit(0);
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
