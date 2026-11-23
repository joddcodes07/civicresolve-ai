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
const { registerSafeStorageIpc } = require('./safe-storage.ipc.cjs');
const { registerGlobalShortcutIpc } = require('./global-shortcut.ipc.cjs');
const { registerWindowIpc }      = require('./window.ipc.cjs');
const { registerPowerIpc }       = require('./power.ipc.cjs');

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
  registerSafeStorageIpc();
  registerGlobalShortcutIpc();
  registerWindowIpc();
  registerPowerIpc();
}

module.exports = { registerIpcHandlers };
