'use strict';

/**
 * Crash Reporter Service — Milestone 18
 *
 * Captures, formats, and persists error reports for the Electron main process.
 * All crash data is written ONLY to the user's private app-data directory
 * (app.getPath('userData')), never transmitted to any external service,
 * and never exposed beyond a carefully scoped IPC channel.
 *
 * Features:
 *   • Structured JSON crash logs written to <userData>/crash-reports/
 *   • Automatic log rotation: keeps the 50 most-recent reports, deletes older
 *   • Captures: uncaughtException, unhandledRejection, renderer render-process-gone,
 *               renderer unresponsive, GPU process crashes
 *   • Privacy-safe: no PII fields, no network calls, no stack-frame source maps
 *   • Provides getCrashReports() and clearCrashReports() for the IPC layer
 *
 * Usage (called once from electron/main.cjs, before app.whenReady()):
 *   const { initCrashReporter } = require('./crash-reporter.service.cjs');
 *   initCrashReporter();
 *
 * Later, attach window-scoped handlers:
 *   const { attachWindowCrashHandlers } = require('./crash-reporter.service.cjs');
 *   attachWindowCrashHandlers(mainWindow);
 */

const { app } = require('electron');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_REPORTS      = 50;    // rotate after this many files
const MAX_STACK_LINES  = 30;    // cap stack trace depth to avoid huge files
const MAX_MSG_LENGTH   = 2000;  // cap error message length

// ─── Internal state ───────────────────────────────────────────────────────────

let _crashDir = null;   // resolved once app is ready
let _isDev    = false;

// ─── Path helpers ─────────────────────────────────────────────────────────────

function getCrashDir() {
  if (_crashDir) return _crashDir;
  // app.getPath('userData') is available after app emits 'ready'
  _crashDir = path.join(app.getPath('userData'), 'crash-reports');
  fs.mkdirSync(_crashDir, { recursive: true });
  return _crashDir;
}

function reportPath(id) {
  return path.join(getCrashDir(), `${id}.json`);
}

// ─── Serialisers ─────────────────────────────────────────────────────────────

/**
 * Builds a privacy-safe, structured error record from any thrown value.
 * @param {string} source  short label for the crash origin
 * @param {unknown} error
 * @param {object} [extra] optional additional fields (must be JSON-safe)
 * @returns {object}
 */
function buildReport(source, error, extra = {}) {
  const now    = new Date();
  const id     = `${now.toISOString().replace(/[:.]/g, '-')}_${source.replace(/\s+/g, '_')}`;
  const isErr  = error instanceof Error;

  // Trim stack to MAX_STACK_LINES to avoid multi-megabyte crash logs
  let stack = null;
  if (isErr && error.stack) {
    stack = error.stack
      .split('\n')
      .slice(0, MAX_STACK_LINES)
      .join('\n');
  }

  return {
    id,
    source,
    timestamp: now.toISOString(),
    appVersion:   app.isReady() ? app.getVersion() : 'unknown',
    electronVersion: process.versions.electron ?? 'unknown',
    nodeVersion:     process.versions.node     ?? 'unknown',
    platform:  process.platform,
    arch:      process.arch,
    osVersion: `${os.type()} ${os.release()}`,
    isDev:     _isDev,
    error: {
      name:    isErr ? error.name    : typeof error,
      message: isErr
        ? String(error.message ?? '').slice(0, MAX_MSG_LENGTH)
        : String(error).slice(0, MAX_MSG_LENGTH),
      stack
    },
    ...extra
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

/**
 * Writes a crash report to disk and rotates old files.
 * @param {object} report  output of buildReport()
 */
function persistReport(report) {
  try {
    const filePath = reportPath(report.id);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    console.error(`[CrashReporter] Report saved → ${filePath}`);
    rotateReports();
  } catch (writeErr) {
    // Cannot crash the crash reporter — just log
    console.error('[CrashReporter] Failed to persist report:', writeErr);
  }
}

/**
 * Keeps only the MAX_REPORTS most-recent crash files, deleting the rest.
 */
function rotateReports() {
  try {
    const dir   = getCrashDir();
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);  // newest first

    files.slice(MAX_REPORTS).forEach(({ name }) => {
      try { fs.unlinkSync(path.join(dir, name)); } catch { /* ignore */ }
    });
  } catch (err) {
    console.error('[CrashReporter] Log rotation failed:', err);
  }
}

// ─── Public: report capture ───────────────────────────────────────────────────

/**
 * Capture and persist an error from any source.
 * @param {string} source
 * @param {unknown} error
 * @param {object} [extra]
 */
function captureError(source, error, extra = {}) {
  const report = buildReport(source, error, extra);
  persistReport(report);
  return report;
}

// ─── Public: query API (used by IPC layer) ────────────────────────────────────

/**
 * Returns a list of all persisted crash reports, sorted newest-first.
 * Each entry includes the parsed report object.
 * @param {number} [limit=20]
 * @returns {object[]}
 */
function getCrashReports(limit = 20) {
  try {
    const dir   = getCrashDir();
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const full = path.join(dir, f);
        return { name: f, mtime: fs.statSync(full).mtimeMs, full };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, Math.min(limit, MAX_REPORTS));

    return files.map(({ full }) => {
      try {
        return JSON.parse(fs.readFileSync(full, 'utf8'));
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (err) {
    console.error('[CrashReporter] getCrashReports error:', err);
    return [];
  }
}

/**
 * Deletes all persisted crash report files.
 * @returns {{ deleted: number }}
 */
function clearCrashReports() {
  try {
    const dir   = getCrashDir();
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    files.forEach(f => {
      try { fs.unlinkSync(path.join(dir, f)); } catch { /* ignore */ }
    });
    console.log(`[CrashReporter] Cleared ${files.length} report(s).`);
    return { deleted: files.length };
  } catch (err) {
    console.error('[CrashReporter] clearCrashReports error:', err);
    return { deleted: 0 };
  }
}

/**
 * Returns the filesystem path of the crash-reports directory for the UI.
 * @returns {string}
 */
function getCrashReportDir() {
  return getCrashDir();
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * Installs process-level crash handlers.
 * Call this ONCE, as early as possible in main.cjs (before app.whenReady()).
 * @param {{ isDev?: boolean }} [opts]
 */
function initCrashReporter({ isDev = false } = {}) {
  _isDev = isDev;

  // Replace the stub handlers that existed in main.cjs before M18
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');

  process.on('uncaughtException', (error) => {
    console.error('[Main] Uncaught exception:', error);
    captureError('uncaughtException', error);
    // Do NOT re-throw — Electron's default handler would quit the app abruptly.
    // The app can often recover; if not, the next error will capture too.
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Main] Unhandled promise rejection:', reason);
    captureError('unhandledRejection', reason);
  });

  // GPU process crash (Electron emits this on the app object)
  app.on('gpu-process-crashed', (event, killed) => {
    console.error('[Main] GPU process crashed. killed =', killed);
    captureError('gpu-process-crashed', new Error('GPU process crashed'), { killed });
  });

  // Child process crashes (Electron 17+)
  app.on('child-process-gone', (event, details) => {
    const { type, reason, exitCode } = details ?? {};
    console.error('[Main] Child process gone:', details);
    captureError('child-process-gone', new Error(`${type} process gone: ${reason}`), {
      processType: type,
      reason,
      exitCode
    });
  });

  console.log('[CrashReporter] Initialised. Reports will be written to userData/crash-reports/');
}

/**
 * Attaches window-scoped crash handlers that require a live BrowserWindow.
 * Call this inside createWindow(), after the window is constructed.
 * @param {Electron.BrowserWindow} win
 */
function attachWindowCrashHandlers(win) {
  // Renderer process gone (crash / OOM / killed by OS)
  win.webContents.on('render-process-gone', (event, details) => {
    const { reason, exitCode } = details ?? {};
    console.error('[Main] Renderer process gone:', details);
    captureError('render-process-gone', new Error(`Renderer gone: ${reason}`), {
      reason,
      exitCode
    });
  });

  // Renderer hung / unresponsive
  win.on('unresponsive', () => {
    console.warn('[Main] Main window became unresponsive');
    captureError('renderer-unresponsive', new Error('Renderer became unresponsive'));
  });

  // Renderer recovered (log it so the report can be correlated)
  win.on('responsive', () => {
    console.log('[Main] Main window recovered responsiveness');
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  initCrashReporter,
  attachWindowCrashHandlers,
  captureError,
  getCrashReports,
  clearCrashReports,
  getCrashReportDir
};
