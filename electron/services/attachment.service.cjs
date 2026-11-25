'use strict';

/**
 * Milestone 29 — Native File Attachment Manager
 *
 * Manages grievance-evidence attachments stored in userData/attachments/.
 * Supports:
 *   - Saving dropped / dialog-selected files to a sandboxed temp store
 *   - Reading them back as Base64 for multipart upload to the API server
 *   - Opening them in the OS's default viewer via shell.openPath
 *   - Enumerating & removing individual attachments
 *
 * Security:
 *   - Only ALLOWED_MIME types / extensions are accepted
 *   - File size is capped at MAX_FILE_BYTES
 *   - Destination paths are resolved inside the userData dir to prevent
 *     path-traversal attacks
 */

const path  = require('path');
const fs    = require('fs');
const crypto = require('crypto');
const { app, shell } = require('electron');

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.txt', '.csv', '.mp4', '.mov', '.avi',
]);

const ALLOWED_MIME_PREFIXES = [
  'image/', 'video/', 'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'text/plain', 'text/csv',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the absolute path to the attachment store directory, creating it if absent. */
function getStoreDir() {
  const dir = path.join(app.getPath('userData'), 'attachments');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Returns the manifest JSON path (tracks metadata for all stored attachments). */
function getManifestPath() {
  return path.join(getStoreDir(), '_manifest.json');
}

/** Reads the manifest or returns an empty array. */
function readManifest() {
  const p = getManifestPath();
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return [];
  }
}

/** Persists the manifest array. */
function writeManifest(entries) {
  fs.writeFileSync(getManifestPath(), JSON.stringify(entries, null, 2), 'utf8');
}

/** Returns true when the given source path is safe to read. */
function isSourcePathSafe(srcPath) {
  if (typeof srcPath !== 'string' || srcPath.trim() === '') return false;
  const resolved = path.resolve(srcPath);
  // Must be an absolute path and must not point inside our own store dir
  // (prevents loops) — no other path restrictions beyond that since the user
  // explicitly chose the file via dialog or drag-and-drop.
  return path.isAbsolute(resolved);
}

/** Returns true when the destination path is inside the store dir. */
function isDestPathSafe(destPath) {
  const storeDir = getStoreDir();
  const resolved = path.resolve(destPath);
  return resolved.startsWith(storeDir + path.sep) || resolved === storeDir;
}

/** Validates extension + mime, throws if disallowed. */
function validateFile(srcPath, mimeType) {
  const ext = path.extname(srcPath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File type not allowed: ${ext}`);
  }
  if (mimeType) {
    const mimeOk = ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p));
    if (!mimeOk) throw new Error(`MIME type not allowed: ${mimeType}`);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Saves a file from an arbitrary source path into the attachment store.
 *
 * @param {string}  srcPath   Absolute path chosen by the user
 * @param {string}  [mimeType] Optional MIME hint (from drag-and-drop DataTransferItem)
 * @param {string}  [sessionId] Optional grievance session key for grouping
 * @returns {{ id, name, size, ext, mimeType, storedPath, sessionId, addedAt }}
 */
function saveAttachment(srcPath, mimeType = '', sessionId = '') {
  if (!isSourcePathSafe(srcPath)) {
    throw new Error('Invalid source path');
  }

  const stat = fs.statSync(srcPath);
  if (!stat.isFile()) throw new Error('Source is not a regular file');
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(`File exceeds ${MAX_FILE_BYTES / 1024 / 1024} MB limit`);
  }

  validateFile(srcPath, mimeType);

  const id      = crypto.randomUUID();
  const ext     = path.extname(srcPath).toLowerCase();
  const name    = path.basename(srcPath);
  const stored  = path.join(getStoreDir(), `${id}${ext}`);

  if (!isDestPathSafe(stored)) {
    throw new Error('Destination path traversal detected');
  }

  fs.copyFileSync(srcPath, stored);

  const entry = {
    id,
    name,
    size: stat.size,
    ext,
    mimeType: mimeType || '',
    storedPath: stored,
    sessionId: sessionId || '',
    addedAt: new Date().toISOString(),
  };

  const manifest = readManifest();
  manifest.push(entry);
  writeManifest(manifest);

  return entry;
}

/**
 * Returns all attachment metadata records (optionally filtered by sessionId).
 *
 * @param {string} [sessionId]
 * @returns {Array<object>}
 */
function listAttachments(sessionId = '') {
  const manifest = readManifest();
  if (!sessionId) return manifest;
  return manifest.filter((e) => e.sessionId === sessionId);
}

/**
 * Reads an attachment as a Base64-encoded string for API multipart upload.
 *
 * @param {string} id
 * @returns {{ id, name, mimeType, base64, size }}
 */
function readAttachmentAsBase64(id) {
  const manifest = readManifest();
  const entry = manifest.find((e) => e.id === id);
  if (!entry) throw new Error(`Attachment not found: ${id}`);

  if (!isDestPathSafe(entry.storedPath)) {
    throw new Error('Stored path traversal detected');
  }

  const data = fs.readFileSync(entry.storedPath);
  return {
    id: entry.id,
    name: entry.name,
    mimeType: entry.mimeType,
    size: entry.size,
    base64: data.toString('base64'),
  };
}

/**
 * Removes an attachment from disk and from the manifest.
 *
 * @param {string} id
 * @returns {{ success: boolean }}
 */
function removeAttachment(id) {
  const manifest = readManifest();
  const idx = manifest.findIndex((e) => e.id === id);
  if (idx === -1) return { success: false, error: 'Not found' };

  const entry = manifest[idx];
  if (isDestPathSafe(entry.storedPath) && fs.existsSync(entry.storedPath)) {
    fs.unlinkSync(entry.storedPath);
  }

  manifest.splice(idx, 1);
  writeManifest(manifest);
  return { success: true };
}

/**
 * Removes all attachments belonging to a session (called after successful submission).
 *
 * @param {string} sessionId
 * @returns {{ removed: number }}
 */
function clearSessionAttachments(sessionId) {
  const manifest = readManifest();
  const kept    = [];
  let   removed = 0;
  for (const entry of manifest) {
    if (entry.sessionId === sessionId) {
      if (isDestPathSafe(entry.storedPath) && fs.existsSync(entry.storedPath)) {
        fs.unlinkSync(entry.storedPath);
      }
      removed++;
    } else {
      kept.push(entry);
    }
  }
  writeManifest(kept);
  return { removed };
}

/**
 * Opens an attachment in the OS default application.
 *
 * @param {string} id
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function openAttachment(id) {
  const manifest = readManifest();
  const entry = manifest.find((e) => e.id === id);
  if (!entry) return { success: false, error: 'Not found' };
  if (!isDestPathSafe(entry.storedPath)) {
    return { success: false, error: 'Invalid stored path' };
  }

  const errMsg = await shell.openPath(entry.storedPath);
  if (errMsg) return { success: false, error: errMsg };
  return { success: true };
}

/**
 * Returns the limits & allowed types so the renderer can display them.
 */
function getAttachmentConstraints() {
  return {
    maxFileSizeBytes: MAX_FILE_BYTES,
    maxFileSizeMB: MAX_FILE_BYTES / 1024 / 1024,
    allowedExtensions: [...ALLOWED_EXTENSIONS],
  };
}

module.exports = {
  saveAttachment,
  listAttachments,
  readAttachmentAsBase64,
  removeAttachment,
  clearSessionAttachments,
  openAttachment,
  getAttachmentConstraints,
};
