'use strict';

/**
 * Window Manager IPC Handlers — Milestone 26
 *
 * Channels:
 *   desktop:window:open   → creates or focuses secondary window
 *   desktop:window:close  → closes secondary window by id
 *   desktop:window:focus  → focuses secondary window by id
 *   desktop:window:list   → returns open secondary window list
 */

const { ipcMain } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const { validateSafeString } = require('../utils/validators.cjs');
const {
  openSecondaryWindow,
  closeSecondaryWindow,
  focusSecondaryWindow,
  listSecondaryWindows
} = require('../services/window-manager.service.cjs');

function registerWindowIpc() {
  ipcMain.handle('desktop:window:open', (event, options = {}) => {
    validateSender(event);

    const safeId = validateSafeString(options.id, 64) || 'secondary-window';
    const safeRoute = validateSafeString(options.route, 255) || '/';
    const safeTitle = validateSafeString(options.title, 128) || 'CivicResolve AI';

    return openSecondaryWindow({
      ...options,
      id: safeId,
      route: safeRoute.startsWith('/') ? safeRoute : `/${safeRoute}`,
      title: safeTitle
    });
  });

  ipcMain.handle('desktop:window:close', (event, id) => {
    validateSender(event);
    const safeId = validateSafeString(id, 64);
    if (!safeId) return { id, closed: false };
    return closeSecondaryWindow(safeId);
  });

  ipcMain.handle('desktop:window:focus', (event, id) => {
    validateSender(event);
    const safeId = validateSafeString(id, 64);
    if (!safeId) return { id, focused: false };
    return focusSecondaryWindow(safeId);
  });

  ipcMain.handle('desktop:window:list', (event) => {
    validateSender(event);
    return listSecondaryWindows();
  });
}

module.exports = { registerWindowIpc };
