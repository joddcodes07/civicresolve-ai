const { registerAppIpc } = require('./app.ipc.cjs');
const { registerDialogIpc } = require('./dialog.ipc.cjs');
const { registerNotificationIpc } = require('./notification.ipc.cjs');

function registerIpcHandlers() {
  registerAppIpc();
  registerDialogIpc();
  registerNotificationIpc();
}

module.exports = { registerIpcHandlers };
