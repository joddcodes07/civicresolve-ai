'use strict';

/**
 * Updater IPC handlers — Milestone 16
 *
 * Channels:
 *   desktop:check-for-update  (invoke)  → manually trigger update check
 *   desktop:install-update    (invoke)  → quit and install downloaded update
 *
 * Both handlers validate the IPC sender before acting, following the same
 * security pattern used by all other IPC modules in this application.
 */

const { ipcMain } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const { checkForUpdate, installUpdate } = require('../services/updater.service.cjs');

function registerUpdaterIpc() {
  /**
   * desktop:check-for-update
   * Manually triggers an update check.  Returns immediately; results are
   * delivered asynchronously via the 'desktop:update-status' push event.
   */
  ipcMain.handle('desktop:check-for-update', (event) => {
    validateSender(event);
    checkForUpdate();
    return { triggered: true };
  });

  /**
   * desktop:install-update
   * Quits the application and installs a previously downloaded update.
   * The renderer must only call this after receiving status === 'ready'.
   */
  ipcMain.handle('desktop:install-update', (event) => {
    validateSender(event);
    installUpdate();
    // installUpdate calls app.quit() so this return is unreachable in practice,
    // but we return a value so the renderer's await resolves cleanly in tests.
    return { installing: true };
  });
}

module.exports = { registerUpdaterIpc };
