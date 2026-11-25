'use strict';

/**
 * Power & System State IPC Handlers — Milestone 27
 *
 * Channels:
 *   desktop:power:get-idle-time   → number (seconds)
 *   desktop:power:get-idle-state  → 'active' | 'idle' | 'locked' | 'unknown'
 *   desktop:power:is-on-battery   → boolean
 *   desktop:power:block-sleep     → number | null (blockerId)
 *   desktop:power:unblock-sleep   → boolean
 */

const { ipcMain } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const {
  getSystemIdleTime,
  getSystemIdleState,
  isOnBatteryPower,
  startPowerSaveBlocker,
  stopPowerSaveBlocker
} = require('../services/power.service.cjs');

function registerPowerIpc() {
  ipcMain.handle('desktop:power:get-idle-time', (event) => {
    validateSender(event);
    return getSystemIdleTime();
  });

  ipcMain.handle('desktop:power:get-idle-state', (event, threshold) => {
    validateSender(event);
    return getSystemIdleState(threshold);
  });

  ipcMain.handle('desktop:power:is-on-battery', (event) => {
    validateSender(event);
    return isOnBatteryPower();
  });

  ipcMain.handle('desktop:power:block-sleep', (event, type) => {
    validateSender(event);
    return startPowerSaveBlocker(type);
  });

  ipcMain.handle('desktop:power:unblock-sleep', (event, blockerId) => {
    validateSender(event);
    return stopPowerSaveBlocker(blockerId);
  });
}

module.exports = { registerPowerIpc };
