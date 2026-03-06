# GitHub Copilot Instructions for AutoDevStack

This repository powers **AutoDevStack**, a CLI tool that scaffolds production-ready full-stack projects. Copilot should follow these guidelines when generating code or making pull requests.

---

## Project Overview

AutoDevStack is a zero-config CLI that generates battle-tested project templates. It helps developers scaffold projects in seconds with:
- Interactive and non-interactive modes
- Curated templates (React, Next.js, T3, SaaS, Monorepo, etc.)
- Plugin system for extensibility
- Docker support
- Git initialization

---

## Repository Structure

```
AutoDevStack/
├── cli/            # CLI entry point (Node.js)
│   └── index.js    # Main CLI logic, template registry, plugin loader
├── templates/      # Project scaffolding templates
│   ├── default/    # React + TypeScript + Vite
│   ├── node/       # Node + Express + TypeScript
│   ├── next/       # Next.js
│   ├── t3/         # T3 Stack (Next.js + Tailwind + tRPC + Prisma)
│   ├── saas/       # SaaS Starter (Next.js + Prisma + Stripe + Tailwind)
│   └── monorepo/   # Turborepo monorepo (apps + services + packages)
├── plugins/        # Plugin system for extending templates
├── tests/          # Node.js built-in test runner
├── scripts/        # Utility scripts
├── examples/       # Example projects
├── docs/           # Extended documentation
└── dashboard/      # Platform dashboard (Next.js)
```

---

## Architecture Patterns

### Template Organization
- Each template is a self-contained working project in `templates/<name>/`
- Templates contain `_gitignore` files (renamed to `.gitignore` on copy)
- Project names are injected into `package.json` automatically
- Templates must be registered in `cli/index.js` `stacks` object

### Monorepo Templates
Templates like `templates/monorepo/` contain sub-structures:
- `/apps` - Frontend applications (e.g., Next.js apps)
- `/services` - Backend services (e.g., Express APIs with auth)
- `/packages` - Shared packages (UI components, database schemas)
- `/infrastructure` - Docker, deployment configs

### Plugin System
- Plugins live in `plugins/<name>/plugin.json`
- Plugin format: `{ name, version, description, templates[] }`
- Install via `plugin add <npm-name|./local-path>`
- Loaded at CLI startup via `loadPlugins()` function

---

## Tech Stack

### CLI
- **Node.js** (ES modules)
- **Commander.js** patterns (custom arg parsing)
- **fs-extra** for file operations
- **Node built-in test runner** (`node:test`)

### Templates Generate
- **Frontend**: React, Next.js 14, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, Next.js API routes
- **Database**: PostgreSQL, Prisma ORM
- **Cache/Queues**: Redis
- **Infrastructure**: Docker, Docker Compose
- **AI Integrations**: OpenAI, Anthropic, LangChain

### Dashboard
- Next.js 14
- TypeScript
- TailwindCSS
- Mock authentication

---

## Coding Standards

### General Guidelines
- **Always write TypeScript** for new templates
- Prefer **functional components** in React
- Use **Next.js App Router** for Next.js templates
- Follow **modular architecture**
- Avoid unnecessary dependencies
- Keep files small and reusable
- Use **server actions and API routes** in Next.js

### Naming Conventions
- **camelCase** for variables and functions
- **PascalCase** for React components and TypeScript types
- **kebab-case** for folder names
- **SCREAMING_SNAKE_CASE** for environment variables

### Code Quality
- Include proper error handling
- Use environment variables for configuration
- Design for scalability
- Follow existing patterns in the codebase
- Don't fix unrelated pre-existing issues
- Avoid over-engineering

### File Structure
- Template `_gitignore` files are renamed to `.gitignore` on copy
- Use relative paths in templates
- Include `.env.example` for environment variables

---

## Testing Practices

### Test Framework
- Use **Node.js built-in test runner** (`node:test`)
- Run tests with `npm test` or `node --test tests/<file>.test.js`
- No external test dependencies (Jest, Mocha, etc.)

### Test Patterns
- Tests live in `tests/` directory
- CLI tests use `spawnSync` to capture stdout/stderr
- API tests use `DB_PATH_OVERRIDE` to avoid touching real database
- Helper function: `runCLI(args, opts)` accepts string or array

### Running Tests
```bash
npm test                              # Run all tests
node --test tests/cli.test.js         # Run specific test
cd api && npm test                    # Run API tests
```

---

## Development Workflow

### Running the CLI
```bash
# Local development
node cli/index.js

# Interactive mode
node cli/index.js

# Non-interactive with flags
node cli/index.js my-app --stack next --git --docker

# Plugin commands
node cli/index.js plugin list
node cli/index.js plugin add <name>
```

### Dashboard
```bash
cd dashboard
npm install
npm run dev              # Dev server on port 3000
npm run build            # Production build
```

### API (if present)
```bash
cd api
npm install
npm start                # Starts on port 4000
npm test                 # Run API tests
# Default login: admin/admin123
```

---

## Docker Support

### Docker Generation
- CLI dynamically generates `Dockerfile`, `docker-compose.yml`, `.dockerignore`
- Generated based on template type via `addDockerSupport()` function
- Triggered by `--docker` flag

### Expected Services
When Docker Compose is used:
- **postgres** - PostgreSQL database
- **redis** - Redis cache
- **api** - Backend services
- **frontend apps** - Next.js/React applications

### Commands
```bash
docker compose up -d     # Start all services
docker compose down      # Stop all services
```

---

## Feature Priorities

When adding features or templates, prioritize:
- **Developer tools and platforms**
- **SaaS dashboards and starter kits**
- **AI-powered tools and integrations**
- **Microservices and API patterns**
- **Automation and workflow tools**

### Feature Characteristics
- Include proper error handling
- Use environment variables for configuration
- Follow scalable architecture patterns
- Provide clear documentation
- Include example usage

---

## UI Guidelines

When working on templates with UI:

### Design System
- Use **TailwindCSS** for styling
- Build reusable components in `/packages/ui` (for monorepo)
- Follow modern SaaS dashboard layouts
- Design for **dark mode** by default

### UI Style
- **Minimal** and clean
- **Dark-mode friendly**
- **Developer-focused** aesthetics
- Consistent spacing and typography
- Professional, production-ready appearance

---

## Pull Request Guidelines

### PR Requirements
- **Clear description** of changes
- **Avoid breaking changes** to existing templates
- **Follow existing folder structure**
- **Update `.env.example`** if adding new environment variables
- **Run tests** before submitting
- **Update documentation** if necessary

### What to Include
- Description of the feature or fix
- Testing steps performed
- Any new dependencies added
- Screenshots (if UI changes)
- Breaking changes (if any)

### Branch Naming
- `feat/` for new features
- `fix/` for bug fixes
- `docs/` for documentation
- `refactor/` for code improvements

---

## Common Patterns

### Adding a New Template
1. Create folder: `templates/<name>/`
2. Build a minimal working project
3. Use `_gitignore` instead of `.gitignore`
4. Register in `cli/index.js` `stacks` object
5. Add to `stackAliases` if needed
6. Test with `node cli/index.js --stack <name>`

### Plugin Development
1. Create: `plugins/<name>/plugin.json`
2. Define manifest with templates array
3. Test with `node cli/index.js plugin add ./plugins/<name>`
4. Verify with `node cli/index.js plugin list`

### CLI Argument Handling
- CLI v2.0 uses subcommands: `create`, `template`, `ai`, `plugin`
- Legacy mode falls through to `handleCreate()`
- `parseArgs()` is exported for testing
- Plugin templates registered in `pluginTemplates` and `pluginAliases`

---

## Repository Goals

AutoDevStack aims to provide:
- **Fast project scaffolding** that eliminates boilerplate setup
- **Production-ready templates** that follow best practices
- **Extensible plugin system** for community contributions
- **Developer productivity tools** that save time
- **Battle-tested patterns** that scale

### Future Vision
- Marketplace for developer tools and templates
- Integration with related projects (bontrager-stack-systems, textwash, cleantext)
- AI-powered code generation assistance
- Template customization and configuration

---

## Important Conventions

### Memory/Context
- Platform API lives in `api/` (port 4000)
- CLI supports both interactive and non-interactive modes
- Tests use Node's built-in test runner (no external deps)
- Docker support is dynamically generated per template
- Plugin system uses `plugin.json` manifests

### Best Practices
- Always read existing files before modifying
- Follow existing code patterns
- Keep changes minimal and focused
- Test locally before committing
- Update documentation when needed

---

## Related Projects

AutoDevStack may integrate with:
- **bontrager-stack-systems**
- **textwash**
- **cleantext**

These may be exposed through the **AutoDevStack App Marketplace**.

---

**Optimize all code suggestions toward automation, scalability, and developer productivity.**
