'use strict';

/**
 * Badge & Taskbar Alert Service — Milestone 22
 *
 * Manages OS-level dock/taskbar notification badges, user attention alerts
 * (dock bounce on macOS, taskbar flashing on Windows/Linux), and taskbar
 * progress bars for asynchronous background tasks.
 *
 * Capabilities:
 *   • setBadgeCount(count): Sets numeric badge on macOS Dock and Windows/Linux taskbars.
 *   • requestAttention(critical, win): Bounces macOS Dock or flashes Windows/Linux taskbar frame.
 *   • clearAttention(win): Clears flash/bounce state.
 *   • setProgressBar(progress, options, win): Displays progress (0.0 to 1.0, or -1 to clear)
 *     with modes: 'normal', 'indeterminate', 'error', 'paused'.
 */

const { app } = require('electron');

/**
 * Updates application icon badge count.
 * @param {number} count Non-negative integer (0 clears badge)
 * @returns {boolean} Whether badge update was supported/successful
 */
function setBadgeCount(count) {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));

  try {
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setBadge(safeCount > 0 ? String(safeCount) : '');
      return true;
    }

    if (typeof app.setBadgeCount === 'function') {
      return app.setBadgeCount(safeCount);
    }
  } catch (err) {
    console.error('[BadgeService] Failed to set badge count:', err);
  }

  return false;
}

/**
 * Requests user attention when an important event happens in the background.
 * @param {boolean} critical If true, bounces continuously until focused; otherwise bounces once.
 * @param {Electron.BrowserWindow} win Target window
 */
function requestAttention(critical = false, win) {
  if (!win || win.isDestroyed() || win.isFocused()) return;

  try {
    if (process.platform === 'darwin' && app.dock) {
      app.dock.bounce(critical ? 'critical' : 'informational');
    } else if (typeof win.flashFrame === 'function') {
      win.flashFrame(true);
    }
  } catch (err) {
    console.error('[BadgeService] Failed to request attention:', err);
  }
}

/**
 * Clears attention/flashing state on window focus.
 * @param {Electron.BrowserWindow} win
 */
function clearAttention(win) {
  if (!win || win.isDestroyed()) return;

  try {
    if (process.platform !== 'darwin' && typeof win.flashFrame === 'function') {
      win.flashFrame(false);
    }
  } catch (err) {
    console.error('[BadgeService] Failed to clear attention:', err);
  }
}

/**
 * Sets taskbar/dock progress bar.
 * @param {number} progress Float between 0.0 and 1.0, or -1 to remove progress.
 * @param {{ mode?: 'none'|'normal'|'indeterminate'|'error'|'paused' }} options
 * @param {Electron.BrowserWindow} win
 */
function setProgressBar(progress, options = {}, win) {
  if (!win || win.isDestroyed()) return;

  const validModes = ['none', 'normal', 'indeterminate', 'error', 'paused'];
  const mode = options && validModes.includes(options.mode) ? options.mode : 'normal';

  let safeProgress = Number(progress);
  if (!Number.isFinite(safeProgress)) {
    safeProgress = -1;
  } else if (safeProgress > 1) {
    safeProgress = 1;
  } else if (safeProgress < 0 && safeProgress !== -1) {
    safeProgress = 0;
  }

  try {
    win.setProgressBar(safeProgress, { mode });
  } catch (err) {
    console.error('[BadgeService] Failed to set progress bar:', err);
  }
}

module.exports = {
  setBadgeCount,
  requestAttention,
  clearAttention,
  setProgressBar
};
