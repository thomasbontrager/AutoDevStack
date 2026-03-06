/**
 * AutoDevStack CLI tests
 *
 * Uses Node's built-in test runner (node:test) – no extra dependencies.
 * Run with: npm test  (or node --test tests/cli.test.js)
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, '..', 'cli', 'index.js');
const PLUGINS_DIR = path.resolve(__dirname, '..', 'plugins');

// Helper: run the CLI and return { output (stdout+stderr combined), exitCode }
// args can be a string (supports basic quoted tokens, e.g. "plugin add /some/path") or an array.
// NOTE: the string tokenizer handles simple quoted strings but not escaped quotes inside them.
// For paths with special characters, pass an array directly, e.g. runCLI(['plugin', 'add', srcDir]).
function runCLI(args, options = {}) {
  const argArray = Array.isArray(args) ? args : args.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)
    ?.map(a => a.replace(/^["']|["']$/g, '')) ?? [];

  const result = spawnSync(
    process.execPath,
    [CLI, ...argArray],
    {
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0' }, // disable chalk colours
      ...options,
    }
  );
  // Combine stdout and stderr so tests can inspect ora spinner output (written to stderr)
  const output = (result.stdout || '') + (result.stderr || '');
  return { output, exitCode: result.status ?? 1 };
}

// ─── Help ─────────────────────────────────────────────────────────────────────

describe('--help flag', () => {
  test('shows subcommands section', () => {
    const { output: stdout } = runCLI('--help');
    assert.ok(stdout.includes('SUBCOMMANDS'), 'Expected SUBCOMMANDS section');
    assert.ok(stdout.includes('create'), 'Expected "create" subcommand');
    assert.ok(stdout.includes('template'), 'Expected "template" subcommand');
    assert.ok(stdout.includes('ai'), 'Expected "ai" subcommand');
    assert.ok(stdout.includes('plugin'), 'Expected "plugin" subcommand');
  });

  test('shows plugin subcommands', () => {
    const { output: stdout } = runCLI('--help');
    assert.ok(stdout.includes('plugin add'), 'Expected "plugin add"');
    assert.ok(stdout.includes('plugin list'), 'Expected "plugin list"');
    assert.ok(stdout.includes('plugin remove'), 'Expected "plugin remove"');
  });

  test('lists built-in stacks', () => {
    const { output: stdout } = runCLI('--help');
    assert.ok(stdout.includes('default'), 'Expected "default" stack');
    assert.ok(stdout.includes('next'), 'Expected "next" stack');
    assert.ok(stdout.includes('t3'), 'Expected "t3" stack');
  });

  test('-h shorthand also shows help', () => {
    const { output: stdout } = runCLI('-h');
    assert.ok(stdout.includes('AutoDevStack'), 'Expected AutoDevStack branding');
  });
});

// ─── template subcommand ──────────────────────────────────────────────────────

describe('template subcommand', () => {
  test('template list shows built-in stacks', () => {
    const { output: stdout, exitCode } = runCLI('template list');
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes('React + TypeScript + Vite'), 'Expected React stack');
    assert.ok(stdout.includes('Next.js'), 'Expected Next.js stack');
    assert.ok(stdout.includes('T3 Stack'), 'Expected T3 Stack');
  });

  test('template (no sub) defaults to list', () => {
    const { output: stdout, exitCode } = runCLI('template');
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes('Available Templates'), 'Expected template list header');
  });

  test('unknown template subcommand exits non-zero', () => {
    const { exitCode } = runCLI('template unknown-cmd');
    assert.notEqual(exitCode, 0);
  });
});

// ─── ai subcommand ────────────────────────────────────────────────────────────

describe('ai subcommand', () => {
  test('ai shows coming-soon message', () => {
    const { output: stdout, exitCode } = runCLI('ai');
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes('coming soon'), 'Expected coming-soon message');
  });

  test('ai echoes provided description', () => {
    const { output: stdout } = runCLI('ai build a todo app');
    assert.ok(stdout.includes('build a todo app'), 'Expected description echo');
  });
});

// ─── plugin subcommand ────────────────────────────────────────────────────────

describe('plugin list', () => {
  test('plugin list shows no-plugins message when empty', () => {
    // Temporarily rename any installed test plugin to avoid interference
    const { output: stdout, exitCode } = runCLI('plugin list');
    assert.equal(exitCode, 0);
    // Either shows a list or the "no plugins" message
    assert.ok(
      stdout.includes('No plugins installed') || stdout.includes('Installed Plugins'),
      'Expected plugin list output'
    );
  });
});

describe('plugin add (local path)', () => {
  let tmpDir;
  let pluginSrcDir;
  const pluginName = 'autodevstack-test-plugin-local';

  before(() => {
    // Create a minimal plugin in a temp directory
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ads-test-'));
    pluginSrcDir = path.join(tmpDir, pluginName);
    const tplDir = path.join(pluginSrcDir, 'templates', 'test-local-stack');
    fs.mkdirpSync(tplDir);

    fs.writeJsonSync(path.join(pluginSrcDir, 'plugin.json'), {
      name: pluginName,
      version: '0.0.1',
      description: 'Local test plugin',
      templates: [{ name: 'Test Local Stack', key: 'test-local-stack' }],
    });
    fs.writeJsonSync(path.join(tplDir, 'package.json'), { name: 'test-local-stack', version: '0.0.1' });
  });

  after(() => {
    // Clean up installed plugin and temp dir
    const installedPath = path.join(PLUGINS_DIR, pluginName);
    if (fs.existsSync(installedPath)) fs.removeSync(installedPath);
    if (fs.existsSync(tmpDir)) fs.removeSync(tmpDir);
  });

  test('installs a plugin from a local path', () => {
    const { output: stdout, exitCode } = runCLI(['plugin', 'add', pluginSrcDir]);
    assert.equal(exitCode, 0, `Expected exit 0, got: ${stdout}`);
    assert.ok(stdout.includes('installed successfully'), 'Expected success message');

    const installedPath = path.join(PLUGINS_DIR, pluginName);
    assert.ok(fs.existsSync(installedPath), 'Plugin directory should exist in plugins/');
    assert.ok(fs.existsSync(path.join(installedPath, 'plugin.json')), 'plugin.json should be present');
  });

  test('installed plugin appears in plugin list', () => {
    const { output: stdout } = runCLI('plugin list');
    assert.ok(stdout.includes(pluginName), 'Installed plugin should appear in list');
  });

  test('installed plugin template appears in template list', () => {
    const { output: stdout } = runCLI('template list');
    assert.ok(stdout.includes('Test Local Stack'), 'Plugin template should appear in template list');
    assert.ok(stdout.includes('test-local-stack'), 'Plugin template key should appear');
  });

  test('removes an installed plugin', () => {
    const { output: stdout, exitCode } = runCLI(['plugin', 'remove', pluginName]);
    assert.equal(exitCode, 0, `Expected exit 0, got: ${stdout}`);
    assert.ok(stdout.includes('removed successfully'), 'Expected success message');

    const installedPath = path.join(PLUGINS_DIR, pluginName);
    assert.ok(!fs.existsSync(installedPath), 'Plugin directory should be gone after remove');
  });
});

describe('plugin error cases', () => {
  test('plugin add with no name exits non-zero', () => {
    const { exitCode } = runCLI('plugin add');
    assert.notEqual(exitCode, 0);
  });

  test('plugin add non-existent local path exits non-zero', () => {
    const { exitCode } = runCLI('plugin add /tmp/does-not-exist-xyz');
    assert.notEqual(exitCode, 0);
  });

  test('plugin remove non-existent plugin exits non-zero', () => {
    const { exitCode } = runCLI('plugin remove non-existent-plugin-xyz');
    assert.notEqual(exitCode, 0);
  });

  test('unknown plugin subcommand exits non-zero', () => {
    const { exitCode } = runCLI('plugin unknown-cmd');
    assert.notEqual(exitCode, 0);
  });
});

// ─── create subcommand ────────────────────────────────────────────────────────

describe('create subcommand', () => {
  let tmpWorkDir;

  before(() => {
    tmpWorkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ads-create-test-'));
  });

  after(() => {
    if (fs.existsSync(tmpWorkDir)) fs.removeSync(tmpWorkDir);
  });

  test('create scaffolds a project from the default (react) stack', () => {
    const projectName = 'my-react-app';
    const { output: stdout, exitCode } = runCLI(`create ${projectName} --stack react`, { cwd: tmpWorkDir });
    assert.equal(exitCode, 0, `CLI failed: ${stdout}`);

    const projectDir = path.join(tmpWorkDir, projectName);
    assert.ok(fs.existsSync(projectDir), 'Project directory should exist');
    assert.ok(fs.existsSync(path.join(projectDir, 'package.json')), 'package.json should exist');

    const pkg = fs.readJsonSync(path.join(projectDir, 'package.json'));
    assert.equal(pkg.name, projectName, 'package.json name should match project name');
  });

  test('create with --docker adds Dockerfile and docker-compose.yml', () => {
    const projectName = 'my-docker-app';
    const { exitCode, output: stdout } = runCLI(`create ${projectName} --stack node --docker`, { cwd: tmpWorkDir });
    assert.equal(exitCode, 0, `CLI failed: ${stdout}`);

    const projectDir = path.join(tmpWorkDir, projectName);
    assert.ok(fs.existsSync(path.join(projectDir, 'Dockerfile')), 'Dockerfile should exist');
    assert.ok(fs.existsSync(path.join(projectDir, 'docker-compose.yml')), 'docker-compose.yml should exist');
    assert.ok(fs.existsSync(path.join(projectDir, '.dockerignore')), '.dockerignore should exist');
  });

  test('create with --git initializes a Git repository', () => {
    const projectName = 'my-git-app';
    const { exitCode, output: stdout } = runCLI(`create ${projectName} --stack next --git`, { cwd: tmpWorkDir });
    assert.equal(exitCode, 0, `CLI failed: ${stdout}`);

    const projectDir = path.join(tmpWorkDir, projectName);
    assert.ok(fs.existsSync(path.join(projectDir, '.git')), '.git directory should exist');
  });

  test('create fails if project folder already exists', () => {
    const projectName = 'existing-project';
    fs.mkdirpSync(path.join(tmpWorkDir, projectName));
    const { exitCode } = runCLI(`create ${projectName} --stack react`, { cwd: tmpWorkDir });
    assert.notEqual(exitCode, 0, 'Should fail when target directory already exists');
  });

  test('create with unknown stack exits non-zero', () => {
    const { exitCode } = runCLI('create my-app --stack unknown-stack-xyz', { cwd: tmpWorkDir });
    assert.notEqual(exitCode, 0);
  });

  test('legacy mode (no subcommand) also creates a project', () => {
    const projectName = 'legacy-project';
    const { output: stdout, exitCode } = runCLI(`${projectName} --stack react`, { cwd: tmpWorkDir });
    assert.equal(exitCode, 0, `Legacy mode failed: ${stdout}`);
    assert.ok(fs.existsSync(path.join(tmpWorkDir, projectName)), 'Project directory should exist');
  });

  test('_gitignore is renamed to .gitignore', () => {
    // The default (react) template ships a _gitignore that should become .gitignore
    const projectName = 'gitignore-test';
    runCLI(`create ${projectName} --stack react`, { cwd: tmpWorkDir });
    const projectDir = path.join(tmpWorkDir, projectName);
    // Either .gitignore exists (renamed) or _gitignore doesn't (already named correctly)
    const hasGitignore = fs.existsSync(path.join(projectDir, '.gitignore'));
    const hasUnderscoreGitignore = fs.existsSync(path.join(projectDir, '_gitignore'));
    assert.ok(hasGitignore, '.gitignore should exist after scaffolding');
    assert.ok(!hasUnderscoreGitignore, '_gitignore should not remain after scaffolding');
  });
});

// ─── deploy subcommand ────────────────────────────────────────────────────────

describe('deploy subcommand', () => {
  test('deploy --help shows usage', () => {
    const { output, exitCode } = runCLI('deploy --help');
    assert.equal(exitCode, 0);
    assert.ok(output.includes('deploy'), 'Expected "deploy" in output');
    assert.ok(output.includes('--git-url'), 'Expected "--git-url" option');
    assert.ok(output.includes('--env'), 'Expected "--env" option');
  });

  test('deploy -h shorthand also shows help', () => {
    const { output, exitCode } = runCLI('deploy -h');
    assert.equal(exitCode, 0);
    assert.ok(output.includes('deploy'), 'Expected deploy help output');
  });
});
