const { ipcMain, nativeTheme, BrowserWindow } = require('electron');
const { validateSender } = require('../utils/security.cjs');

const VALID_SOURCES = ['system', 'light', 'dark'];
const COLOR_DARK = '#0f172a';
const COLOR_LIGHT = '#f4f2ec';

/**
 * Updates the native window background color to prevent flash-of-white during resizing or loading.
 * @param {Electron.BrowserWindow} window
 */
function updateWindowBackground(window) {
  if (window && !window.isDestroyed()) {
    const isDark = nativeTheme.shouldUseDarkColors;
    window.setBackgroundColor(isDark ? COLOR_DARK : COLOR_LIGHT);
  }
}

/**
 * Registers theme IPC handlers and OS theme change listeners.
 */
function registerThemeIpc() {
  ipcMain.handle('desktop:get-theme', (event) => {
    validateSender(event);
    return {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      themeSource: nativeTheme.themeSource,
      shouldUseHighContrastColors: nativeTheme.shouldUseHighContrastColors
    };
  });

  ipcMain.handle('desktop:set-theme-source', (event, source) => {
    validateSender(event);
    if (typeof source !== 'string' || !VALID_SOURCES.includes(source)) {
      throw new Error(`Invalid theme source. Must be one of: ${VALID_SOURCES.join(', ')}`);
    }

    nativeTheme.themeSource = source;
    return {
      success: true,
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      themeSource: nativeTheme.themeSource
    };
  });

  // Listen to OS theme changes and broadcast to all application windows
  nativeTheme.on('updated', () => {
    const payload = {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      themeSource: nativeTheme.themeSource,
      shouldUseHighContrastColors: nativeTheme.shouldUseHighContrastColors
    };

    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        updateWindowBackground(win);
        win.webContents.send('desktop:theme-changed', payload);
      }
    }
  });
}

module.exports = {
  registerThemeIpc,
  updateWindowBackground,
  VALID_SOURCES,
  COLOR_DARK,
  COLOR_LIGHT
};
