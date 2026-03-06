# Contributing to AutoDevStack

Thank you for considering contributing to AutoDevStack! 🎉

Every contribution — whether it's a new template, a bug fix, documentation improvement, or an example project — helps the community scaffold better, faster, and with fewer headaches.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Ways to Contribute](#ways-to-contribute)
  - [Adding a New Stack Template](#adding-a-new-stack-template)
  - [Improving the CLI](#improving-the-cli)
  - [Adding Example Projects](#adding-example-projects)
  - [Improving Documentation](#improving-documentation)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Standards](#coding-standards)
- [Community](#community)

---

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating. Be kind and respectful — we're all here to build cool things together. 🚀

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/AutoDevStack.git
   cd AutoDevStack
   npm install
   ```
3. **Create a branch** for your change:
   ```bash
   git checkout -b feat/my-awesome-template
   ```
4. Make your changes, then run tests:
   ```bash
   npm test
   ```
5. **Submit a Pull Request** 🎉

---

## Ways to Contribute

### Adding a New Stack Template

Templates live in `templates/<name>/`. Each template is a self-contained minimal project.

1. Create a new folder under `templates/<stack-name>/` with a working project structure:
   - `package.json` — `name`, `scripts`, and relevant dependencies
   - Source files (e.g., `src/index.ts`, `pages/index.tsx`)
   - Config files (e.g., `tsconfig.json`, framework config)
   - `_gitignore` — will be renamed to `.gitignore` when scaffolded
   - `.env.example` — document all required environment variables

2. Register your stack in `cli/index.js`:
   ```js
   const stacks = {
     // ... existing stacks
     "My New Stack": "my-stack-folder-name",
   };
   ```
   And add an alias to `stackAliases`:
   ```js
   export const stackAliases = {
     // ...
     'mystack': 'my-stack-folder-name',
   };
   ```

3. Test it locally:
   ```bash
   node cli/index.js
   # Select your stack in interactive mode
   node cli/index.js my-project --stack mystack
   # Verify the generated project structure looks correct
   ```

4. See [docs/adding-templates.md](docs/adding-templates.md) for the full guide.

---

### Improving the CLI

- Keep the UX consistent — use the existing `ora`, `chalk`, and `inquirer` patterns
- Handle edge cases: empty input, existing folders, missing templates
- Export new helpers for testability (see `parseArgs` as an example)
- Write clear, descriptive commit messages following [Conventional Commits](https://www.conventionalcommits.org/)

---

### Adding Example Projects

The `examples/` directory contains reference projects that demonstrate real-world usage of AutoDevStack templates.

1. Scaffold a project using the CLI:
   ```bash
   node cli/index.js my-example --stack saas --git
   ```
2. Build something interesting with it
3. Place it under `examples/<your-example-name>/`
4. Add a `README.md` explaining:
   - What the example demonstrates
   - How to run it
   - Any notable patterns used

See existing examples in [`examples/`](examples/) for reference.

---

### Improving Documentation

Documentation lives in [`docs/`](docs/). The files there are:

- `docs/cli-reference.md` — Full CLI flag and option reference
- `docs/adding-templates.md` — How to create and register new templates
- `docs/plugin-system.md` — How the plugin system works

Improvements, corrections, and new guides are all very welcome!

---

### Reporting Bugs

1. **Search existing issues** first — someone may have already reported it
2. Open a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the bug
   - Expected vs. actual behavior
   - Your environment (Node version, OS)
   - Relevant error output

---

### Suggesting Features

1. Open a GitHub issue with the `enhancement` label
2. Describe the feature and the problem it solves
3. Include example CLI usage or mockups if helpful
4. Reference the [ROADMAP.md](ROADMAP.md) to see if it's already planned

---

## Development Setup

```bash
# Clone the repo
git clone https://github.com/thomasbontrager/AutoDevStack.git
cd AutoDevStack

# Install dependencies
npm install

# Run the CLI in interactive mode
node cli/index.js

# Run the CLI with flags (non-interactive)
node cli/index.js my-app --stack next --git --docker

# Run tests
npm test
```

### API (optional)

```bash
cd api
npm install
npm start     # Starts on port 4000
npm test      # Run API tests
```

### Dashboard (optional)

```bash
cd dashboard
npm install
npm run dev   # Dev server on port 3000
```

---

## Testing

We use **Node.js built-in test runner** (`node:test`) — no external test framework required.

```bash
# Run all tests
npm test

# Run a specific test file
node --test tests/cli.test.js

# Run API tests
cd api && npm test
```

When adding new CLI features, add tests in `tests/cli.test.js` following the existing patterns. The `runCLI(args, opts)` helper accepts a string or array of arguments and captures stdout/stderr.

---

## Pull Request Guidelines

- **Keep PRs focused** — one feature or fix per PR
- **Describe what your PR does** and why in the PR description
- **Reference related issues** with `Closes #123` or `Fixes #123`
- **Run tests** before submitting: `npm test`
- **Update documentation** when adding or changing features
- **Update `.env.example`** if you add new environment variables
- **No breaking changes** to existing templates without discussion

### Branch Naming

| Type | Branch prefix | Example |
|------|--------------|---------|
| New feature | `feat/` | `feat/nestjs-template` |
| Bug fix | `fix/` | `fix/docker-compose-path` |
| Documentation | `docs/` | `docs/plugin-guide` |
| Refactoring | `refactor/` | `refactor/cli-argument-parsing` |

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(templates): add NestJS template
fix(cli): handle existing folder gracefully
docs(contributing): add plugin guide section
```

---

## Coding Standards

### JavaScript / Node.js

- Use **ES modules** (`import`/`export`) — the CLI is `"type": "module"`
- Use **async/await** over callbacks or raw Promises
- Handle errors explicitly — don't swallow exceptions silently
- Prefer `fs-extra` over native `fs` for file operations

### Templates

- Always write **TypeScript** for new templates
- Use **functional React components** with hooks
- Use **Next.js App Router** for new Next.js templates
- Include a `.env.example` for all environment variables
- Use `_gitignore` (not `.gitignore`) inside templates — it gets renamed on copy

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Variables & functions | camelCase | `projectName`, `loadPlugins()` |
| React components & TS types | PascalCase | `UserCard`, `ProjectConfig` |
| Folders | kebab-case | `starter-apps/`, `my-template/` |
| Environment variables | SCREAMING_SNAKE_CASE | `DATABASE_URL`, `STRIPE_SECRET_KEY` |

---

## Community

- ⭐ **Star the repo** if AutoDevStack saves you time
- 🐛 **Open issues** for bugs or feature requests
- 🔀 **Submit PRs** for improvements
- 📣 **Share** your projects built with AutoDevStack

We appreciate every contribution, large and small. Thank you for helping make AutoDevStack better for everyone! 🙌
