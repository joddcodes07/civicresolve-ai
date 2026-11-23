'use strict';

/**
 * Safe Storage IPC Handlers — Milestone 24
 *
 * Channels:
 *   desktop:safe-storage:is-available → boolean
 *   desktop:safe-storage:set          → boolean
 *   desktop:safe-storage:get          → string | null
 *   desktop:safe-storage:remove       → boolean
 *   desktop:safe-storage:clear        → boolean
 */

const { ipcMain } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const { validateSafeString } = require('../utils/validators.cjs');
const {
  isSafeStorageAvailable,
  setSecret,
  getSecret,
  removeSecret,
  clearSecrets
} = require('../services/safe-storage.service.cjs');

function registerSafeStorageIpc() {
  ipcMain.handle('desktop:safe-storage:is-available', (event) => {
    validateSender(event);
    return isSafeStorageAvailable();
  });

  ipcMain.handle('desktop:safe-storage:set', (event, key, value) => {
    validateSender(event);
    const safeKey = validateSafeString(key, 128);
    if (!safeKey || typeof value !== 'string' || value.length > 65536) {
      return false;
    }
    return setSecret(safeKey, value);
  });

  ipcMain.handle('desktop:safe-storage:get', (event, key) => {
    validateSender(event);
    const safeKey = validateSafeString(key, 128);
    if (!safeKey) return null;
    return getSecret(safeKey);
  });

  ipcMain.handle('desktop:safe-storage:remove', (event, key) => {
    validateSender(event);
    const safeKey = validateSafeString(key, 128);
    if (!safeKey) return false;
    return removeSecret(safeKey);
  });

  ipcMain.handle('desktop:safe-storage:clear', (event) => {
    validateSender(event);
    return clearSecrets();
  });
}

module.exports = { registerSafeStorageIpc };
