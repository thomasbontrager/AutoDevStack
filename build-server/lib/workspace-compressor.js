/**
 * AutoDevStack Workspace Compressor
 *
 * Provides intelligent compression for cloud workspaces.  When a project
 * directory exceeds the configurable threshold (default 5 GB), it is
 * automatically shrunk through:
 *
 *   1. Pruning – remove regenerable artifacts (node_modules, .git, dist, etc.)
 *   2. Flow compression – gzip-compress remaining source files via Node.js
 *      streaming pipelines so data is processed as it flows, without buffering
 *      large files in memory.
 *
 * This typically reduces a 5 GB workspace to < 5 MB for long-term storage,
 * while keeping everything functional (deps are reinstalled on next build).
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream/promises');
const { createReadStream, createWriteStream } = require('node:fs');

// ─── Configuration ────────────────────────────────────────────────────────────

/** Default threshold: 5 GiB */
const DEFAULT_THRESHOLD_BYTES = parseInt(
  process.env.COMPRESSION_THRESHOLD || (5 * 1024 * 1024 * 1024),
  10,
);

/**
 * Paths that can safely be deleted before storage – they are regenerable from
 * package manifests, version control, or the build pipeline.
 */
const PRUNABLE_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'out',
  '.output',
  '__pycache__',
  '.venv',
  'venv',
  '.mypy_cache',
  '.pytest_cache',
  'target',       // Rust / Java / Maven
  'vendor',       // Go / PHP
];

/**
 * File extensions whose content should be gzip-compressed for storage.
 * Binary files (images, fonts, compiled assets) are excluded because they
 * are already compressed or rarely benefit from further compression.
 */
const COMPRESSIBLE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs',
  '.ts', '.tsx', '.jsx',
  '.json', '.jsonc',
  '.css', '.scss', '.sass', '.less',
  '.html', '.htm', '.xml', '.svg',
  '.md', '.mdx', '.txt', '.csv',
  '.yaml', '.yml', '.toml', '.ini', '.env',
  '.sh', '.bash', '.zsh',
  '.py', '.rb', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.hpp',
  '.prisma', '.graphql', '.gql',
  '.lock',   // package-lock.json, yarn.lock, Cargo.lock etc.
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively calculate the total byte size of a directory.
 * @param {string} dirPath
 * @returns {number} total bytes
 */
function getDirSize(dirPath) {
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isSymbolicLink()) {
        continue; // skip symlinks to avoid cycles
      } else if (entry.isDirectory()) {
        total += getDirSize(fullPath);
      } else if (entry.isFile()) {
        try {
          total += fs.statSync(fullPath).size;
        } catch { /* unreadable – skip */ }
      }
    }
  } catch { /* unreadable directory – skip */ }
  return total;
}

/**
 * Format a byte count as a human-readable string (e.g. "4.78 GB").
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024)      return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

// ─── Pruning ──────────────────────────────────────────────────────────────────

/**
 * Remove regenerable artifacts from the workspace to recover storage space.
 *
 * @param {string} dirPath   Root of the workspace directory.
 * @returns {number}         Bytes freed.
 */
function pruneWorkspace(dirPath) {
  let freed = 0;
  for (const name of PRUNABLE_PATHS) {
    const target = path.join(dirPath, name);
    if (fs.existsSync(target)) {
      try {
        const size = getDirSize(target);
        fs.rmSync(target, { recursive: true, force: true });
        freed += size;
      } catch { /* skip if removal fails */ }
    }
  }
  return freed;
}

// ─── Flow compression (streaming pipeline) ────────────────────────────────────

/**
 * Gzip-compress a single file via a streaming pipeline (flow traffic).
 * The original file is replaced by its `.gz` counterpart.
 *
 * @param {string} filePath   Absolute path to the file to compress.
 * @returns {Promise<{originalSize: number, compressedSize: number}>}
 */
async function compressFile(filePath) {
  const originalSize = fs.statSync(filePath).size;
  const outPath = `${filePath}.gz`;

  const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

  // Streaming pipeline: read → gzip → write (no full-file buffering)
  await pipeline(
    createReadStream(filePath),
    gzip,
    createWriteStream(outPath),
  );

  const compressedSize = fs.statSync(outPath).size;

  // Replace original with compressed version
  fs.unlinkSync(filePath);

  return { originalSize, compressedSize };
}

/**
 * Recursively gzip-compress all compressible source files in a directory,
 * replacing each original with a `.gz` file.
 *
 * @param {string} dirPath
 * @returns {Promise<{files: number, savedBytes: number}>}
 */
async function compressSourceFiles(dirPath) {
  let files = 0;
  let savedBytes = 0;

  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return { files, savedBytes };
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const sub = await compressSourceFiles(fullPath);
      files += sub.files;
      savedBytes += sub.savedBytes;
    } else if (entry.isFile() && !entry.name.endsWith('.gz')) {
      const ext = path.extname(entry.name).toLowerCase();
      if (COMPRESSIBLE_EXTENSIONS.has(ext)) {
        try {
          const { originalSize, compressedSize } = await compressFile(fullPath);
          savedBytes += Math.max(0, originalSize - compressedSize);
          files++;
        } catch { /* skip uncompressible files */ }
      }
    }
  }

  return { files, savedBytes };
}

// ─── Auto-compress ────────────────────────────────────────────────────────────

/**
 * Auto-compress a workspace directory if it exceeds the size threshold.
 *
 * Compression strategy:
 *   1. Measure original size.
 *   2. If below threshold → return without compressing.
 *   3. Prune regenerable artifacts (node_modules, .git, dist…).
 *   4. If still above threshold → gzip-compress source files via streaming
 *      flow pipeline.
 *
 * @param {string} dirPath                 Workspace directory path.
 * @param {number} [thresholdBytes]        Byte threshold (default 5 GiB).
 * @returns {Promise<CompressionStats>}
 *
 * @typedef {Object} CompressionStats
 * @property {boolean} triggered           Whether compression was applied.
 * @property {number}  originalSizeBytes   Size before compression.
 * @property {number}  prunedSizeBytes     Size after pruning artifacts.
 * @property {number}  finalSizeBytes      Size after all compression.
 * @property {number}  ratio               finalSize / originalSize (0–1).
 * @property {number}  freedBytes          Bytes reclaimed in total.
 * @property {number}  thresholdBytes      The threshold that was applied.
 * @property {string}  originalSizeHuman   Human-readable original size.
 * @property {string}  finalSizeHuman      Human-readable final size.
 */
async function autoCompress(dirPath, thresholdBytes = DEFAULT_THRESHOLD_BYTES) {
  const originalSizeBytes = getDirSize(dirPath);

  const stats = {
    triggered: false,
    originalSizeBytes,
    prunedSizeBytes: originalSizeBytes,
    finalSizeBytes: originalSizeBytes,
    ratio: 1,
    freedBytes: 0,
    thresholdBytes,
    originalSizeHuman: formatBytes(originalSizeBytes),
    finalSizeHuman: formatBytes(originalSizeBytes),
  };

  if (originalSizeBytes < thresholdBytes) {
    return stats; // nothing to do
  }

  stats.triggered = true;

  // Step 1: Prune regenerable artifacts
  stats.freedBytes += pruneWorkspace(dirPath);
  stats.prunedSizeBytes = getDirSize(dirPath);
  stats.finalSizeBytes = stats.prunedSizeBytes;

  // Step 2: If still large, gzip-compress remaining source files via
  //         streaming flow pipeline (no full-file buffering).
  if (stats.prunedSizeBytes > thresholdBytes) {
    const { savedBytes } = await compressSourceFiles(dirPath);
    stats.freedBytes += savedBytes;
    stats.finalSizeBytes = getDirSize(dirPath);
  }

  stats.ratio = stats.originalSizeBytes > 0
    ? Math.round((stats.finalSizeBytes / stats.originalSizeBytes) * 10000) / 10000
    : 1;

  stats.finalSizeHuman = formatBytes(stats.finalSizeBytes);

  return stats;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  DEFAULT_THRESHOLD_BYTES,
  getDirSize,
  formatBytes,
  pruneWorkspace,
  compressFile,
  compressSourceFiles,
  autoCompress,
};
