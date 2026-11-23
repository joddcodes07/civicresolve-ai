'use strict';

/**
 * Badge & Taskbar Alert IPC Handlers — Milestone 22
 *
 * Channels:
 *   desktop:set-badge-count    → sets application badge count (dock/taskbar)
 *   desktop:request-attention  → requests user attention (bounce/flash)
 *   desktop:clear-attention    → clears user attention indicator
 *   desktop:set-progress-bar   → sets dock/taskbar progress bar
 */

const { ipcMain } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const {
  setBadgeCount,
  requestAttention,
  clearAttention,
  setProgressBar
} = require('../services/badge.service.cjs');

function registerBadgeIpc() {
  ipcMain.handle('desktop:set-badge-count', (event, count) => {
    validateSender(event);
    const parsed = Math.max(0, Math.min(Math.floor(Number(count) || 0), 9999));
    const success = setBadgeCount(parsed);
    return { success, count: parsed };
  });

  ipcMain.handle('desktop:request-attention', (event, critical = false) => {
    const senderWindow = validateSender(event);
    requestAttention(Boolean(critical), senderWindow);
    return { success: true };
  });

  ipcMain.handle('desktop:clear-attention', (event) => {
    const senderWindow = validateSender(event);
    clearAttention(senderWindow);
    return { success: true };
  });

  ipcMain.handle('desktop:set-progress-bar', (event, progress, options = {}) => {
    const senderWindow = validateSender(event);
    setProgressBar(progress, options, senderWindow);
    return { success: true };
  });
}

module.exports = { registerBadgeIpc };
