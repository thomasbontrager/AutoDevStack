# Plugin System

AutoDevStack's plugin system lets you extend the CLI with new templates without modifying the core codebase. Plugins can be published to npm, shared as local directories, or used internally within a team.

---

## How It Works

At startup, the CLI calls `loadPlugins()`, which scans the `plugins/` directory for subdirectories containing a `plugin.json` manifest. Each discovered plugin registers its templates into the global `pluginTemplates` and `pluginAliases` maps, making them available alongside built-in stacks.

```
plugins/
├── my-svelte-plugin/
│   └── plugin.json
└── my-internal-plugin/
    └── plugin.json
```

---

## Plugin Manifest Format

Each plugin directory must contain a `plugin.json` with this structure:

```json
{
  "name": "autodevstack-plugin-svelte",
  "version": "1.0.0",
  "description": "SvelteKit template for AutoDevStack",
  "templates": [
    {
      "name": "SvelteKit",
      "key": "svelte",
      "path": "templates/svelte"
    }
  ]
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Plugin package name (used for display and removal) |
| `version` | ✅ | Semver version string |
| `description` | ✅ | Short description of the plugin |
| `templates` | ✅ | Array of template definitions (see below) |

### Template Definition Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name shown in the interactive prompt |
| `key` | ✅ | CLI flag value used with `--stack` or `--template` |
| `path` | Optional | Path to the template directory, relative to the plugin root. Defaults to `templates/<key>` |

---

## Installing a Plugin

### From npm

```bash
autodevstack plugin add autodevstack-plugin-svelte
```

The CLI installs the package into `plugins/autodevstack-plugin-svelte/` and loads its manifest.

### From a local directory

```bash
autodevstack plugin add ./my-local-plugin
```

This copies or links the plugin into the `plugins/` directory.

### Verifying installation

```bash
autodevstack plugin list
```

Output example:

```
Installed plugins:
  autodevstack-plugin-svelte  v1.0.0  SvelteKit template for AutoDevStack
    Templates: svelte
```

---

## Uninstalling a Plugin

```bash
autodevstack plugin remove autodevstack-plugin-svelte
```

---

## Using Plugin Templates

Once installed, plugin templates are available just like built-in templates:

```bash
# Interactive mode — plugin templates appear in the stack list
autodevstack

# Non-interactive — use the plugin template's key
autodevstack my-app --stack svelte --git
```

---

## Creating a Plugin

### 1. Initialize the plugin directory

```bash
mkdir autodevstack-plugin-svelte
cd autodevstack-plugin-svelte
```

### 2. Create `plugin.json`

```json
{
  "name": "autodevstack-plugin-svelte",
  "version": "1.0.0",
  "description": "SvelteKit template for AutoDevStack",
  "templates": [
    {
      "name": "SvelteKit",
      "key": "svelte",
      "path": "templates/svelte"
    }
  ]
}
```

### 3. Add your template

```bash
mkdir -p templates/svelte
# Add your template files here
# Follow the same conventions as built-in templates:
# - _gitignore (not .gitignore)
# - .env.example
# - package.json with name, scripts, dependencies
```

### 4. Test locally

```bash
autodevstack plugin add ./autodevstack-plugin-svelte
autodevstack my-svelte-app --stack svelte
```

### 5. Publish to npm (optional)

```bash
npm publish
# Users can then install with:
# autodevstack plugin add autodevstack-plugin-svelte
```

---

## Plugin Naming Convention

Published plugins should follow the naming pattern:

```
autodevstack-plugin-<name>
```

Examples:
- `autodevstack-plugin-svelte`
- `autodevstack-plugin-nestjs`
- `autodevstack-plugin-remix`

---

## Plugin Development Best Practices

- **Follow template conventions** — use `_gitignore`, `.env.example`, `README.md`
- **Keep templates minimal** — same rules as built-in templates
- **Version your plugin** — use semver in `plugin.json`
- **Document your templates** — include a `README.md` in each template directory
- **Test before publishing** — install locally with `autodevstack plugin add ./your-plugin`

---

## Example Plugin Structure

```
autodevstack-plugin-svelte/
├── plugin.json
└── templates/
    └── svelte/
        ├── src/
        │   ├── routes/
        │   │   └── +page.svelte
        │   └── app.html
        ├── static/
        ├── package.json
        ├── svelte.config.js
        ├── vite.config.ts
        ├── tsconfig.json
        ├── _gitignore
        ├── .env.example
        └── README.md
```

---

## How `loadPlugins()` Works

The `loadPlugins()` function in `cli/index.js`:

1. Reads all subdirectories of `plugins/`
2. Looks for `plugin.json` in each subdirectory
3. Parses the manifest and validates the required fields
4. Registers each template into `pluginTemplates` (display name → folder key) and `pluginAliases` (key → resolved path)
5. Appends plugin templates to the interactive prompt choices

Plugin templates are indistinguishable from built-in templates during scaffolding — they go through the same `copyTemplate` flow.
