'use strict';

/**
 * Offline IPC handler — Milestone 19
 *
 * Channel:
 *   desktop:get-connectivity  (invoke)  → { online: boolean, since: string }
 *
 * Push events (sent by offline-monitor.service.cjs → renderer):
 *   desktop:connectivity-changed        → { online: boolean, since: string }
 *
 * The renderer subscribes to push events via onConnectivityChanged() in preload.
 * This IPC handler is only needed for the initial synchronous query on mount.
 */

const { ipcMain }        = require('electron');
const { validateSender } = require('../utils/security.cjs');
const { getConnectivity } = require('../services/offline-monitor.service.cjs');

function registerOfflineIpc() {
  /**
   * desktop:get-connectivity
   * Returns the current cached connectivity state without triggering a probe.
   * Useful for initial render: the React hook calls this once on mount to
   * hydrate state before the first push event arrives.
   */
  ipcMain.handle('desktop:get-connectivity', (event) => {
    validateSender(event);
    return getConnectivity();
  });
}

module.exports = { registerOfflineIpc };
