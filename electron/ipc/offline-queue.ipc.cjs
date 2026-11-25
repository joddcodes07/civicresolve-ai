'use strict';

/**
 * Offline Queue & Draft IPC Handlers — Milestone 28
 *
 * Channels:
 *   desktop:queue:add     → adds grievance to offline submission queue
 *   desktop:queue:list    → returns all queued offline submissions
 *   desktop:queue:remove  → removes synced submission from queue
 *   desktop:queue:update  → updates submission status/retryCount
 *   desktop:queue:clear   → clears submission queue
 *   desktop:draft:save    → auto-saves form draft
 *   desktop:draft:get     → retrieves form draft
 *   desktop:draft:clear   → clears form draft
 */

const { ipcMain } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const { validateSafeString } = require('../utils/validators.cjs');
const {
  addToQueue,
  getQueue,
  removeFromQueue,
  updateQueueItem,
  clearQueue,
  saveDraft,
  getDraft,
  clearDraft
} = require('../services/offline-queue.service.cjs');

function registerOfflineQueueIpc() {
  ipcMain.handle('desktop:queue:add', (event, payload) => {
    validateSender(event);
    return addToQueue(payload);
  });

  ipcMain.handle('desktop:queue:list', (event) => {
    validateSender(event);
    return getQueue();
  });

  ipcMain.handle('desktop:queue:remove', (event, id) => {
    validateSender(event);
    const safeId = validateSafeString(id, 64);
    if (!safeId) return { success: false };
    return removeFromQueue(safeId);
  });

  ipcMain.handle('desktop:queue:update', (event, id, updates) => {
    validateSender(event);
    const safeId = validateSafeString(id, 64);
    if (!safeId) return { success: false };
    return updateQueueItem(safeId, updates);
  });

  ipcMain.handle('desktop:queue:clear', (event) => {
    validateSender(event);
    return clearQueue();
  });

  ipcMain.handle('desktop:draft:save', (event, key, data) => {
    validateSender(event);
    const safeKey = validateSafeString(key, 64);
    if (!safeKey) return { success: false };
    return saveDraft(safeKey, data);
  });

  ipcMain.handle('desktop:draft:get', (event, key) => {
    validateSender(event);
    const safeKey = validateSafeString(key, 64);
    if (!safeKey) return null;
    return getDraft(safeKey);
  });

  ipcMain.handle('desktop:draft:clear', (event, key) => {
    validateSender(event);
    const safeKey = validateSafeString(key, 64);
    if (!safeKey) return { success: false };
    return clearDraft(safeKey);
  });
}

module.exports = { registerOfflineQueueIpc };
