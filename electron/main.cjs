const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

// IPC: Renderer requests basic desktop information
ipcMain.handle('desktop:get-app-info', () => {
    return {
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
        isPackaged: app.isPackaged
    };
});

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        minWidth: 1000,
        minHeight: 650,
        title: 'CivicResolve AI',
        backgroundColor: '#0f172a',

        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    if (isDev) {
        mainWindow.loadURL('http://127.0.0.1:5173');
    } else {
        mainWindow.loadFile(
            path.join(__dirname, '../client/dist/index.html')
        );
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
