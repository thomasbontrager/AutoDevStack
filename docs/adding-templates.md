# Adding Templates

A step-by-step guide to creating and registering new stack templates in AutoDevStack.

---

## Overview

Templates are the heart of AutoDevStack. Each template is a self-contained, minimal working project that the CLI copies into the user's target directory when they scaffold a new project.

Templates live in `templates/<key>/`. The `<key>` is the short identifier used in the CLI (e.g., `saas`, `node`, `next`).

---

## Step 1: Create the Template Directory

```bash
mkdir templates/my-stack
```

Inside, build a minimal but working project. Include:

| File | Required? | Notes |
|------|-----------|-------|
| `package.json` | ✅ | Must include `name`, `scripts`, and dependencies |
| Source files | ✅ | e.g., `src/index.ts`, `pages/index.tsx` |
| Config files | ✅ | e.g., `tsconfig.json`, `vite.config.ts` |
| `_gitignore` | ✅ | Renamed to `.gitignore` on copy — never name it `.gitignore` |
| `.env.example` | Recommended | Document all required environment variables |
| `README.md` | Recommended | Explain how to run the generated project |
| `Dockerfile` | Optional | Include if Docker is integral to the template |
| `docker-compose.yml` | Optional | For templates with multiple services |

### Template `package.json` example

```json
{
  "name": "my-stack-template",
  "version": "0.1.0",
  "description": "My stack template",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

> **Note:** The `name` field will be replaced with the user's project name when the CLI scaffolds the project — you don't need to worry about it.

---

## Step 2: Use `_gitignore` Instead of `.gitignore`

Git ignores `.gitignore` files inside subdirectories during `git add`, so template `.gitignore` files would never be committed. AutoDevStack solves this by using `_gitignore` as the filename in templates. The CLI renames it to `.gitignore` when copying the template.

```bash
# In your template directory:
touch templates/my-stack/_gitignore
```

Example `_gitignore` content:

```
node_modules/
dist/
.env
*.log
```

---

## Step 3: Register the Template in `cli/index.js`

Open `cli/index.js` and add your template to two places:

### 1. The `stacks` object (for interactive mode)

```js
const stacks = {
  "React + TypeScript + Vite": "default",
  "Node + Express + TypeScript": "node",
  // ... existing stacks ...
  "My Stack (short description)": "my-stack",   // ← add here
};
```

The key is the display name shown in the interactive prompt. The value is the folder name under `templates/`.

### 2. The `stackAliases` object (for `--stack` flag)

```js
export const stackAliases = {
  'default': 'default',
  'react': 'default',
  // ... existing aliases ...
  'mystack': 'my-stack',    // ← add here
  'my-stack': 'my-stack',   // ← optional hyphenated alias
};
```

---

## Step 4: Test Your Template

**Interactive mode:**

```bash
node cli/index.js
# Select your stack from the list
```

**Non-interactive mode:**

```bash
node cli/index.js test-project --stack mystack --git --docker
```

**Verify the output:**

```bash
cd test-project
npm install
npm run dev
# Check that the project starts correctly
```

---

## Step 5: Add an Example (Optional but Encouraged)

Add a `README.md` under `examples/my-stack/` documenting:
- What the template is for
- How it was scaffolded
- Key patterns and features
- How to deploy it

See the [examples/](../examples/) directory for reference examples.

---

## Template Development Tips

### Keep it minimal

Templates should be the smallest working starting point, not a kitchen-sink application. Users will add features on top — your job is to set up the correct foundation.

### Include sensible defaults

- TypeScript configured with strict mode
- A working `dev` script
- `_gitignore` with `node_modules/`, `dist/`, `.env`
- `.env.example` with all required variables documented

### Avoid committing generated files

Never commit `node_modules/`, `dist/`, or `.env` files inside templates.

### Docker support

If Docker is core to the template (e.g., requires a database), include a `docker-compose.yml`. The CLI's `--docker` flag generates a generic `Dockerfile` + `docker-compose.yml` dynamically for templates that don't have one built in.

### Multiple services (monorepo-style)

For templates with multiple services (like `ai` or `monorepo`), organize them in subdirectories:

```
templates/my-stack/
├── frontend/
├── backend/
├── shared/
├── docker-compose.yml
└── package.json   # Root workspace package.json
```

---

## How the CLI Copies Templates

When a user scaffolds a project, the CLI:

1. Resolves the template folder (built-in or plugin)
2. Uses `fs-extra.copy()` to copy the entire template directory
3. Renames any `_gitignore` files to `.gitignore`
4. Updates the `name` field in `package.json` to the user's project name
5. Optionally initializes a Git repository (`--git`)
6. Optionally generates Docker files (`--docker`)

See `cli/index.js` for the full `handleCreate` / `copyTemplate` implementation.

---

## Checklist for New Templates

- [ ] Working project structure under `templates/<key>/`
- [ ] `package.json` with `name`, `scripts`, and dependencies
- [ ] `_gitignore` (not `.gitignore`)
- [ ] `.env.example` documenting environment variables
- [ ] `README.md` with setup instructions
- [ ] Registered in `stacks` object in `cli/index.js`
- [ ] Registered in `stackAliases` object in `cli/index.js`
- [ ] Tested with `node cli/index.js test-project --stack <key>`
- [ ] Generated project starts and runs correctly
- [ ] `npm test` passes
