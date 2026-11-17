'use strict';

/**
 * Updater Service — Milestone 16
 *
 * Wraps electron-updater's autoUpdater to provide over-the-air update support
 * via GitHub Releases.  Only active in production (packaged) builds; in
 * development the service registers listeners but never fires a real check so
 * that engineers are not interrupted while coding.
 *
 * Usage:
 *   const { initUpdater, checkForUpdate, installUpdate } = require('./updater.service.cjs');
 *   initUpdater(mainWindow);          // call once after window is ready
 *   checkForUpdate();                 // IPC-initiated manual check
 *   installUpdate();                  // IPC-initiated install & relaunch
 */

const { app } = require('electron');

// electron-updater is bundled with electron-builder.  It is a production
// dependency only when the app is packaged; in raw development the module
// still exists in node_modules because electron-builder is a devDependency
// that ships it.
let autoUpdater;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch (err) {
  // If electron-updater is not installed (e.g. during plain `node` unit tests)
  // create a minimal no-op shim so the rest of this module stays safe.
  console.warn('[Updater] electron-updater not available – update features disabled:', err.message);
  autoUpdater = null;
}

const isDev = !app.isPackaged;

/** @type {Electron.BrowserWindow | null} */
let _mainWindow = null;

// ─── Status payload helpers ──────────────────────────────────────────────────

/**
 * Sends a structured update-status event to the renderer.
 * @param {'idle'|'checking'|'available'|'not-available'|'downloading'|'ready'|'error'} status
 * @param {object} [data]
 */
function sendStatus(status, data = {}) {
  if (!_mainWindow || _mainWindow.isDestroyed()) return;
  _mainWindow.webContents.send('desktop:update-status', { status, ...data });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialises the auto-updater, attaches all event listeners, and (in
 * production) triggers an automatic background check 10 seconds after the
 * window is ready so that it does not compete with startup rendering.
 *
 * @param {Electron.BrowserWindow} mainWindow
 */
function initUpdater(mainWindow) {
  _mainWindow = mainWindow;

  if (!autoUpdater) return;

  // ── Configuration ──────────────────────────────────────────────────────────
  autoUpdater.autoDownload = true;        // download silently in background
  autoUpdater.autoInstallOnAppQuit = true; // install on next quit if downloaded

  // Publish provider is defined in electron-builder.yml (github releases).
  // No explicit setFeedURL call is needed when using the yml config.

  // ── Event listeners ────────────────────────────────────────────────────────

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update…');
    sendStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    sendStatus('available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: typeof info.releaseNotes === 'string'
        ? info.releaseNotes.slice(0, 2000)   // cap size to avoid flooding IPC
        : null
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] Application is up to date:', info.version);
    sendStatus('not-available', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent ?? 0);
    console.log(`[Updater] Download progress: ${percent}%`);
    sendStatus('downloading', {
      percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: Math.round(progress.bytesPerSecond ?? 0)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded, ready to install:', info.version);
    sendStatus('ready', {
      version: info.version,
      releaseDate: info.releaseDate
    });
  });

  autoUpdater.on('error', (err) => {
    // Avoid leaking full stack traces to the renderer; log details server-side.
    console.error('[Updater] Error:', err);
    sendStatus('error', {
      message: err?.message ? String(err.message).slice(0, 300) : 'Unknown updater error'
    });
  });

  // ── Auto-check on startup (production only) ────────────────────────────────
  if (!isDev) {
    // Delay the initial check so it does not block window paint / hydration.
    setTimeout(() => {
      checkForUpdate();
    }, 10_000);
  } else {
    console.log('[Updater] Development mode – automatic update check skipped.');
  }
}

/**
 * Manually triggers an update check.  Safe to call in both dev and production;
 * in dev it logs a notice instead of hitting GitHub to avoid spurious network
 * errors during development.
 */
function checkForUpdate() {
  if (!autoUpdater) {
    console.warn('[Updater] checkForUpdate called but electron-updater is unavailable.');
    sendStatus('error', { message: 'electron-updater is not available in this environment.' });
    return;
  }

  if (isDev) {
    console.log('[Updater] checkForUpdate called in dev mode – sending not-available status.');
    sendStatus('not-available', { version: app.getVersion() });
    return;
  }

  try {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('[Updater] checkForUpdatesAndNotify error:', err);
      sendStatus('error', { message: String(err?.message ?? err).slice(0, 300) });
    });
  } catch (err) {
    console.error('[Updater] checkForUpdate threw synchronously:', err);
    sendStatus('error', { message: String(err?.message ?? err).slice(0, 300) });
  }
}

/**
 * Quits the application and installs the previously downloaded update.
 * Must only be called after an `update-downloaded` event has fired (i.e. the
 * renderer should gate this behind a `status === 'ready'` check).
 */
function installUpdate() {
  if (!autoUpdater) {
    console.warn('[Updater] installUpdate called but electron-updater is unavailable.');
    return;
  }
  console.log('[Updater] Quitting and installing update…');
  autoUpdater.quitAndInstall(/* isSilent */ false, /* isForceRunAfter */ true);
}

module.exports = { initUpdater, checkForUpdate, installUpdate };
