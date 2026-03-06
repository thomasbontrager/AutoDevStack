# Plugins

This directory stores installed AutoDevStack plugins.

Plugins allow community members and teams to extend AutoDevStack with custom templates, generators, and post-scaffold hooks.

---

## Plugin System (v2.0)

The plugin system is available from AutoDevStack v2.0. Plugins are stored as subdirectories inside `plugins/`. Each plugin directory must contain a `plugin.json` manifest.

---

## Installing a Plugin

```bash
autodevstack plugin add <plugin-name>
```

## Listing Installed Plugins

```bash
autodevstack plugin list
```

## Removing a Plugin

```bash
autodevstack plugin remove <plugin-name>
```

---

## Plugin API

A plugin is a directory (usually named after its npm package) containing at minimum a **`plugin.json`** manifest file.

### `plugin.json` Schema

```json
{
  "name": "autodevstack-plugin-firebase",
  "version": "1.0.0",
  "description": "Firebase + Next.js starter template",
  "templates": {
    "Firebase + Next.js": "firebase-next"
  },
  "templatePaths": {
    "firebase-next": "./templates/firebase-next"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Unique plugin identifier (usually the npm package name). |
| `version` | `string` | ✅ | Semver version string. |
| `description` | `string` | ❌ | Short description shown in `plugin list`. |
| `templates` | `object` | ❌ | Map of **display name → template key** contributed by this plugin. |
| `templatePaths` | `object` | ❌ | Map of **template key → path** (relative to the plugin directory) where template files live. |

### Template directory structure

Each template referenced in `templatePaths` should be a directory that follows the same conventions as the built-in templates in `templates/`:

```
plugins/
  autodevstack-plugin-firebase/
    plugin.json
    templates/
      firebase-next/
        package.json
        _gitignore
        src/
        ...
```

### How plugins are loaded

At startup, AutoDevStack:
1. Reads every subdirectory inside `plugins/`.
2. Loads `plugin.json` from each subdirectory.
3. Merges contributed `templates` into the stack selection list.
4. Resolves `templatePaths` relative to the plugin directory.

### Developing a plugin locally

1. Create a directory under `plugins/`:
   ```bash
   mkdir plugins/my-local-plugin
   ```
2. Add a `plugin.json` manifest and your template directories.
3. Run `autodevstack template list` to confirm your template appears.
4. Scaffold with `autodevstack create my-app --stack <your-template-key>`.

---

## Contributing a Plugin

1. Scaffold your plugin as an npm package that follows the plugin spec above.
2. Publish it to npm with a name prefixed `autodevstack-plugin-`.
3. Open a PR to add it to the [community plugin registry](https://github.com/thomasbontrager/AutoDevStack/discussions).

