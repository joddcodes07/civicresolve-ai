const { registerAppIpc } = require('./app.ipc.cjs');
const { registerDialogIpc } = require('./dialog.ipc.cjs');

function registerIpcHandlers() {
  registerAppIpc();
  registerDialogIpc();
}

module.exports = { registerIpcHandlers };
