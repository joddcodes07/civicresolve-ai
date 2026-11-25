'use strict';

/**
 * Milestone 30 — Accessibility IPC Handlers
 *
 * Channel prefix: desktop:accessibility:*
 *
 * Channels:
 *   desktop:accessibility:getInfo           – returns current zoom, high-contrast, kiosk, fullscreen info
 *   desktop:accessibility:getZoom           – returns current zoom factor
 *   desktop:accessibility:setZoom           – sets zoom factor (clamped 0.5 - 3.0)
 *   desktop:accessibility:zoomIn            – increments zoom by 0.1
 *   desktop:accessibility:zoomOut           – decrements zoom by 0.1
 *   desktop:accessibility:resetZoom         – resets zoom to 1.0
 *   desktop:accessibility:setKiosk          – toggles or sets kiosk mode
 *   desktop:accessibility:toggleFullScreen  – toggles fullscreen mode
 *   desktop:accessibility:setSupport        – toggles accessibility support flag
 */

const { ipcMain } = require('electron');
const {
  getAccessibilityInfo,
  getZoomFactor,
  setZoomFactor,
  zoomIn,
  zoomOut,
  resetZoom,
  setKiosk,
  toggleFullScreen,
  setAccessibilitySupport,
} = require('../services/accessibility.service.cjs');
const { validateSender } = require('../utils/security.cjs');

function registerAccessibilityIpc() {
  ipcMain.handle('desktop:accessibility:getInfo', async (event) => {
    validateSender(event);
    const win = event.sender.getOwnerBrowserWindow();
    return getAccessibilityInfo(win);
  });

  ipcMain.handle('desktop:accessibility:getZoom', async (event) => {
    validateSender(event);
    const win = event.sender.getOwnerBrowserWindow();
    return getZoomFactor(win);
  });

  ipcMain.handle('desktop:accessibility:setZoom', async (event, factor) => {
    validateSender(event);
    const num = typeof factor === 'number' ? factor : parseFloat(factor);
    if (isNaN(num)) return getZoomFactor();
    const win = event.sender.getOwnerBrowserWindow();
    return setZoomFactor(num, win);
  });

  ipcMain.handle('desktop:accessibility:zoomIn', async (event) => {
    validateSender(event);
    const win = event.sender.getOwnerBrowserWindow();
    return zoomIn(win);
  });

  ipcMain.handle('desktop:accessibility:zoomOut', async (event) => {
    validateSender(event);
    const win = event.sender.getOwnerBrowserWindow();
    return zoomOut(win);
  });

  ipcMain.handle('desktop:accessibility:resetZoom', async (event) => {
    validateSender(event);
    const win = event.sender.getOwnerBrowserWindow();
    return resetZoom(win);
  });

  ipcMain.handle('desktop:accessibility:setKiosk', async (event, enabled) => {
    validateSender(event);
    const win = event.sender.getOwnerBrowserWindow();
    return setKiosk(enabled, win);
  });

  ipcMain.handle('desktop:accessibility:toggleFullScreen', async (event) => {
    validateSender(event);
    const win = event.sender.getOwnerBrowserWindow();
    return toggleFullScreen(win);
  });

  ipcMain.handle('desktop:accessibility:setSupport', async (event, enabled) => {
    validateSender(event);
    return setAccessibilitySupport(Boolean(enabled));
  });
}

module.exports = { registerAccessibilityIpc };
