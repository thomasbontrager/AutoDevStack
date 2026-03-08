#!/usr/bin/env node
import fs from "fs-extra";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(chalk.green.bold("\n🚀 Welcome to AutoDevStack! 🚀"));
console.log(chalk.gray("Scaffold your next project in seconds.\n"));

const stacks = {
  react: {
    label: "React + TypeScript + Vite",
    template: "default",
  },
  node: {
    label: "Node + Express + TypeScript",
    template: "node",
  },
  next: {
    label: "Next.js",
    template: "next",
  },
  t3: {
    label: "T3 Stack (Next.js + Tailwind + tRPC + Prisma)",
    template: "t3",
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    projectName: null,
    stack: null,
    git: false,
  };

  if (args.length > 0 && !args[0].startsWith("--")) {
    parsed.projectName = args[0];
  }

  args.forEach((arg, index) => {
    if (arg === "--stack") {
      parsed.stack = args[index + 1];
    }

    if (arg === "--git") {
      parsed.git = true;
    }
  });

  return parsed;
}

async function promptUser(existingArgs) {
  const questions = [];

  if (!existingArgs.projectName) {
    questions.push({
      type: "input",
      name: "projectName",
      message: "Project name:",
      validate: (input) => {
        if (!input.trim()) return "Project name cannot be empty.";
        if (!/^[a-z0-9-_]+$/i.test(input.trim()))
          return "Project name can only contain letters, numbers, dashes, and underscores.";
        return true;
      },
    });
  }

  if (!existingArgs.stack) {
    questions.push({
      type: "list",
      name: "stack",
      message: "Choose a stack:",
      choices: Object.entries(stacks).map(([key, val]) => ({
        name: val.label,
        value: key,
      })),
    });
  }

  const answers = await inquirer.prompt(questions);

  return {
    projectName: existingArgs.projectName || answers.projectName,
    stack: existingArgs.stack || answers.stack,
    git: existingArgs.git,
  };
}

async function main() {
  try {
    const args = parseArgs();
    const { projectName, stack, git } = await promptUser(args);

    if (!stacks[stack]) {
      console.log(chalk.red(`\n❌ Unknown stack "${stack}"\n`));
      process.exit(1);
    }

    const projectDir = path.join(process.cwd(), projectName);

    if (fs.existsSync(projectDir)) {
      console.log(
        chalk.red(`\n❌ Folder "${projectName}" already exists.\n`)
      );
      process.exit(1);
    }

    const templatePath = path.join(__dirname, "templates", stacks[stack].template);

    if (!fs.existsSync(templatePath)) {
      console.log(chalk.red("\n❌ Template not found.\n"));
      process.exit(1);
    }

    const spinner = ora(`Creating project "${projectName}"...`).start();

    fs.copySync(templatePath, projectDir);

    const gitignoreFrom = path.join(projectDir, "_gitignore");
    const gitignoreTo = path.join(projectDir, ".gitignore");

    if (fs.existsSync(gitignoreFrom)) {
      fs.moveSync(gitignoreFrom, gitignoreTo);
    }

    const pkgPath = path.join(projectDir, "package.json");

    if (fs.existsSync(pkgPath)) {
      const pkg = fs.readJsonSync(pkgPath);
      pkg.name = projectName;
      fs.writeJsonSync(pkgPath, pkg, { spaces: 2 });
    }

    spinner.succeed(chalk.green(`Project "${projectName}" created successfully!`));

    if (git) {
      console.log(chalk.gray("\nInitializing Git repository..."));
      try {
        execSync("git init", { cwd: projectDir });
        execSync("git add .", { cwd: projectDir });
        execSync('git commit -m "Initial commit from AutoDevStack"', { cwd: projectDir });
        console.log(chalk.green("Git repository initialized."));
      } catch {
        console.log(chalk.yellow("Git initialization skipped."));
      }
    }

    console.log(chalk.blue(`\n✨ Stack: ${stacks[stack].label}\n`));
    console.log(chalk.bold("Next steps:"));
    console.log(chalk.cyan(`  cd ${projectName}`));
    console.log(chalk.cyan("  npm install"));
    console.log(chalk.cyan("  npm run dev"));
    console.log(chalk.green.bold("\nHappy coding! 🎉\n"));

  } catch (error) {
    console.error(chalk.red("\n❌ Something went wrong:"), error.message);
    process.exit(1);
  }
}

main();
