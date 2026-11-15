const { ipcMain, Notification } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const { validateSafeString } = require('../utils/validators.cjs');

function registerNotificationIpc() {
  ipcMain.handle('desktop:show-notification', async (event, options = {}) => {
    // Ensure the call comes from an authorized application window
    validateSender(event);

    if (!Notification.isSupported()) {
      return { supported: false };
    }

    const title = validateSafeString(options?.title, 100) || 'CivicResolve AI';
    const body = validateSafeString(options?.body, 300) || '';
    const silent = Boolean(options?.silent);

    const notification = new Notification({
      title,
      body,
      silent
    });

    notification.show();
    return { success: true };
  });

  ipcMain.handle('desktop:is-notification-supported', () => {
    return Notification.isSupported();
  });
}

module.exports = { registerNotificationIpc };
