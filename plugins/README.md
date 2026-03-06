# Plugins

This directory stores installed AutoDevStack plugins.

Plugins allow community members and teams to extend AutoDevStack with custom templates, generators, and post-scaffold hooks.

## Plugin Format

Each plugin lives in its own subdirectory inside `plugins/` and must contain a `plugin.json` manifest:

```
plugins/
  my-plugin/
    plugin.json
    templates/
      my-template/
        package.json
        src/
        ...
```

### `plugin.json` schema

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "A short description of the plugin",
  "templates": [
    {
      "name": "My Custom Template",
      "key": "my-template",
      "path": "templates/my-template"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Unique plugin identifier (used as the directory name) |
| `version` | string | ✅ | Semantic version string |
| `description` | string | | Human-readable description |
| `templates` | array | ✅ | List of templates provided by this plugin |
| `templates[].name` | string | ✅ | Display name shown in interactive picker |
| `templates[].key` | string | ✅ | CLI key used with `--stack` / `--template` |
| `templates[].path` | string | | Path relative to the plugin root (default: `templates/<key>`) |

## Installing Plugins

### From npm

```bash
autodevstack plugin add autodevstack-plugin-svelte
```

### From a local path

```bash
autodevstack plugin add ./my-local-plugin
```

## Listing Installed Plugins

```bash
autodevstack plugin list
```

## Removing a Plugin

```bash
autodevstack plugin remove my-plugin
```

## Using a Plugin Template

Once installed, plugin templates appear alongside built-in stacks in the interactive picker and can also be used via the `--stack` flag:

```bash
autodevstack create my-app --stack my-template
```

## Contributing a Plugin

1. Create a plugin package following the format described above
2. Add a `plugin.json` manifest and your template files
3. Publish to npm with the naming convention `autodevstack-plugin-<name>`
4. Users can then install it with `autodevstack plugin add autodevstack-plugin-<name>`

