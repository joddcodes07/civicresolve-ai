const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
    isElectron: true,

    platform: process.platform,

    getAppInfo: () => ipcRenderer.invoke('desktop:get-app-info'),

    selectImages: (maxFiles = 3) =>
        ipcRenderer.invoke('desktop:select-images', maxFiles),

    selectDocuments: (options = {}) =>
        ipcRenderer.invoke('desktop:select-documents', options),

    saveFile: (options = {}) =>
        ipcRenderer.invoke('desktop:save-file', options)
});
