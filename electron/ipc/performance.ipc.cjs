'use strict';

/**
 * Performance IPC Handlers — Milestone 20
 *
 * Exposes performance monitoring, cache inspection, and cache clearing
 * to the renderer process safely with sender validation.
 *
 * Channels:
 *   desktop:get-cache-stats    → returns { cacheSizeBytes, cacheSizeMB }
 *   desktop:clear-cache        → clears HTTP/shader cache, returns { cleared: boolean }
 *   desktop:get-memory-metrics → returns system & process memory metrics
 */

const { ipcMain } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const {
  getCacheStats,
  clearCache,
  getMemoryMetrics
} = require('../services/performance.service.cjs');

function registerPerformanceIpc() {
  ipcMain.handle('desktop:get-cache-stats', async (event) => {
    validateSender(event);
    return await getCacheStats();
  });

  ipcMain.handle('desktop:clear-cache', async (event) => {
    validateSender(event);
    return await clearCache();
  });

  ipcMain.handle('desktop:get-memory-metrics', async (event) => {
    validateSender(event);
    return await getMemoryMetrics();
  });
}

module.exports = { registerPerformanceIpc };
