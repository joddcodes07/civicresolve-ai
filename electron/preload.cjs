const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
    isElectron: true,

    platform: process.platform,

    getAppInfo: () => ipcRenderer.invoke('desktop:get-app-info')
});
