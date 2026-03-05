#!/usr/bin/env node
const fs = require('fs-extra');
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');

console.log(chalk.green.bold("\n🚀 Welcome to AutoDevStack! 🚀\n"));

// Supported stacks and templates
const stacks = {
  "React + TypeScript + Vite": "default",
  // Future: add Node/Express/T3 stacks here
};

(async function main() {
  try {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'projectName', message: 'Project name:' },
      { type: 'list', name: 'stack', message: 'Choose a stack:', choices: Object.keys(stacks) }
    ]);

    const projectDir = path.join(process.cwd(), answers.projectName);

    if (fs.existsSync(projectDir)) {
      console.log(chalk.red(`\n❌ Folder "${answers.projectName}" already exists. Choose another name.\n`));
      process.exit(1);
    }

    // Copy template files
    const templatePath = path.join(__dirname, 'templates', stacks[answers.stack]);
    fs.copySync(templatePath, projectDir);

    console.log(chalk.blue(`\n✨ Project "${answers.projectName}" created with ${answers.stack} stack!\n`));
    console.log(chalk.yellow(`Next steps:`));
    console.log(chalk.yellow(`cd ${answers.projectName}`));
    console.log(chalk.yellow(`npm install`));
    console.log(chalk.yellow(`npm run dev`));
    console.log(chalk.green.bold("\nHappy coding! 🚀\n"));

  } catch (error) {
    console.error(chalk.red("❌ Something went wrong:"), error);
    process.exit(1);
  }
})();