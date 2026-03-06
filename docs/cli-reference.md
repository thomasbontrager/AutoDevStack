# CLI Reference

Full reference for all AutoDevStack CLI commands, flags, and options.

---

## Table of Contents

- [Global Usage](#global-usage)
- [Interactive Mode](#interactive-mode)
- [create (default)](#create-default)
- [template](#template)
- [ai](#ai)
- [plugin](#plugin)
- [domain](#domain)
- [deploy](#deploy)
- [Stacks Reference](#stacks-reference)
- [Environment Variables](#environment-variables)

---

## Global Usage

```
autodevstack [subcommand] [project-name] [options]
```

If no subcommand is given, the CLI falls through to `create` (legacy mode).

### Global Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--help` | `-h` | Show help and exit |
| `--version` | `-v` | Show CLI version and exit |

---

## Interactive Mode

Running `autodevstack` with no arguments launches the interactive prompt:

```bash
npx autodevstack
```

The CLI will ask for:
1. **Project name** — used as the directory name and set in `package.json`
2. **Stack** — choose from all registered templates
3. **Git** — initialize a Git repository? (`Y/n`)
4. **Docker** — add Docker support? (`Y/n`)

---

## create (default)

Scaffold a new project. This is the default mode when no subcommand is given.

```bash
autodevstack [project-name] [options]
# or explicitly:
autodevstack create [project-name] [options]
```

### Options

| Flag | Description | Example |
|------|-------------|---------|
| `--stack <name>` | Specify the stack to use | `--stack saas` |
| `--template <name>` | Alias for `--stack` | `--template next` |
| `--git` | Initialize a Git repository | `--git` |
| `--docker` | Add Dockerfile and docker-compose.yml | `--docker` |
| `--register` | Register project with the AutoDevStack platform API | `--register` |
| `--api-url <url>` | Override the platform API URL (default: `http://localhost:4000`) | `--api-url https://api.myplatform.com` |

### Examples

```bash
# Interactive mode
npx autodevstack

# Quick Next.js app
npx autodevstack my-app --stack next

# SaaS app with Git and Docker
npx autodevstack my-saas --stack saas --git --docker

# Monorepo with Git
npx autodevstack my-platform --stack monorepo --git

# AI app
npx autodevstack my-ai --stack ai --git --docker

# Register with platform
npx autodevstack my-app --stack node --register
```

---

## template

List and inspect available templates.

```bash
autodevstack template list
autodevstack template info <name>
```

### template list

Prints all registered templates (built-in + plugins).

```bash
autodevstack template list
```

Output example:

```
Available templates:
  react      React + TypeScript + Vite
  node       Node + Express + TypeScript
  next       Next.js
  t3         T3 Stack (Next.js + Tailwind + tRPC + Prisma)
  saas       SaaS Starter (Next.js + Prisma + Stripe + Tailwind)
  monorepo   Monorepo (apps + services + packages)
  ai         AI App (Next.js + Express + LangChain + Prisma)
```

---

## ai

AI-powered project generation (coming soon).

```bash
autodevstack ai
```

The `ai` subcommand will guide you through generating a custom project scaffold based on a natural language description. Currently marked as **coming soon**.

---

## plugin

Manage CLI plugins.

```bash
autodevstack plugin <action> [args]
```

### plugin list

List all installed plugins.

```bash
autodevstack plugin list
```

### plugin add

Install a plugin from npm or a local path.

```bash
# From npm
autodevstack plugin add autodevstack-plugin-svelte

# From a local directory
autodevstack plugin add ./plugins/my-custom-plugin
```

### plugin remove

Remove an installed plugin.

```bash
autodevstack plugin remove autodevstack-plugin-svelte
```

See [plugin-system.md](plugin-system.md) for the full plugin development guide.

---

## domain

Manage custom domains for your AutoDevStack projects.

```bash
autodevstack domain <action> [args]
```

### domain list

List all registered domains.

```bash
autodevstack domain list
```

### domain add

Register a domain for a project.

```bash
autodevstack domain add my-project mydomain.com
```

### domain remove

Remove a domain.

```bash
autodevstack domain remove mydomain.com
```

Domain records are stored locally in `~/.autodevstack/domains.json` and synced to the platform API when `--register` is used.

---

## deploy

Deploy a project to the AutoDevStack build server.

```bash
autodevstack deploy [project-name] [options]
```

### Options

| Flag | Description |
|------|-------------|
| `--environment <env>` | Target environment: `production`, `staging`, `preview` (default: `production`) |
| `--api-url <url>` | Platform API URL |

### Example

```bash
autodevstack deploy my-app --environment staging
```

The CLI will:
1. Authenticate with the platform API
2. Find or create the project record
3. Detect the git remote URL
4. Submit a build job to the build server

---

## Stacks Reference

| Stack key | Full name | Template folder |
|-----------|-----------|-----------------|
| `react` / `default` | React + TypeScript + Vite | `templates/default/` |
| `node` / `express` | Node + Express + TypeScript | `templates/node/` |
| `next` / `nextjs` | Next.js | `templates/next/` |
| `t3` | T3 Stack | `templates/t3/` |
| `saas` | SaaS Starter | `templates/saas/` |
| `monorepo` | Monorepo | `templates/monorepo/` |
| `ai` | AI App | `templates/ai/` |

Plugin-provided stacks are also available after installation.

---

## Environment Variables

The CLI itself reads the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTODEVSTACK_API_URL` | `http://localhost:4000` | Platform API base URL |
| `AUTODEVSTACK_TOKEN` | — | Auth token for platform API (used by `deploy` and `--register`) |

These can also be set via `.env` file in the project root or `~/.autodevstack/.env`.
