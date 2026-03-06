#!/usr/bin/env node
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {
    projectName: null,
    stack: null,
    template: null,
    git: false,
    docker: false,
    ai: false,
    register: false,
    apiUrl: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (arg === '--stack' && args[i + 1]) {
      flags.stack = args[i + 1];
      i++;
    } else if (arg === '--template' && args[i + 1]) {
      flags.template = args[i + 1];
      i++;
    } else if (arg === '--git') {
      flags.git = true;
    } else if (arg === '--docker') {
      flags.docker = true;
    } else if (arg === '--ai') {
      flags.ai = true;
    } else if (arg === '--register') {
      flags.register = true;
    } else if (arg === '--api-url' && args[i + 1]) {
      flags.apiUrl = args[i + 1];
      i++;
    } else if (!arg.startsWith('-') && !flags.projectName) {
      flags.projectName = arg;
    }
  }

  return flags;
}

function showHelp() {
  console.log(chalk.green.bold("\n🚀 AutoDevStack CLI\n"));
  console.log(chalk.white("Scaffold production-ready full-stack projects in seconds.\n"));

  console.log(chalk.yellow.bold("USAGE:"));
  console.log(chalk.white("  autodevstack [project-name] [options]\n"));

  console.log(chalk.yellow.bold("OPTIONS:"));
  console.log(chalk.white("  --stack <name>       Specify stack (react, node, next, t3, saas, monorepo)"));
  console.log(chalk.white("  --template <name>    Alias for --stack"));
  console.log(chalk.white("  --git                Initialize Git repository"));
  console.log(chalk.white("  --docker             Add Docker support (Dockerfile + docker-compose.yml)"));
  console.log(chalk.white("  --ai                 AI-powered app generation (coming soon)"));
  console.log(chalk.white("  --register           Register project with the AutoDevStack platform API"));
  console.log(chalk.white("  --api-url <url>      Platform API URL (default: http://localhost:4000)"));
  console.log(chalk.white("  --help, -h           Show this help message\n"));

  console.log(chalk.yellow.bold("EXAMPLES:"));
  console.log(chalk.cyan("  autodevstack my-app"));
  console.log(chalk.cyan("  autodevstack my-app --stack next"));
  console.log(chalk.cyan("  autodevstack my-saas --template saas --git --docker"));
  console.log(chalk.cyan("  autodevstack my-platform --stack monorepo\n"));

  console.log(chalk.yellow.bold("AVAILABLE STACKS:"));
  Object.entries(stacks).forEach(([name, key]) => {
    console.log(chalk.white(`  ${key.padEnd(12)} - ${name}`));
  });
  console.log();
}

function addDockerSupport(projectDir, templateKey) {
  // Generate Dockerfile based on template type
  let dockerfile = '';
  let dockerCompose = '';

  if (templateKey === 'node' || templateKey === 'saas' || templateKey === 'next' || templateKey === 't3') {
    // Node.js-based Dockerfile
    dockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

${templateKey === 'next' || templateKey === 't3' || templateKey === 'saas' ? 'RUN npm run build\n' : ''}
EXPOSE ${templateKey === 'node' ? '3000' : '3000'}

CMD ["npm", "run", "${templateKey === 'node' ? 'start' : 'start'}"]
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
  } else if (templateKey === 'default') {
    // React/Vite Dockerfile
    dockerfile = `FROM node:18-alpine as builder

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

  // Write Docker files
  fs.writeFileSync(path.join(projectDir, 'Dockerfile'), dockerfile);
  fs.writeFileSync(path.join(projectDir, 'docker-compose.yml'), dockerCompose);

  // Add .dockerignore
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

async function registerWithPlatform(projectName, templateKey, description, apiUrl) {
  const url = apiUrl || 'http://localhost:4000';

  // Prompt for platform credentials
  const { username, password } = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Platform API username:',
      validate: input => input.trim() ? true : 'Username cannot be empty.',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Platform API password:',
      mask: '*',
      validate: input => input ? true : 'Password cannot be empty.',
    },
  ]);

  // Login
  let token;
  try {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      throw new Error(loginData.error || 'Login failed');
    }
    token = loginData.token;
  } catch (err) {
    throw new Error(`Failed to authenticate with platform: ${err.message}`);
  }

  // Register project
  const registerRes = await fetch(`${url}/api/projects/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ name: projectName, stack: templateKey, description }),
  });
  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(registerData.error || 'Project registration failed');
  }
  return registerData.project;
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
    const flags = parseArgs();

    // Show help if requested
    if (flags.help) {
      showHelp();
      process.exit(0);
    }

    // AI mode placeholder
    if (flags.ai) {
      console.log(chalk.yellow("\n⚠️  AI-powered app generation is coming soon!"));
      console.log(chalk.gray("This feature will allow you to describe your app and generate a custom stack.\n"));
      process.exit(0);
    }

    console.log(chalk.green.bold("\n🚀 Welcome to AutoDevStack! 🚀"));
    console.log(chalk.gray("Scaffold your next project in seconds.\n"));

    // Determine which prompts to show
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

    // Use --template or --stack flag
    const stackFlag = flags.template || flags.stack;
    if (!stackFlag) {
      questions.push({
        type: 'list',
        name: 'stack',
        message: 'Choose a stack:',
        choices: Object.keys(stacks),
      });
    }

    const answers = questions.length > 0 ? await inquirer.prompt(questions) : {};

    // Merge flags and answers
    const projectName = (flags.projectName || answers.projectName).trim();
    let selectedStack;

    if (stackFlag) {
      const templateKey = stackAliases[stackFlag.toLowerCase()];
      if (!templateKey) {
        console.log(chalk.red(`\n❌ Unknown stack "${stackFlag}". Use --help to see available stacks.\n`));
        process.exit(1);
      }
      // Find the display name
      selectedStack = Object.keys(stacks).find(key => stacks[key] === templateKey);
    } else {
      selectedStack = answers.stack;
    }

    const projectDir = path.join(process.cwd(), projectName);

    if (fs.existsSync(projectDir)) {
      console.log(chalk.red(`\n❌ Folder "${projectName}" already exists. Choose a different name.\n`));
      process.exit(1);
    }

    const templateKey = stacks[selectedStack];
    const templatePath = path.join(__dirname, '..', 'templates', templateKey);

    if (!fs.existsSync(templatePath)) {
      console.log(chalk.red(`\n❌ Template for "${selectedStack}" not found.\n`));
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

    // Add Docker support if requested
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

    // Initialize Git if requested
    if (flags.git) {
      const gitSpinner = ora('Initializing Git repository...').start();
      try {
        const originalDir = process.cwd();
        process.chdir(projectDir);

        execSync('git init', { stdio: 'ignore' });
        execSync('git add .', { stdio: 'ignore' });

        // Try to commit, but configure git if needed
        try {
          execSync('git commit -m "Initial commit"', { stdio: 'ignore' });
        } catch (commitErr) {
          // If commit fails, likely due to missing git config, configure and retry
          try {
            execSync('git config user.email "autodevstack@example.com"', { stdio: 'ignore' });
            execSync('git config user.name "AutoDevStack"', { stdio: 'ignore' });
            execSync('git commit -m "Initial commit"', { stdio: 'ignore' });
          } catch (retryErr) {
            // If still fails, just warn but don't fail the whole operation
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

    // Register with platform API if requested
    if (flags.register) {
      try {
        const project = await registerWithPlatform(
          projectName,
          templateKey,
          '',
          flags.apiUrl
        );
        console.log(chalk.green(`✅ Project registered on platform (ID: ${project.id})`));
      } catch (err) {
        console.log(chalk.yellow(`⚠️  Could not register with platform: ${err.message}`));
        console.log(chalk.gray('   You can register later by starting the API server and running autodevstack register.'));
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

  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\nAborted.\n'));
      process.exit(0);
    }
    console.error(chalk.red('\n❌ Something went wrong:'), error.message);
    process.exit(1);
  }
})();
