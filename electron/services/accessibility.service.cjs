'use strict';

/**
 * Milestone 30 — Desktop Accessibility, Display Scaling & Kiosk Service
 *
 * Provides:
 *   - Accessibility & screen-reader support querying and toggling
 *   - High-contrast / inverted colors mode detection via nativeTheme and systemPreferences
 *   - Window zoom controls (zoomIn, zoomOut, resetZoom, setZoomFactor)
 *   - Persistent zoom factor across app sessions (stored in userData/accessibility-settings.json)
 *   - Kiosk mode and full-screen controls for civic grievance terminals / kiosks
 *   - State change broadcast events to renderer windows
 */

const { app, BrowserWindow, nativeTheme, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.1;
const DEFAULT_ZOOM = 1.0;

let currentWindow = null;
let savedSettings = {
  zoomFactor: DEFAULT_ZOOM,
  highContrastForced: false,
};

/** Returns path to the settings file in userData */
function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'accessibility-settings.json');
}

/** Loads persisted accessibility settings */
function loadSettings() {
  try {
    const file = getSettingsFilePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (typeof parsed.zoomFactor === 'number' && parsed.zoomFactor >= MIN_ZOOM && parsed.zoomFactor <= MAX_ZOOM) {
        savedSettings.zoomFactor = Number(parsed.zoomFactor.toFixed(2));
      }
      if (typeof parsed.highContrastForced === 'boolean') {
        savedSettings.highContrastForced = parsed.highContrastForced;
      }
    }
  } catch (err) {
    console.warn('[AccessibilityService] Failed to load settings:', err.message);
  }
}

/** Persists current accessibility settings */
function saveSettings() {
  try {
    const file = getSettingsFilePath();
    fs.writeFileSync(file, JSON.stringify(savedSettings, null, 2), 'utf8');
  } catch (err) {
    console.warn('[AccessibilityService] Failed to persist settings:', err.message);
  }
}

/**
 * Returns current accessibility and display state
 */
function getAccessibilityInfo(targetWin = currentWindow) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || currentWindow;
  let zoomFactor = savedSettings.zoomFactor;
  let isKiosk = false;
  let isFullScreen = false;

  if (win && !win.isDestroyed()) {
    try {
      zoomFactor = win.webContents.getZoomFactor();
      isKiosk = win.isKiosk();
      isFullScreen = win.isFullScreen();
    } catch {
      // ignore
    }
  }

  let highContrast = false;
  let invertedColors = false;

  try {
    highContrast = nativeTheme.inForcedColorsMode || savedSettings.highContrastForced;
  } catch {
    highContrast = savedSettings.highContrastForced;
  }

  try {
    if (process.platform === 'darwin' && systemPreferences.isInvertedColorScheme) {
      invertedColors = systemPreferences.isInvertedColorScheme();
    } else if (nativeTheme.shouldUseInvertedColorScheme) {
      invertedColors = nativeTheme.shouldUseInvertedColorScheme;
    }
  } catch {
    invertedColors = false;
  }

  let screenReaderEnabled = false;
  try {
    screenReaderEnabled = app.isAccessibilitySupportEnabled();
  } catch {
    screenReaderEnabled = false;
  }

  return {
    zoomFactor: Number(zoomFactor.toFixed(2)),
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    isKiosk,
    isFullScreen,
    highContrast,
    invertedColors,
    screenReaderEnabled,
    platform: process.platform,
  };
}

/** Broadcasts accessibility updates to renderer */
function broadcastState(targetWin = currentWindow) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || currentWindow;
  if (win && !win.isDestroyed() && win.webContents) {
    try {
      win.webContents.send('desktop:accessibility:state-changed', getAccessibilityInfo(win));
    } catch {
      // ignore
    }
  }
}

/** Applies zoom factor to a window and persists it */
function setZoomFactor(factor, targetWin = currentWindow) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || currentWindow;
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(factor) || DEFAULT_ZOOM));
  const rounded = Number(clamped.toFixed(2));

  savedSettings.zoomFactor = rounded;
  saveSettings();

  if (win && !win.isDestroyed() && win.webContents) {
    try {
      win.webContents.setZoomFactor(rounded);
    } catch (err) {
      console.warn('[AccessibilityService] Failed to set zoom factor:', err.message);
    }
  }

  broadcastState(win);
  return rounded;
}

/** Increase zoom by ZOOM_STEP */
function zoomIn(targetWin = currentWindow) {
  const current = getZoomFactor(targetWin);
  return setZoomFactor(current + ZOOM_STEP, targetWin);
}

/** Decrease zoom by ZOOM_STEP */
function zoomOut(targetWin = currentWindow) {
  const current = getZoomFactor(targetWin);
  return setZoomFactor(current - ZOOM_STEP, targetWin);
}

/** Reset zoom to 1.0 */
function resetZoom(targetWin = currentWindow) {
  return setZoomFactor(DEFAULT_ZOOM, targetWin);
}

/** Get current zoom factor */
function getZoomFactor(targetWin = currentWindow) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || currentWindow;
  if (win && !win.isDestroyed() && win.webContents) {
    try {
      return Number(win.webContents.getZoomFactor().toFixed(2));
    } catch {
      // fallback
    }
  }
  return savedSettings.zoomFactor;
}

/** Toggle or set Kiosk mode */
function setKiosk(enabled, targetWin = currentWindow) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || currentWindow;
  if (!win || win.isDestroyed()) return false;

  const targetState = typeof enabled === 'boolean' ? enabled : !win.isKiosk();
  win.setKiosk(targetState);
  broadcastState(win);
  return win.isKiosk();
}

/** Toggle FullScreen */
function toggleFullScreen(targetWin = currentWindow) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || currentWindow;
  if (!win || win.isDestroyed()) return false;

  const nextState = !win.isFullScreen();
  win.setFullScreen(nextState);
  broadcastState(win);
  return win.isFullScreen();
}

/** Enable or disable screen reader accessibility support in Electron */
function setAccessibilitySupport(enabled) {
  try {
    app.setAccessibilitySupportEnabled(Boolean(enabled));
    broadcastState();
    return app.isAccessibilitySupportEnabled();
  } catch (err) {
    console.warn('[AccessibilityService] setAccessibilitySupport error:', err.message);
    return false;
  }
}

/** Initialize service with the main window and restore settings */
function initAccessibility(mainWindow) {
  currentWindow = mainWindow;
  loadSettings();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.once('did-finish-load', () => {
      try {
        mainWindow.webContents.setZoomFactor(savedSettings.zoomFactor);
        broadcastState(mainWindow);
      } catch (err) {
        console.warn('[AccessibilityService] Failed to apply initial zoom:', err.message);
      }
    });
  }

  // Listen to system high contrast / theme changes
  try {
    nativeTheme.on('updated', () => {
      broadcastState(currentWindow);
    });
  } catch {
    // ignore
  }
}

module.exports = {
  initAccessibility,
  getAccessibilityInfo,
  getZoomFactor,
  setZoomFactor,
  zoomIn,
  zoomOut,
  resetZoom,
  setKiosk,
  toggleFullScreen,
  setAccessibilitySupport,
};
