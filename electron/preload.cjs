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
    },

    getTheme: () => ipcRenderer.invoke('desktop:get-theme'),

    setThemeSource: (source) =>
        ipcRenderer.invoke('desktop:set-theme-source', source),

    onThemeChanged: (callback) => {
        if (typeof callback !== 'function') return () => { };
        const handler = (_event, themeInfo) => callback(themeInfo);
        ipcRenderer.on('desktop:theme-changed', handler);
        return () => ipcRenderer.removeListener('desktop:theme-changed', handler);
    }
});
