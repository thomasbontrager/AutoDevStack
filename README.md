# AutoDevStack

> **Scaffold production-ready full-stack projects in seconds — not hours.**

Stop copy-pasting boilerplate. AutoDevStack is a zero-config CLI that spins up battle-tested project templates so you can focus on building features from minute one.

[![npm version](https://img.shields.io/npm/v/autodevstack)](https://www.npmjs.com/package/autodevstack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Demo

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
npx autodevstack my-saas --template saas --git --docker

# Skip all prompts
npx autodevstack my-app --stack next

# See all options
npx autodevstack --help
```

---

## Features

- ⚡ **Instant scaffolding** — project ready in under 5 seconds
- 🎯 **Curated templates** — hand-crafted, opinionated starters that just work
- 🔧 **Zero config** — sensible defaults out of the box
- 🚀 **CLI arguments** — skip prompts with `--stack`, `--git`, `--docker` flags
- 💼 **SaaS template** — production-ready SaaS with auth, billing, and database
- 📦 **Monorepo support** — Turborepo-powered monorepo scaffolding
- 🐳 **Docker ready** — add containerization with `--docker` flag
- 🔌 **Plugin-ready** — extend with community or custom plugins (see [`plugins/`](plugins/))
- 📦 **Auto name injection** — project name is set in `package.json` automatically
- 🔒 **`.gitignore` handling** — template `_gitignore` files are renamed on copy

---

## Quick Start

**Option 1 — Run directly with npx (once published):**

```bash
npx autodevstack my-app
```

**Option 2 — With command-line arguments:**

```bash
# Create a SaaS app with Git and Docker
npx autodevstack my-saas --template saas --git --docker

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

### Adding a Template

1. Create a folder under `templates/<your-template>/` with a working project structure.
2. Register it in [`cli/index.js`](cli/index.js) inside the `stacks` object.
3. Test it with `node cli/index.js`.

---

## Example Projects

The [`examples/`](examples/) directory contains reference projects built with AutoDevStack to showcase real-world usage patterns.

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
│   ├── saas/       # SaaS Starter (NEW!)
│   └── monorepo/   # Monorepo (NEW!)
├── examples/       # Example projects built with AutoDevStack
├── docs/           # Extended documentation
├── plugins/        # Plugin system (extensibility)
├── scripts/        # Utility and automation scripts
├── tests/          # Test suite
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── ROADMAP.md
├── SECURITY.md
└── LICENSE
```

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
