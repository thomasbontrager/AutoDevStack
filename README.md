# AutoDevStack

> **Scaffold production-ready full-stack projects in seconds — not hours.**

Stop copy-pasting boilerplate. AutoDevStack is a zero-config CLI that spins up battle-tested project templates so you can focus on building features from minute one.

[![npm version](https://img.shields.io/npm/v/autodevstack)](https://www.npmjs.com/package/autodevstack)
[![npx autodevstack](https://img.shields.io/badge/npx-autodevstack-brightgreen)](https://www.npmjs.com/package/autodevstack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Demo

**One-command SaaS generation:**
```bash
npx autodevstack my-saas --template saas --git --docker
```
That's it — a full SaaS project with auth, billing, database, Docker, and Git is ready in seconds. See [`examples/saas-demo/`](examples/saas-demo/) for an example.

**Interactive mode:**
```
🚀 Welcome to AutoDevStack! 🚀
Scaffold your next project in seconds.

? Project name: my-app
? Choose a stack:
  ❯ React + TypeScript + Vite
    Node + Express + TypeScript
    Next.js
    T3 Stack (Next.js + Tailwind + tRPC + Prisma)
    SaaS Starter (Next.js + Prisma + Stripe + Tailwind)
    Monorepo (apps + services + packages)
    AI App (Next.js + Express + LangChain + Prisma)

⠋ Creating project "my-app"...
✔ Project "my-app" created successfully!

✨ Stack: React + TypeScript + Vite

Next steps:
  cd my-app
  npm install
  npm run dev

Happy coding! 🎉
```

**Command-line mode:**
```bash
# Quick setup with flags
npx autodevstack my-saas --stack saas --git --docker

# AI-powered app
npx autodevstack my-ai --stack ai --git --docker

# Monorepo platform
npx autodevstack my-platform --stack monorepo --git

# See all options
npx autodevstack --help
```

---

## Features

- ⚡ **Instant scaffolding** — project ready in under 5 seconds
- 🎯 **Curated templates** — hand-crafted, opinionated starters that just work
- 🔧 **Zero config** — sensible defaults out of the box
- 🚀 **Full CLI** — skip prompts with `--stack`, `--git`, `--docker`, `--register` flags
- 💼 **SaaS template** — production-ready SaaS with auth, billing, and database
- 🤖 **AI App template** — LangChain + OpenAI/Anthropic + streaming responses
- 📦 **Monorepo support** — Turborepo-powered monorepo scaffolding
- 🐳 **Docker ready** — add containerization with `--docker` flag
- 🔌 **Plugin system** — extend with community or custom plugins (see [`plugins/`](plugins/))
- 📦 **Auto name injection** — project name is set in `package.json` automatically
- 🔒 **`.gitignore` handling** — template `_gitignore` files are renamed on copy
- 🚢 **Deploy subcommand** — push builds to the AutoDevStack build server
- 🌐 **Domain management** — register and manage custom domains via the platform API

---

## Why AutoDevStack?

| Feature | AutoDevStack | Create React App | Next.js CLI | T3 CLI |
|---------|:------------:|:----------------:|:-----------:|:------:|
| Multiple templates | ✅ | ❌ | ❌ | ❌ |
| SaaS starter (auth + billing + DB) | ✅ | ❌ | ❌ | ❌ |
| Docker support (`--docker`) | ✅ | ❌ | ❌ | ❌ |
| Git initialization (`--git`) | ✅ | ❌ | ❌ | ✅ |
| Monorepo scaffold | ✅ | ❌ | ❌ | ❌ |
| AI app template | ✅ | ❌ | ❌ | ❌ |
| Plugin system | ✅ | ❌ | ❌ | ❌ |
| Non-interactive (full CLI flags) | ✅ | ✅ | ✅ | ✅ |

---

## Quick Start

**Option 1 — Run directly with npx (once published):**

```bash
npx autodevstack my-app
```

**Option 2 — With command-line arguments:**

```bash
# Create a SaaS app with Git and Docker
npx autodevstack my-saas --stack saas --git --docker

# Create an AI app
npx autodevstack my-ai --stack ai --git --docker

# Create a Next.js app
npx autodevstack my-app --stack next

# Create a monorepo
npx autodevstack my-platform --stack monorepo
```

**Option 3 — Clone and run locally:**

```bash
git clone https://github.com/thomasbontrager/AutoDevStack.git
cd AutoDevStack
npm install
node cli/index.js
```

**Option 4 — Global install via npm link:**

```bash
git clone https://github.com/thomasbontrager/AutoDevStack.git
cd AutoDevStack
npm install
npm link
autodevstack
```

---

## Templates

Templates live in the [`templates/`](templates/) directory. Each template is a self-contained minimal project.

| Stack | Folder | Description |
|-------|--------|-------------|
| React + TypeScript + Vite | [`templates/default/`](templates/default/) | Fast React SPA with Vite bundler and TypeScript |
| Node + Express + TypeScript | [`templates/node/`](templates/node/) | Lightweight REST API server |
| Next.js | [`templates/next/`](templates/next/) | Full-stack React framework with file-based routing |
| T3 Stack | [`templates/t3/`](templates/t3/) | Next.js + Tailwind CSS + tRPC + Prisma |
| **SaaS Starter** | [`templates/saas/`](templates/saas/) | **Production SaaS with auth, billing, and database** |
| **Monorepo** | [`templates/monorepo/`](templates/monorepo/) | **Turborepo monorepo with apps, services, and packages** |
| **AI App** | [`templates/ai/`](templates/ai/) | **Next.js + Express + LangChain + OpenAI/Anthropic** |

### Adding a Template

1. Create a folder under `templates/<your-template>/` with a working project structure.
2. Register it in [`cli/index.js`](cli/index.js) inside the `stacks` object.
3. Test it with `node cli/index.js`.

See [docs/adding-templates.md](docs/adding-templates.md) for the full guide.

---

## CLI Reference

```
autodevstack [project-name] [options]
autodevstack <subcommand> [args]
```

### Subcommands

| Subcommand | Description |
|------------|-------------|
| *(none)* | Interactive or non-interactive project scaffolding |
| `template list` | List all available templates |
| `plugin list` | List installed plugins |
| `plugin add <name>` | Install a plugin from npm or local path |
| `plugin remove <name>` | Remove a plugin |
| `domain list` | List registered domains |
| `domain add <project> <domain>` | Register a domain |
| `domain remove <domain>` | Remove a domain |
| `deploy [project]` | Deploy a project to the build server |
| `ai` | AI-powered project generation (coming soon) |

### Flags

| Flag | Description |
|------|-------------|
| `--stack <name>` | Template: `react`, `node`, `next`, `t3`, `saas`, `monorepo`, `ai` |
| `--template <name>` | Alias for `--stack` |
| `--git` | Initialize a Git repository |
| `--docker` | Add Dockerfile and docker-compose.yml |
| `--register` | Register the project with the platform API |
| `--api-url <url>` | Override the platform API URL |
| `--help`, `-h` | Show help |

See [docs/cli-reference.md](docs/cli-reference.md) for the complete reference.

---

## Example Projects

The [`examples/`](examples/) directory contains reference projects built with AutoDevStack:

| Example | Description |
|---------|-------------|
| [`examples/saas/`](examples/saas/) | SaaS app with auth, Stripe billing, and PostgreSQL |
| [`examples/ai-app/`](examples/ai-app/) | AI chatbot with LangChain, streaming, and conversation history |
| [`examples/api/`](examples/api/) | REST API with JWT auth, Zod validation, and Prisma |

The [`starter-apps/`](starter-apps/) directory contains more opinionated, feature-rich starting points ready for real projects.

---

## Project Structure

```
AutoDevStack/
├── cli/            # CLI entry point
│   └── index.js
├── templates/      # Project scaffolding templates
│   ├── default/    # React + TypeScript + Vite
│   ├── node/       # Node + Express + TypeScript
│   ├── next/       # Next.js
│   ├── t3/         # T3 Stack
│   ├── saas/       # SaaS Starter
│   ├── monorepo/   # Monorepo
│   └── ai/         # AI App
├── examples/       # Reference projects built with AutoDevStack
│   ├── saas/       # SaaS example
│   ├── ai-app/     # AI app example
│   └── api/        # REST API example
├── starter-apps/   # Feature-rich starter apps for real projects
├── docs/           # Extended documentation
│   ├── cli-reference.md
│   ├── adding-templates.md
│   └── plugin-system.md
├── plugins/        # Plugin system (extensibility)
├── scripts/        # Utility and automation scripts
├── tests/          # Test suite
├── api/            # Platform API (port 4000)
├── dashboard/      # Platform dashboard (Next.js)
├── build-server/   # Build server for deployments
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── ROADMAP.md
├── SECURITY.md
└── LICENSE
```

---

## Plugin System

Extend AutoDevStack with new templates via plugins:

```bash
# Install a plugin from npm
autodevstack plugin add autodevstack-plugin-svelte

# Install from a local path
autodevstack plugin add ./my-custom-plugin

# List installed plugins
autodevstack plugin list
```

Plugins register their templates into the CLI automatically — they appear in the interactive prompt and work with `--stack` just like built-in templates.

See [docs/plugin-system.md](docs/plugin-system.md) for the full plugin development guide.

---

## Success Metrics

AutoDevStack tracks its impact through the following metrics. Add yours by opening a PR or leaving a comment! 🚀

- ⏱️ **Time to first `npm run dev`** — from zero to running app in under 60 seconds
- 📦 **Templates available** — 7 production-ready stacks (and growing)
- 🔌 **Plugin ecosystem** — extensible via community plugins
- 🛠️ **Zero manual setup** — `_gitignore`, `package.json` name injection, and Docker support all handled automatically
- 🌍 **Community adoption** — developers worldwide use AutoDevStack to eliminate boilerplate

> ⭐ Star the repo if AutoDevStack saves you time! Each star helps us reach more developers.

---

## Viral Features

AutoDevStack is designed to spread organically through developer communities:

- **One-liner scaffolding** — `npx autodevstack my-saas --stack saas --git --docker` is shareable and memorable
- **Production-quality output** — generated projects are good enough to demo, share, and deploy immediately
- **Open plugin ecosystem** — publish your own template as `autodevstack-plugin-<name>` on npm
- **Built-in examples** — the `examples/` and `starter-apps/` directories are designed for inspiration and sharing
- **GitHub-ready** — `--git` initializes a repository; generated projects include a proper `.gitignore` and `README.md`
- **Platform API** — `--register` and `deploy` subcommand enable teams to self-host and share a scaffolding platform

---

## Adoption Tracking

Want to see how teams are adopting AutoDevStack? Here are ways to track and share adoption:

### Share your project

Built something with AutoDevStack? We'd love to hear about it:
- Open a [GitHub Discussion](https://github.com/thomasbontrager/AutoDevStack/discussions) to share what you built
- Add an example to the [`examples/`](examples/) directory via PR
- Tag your project with `#autodevstack` on social media

### Usage signals

- ⭐ **GitHub stars** — the simplest signal of community interest
- 🍴 **Forks** — indicates active use and customization
- 📦 **npm downloads** — tracked at [npmjs.com/package/autodevstack](https://www.npmjs.com/package/autodevstack)
- 🔌 **Published plugins** — search npm for `autodevstack-plugin-*` to see community templates

### For teams

If you're using AutoDevStack within a team or organization:
1. Self-host the platform API (`api/`) for project registration and deployment
2. Use `autodevstack --register` when scaffolding to track projects in your dashboard
3. Publish internal templates as private plugins and distribute via your npm registry

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full versioned roadmap.

**Highlights:**
- SvelteKit and Remix templates
- NestJS backend template
- Docker support for all stacks
- `npm init autodevstack` support
- Interactive configuration (database, auth, etc.)
- npm registry publish

---

## Contributing

We'd love your help! See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-stack`)
3. Add your template under `templates/<name>/`
4. Register it in `cli/index.js`
5. Submit a PR 🎉

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

## Security

Found a vulnerability? Please see [SECURITY.md](SECURITY.md) for responsible disclosure guidelines.

---

## License

MIT — see [LICENSE](LICENSE)

---

⭐ Star this repo if it saves you time!
