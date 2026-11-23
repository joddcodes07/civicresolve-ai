const { registerAppIpc }      = require('./app.ipc.cjs');
const { registerDialogIpc }   = require('./dialog.ipc.cjs');
const { registerNotificationIpc } = require('./notification.ipc.cjs');
const { registerThemeIpc }    = require('./theme.ipc.cjs');
const { registerUpdaterIpc }  = require('./updater.ipc.cjs');
const { registerCrashIpc }    = require('./crash.ipc.cjs');
const { registerOfflineIpc }  = require('./offline.ipc.cjs');
const { registerPerformanceIpc } = require('./performance.ipc.cjs');
const { registerTrayIpc }        = require('./tray.ipc.cjs');
const { registerBadgeIpc }       = require('./badge.ipc.cjs');
const { registerPrintIpc }       = require('./print.ipc.cjs');

function registerIpcHandlers() {
  registerAppIpc();
  registerDialogIpc();
  registerNotificationIpc();
  registerThemeIpc();
  registerUpdaterIpc();
  registerCrashIpc();
  registerOfflineIpc();
  registerPerformanceIpc();
  registerTrayIpc();
  registerBadgeIpc();
  registerPrintIpc();
}

module.exports = { registerIpcHandlers };
