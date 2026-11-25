'use strict';

/**
 * Global Shortcut IPC Handlers — Milestone 25
 *
 * Channels:
 *   desktop:global-shortcuts:get-status  → returns list of registered shortcuts
 *   desktop:global-shortcuts:register    → registers a custom shortcut
 *   desktop:global-shortcuts:unregister  → unregisters a shortcut
 */

const { ipcMain } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const { validateSafeString } = require('../utils/validators.cjs');
const {
  getGlobalShortcutsStatus,
  registerCustomShortcut,
  unregisterCustomShortcut
} = require('../services/global-shortcut.service.cjs');

function registerGlobalShortcutIpc() {
  ipcMain.handle('desktop:global-shortcuts:get-status', (event) => {
    validateSender(event);
    return getGlobalShortcutsStatus();
  });

  ipcMain.handle('desktop:global-shortcuts:register', (event, accelerator, action) => {
    const senderWindow = validateSender(event);
    const safeAccelerator = validateSafeString(accelerator, 64);
    const safeAction = validateSafeString(action, 64) || 'custom';

    if (!safeAccelerator) return false;
    return registerCustomShortcut(safeAccelerator, safeAction, senderWindow);
  });

  ipcMain.handle('desktop:global-shortcuts:unregister', (event, accelerator) => {
    validateSender(event);
    const safeAccelerator = validateSafeString(accelerator, 64);
    if (!safeAccelerator) return false;
    return unregisterCustomShortcut(safeAccelerator);
  });
}

module.exports = { registerGlobalShortcutIpc };
