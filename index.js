#!/usr/bin/env node
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(chalk.green.bold("\n🚀 Welcome to AutoDevStack! 🚀"));
console.log(chalk.gray("Scaffold your next project in seconds.\n"));

const stacks = {
  "React + TypeScript + Vite": "default",
  "Node + Express + TypeScript": "node",
  "Next.js": "next",
  "T3 Stack (Next.js + Tailwind + tRPC + Prisma)": "t3",
};

(async function main() {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        validate: (input) => {
          if (!input.trim()) return 'Project name cannot be empty.';
          if (!/^[a-z0-9-_]+$/i.test(input.trim())) return 'Project name can only contain letters, numbers, dashes, and underscores.';
          return true;
        },
      },
      {
        type: 'list',
        name: 'stack',
        message: 'Choose a stack:',
        choices: Object.keys(stacks),
      },
    ]);

    const projectName = answers.projectName.trim();
    const projectDir = path.join(process.cwd(), projectName);

    if (fs.existsSync(projectDir)) {
      console.log(chalk.red(`\n❌ Folder "${projectName}" already exists. Choose a different name.\n`));
      process.exit(1);
    }

    const templateKey = stacks[answers.stack];
    const templatePath = path.join(__dirname, 'templates', templateKey);

    if (!fs.existsSync(templatePath)) {
      console.log(chalk.red(`\n❌ Template for "${answers.stack}" not found.\n`));
      process.exit(1);
    }

    const spinner = ora(`Creating project "${projectName}"...`).start();

    try {
      fs.copySync(templatePath, projectDir);

      // Rename _gitignore to .gitignore if present
      const gitignoreFrom = path.join(projectDir, '_gitignore');
      const gitignoreTo = path.join(projectDir, '.gitignore');
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

    console.log(chalk.blue(`\n✨ Stack: ${answers.stack}\n`));
    console.log(chalk.bold('Next steps:'));
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
