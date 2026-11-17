const { registerAppIpc } = require('./app.ipc.cjs');
const { registerDialogIpc } = require('./dialog.ipc.cjs');
const { registerNotificationIpc } = require('./notification.ipc.cjs');
const { registerThemeIpc } = require('./theme.ipc.cjs');

function registerIpcHandlers() {
  registerAppIpc();
  registerDialogIpc();
  registerNotificationIpc();
  registerThemeIpc();
}

module.exports = { registerIpcHandlers };
