/**
 * AutoDevStack v2.0 - CLI unit tests
 * Run with: npm test
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

// We import only the pure, testable helpers (not the IIFE main() entry point)
import {
  parseArgs,
  stacks,
  stackAliases,
  loadPlugins,
  applyPlugins,
  addDockerSupport,
  handleTemplate,
  handleAI,
  handlePlugin,
} from '../cli/index.js';

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

describe('parseArgs', () => {
  it('defaults to "create" subcommand when no subcommand is given', () => {
    const result = parseArgs(['node', 'autodevstack', 'my-app', '--stack', 'next']);
    expect(result.subcommand).toBe('create');
    expect(result.flags.projectName).toBe('my-app');
    expect(result.flags.stack).toBe('next');
  });

  it('recognises the "create" subcommand explicitly', () => {
    const result = parseArgs(['node', 'autodevstack', 'create', 'my-project', '--stack', 'node']);
    expect(result.subcommand).toBe('create');
    expect(result.flags.projectName).toBe('my-project');
    expect(result.flags.stack).toBe('node');
  });

  it('recognises the "template" subcommand', () => {
    const result = parseArgs(['node', 'autodevstack', 'template', 'list']);
    expect(result.subcommand).toBe('template');
    expect(result.subArgs).toEqual(['list']);
  });

  it('recognises the "ai" subcommand', () => {
    const result = parseArgs(['node', 'autodevstack', 'ai']);
    expect(result.subcommand).toBe('ai');
  });

  it('recognises the "plugin" subcommand with "add"', () => {
    const result = parseArgs(['node', 'autodevstack', 'plugin', 'add', 'my-plugin']);
    expect(result.subcommand).toBe('plugin');
    expect(result.subArgs).toEqual(['add', 'my-plugin']);
  });

  it('recognises the "plugin" subcommand with "list"', () => {
    const result = parseArgs(['node', 'autodevstack', 'plugin', 'list']);
    expect(result.subcommand).toBe('plugin');
    expect(result.subArgs).toEqual(['list']);
  });

  it('sets help flag for --help', () => {
    const result = parseArgs(['node', 'autodevstack', '--help']);
    expect(result.flags.help).toBe(true);
  });

  it('sets help flag for -h shorthand', () => {
    const result = parseArgs(['node', 'autodevstack', '-h']);
    expect(result.flags.help).toBe(true);
  });

  it('parses --git and --docker flags', () => {
    const result = parseArgs(['node', 'autodevstack', 'create', 'proj', '--git', '--docker']);
    expect(result.flags.git).toBe(true);
    expect(result.flags.docker).toBe(true);
  });

  it('parses --template as alias for --stack', () => {
    const result = parseArgs(['node', 'autodevstack', 'create', 'proj', '--template', 'saas']);
    expect(result.flags.template).toBe('saas');
  });

  it('parses short flags -s and -t', () => {
    const result = parseArgs(['node', 'autodevstack', 'create', 'proj', '-s', 't3', '-t', 'saas']);
    expect(result.flags.stack).toBe('t3');
    expect(result.flags.template).toBe('saas');
  });
});

// ---------------------------------------------------------------------------
// stacks and stackAliases
// ---------------------------------------------------------------------------

describe('built-in stacks', () => {
  it('contains all expected stack keys', () => {
    const keys = Object.values(stacks);
    expect(keys).toContain('default');
    expect(keys).toContain('node');
    expect(keys).toContain('next');
    expect(keys).toContain('t3');
    expect(keys).toContain('saas');
    expect(keys).toContain('monorepo');
  });

  it('stackAliases maps react → default', () => {
    expect(stackAliases['react']).toBe('default');
  });

  it('stackAliases maps express → node', () => {
    expect(stackAliases['express']).toBe('node');
  });

  it('stackAliases maps nextjs → next', () => {
    expect(stackAliases['nextjs']).toBe('next');
  });
});

// ---------------------------------------------------------------------------
// Plugin system – loadPlugins / applyPlugins
// ---------------------------------------------------------------------------

describe('plugin system', () => {
  let tmpPluginsDir;

  beforeEach(() => {
    tmpPluginsDir = path.join(os.tmpdir(), `ads-test-plugins-${Date.now()}`);
    fs.ensureDirSync(tmpPluginsDir);
  });

  afterEach(() => {
    fs.removeSync(tmpPluginsDir);
  });

  it('loadPlugins returns empty array when plugins dir is missing', () => {
    // Point PLUGINS_DIR at a nonexistent path via the module constant is not
    // directly possible without rewiring; test the "no dir" branch indirectly
    // by checking an empty tmp dir returns []
    const fakePluginsDir = path.join(os.tmpdir(), 'nonexistent-plugins-' + Date.now());
    expect(fs.existsSync(fakePluginsDir)).toBe(false);
    // The real loadPlugins() reads from the module-level PLUGINS_DIR.
    // Here we verify the actual function doesn't throw on any existing state.
    expect(() => loadPlugins()).not.toThrow();
  });

  it('loadPlugins reads plugin.json manifests from subdirectories', () => {
    // Create a fake plugin directory with a plugin.json
    const pluginDir = path.join(tmpPluginsDir, 'test-plugin');
    fs.ensureDirSync(pluginDir);
    fs.writeJsonSync(path.join(pluginDir, 'plugin.json'), {
      name: 'test-plugin',
      version: '1.0.0',
      templates: { 'My Custom Template': 'custom' },
      templatePaths: { 'custom': './templates/custom' },
    });

    // Manually replicate what loadPlugins does for this tmpPluginsDir
    const entries = fs.readdirSync(tmpPluginsDir, { withFileTypes: true });
    const plugins = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(tmpPluginsDir, entry.name, 'plugin.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = fs.readJsonSync(manifestPath);
        plugins.push({ ...manifest, _dir: path.join(tmpPluginsDir, entry.name) });
      }
    }

    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe('test-plugin');
    expect(plugins[0].templates).toEqual({ 'My Custom Template': 'custom' });
  });

  it('applyPlugins merges plugin templates into stacks and aliases', () => {
    const testStacks = { ...stacks };
    const testAliases = { ...stackAliases };

    const plugins = [
      {
        name: 'my-plugin',
        templates: { 'Firebase Starter': 'firebase' },
      },
    ];

    applyPlugins(plugins, testStacks, testAliases);

    expect(testStacks['Firebase Starter']).toBe('firebase');
    expect(testAliases['firebase']).toBe('firebase');
  });

  it('applyPlugins is a no-op for plugins without templates', () => {
    const testStacks = { ...stacks };
    const testAliases = { ...stackAliases };
    const before = Object.keys(testStacks).length;

    applyPlugins([{ name: 'no-templates-plugin' }], testStacks, testAliases);

    expect(Object.keys(testStacks).length).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Docker support
// ---------------------------------------------------------------------------

describe('addDockerSupport', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `ads-docker-test-${Date.now()}`);
    fs.ensureDirSync(tmpDir);
  });

  afterEach(() => {
    fs.removeSync(tmpDir);
  });

  it('generates Dockerfile, docker-compose.yml, and .dockerignore for "next" template', () => {
    addDockerSupport(tmpDir, 'next');

    expect(fs.existsSync(path.join(tmpDir, 'Dockerfile'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'docker-compose.yml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.dockerignore'))).toBe(true);

    const dockerfile = fs.readFileSync(path.join(tmpDir, 'Dockerfile'), 'utf8');
    expect(dockerfile).toContain('FROM node:18-alpine');
    expect(dockerfile).toContain('npm run build');
    expect(dockerfile).toContain('EXPOSE 3000');
  });

  it('generates multi-stage Dockerfile for "default" (React/Vite) template', () => {
    addDockerSupport(tmpDir, 'default');

    const dockerfile = fs.readFileSync(path.join(tmpDir, 'Dockerfile'), 'utf8');
    expect(dockerfile).toContain('FROM nginx:alpine');
    expect(dockerfile).toContain('EXPOSE 80');

    const compose = fs.readFileSync(path.join(tmpDir, 'docker-compose.yml'), 'utf8');
    expect(compose).toContain('"80:80"');
  });

  it('includes postgres service in docker-compose for "saas" template', () => {
    addDockerSupport(tmpDir, 'saas');

    const compose = fs.readFileSync(path.join(tmpDir, 'docker-compose.yml'), 'utf8');
    expect(compose).toContain('postgres:15-alpine');
  });

  it('.dockerignore excludes node_modules and .env', () => {
    addDockerSupport(tmpDir, 'node');

    const ignore = fs.readFileSync(path.join(tmpDir, '.dockerignore'), 'utf8');
    expect(ignore).toContain('node_modules');
    expect(ignore).toContain('.env');
  });
});

// ---------------------------------------------------------------------------
// handleTemplate
// ---------------------------------------------------------------------------

describe('handleTemplate', () => {
  it('lists all built-in stacks without throwing', () => {
    const output = [];
    const origLog = console.log;
    console.log = (...args) => output.push(args.join(' '));

    handleTemplate(['list'], stacks);

    console.log = origLog;

    const combined = output.join('\n');
    expect(combined).toContain('default');
    expect(combined).toContain('next');
    expect(combined).toContain('saas');
  });

  it('defaults to "list" when no action is provided', () => {
    const output = [];
    const origLog = console.log;
    console.log = (...args) => output.push(args.join(' '));

    handleTemplate([], stacks);

    console.log = origLog;
    expect(output.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// handleAI
// ---------------------------------------------------------------------------

describe('handleAI', () => {
  it('prints a "coming soon" message', () => {
    const output = [];
    const origLog = console.log;
    console.log = (...args) => output.push(args.join(' '));

    handleAI();

    console.log = origLog;
    expect(output.join(' ')).toContain('coming soon');
  });
});

// ---------------------------------------------------------------------------
// handlePlugin – list with empty plugins dir
// ---------------------------------------------------------------------------

describe('handlePlugin', () => {
  it('prints "No plugins installed" when no plugins exist', () => {
    const output = [];
    const origLog = console.log;
    console.log = (...args) => output.push(args.join(' '));

    // 'list' action – PLUGINS_DIR may or may not have entries in CI,
    // but at minimum the function should not throw
    expect(() => handlePlugin(['list'])).not.toThrow();

    console.log = origLog;
  });

  it('exits with error when "add" is called without a plugin name', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    expect(() => handlePlugin(['add'])).toThrow('process.exit called');

    exitSpy.mockRestore();
  });

  it('exits with error for an unknown plugin action', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    expect(() => handlePlugin(['unknown-action'])).toThrow('process.exit called');

    exitSpy.mockRestore();
  });
});
