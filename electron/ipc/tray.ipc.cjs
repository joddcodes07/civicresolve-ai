'use strict';

/**
 * System Tray IPC Handlers — Milestone 21
 *
 * Exposes tray updates to the renderer safely with sender validation.
 *
 * Channels:
 *   desktop:set-tray-tooltip → updates tray tooltip text
 *   desktop:set-tray-badge   → updates tray notification indicator
 */

const { ipcMain } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const { validateSafeString } = require('../utils/validators.cjs');
const { setTrayTooltip, setTrayBadge } = require('../services/tray.service.cjs');

function registerTrayIpc() {
  ipcMain.handle('desktop:set-tray-tooltip', (event, tooltip) => {
    validateSender(event);
    const safeText = validateSafeString(tooltip, 255);
    setTrayTooltip(safeText || 'CivicResolve AI');
    return { success: true };
  });

  ipcMain.handle('desktop:set-tray-badge', (event, hasAlert) => {
    validateSender(event);
    setTrayBadge(Boolean(hasAlert));
    return { success: true };
  });
}

module.exports = { registerTrayIpc };
