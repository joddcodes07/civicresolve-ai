'use strict';

/**
 * Global Shortcut Service — Milestone 25
 *
 * Manages OS-level global shortcuts (system-wide hotkeys) for quick grievance
 * capture, status tracking, and instant window toggling even when CivicResolve AI
 * is minimized, hidden in the system tray, or running in the background.
 *
 * Default Shortcuts:
 *   • CommandOrControl+Alt+L: Quick Lodge Grievance (brings app to front and navigates to /lodge)
 *   • CommandOrControl+Alt+T: Quick Track Grievance (brings app to front and navigates to /track)
 *   • CommandOrControl+Alt+G: Toggle Application Visibility (instant show / hide to tray)
 */

const { globalShortcut } = require('electron');

/** @type {Electron.BrowserWindow | null} */
let _mainWindow = null;

// Registry of active global shortcuts
const _registeredShortcuts = new Map();

/**
 * Brings the main window to front and focuses it.
 * @param {Electron.BrowserWindow} win
 */
function bringToFront(win) {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

/**
 * Navigates the main window to a target route.
 * @param {Electron.BrowserWindow} win
 * @param {string} route
 */
function navigateTo(win, route) {
  bringToFront(win);
  win.webContents.send('desktop:navigate', route);
}

/**
 * Toggles visibility of the main window.
 * @param {Electron.BrowserWindow} win
 */
function toggleWindowVisibility(win) {
  if (!win || win.isDestroyed()) return;
  if (win.isVisible() && win.isFocused()) {
    win.hide();
  } else {
    bringToFront(win);
  }
}

/**
 * Registers a global shortcut safely.
 * @param {string} accelerator
 * @param {string} action
 * @param {() => void} handler
 * @returns {boolean}
 */
function safeRegister(accelerator, action, handler) {
  try {
    if (globalShortcut.isRegistered(accelerator)) {
      globalShortcut.unregister(accelerator);
    }

    const success = globalShortcut.register(accelerator, handler);
    _registeredShortcuts.set(accelerator, {
      accelerator,
      action,
      registered: success
    });

    if (success) {
      console.log(`[GlobalShortcut] Registered: ${accelerator} (${action})`);
    } else {
      console.warn(`[GlobalShortcut] Failed to register: ${accelerator}`);
    }

    return success;
  } catch (err) {
    console.error(`[GlobalShortcut] Error registering ${accelerator}:`, err);
    return false;
  }
}

/**
 * Registers default system-wide quick capture shortcuts.
 * @param {Electron.BrowserWindow} mainWindow
 */
function registerGlobalShortcuts(mainWindow) {
  _mainWindow = mainWindow;

  // Quick Lodge Grievance
  safeRegister('CommandOrControl+Alt+L', 'quick-lodge', () => {
    if (_mainWindow) navigateTo(_mainWindow, '/lodge');
  });

  // Quick Track Grievance
  safeRegister('CommandOrControl+Alt+T', 'quick-track', () => {
    if (_mainWindow) navigateTo(_mainWindow, '/track');
  });

  // Toggle Window Visibility (Show / Hide to Tray)
  safeRegister('CommandOrControl+Alt+G', 'toggle-window', () => {
    if (_mainWindow) toggleWindowVisibility(_mainWindow);
  });
}

/**
 * Returns current status of all registered global shortcuts.
 * @returns {Array<{ accelerator: string, action: string, registered: boolean }>}
 */
function getGlobalShortcutsStatus() {
  const result = [];
  for (const item of _registeredShortcuts.values()) {
    result.push({
      accelerator: item.accelerator,
      action: item.action,
      registered: globalShortcut.isRegistered(item.accelerator)
    });
  }
  return result;
}

/**
 * Registers a custom global shortcut requested by the renderer.
 * @param {string} accelerator
 * @param {string} action
 * @param {Electron.BrowserWindow} win
 * @returns {boolean}
 */
function registerCustomShortcut(accelerator, action, win) {
  if (!accelerator || typeof accelerator !== 'string') return false;

  return safeRegister(accelerator, action || 'custom', () => {
    if (win && !win.isDestroyed()) {
      bringToFront(win);
      win.webContents.send('desktop:shortcut-triggered', { accelerator, action });
    }
  });
}

/**
 * Unregisters a specific global shortcut.
 * @param {string} accelerator
 * @returns {boolean}
 */
function unregisterCustomShortcut(accelerator) {
  if (!accelerator || typeof accelerator !== 'string') return false;

  try {
    if (globalShortcut.isRegistered(accelerator)) {
      globalShortcut.unregister(accelerator);
      _registeredShortcuts.delete(accelerator);
      return true;
    }
  } catch (err) {
    console.error(`[GlobalShortcut] Error unregistering ${accelerator}:`, err);
  }

  return false;
}

/**
 * Unregisters all global shortcuts when application is quitting.
 */
function unregisterGlobalShortcuts() {
  try {
    globalShortcut.unregisterAll();
    _registeredShortcuts.clear();
    _mainWindow = null;
    console.log('[GlobalShortcut] All global shortcuts unregistered');
  } catch (err) {
    console.error('[GlobalShortcut] Error during unregisterAll:', err);
  }
}

module.exports = {
  registerGlobalShortcuts,
  unregisterGlobalShortcuts,
  getGlobalShortcutsStatus,
  registerCustomShortcut,
  unregisterCustomShortcut
};
