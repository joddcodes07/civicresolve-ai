'use strict';

/**
 * Crash Reporter IPC handlers — Milestone 18
 *
 * Channels (all invoke/handle):
 *   desktop:get-crash-reports    → returns array of recent crash report objects
 *   desktop:clear-crash-reports  → deletes all persisted crash logs
 *   desktop:get-crash-report-dir → returns the filesystem path of the log folder
 *   desktop:report-renderer-error→ accepts an error from the renderer's
 *                                   ErrorBoundary / window.onerror and persists it
 *
 * All handlers validate the IPC sender before acting.
 */

const { ipcMain } = require('electron');
const { validateSender }     = require('../utils/security.cjs');
const { validateSafeString } = require('../utils/validators.cjs');

// Convenience wrapper: trims and caps an optional string field from renderer payload.
// Returns null if the value is not a non-empty string.
function safeStr(value, maxLength) {
  return validateSafeString(value, maxLength);
}

const {
  getCrashReports,
  clearCrashReports,
  getCrashReportDir,
  captureError
} = require('../services/crash-reporter.service.cjs');

function registerCrashIpc() {
  /**
   * desktop:get-crash-reports
   * Returns up to `limit` recent crash reports (default 20, max 50).
   */
  ipcMain.handle('desktop:get-crash-reports', (event, limit = 20) => {
    validateSender(event);
    const safeLimit = Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), 50)
      : 20;
    return getCrashReports(safeLimit);
  });

  /**
   * desktop:clear-crash-reports
   * Deletes all crash log files from disk.
   * Returns { deleted: number }.
   */
  ipcMain.handle('desktop:clear-crash-reports', (event) => {
    validateSender(event);
    return clearCrashReports();
  });

  /**
   * desktop:get-crash-report-dir
   * Returns the absolute path of the crash-reports folder.
   * Useful for showing a "Show in Finder/Explorer" link in the UI.
   */
  ipcMain.handle('desktop:get-crash-report-dir', (event) => {
    validateSender(event);
    return getCrashReportDir();
  });

  /**
   * desktop:report-renderer-error
   * Accepts a serialised error from the React ErrorBoundary or window.onerror
   * and persists it as a crash report (tagged with source = 'renderer').
   *
   * Expected payload shape:
   *   { message: string, stack?: string, componentStack?: string, url?: string }
   */
  ipcMain.handle('desktop:report-renderer-error', (event, payload = {}) => {
    validateSender(event);

    // Validate and sanitise incoming strings — never trust renderer data blindly
    const message        = safeStr(payload?.message,        2000) ?? 'Unknown renderer error';
    const stack          = safeStr(payload?.stack,          5000);
    const componentStack = safeStr(payload?.componentStack, 3000);
    const url            = safeStr(payload?.url,             500);

    // Reconstruct a minimal Error-like object so buildReport gets a usable stack
    const syntheticErr = new Error(message);
    if (stack) syntheticErr.stack = stack;
    syntheticErr.name = 'RendererError';

    const extra = {};
    if (componentStack) extra.componentStack = componentStack;
    if (url)            extra.rendererUrl    = url;

    captureError('renderer', syntheticErr, extra);
    return { captured: true };
  });
}

module.exports = { registerCrashIpc };
