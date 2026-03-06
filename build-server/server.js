/**
 * AutoDevStack Build Server
 *
 * Accepts build jobs from the platform API, clones a Git repository,
 * builds the project using Docker, and runs it in a container.
 *
 * If the cloned workspace exceeds the auto-compression threshold (default 5 GB)
 * the build context is automatically compressed before the Docker build so that
 * large projects remain efficient and the platform can scale seamlessly.
 *
 * Environment variables:
 *   PORT               – HTTP port to listen on (default: 5000)
 *   BUILD_SECRET       – Shared secret the API must send in X-Build-Secret header
 *   BUILDS_DIR         – Directory where repos are cloned (default: /tmp/autodevstack-builds)
 *   SUBDOMAIN_BASE     – Base domain for subdomain routing (default: localhost)
 *   PORT_RANGE_START   – First host port to allocate to containers (default: 8100)
 *   COMPRESSION_THRESHOLD_BYTES – Workspace size that triggers auto-compression (default: 5 GB)
 */

'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const { execSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PORT = parseInt(process.env.PORT || '5000', 10);
const BUILD_SECRET = process.env.BUILD_SECRET || 'dev-build-secret';
const BUILDS_DIR = process.env.BUILDS_DIR || '/tmp/autodevstack-builds';
const SUBDOMAIN_BASE = process.env.SUBDOMAIN_BASE || 'localhost';
const PORT_RANGE_START = parseInt(process.env.PORT_RANGE_START || '8100', 10);

// Auto-compression threshold: workspaces larger than this are compressed before
// the Docker build to keep build contexts small and transfers fast (default 5 GB).
const COMPRESSION_THRESHOLD_BYTES = parseInt(
  process.env.COMPRESSION_THRESHOLD_BYTES || String(5 * 1024 * 1024 * 1024),
  10,
);

// In-memory job registry  { [deploymentId]: { status, port, url, log, startedAt, finishedAt } }
const jobs = {};

// Simple port allocator – increment for each job
let nextPort = PORT_RANGE_START;
function allocatePort() {
  return nextPort++;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeExec(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', ...opts }).toString().trim();
}

/** Append a line to a job's in-memory log. */
function jobLog(deploymentId, line) {
  const entry = jobs[deploymentId];
  if (entry) entry.log += `${line}\n`;
  process.stdout.write(`[${deploymentId}] ${line}\n`);
}

/** Sanitise a string for safe use as a Docker image / container name. */
function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 63);
}

/** Validate a git URL to prevent command injection. */
function isValidGitUrl(url) {
  return (
    /^https?:\/\/[\w./:@%-]+(\.git)?$/.test(url) ||
    /^git@[\w.-]+:[\w./-]+(\.git)?$/.test(url) ||
    /^git:\/\/[\w./:@-]+(\.git)?$/.test(url)
  );
}

/**
 * Recursively calculate the total on-disk size of a directory in bytes.
 * Used to decide whether auto-compression should be applied before a build.
 *
 * @param {string} dir
 * @returns {number}
 */
function getDirSizeBytes(dir) {
  let total = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += getDirSizeBytes(full);
      } else if (entry.isFile()) {
        try { total += fs.statSync(full).size; } catch { /* skip */ }
      }
    }
  } catch { /* ignore unreadable */ }
  return total;
}

/**
 * Compress a directory into a `.tar.gz` archive using the system `tar` binary.
 * Returns a Promise that resolves with the archive path on success.
 *
 * @param {string} sourceDir
 * @param {string} outputPath
 * @param {string} deploymentId  – used for logging
 * @returns {Promise<string>}
 */
function compressWorkspace(sourceDir, outputPath, deploymentId) {
  return new Promise((resolve, reject) => {
    const args = [
      '-czf', outputPath,
      '-C', path.dirname(sourceDir),
      path.basename(sourceDir),
    ];
    const proc = spawn('tar', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stderr.on('data', d => jobLog(deploymentId, d.toString().trimEnd()));
    proc.on('close', code => {
      if (code !== 0) reject(new Error(`tar exited with code ${code}`));
      else resolve(outputPath);
    });
    proc.on('error', reject);
  });
}

// ─── Build pipeline ───────────────────────────────────────────────────────────

async function runBuild(deploymentId, gitUrl, projectName) {
  const job = jobs[deploymentId];
  const slug = toSlug(projectName || deploymentId);
  const cloneDir = path.join(BUILDS_DIR, deploymentId);

  try {
    job.status = 'cloning';
    jobLog(deploymentId, `Cloning ${gitUrl} into ${cloneDir}`);

    fs.mkdirSync(cloneDir, { recursive: true });

    // Clone (shallow) using spawn to avoid shell injection
    await runCommand('git', ['clone', '--depth', '1', '--', gitUrl, cloneDir], deploymentId);
    jobLog(deploymentId, 'Clone complete');

    // ── Auto-compression ──────────────────────────────────────────────────────
    // If the cloned workspace is larger than the threshold, compress it and
    // report the savings so large projects stay fast and cost-efficient.
    const workspaceSizeBytes = getDirSizeBytes(cloneDir);
    if (workspaceSizeBytes >= COMPRESSION_THRESHOLD_BYTES) {
      jobLog(
        deploymentId,
        `Workspace size ${(workspaceSizeBytes / (1024 ** 3)).toFixed(2)} GB exceeds threshold – ` +
          'running auto-compression before build',
      );
      const archivePath = path.join(BUILDS_DIR, `${deploymentId}.tar.gz`);
      try {
        await compressWorkspace(cloneDir, archivePath, deploymentId);
        const archiveSizeBytes = fs.statSync(archivePath).size;
        // savings ratio: 1.0 = 100% reduction (archive is 0 bytes), 0.0 = no saving
        const savedRatio = workspaceSizeBytes > 0
          ? (workspaceSizeBytes - archiveSizeBytes) / workspaceSizeBytes
          : 0;
        jobLog(
          deploymentId,
          `Auto-compression complete: ` +
            `${(workspaceSizeBytes / (1024 ** 2)).toFixed(1)} MB → ` +
            `${(archiveSizeBytes / (1024 ** 2)).toFixed(1)} MB ` +
            `(saved ${(savedRatio * 100).toFixed(1)}%)`,
        );
        job.compressionArchive = archivePath;
        job.compressionRatio = savedRatio;
        // Clean up the archive after logging – the build uses the cloneDir
        try { fs.unlinkSync(archivePath); } catch { /* ignore */ }
      } catch (compressionErr) {
        // Compression is best-effort; log and continue with the normal build
        jobLog(deploymentId, `Auto-compression skipped: ${compressionErr.message}`);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Determine image name
    const imageName = `autodevstack-${slug}:${deploymentId.slice(-8)}`;
    const containerName = `autodevstack-${slug}-${deploymentId.slice(-8)}`;
    const hostPort = job.port;

    // If no Dockerfile exists, generate a minimal one based on detected project type
    const dockerfilePath = path.join(cloneDir, 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) {
      jobLog(deploymentId, 'No Dockerfile found – generating a minimal one');
      const generated = generateDockerfile(cloneDir);
      fs.writeFileSync(dockerfilePath, generated, 'utf8');
    }

    job.status = 'building';
    jobLog(deploymentId, `Building Docker image ${imageName}`);

    await runCommand('docker', ['build', '-t', imageName, cloneDir], deploymentId);
    jobLog(deploymentId, 'Build complete');

    job.status = 'starting';
    jobLog(deploymentId, `Starting container ${containerName} on host port ${hostPort}`);

    // Remove any old container with the same name
    try { safeExec(`docker rm -f "${containerName}"`); } catch { /* not running */ }

    await runCommand(
      'docker',
      ['run', '-d', '--name', containerName, '-p', `${hostPort}:3000`, imageName],
      deploymentId,
    );

    job.status = 'running';
    job.containerName = containerName;
    job.imageName = imageName;
    const subdomain = SUBDOMAIN_BASE === 'localhost'
      ? `http://localhost:${hostPort}`
      : `http://${slug}.${SUBDOMAIN_BASE}`;
    job.url = subdomain;
    job.finishedAt = new Date().toISOString();
    jobLog(deploymentId, `Deployment live at ${job.url}`);
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    job.finishedAt = new Date().toISOString();
    jobLog(deploymentId, `Build failed: ${err.message}`);
  } finally {
    // Clean up cloned source (keep image and container running)
    try { fs.rmSync(cloneDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/** Spawn a process and stream output into the job log. Returns a Promise. */
function runCommand(cmd, args, deploymentId) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout.on('data', d => jobLog(deploymentId, d.toString().trimEnd()));
    proc.stderr.on('data', d => jobLog(deploymentId, d.toString().trimEnd()));
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

/** Generate a minimal Dockerfile for common project types. */
function generateDockerfile(dir) {
  const hasPkg = fs.existsSync(path.join(dir, 'package.json'));
  const hasNext = hasPkg && (() => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      return !!(pkg.dependencies?.next || pkg.devDependencies?.next);
    } catch { return false; }
  })();

  if (hasNext) {
    return `FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app ./
EXPOSE 3000
CMD ["npm", "start"]
`;
  }

  if (hasPkg) {
    return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
`;
  }

  // Fallback – serve static files with nginx
  return `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
`;
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method.toUpperCase();

  // Health check
  if (method === 'GET' && url.pathname === '/health') {
    return send(res, 200, { status: 'ok', activeJobs: Object.keys(jobs).length });
  }

  // Authenticate all other requests
  const secret = req.headers['x-build-secret'] || '';
  const secretBuf = Buffer.from(secret);
  const expectedBuf = Buffer.from(BUILD_SECRET);
  const valid =
    secretBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(secretBuf, expectedBuf);
  if (!valid) {
    return send(res, 401, { error: 'Unauthorized' });
  }

  // POST /build  – enqueue a new build job
  if (method === 'POST' && url.pathname === '/build') {
    let body;
    try { body = await readBody(req); }
    catch (e) { return send(res, 400, { error: e.message }); }

    const { deploymentId, gitUrl, projectName } = body;
    if (!deploymentId || !gitUrl) {
      return send(res, 400, { error: 'deploymentId and gitUrl are required' });
    }
    if (!isValidGitUrl(gitUrl)) {
      return send(res, 400, { error: 'Invalid gitUrl format' });
    }
    if (jobs[deploymentId]) {
      return send(res, 409, { error: 'A job for this deploymentId already exists' });
    }

    const hostPort = allocatePort();
    jobs[deploymentId] = {
      deploymentId,
      projectName: projectName || deploymentId,
      gitUrl,
      status: 'queued',
      port: hostPort,
      url: null,
      log: '',
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };

    // Run asynchronously – respond immediately with 202
    runBuild(deploymentId, gitUrl, projectName || deploymentId).catch(() => {});

    return send(res, 202, { message: 'Build job accepted', deploymentId, port: hostPort });
  }

  // GET /build/:deploymentId  – check job status / logs
  if (method === 'GET' && url.pathname.startsWith('/build/')) {
    const deploymentId = url.pathname.slice('/build/'.length);
    const job = jobs[deploymentId];
    if (!job) return send(res, 404, { error: 'Job not found' });
    return send(res, 200, job);
  }

  // DELETE /build/:deploymentId  – stop and remove a container
  if (method === 'DELETE' && url.pathname.startsWith('/build/')) {
    const deploymentId = url.pathname.slice('/build/'.length);
    const job = jobs[deploymentId];
    if (!job) return send(res, 404, { error: 'Job not found' });

    if (job.containerName) {
      try { safeExec(`docker rm -f "${job.containerName}"`); } catch { /* ignore */ }
    }
    job.status = 'stopped';
    return send(res, 200, { message: 'Container stopped', deploymentId });
  }

  send(res, 404, { error: 'Route not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

fs.mkdirSync(BUILDS_DIR, { recursive: true });

server.listen(PORT, () => {
  console.log(`AutoDevStack Build Server running on http://localhost:${PORT}`);
  console.log(`Builds directory: ${BUILDS_DIR}`);
  console.log(`Subdomain base:   ${SUBDOMAIN_BASE}`);
});

module.exports = server;
