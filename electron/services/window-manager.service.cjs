'use strict';

/**
 * Window Manager Service — Milestone 26
 *
 * Manages secondary application windows (e.g. Detached Live Map, Officer
 * Complaint Inspector, Real-Time Heatmaps) with full sandbox and security isolation.
 *
 * Capabilities:
 *   • openSecondaryWindow(options): Creates or focuses a dedicated secondary window.
 *   • closeSecondaryWindow(id): Closes a specific secondary window.
 *   • focusSecondaryWindow(id): Brings an open secondary window to the front.
 *   • listSecondaryWindows(): Returns open window metadata.
 *   • closeAllSecondaryWindows(): Teardown cleanup on app quit.
 */

const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('path');
const { configureSecurityHandlers } = require('../utils/security.cjs');
const { showContextMenu } = require('../menu/context.menu.cjs');
const { attachWindowCrashHandlers } = require('./crash-reporter.service.cjs');

/** @type {Map<string, Electron.BrowserWindow>} */
const _secondaryWindows = new Map();

/**
 * Creates or focuses a secondary BrowserWindow.
 * @param {object} options
 * @param {string} options.id Unique window identifier (e.g. 'detached-map')
 * @param {string} [options.route='/'] React route to load
 * @param {string} [options.title='CivicResolve AI'] Window title
 * @param {number} [options.width=1050] Window width
 * @param {number} [options.height=720] Window height
 * @param {number} [options.minWidth=600] Minimum width
 * @param {number} [options.minHeight=450] Minimum height
 * @returns {{ id: string, action: 'focused' | 'opened' }}
 */
function openSecondaryWindow(options = {}) {
  const windowId = options.id || 'secondary-window';
  const targetRoute = options.route || '/';

  // If already open, restore and focus
  if (_secondaryWindows.has(windowId)) {
    const existing = _secondaryWindows.get(windowId);
    if (existing && !existing.isDestroyed()) {
      if (existing.isMinimized()) existing.restore();
      existing.show();
      existing.focus();
      if (targetRoute && targetRoute !== '/') {
        existing.webContents.send('desktop:navigate', targetRoute);
      }
      return { id: windowId, action: 'focused' };
    }
  }

  const isDev = !app.isPackaged;
  const isDark = nativeTheme.shouldUseDarkColors;

  const win = new BrowserWindow({
    width: Math.max(options.minWidth || 600, Math.min(Number(options.width) || 1050, 2560)),
    height: Math.max(options.minHeight || 450, Math.min(Number(options.height) || 720, 1440)),
    minWidth: options.minWidth || 600,
    minHeight: options.minHeight || 450,
    title: options.title || 'CivicResolve AI',
    backgroundColor: isDark ? '#0f172a' : '#f4f2ec',
    show: false,

    webPreferences: {
      preload: path.join(__dirname, '../preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Attach all security guards and handlers
  configureSecurityHandlers(win);
  attachWindowCrashHandlers(win);

  // Attach contextual right-click menu
  win.webContents.on('context-menu', (event, params) => {
    showContextMenu(win, params, isDev);
  });

  // Display cleanly once DOM is ready without white flash
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  // Deliver route after DOM load if in packaged mode
  win.webContents.on('did-finish-load', () => {
    if (targetRoute && targetRoute !== '/') {
      win.webContents.send('desktop:navigate', targetRoute);
    }
  });

  win.on('closed', () => {
    _secondaryWindows.delete(windowId);
  });

  _secondaryWindows.set(windowId, win);

  // Load URL
  if (isDev) {
    win.loadURL(`http://127.0.0.1:5173${targetRoute}`);
  } else {
    win.loadFile(path.join(__dirname, '../../client/dist/index.html'));
  }

  console.log(`[WindowManager] Secondary window opened: ${windowId} (${targetRoute})`);
  return { id: windowId, action: 'opened' };
}

/**
 * Closes an open secondary window by ID.
 * @param {string} windowId
 * @returns {{ id: string, closed: boolean }}
 */
function closeSecondaryWindow(windowId) {
  if (_secondaryWindows.has(windowId)) {
    const win = _secondaryWindows.get(windowId);
    if (win && !win.isDestroyed()) {
      win.close();
      _secondaryWindows.delete(windowId);
      return { id: windowId, closed: true };
    }
  }
  return { id: windowId, closed: false };
}

/**
 * Focuses an existing secondary window.
 * @param {string} windowId
 * @returns {{ id: string, focused: boolean }}
 */
function focusSecondaryWindow(windowId) {
  if (_secondaryWindows.has(windowId)) {
    const win = _secondaryWindows.get(windowId);
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      return { id: windowId, focused: true };
    }
  }
  return { id: windowId, focused: false };
}

/**
 * Returns a list of currently open secondary windows.
 * @returns {Array<{ id: string, title: string, isVisible: boolean }>}
 */
function listSecondaryWindows() {
  const list = [];
  for (const [id, win] of _secondaryWindows.entries()) {
    if (win && !win.isDestroyed()) {
      list.push({
        id,
        title: win.getTitle(),
        isVisible: win.isVisible()
      });
    }
  }
  return list;
}

/**
 * Closes all open secondary windows on application teardown.
 */
function closeAllSecondaryWindows() {
  for (const win of _secondaryWindows.values()) {
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  }
  _secondaryWindows.clear();
}

module.exports = {
  openSecondaryWindow,
  closeSecondaryWindow,
  focusSecondaryWindow,
  listSecondaryWindows,
  closeAllSecondaryWindows
};
