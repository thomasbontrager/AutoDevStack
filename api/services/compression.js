'use strict';

/**
 * AutoDevStack Compression Service
 *
 * Provides auto-compression for cloud workspaces.  When a project workspace
 * reaches the configured threshold (default: 5 GB) it is automatically
 * compressed down toward a target size (default: 5 MB) using gzip / brotli.
 *
 * The service intentionally uses only Node.js built-ins (zlib, fs, path,
 * child_process) so it adds no extra npm dependencies.
 *
 * Environment variables:
 *   COMPRESSION_THRESHOLD_BYTES – workspace size that triggers auto-compression
 *                                  (default: 5_368_709_120 = 5 GB)
 *   COMPRESSION_TARGET_BYTES    – desired size after compression
 *                                  (default:     5_242_880 = 5 MB)
 */

const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const AUTO_COMPRESS_THRESHOLD_BYTES = parseInt(
  process.env.COMPRESSION_THRESHOLD_BYTES || String(5 * 1024 * 1024 * 1024),
  10,
);

const TARGET_SIZE_BYTES = parseInt(
  process.env.COMPRESSION_TARGET_BYTES || String(5 * 1024 * 1024),
  10,
);

// ─── Size helpers ─────────────────────────────────────────────────────────────

/**
 * Recursively calculate the total on-disk size of a directory in bytes.
 * Silently skips entries that cannot be read (e.g. permission errors).
 *
 * @param {string} dir – absolute path to the directory
 * @returns {number} total size in bytes
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
  } catch { /* ignore unreadable directory */ }
  return total;
}

/**
 * Returns `true` when the given byte count meets or exceeds the auto-
 * compression threshold.
 *
 * @param {number} sizeBytes
 * @returns {boolean}
 */
function shouldAutoCompress(sizeBytes) {
  return sizeBytes >= AUTO_COMPRESS_THRESHOLD_BYTES;
}

// ─── Archive compression ──────────────────────────────────────────────────────

/**
 * Compress an entire directory into a single `.tar.gz` archive using the
 * system `tar` binary (universally available on Linux/macOS build hosts).
 *
 * @param {string} sourceDir   – absolute path to the directory to compress
 * @param {string} outputPath  – destination `.tar.gz` file path
 * @returns {Promise<{archivePath:string, originalBytes:number, compressedBytes:number, ratio:number}>}
 */
function compressDirectory(sourceDir, outputPath) {
  const originalBytes = getDirSizeBytes(sourceDir);

  return new Promise((resolve, reject) => {
    const args = [
      '-czf', outputPath,
      '-C', path.dirname(sourceDir),
      path.basename(sourceDir),
    ];

    const proc = spawn('tar', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`tar exited with code ${code}: ${stderr.trim()}`));
      }
      let compressedBytes = 0;
      try { compressedBytes = fs.statSync(outputPath).size; } catch { /* ignore */ }
      const ratio = originalBytes > 0 ? compressedBytes / originalBytes : 0;
      resolve({ archivePath: outputPath, originalBytes, compressedBytes, ratio });
    });

    proc.on('error', reject);
  });
}

// ─── In-memory / streaming compression ───────────────────────────────────────

/**
 * Compress a `Buffer` or `string` using gzip (best compression level).
 * Suitable for flow-traffic response optimization (HTTP payloads, API responses).
 *
 * @param {Buffer|string} data
 * @returns {Promise<Buffer>}
 */
function gzipData(data) {
  return new Promise((resolve, reject) => {
    zlib.gzip(
      typeof data === 'string' ? Buffer.from(data, 'utf8') : data,
      { level: zlib.constants.Z_BEST_COMPRESSION },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
  });
}

/**
 * Compress a `Buffer` or `string` using Brotli (maximum quality).
 * Brotli typically achieves 15–25 % better ratios than gzip and is ideal for
 * the "super-tight compression through flow traffic" requirement.
 *
 * @param {Buffer|string} data
 * @returns {Promise<Buffer>}
 */
function brotliCompressData(data) {
  return new Promise((resolve, reject) => {
    zlib.brotliCompress(
      typeof data === 'string' ? Buffer.from(data, 'utf8') : data,
      { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY } },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
  });
}

/**
 * Decompress a Brotli-compressed `Buffer`.
 *
 * @param {Buffer} data
 * @returns {Promise<Buffer>}
 */
function brotliDecompressData(data) {
  return new Promise((resolve, reject) => {
    zlib.brotliDecompress(data, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

/**
 * Analyse a project directory and return human-readable size metrics.
 *
 * @param {string} projectDir
 * @returns {{ sizeBytes:number, sizeMB:number, sizeGB:number,
 *             needsCompression:boolean, thresholdBytes:number, targetBytes:number }}
 */
function analyzeProject(projectDir) {
  const sizeBytes = getDirSizeBytes(projectDir);
  return {
    sizeBytes,
    sizeMB: parseFloat((sizeBytes / (1024 * 1024)).toFixed(2)),
    sizeGB: parseFloat((sizeBytes / (1024 * 1024 * 1024)).toFixed(4)),
    needsCompression: shouldAutoCompress(sizeBytes),
    thresholdBytes: AUTO_COMPRESS_THRESHOLD_BYTES,
    targetBytes: TARGET_SIZE_BYTES,
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getDirSizeBytes,
  shouldAutoCompress,
  compressDirectory,
  gzipData,
  brotliCompressData,
  brotliDecompressData,
  analyzeProject,
  AUTO_COMPRESS_THRESHOLD_BYTES,
  TARGET_SIZE_BYTES,
};
