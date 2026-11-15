const { app, ipcMain } = require('electron');

function registerAppIpc() {
  ipcMain.handle('desktop:get-app-info', () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      isPackaged: app.isPackaged
    };
  });
}

module.exports = { registerAppIpc };
