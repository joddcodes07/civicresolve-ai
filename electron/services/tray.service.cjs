'use strict';

/**
 * System Tray Service — Milestone 21
 *
 * Manages the native OS System Tray / Menu Bar item for CivicResolve AI.
 * Provides quick access to navigation, status indicators, and background execution.
 *
 * Features:
 *   • Crisp 16x16 / 32x32 template icon adapting to macOS dark/light menu bars
 *     and Windows/Linux notification areas.
 *   • Quick navigation: Show App, Lodge Grievance, Track Grievance, Officer Queue.
 *   • Utility actions: Check for Updates, Toggle Dark/Light Theme.
 *   • Click and double-click actions to toggle window visibility.
 *   • Dynamic tooltip and alert badge support.
 */

const { app, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { checkForUpdate } = require('./updater.service.cjs');

/** @type {Electron.Tray | null} */
let _tray = null;
/** @type {Electron.BrowserWindow | null} */
let _mainWindow = null;

// Fallback 16x16 transparent PNG with a slate circle icon (Base64)
const FALLBACK_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
  'WElEQVR42mNkQAaMjIx/0fgYGBj+E6OekYGBgQGbxhiBqBqA8ZlxasBmAKXmMSIbyzAS' +
  'bAAmG1mMSQ16QIaRC8AMQNdISh6A5gCShhE9jEgNRtJomKRhZACfI0YNAADbEgS7F5jU' +
  'LwAAAABJRU5ErkJggg==';

/**
 * Loads the tray icon from assets or falls back to a template DataURL.
 * @returns {Electron.NativeImage}
 */
function getTrayIcon() {
  const isMac = process.platform === 'darwin';
  const iconFilename = isMac ? 'tray-iconTemplate.png' : 'tray-icon.png';
  const iconPath = path.join(__dirname, '../assets', iconFilename);

  try {
    let icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = nativeImage.createFromDataURL(FALLBACK_ICON_DATA_URL);
    }
    if (isMac) {
      icon.setTemplateImage(true);
    }
    return icon;
  } catch {
    return nativeImage.createFromDataURL(FALLBACK_ICON_DATA_URL);
  }
}

/**
 * Builds the context menu for the System Tray.
 * @param {Electron.BrowserWindow} win
 * @returns {Electron.Menu}
 */
function buildContextMenu(win) {
  return Menu.buildFromTemplate([
    {
      label: 'Show CivicResolve AI',
      click: () => {
        if (!win || win.isDestroyed()) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    },
    { type: 'separator' },
    {
      label: 'Lodge New Grievance',
      click: () => {
        if (!win || win.isDestroyed()) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        win.webContents.send('desktop:navigate', '/lodge');
      }
    },
    {
      label: 'Track Grievance',
      click: () => {
        if (!win || win.isDestroyed()) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        win.webContents.send('desktop:navigate', '/track');
      }
    },
    {
      label: 'Officer Queue',
      click: () => {
        if (!win || win.isDestroyed()) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        win.webContents.send('desktop:navigate', '/officer');
      }
    },
    { type: 'separator' },
    {
      label: 'Check for Updates...',
      click: () => {
        checkForUpdate();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit CivicResolve AI',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
}

/**
 * Initializes and mounts the system tray.
 * @param {Electron.BrowserWindow} mainWindow
 */
function createTray(mainWindow) {
  if (_tray) return _tray;

  _mainWindow = mainWindow;
  const icon = getTrayIcon();

  _tray = new Tray(icon);
  _tray.setToolTip('CivicResolve AI');
  _tray.setContextMenu(buildContextMenu(_mainWindow));

  // Toggle window on tray icon click (Windows/Linux)
  _tray.on('click', () => {
    if (!_mainWindow || _mainWindow.isDestroyed()) return;
    if (_mainWindow.isVisible()) {
      _mainWindow.hide();
    } else {
      if (_mainWindow.isMinimized()) _mainWindow.restore();
      _mainWindow.show();
      _mainWindow.focus();
    }
  });

  _tray.on('double-click', () => {
    if (!_mainWindow || _mainWindow.isDestroyed()) return;
    if (_mainWindow.isMinimized()) _mainWindow.restore();
    _mainWindow.show();
    _mainWindow.focus();
  });

  console.log('[TrayService] System tray initialized');
  return _tray;
}

/**
 * Updates the tray tooltip dynamically.
 * @param {string} tooltipText
 */
function setTrayTooltip(tooltipText) {
  if (!_tray) return;
  const text = typeof tooltipText === 'string' && tooltipText.trim()
    ? tooltipText.trim()
    : 'CivicResolve AI';
  _tray.setToolTip(text);
}

/**
 * Updates the tray tooltip or indicator to reflect alerts/pending items.
 * @param {boolean} hasAlert
 */
function setTrayBadge(hasAlert) {
  if (!_tray) return;
  if (hasAlert) {
    _tray.setToolTip('CivicResolve AI • New Grievance Updates');
  } else {
    _tray.setToolTip('CivicResolve AI');
  }
}

/**
 * Cleans up and destroys the tray instance.
 */
function destroyTray() {
  if (_tray) {
    _tray.destroy();
    _tray = null;
    _mainWindow = null;
    console.log('[TrayService] System tray destroyed');
  }
}

module.exports = {
  createTray,
  setTrayTooltip,
  setTrayBadge,
  destroyTray
};
