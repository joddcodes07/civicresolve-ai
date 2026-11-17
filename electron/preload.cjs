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
        ipcRenderer.invoke('desktop:save-file', options),

    showNotification: (options = {}) =>
        ipcRenderer.invoke('desktop:show-notification', options),

    isNotificationSupported: () =>
        ipcRenderer.invoke('desktop:is-notification-supported'),

    onNavigate: (callback) => {
        if (typeof callback !== 'function') return () => { };
        const handler = (_event, targetPath) => callback(targetPath);
        ipcRenderer.on('desktop:navigate', handler);
        return () => ipcRenderer.removeListener('desktop:navigate', handler);
    }
});
