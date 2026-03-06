#!/usr/bin/env node
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const stacks = {
  "React + TypeScript + Vite": "default",
  "Node + Express + TypeScript": "node",
  "Next.js": "next",
  "T3 Stack (Next.js + Tailwind + tRPC + Prisma)": "t3",
};

// Short-name aliases accepted by the --stack flag
const stackAliases = {
  "react": "React + TypeScript + Vite",
  "default": "React + TypeScript + Vite",
  "vite": "React + TypeScript + Vite",
  "node": "Node + Express + TypeScript",
  "express": "Node + Express + TypeScript",
  "next": "Next.js",
  "nextjs": "Next.js",
  "t3": "T3 Stack (Next.js + Tailwind + tRPC + Prisma)",
};

function printHelp() {
  console.log(chalk.green.bold('\n🚀 AutoDevStack v1.1\n'));
  console.log(chalk.white('  Scaffold your next project in seconds.\n'));
  console.log(chalk.bold('Usage:'));
  console.log('  autodevstack [project-name] [options]\n');
  console.log(chalk.bold('Options:'));
  console.log('  -s, --stack <name>      Stack alias: react, node, next, t3');
  console.log('  -t, --template <key>    Template key: default, node, next, t3');
  console.log('      --ai                Add AI integration setup');
  console.log('      --git               Initialize a Git repository');
  console.log('      --docker            Add Docker support (Dockerfile + docker-compose)');
  console.log('  -h, --help              Show this help message\n');
  console.log(chalk.bold('Examples:'));
  console.log(chalk.cyan('  autodevstack my-app --stack react'));
  console.log(chalk.cyan('  autodevstack my-api --stack node --git --docker'));
  console.log(chalk.cyan('  autodevstack my-app --template t3 --ai\n'));
}

const PROJECT_NAME_PATTERN = /^[a-z0-9-_]+$/i;

function validateProjectName(name) {
  if (!name || !name.trim()) return 'Project name cannot be empty.';
  if (!PROJECT_NAME_PATTERN.test(name.trim())) {
    return 'Project name can only contain letters, numbers, dashes, and underscores.';
  }
  return true;
}

(async function main() {
  // Parse CLI arguments
  let flags, positionals;
  try {
    ({ values: flags, positionals } = parseArgs({
      args: process.argv.slice(2),
      options: {
        stack:    { type: 'string',  short: 's' },
        template: { type: 'string',  short: 't' },
        ai:       { type: 'boolean' },
        git:      { type: 'boolean' },
        docker:   { type: 'boolean' },
        help:     { type: 'boolean', short: 'h' },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    console.error(chalk.red(`\n❌ ${err.message}\n`));
    printHelp();
    process.exit(1);
  }

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  console.log(chalk.green.bold("\n🚀 Welcome to AutoDevStack! 🚀"));
  console.log(chalk.gray("Scaffold your next project in seconds.\n"));

  try {
    // Resolve stack name from --stack or --template flag, if provided
    let resolvedStack = null;
    if (flags.stack) {
      const match = stackAliases[flags.stack.toLowerCase()];
      if (!match) {
        console.log(chalk.red(`\n❌ Unknown stack "${flags.stack}". Valid options: ${Object.keys(stackAliases).join(', ')}\n`));
        process.exit(1);
      }
      resolvedStack = match;
    } else if (flags.template) {
      const entry = Object.entries(stacks).find(([, v]) => v === flags.template.toLowerCase());
      if (!entry) {
        console.log(chalk.red(`\n❌ Unknown template "${flags.template}". Valid options: ${Object.values(stacks).join(', ')}\n`));
        process.exit(1);
      }
      resolvedStack = entry[0];
    }

    // Validate positional project name early so the user gets feedback before prompts
    if (positionals[0]) {
      const validation = validateProjectName(positionals[0]);
      if (validation !== true) {
        console.log(chalk.red(`\n❌ ${validation}\n`));
        process.exit(1);
      }
    }

    // Build the list of prompts for values not supplied via flags
    const prompts = [];

    if (!positionals[0]) {
      prompts.push({
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        validate: (input) => validateProjectName(input),
      });
    }

    if (!resolvedStack) {
      prompts.push({
        type: 'list',
        name: 'stack',
        message: 'Choose a stack:',
        choices: Object.keys(stacks),
      });
    }

    if (!('ai' in flags)) {
      prompts.push({
        type: 'confirm',
        name: 'ai',
        message: 'Add AI integration setup?',
        default: false,
      });
    }

    if (!('git' in flags)) {
      prompts.push({
        type: 'confirm',
        name: 'git',
        message: 'Initialize a Git repository?',
        default: true,
      });
    }

    if (!('docker' in flags)) {
      prompts.push({
        type: 'confirm',
        name: 'docker',
        message: 'Add Docker support?',
        default: false,
      });
    }

    const answers = prompts.length > 0 ? await inquirer.prompt(prompts) : {};

    const projectName = (positionals[0] || answers.projectName).trim();
    const stackName   = resolvedStack || answers.stack;
    const useAi       = flags.ai     ?? answers.ai     ?? false;
    const useGit      = flags.git    ?? answers.git    ?? false;
    const useDocker   = flags.docker ?? answers.docker ?? false;

    const projectDir = path.join(process.cwd(), projectName);

    if (fs.existsSync(projectDir)) {
      console.log(chalk.red(`\n❌ Folder "${projectName}" already exists. Choose a different name.\n`));
      process.exit(1);
    }

    const templateKey  = stacks[stackName];
    const templatePath = path.join(__dirname, '..', 'templates', templateKey);

    if (!fs.existsSync(templatePath)) {
      console.log(chalk.red(`\n❌ Template for "${stackName}" not found.\n`));
      process.exit(1);
    }

    const spinner = ora(`Creating project "${projectName}"...`).start();

    try {
      fs.copySync(templatePath, projectDir);

      // Rename _gitignore to .gitignore if present
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

    console.log(chalk.blue(`\n✨ Stack: ${stackName}\n`));
    if (useAi)     console.log(chalk.blue('🤖 AI integration: enabled'));
    if (useGit)    console.log(chalk.blue('📦 Git: initialized'));
    if (useDocker) console.log(chalk.blue('🐳 Docker: configured'));
    console.log(chalk.bold('\nNext steps:'));
    console.log(chalk.cyan(`  cd ${projectName}`));
    console.log(chalk.cyan('  npm install'));
    console.log(chalk.cyan('  npm run dev'));
    console.log(chalk.green.bold('\nHappy coding! 🎉\n'));

  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\nAborted.\n'));
      process.exit(0);
    }
    console.error(chalk.red('\n❌ Something went wrong:'), error.message);
    process.exit(1);
  }
})();
