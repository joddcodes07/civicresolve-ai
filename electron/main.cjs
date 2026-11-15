const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc/index.cjs');
const { configureSecurityHandlers } = require('./utils/security.cjs');

// Configure application metadata
app.setName('CivicResolve AI');
if (process.platform === 'win32') {
    app.setAppUserModelId('com.civicresolve.ai');
}

// Global exception and rejection handlers for graceful recovery and logging
process.on('uncaughtException', (error) => {
    console.error('[Main] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('[Main] Unhandled promise rejection:', reason);
});

// Enforce single-instance lock to prevent duplicate application processes
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    let mainWindow = null;
    const isDev = !app.isPackaged;

    // Register modular IPC handlers
    registerIpcHandlers();

    function createWindow() {
        mainWindow = new BrowserWindow({
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
                sandbox: true,
                webSecurity: true,
                allowRunningInsecureContent: false
            }
        });

        // Enforce origin, navigation, and window open security guards
        configureSecurityHandlers(mainWindow);

        // Monitor renderer crash and unresponsiveness
        mainWindow.webContents.on('render-process-gone', (event, details) => {
            console.error('[Main] Renderer process gone:', details);
        });

        mainWindow.on('unresponsive', () => {
            console.warn('[Main] Main window became unresponsive');
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

        if (isDev) {
            mainWindow.loadURL('http://127.0.0.1:5173');
        } else {
            mainWindow.loadFile(
                path.join(__dirname, '../client/dist/index.html')
            );
        }
    }

    app.on('second-instance', () => {
        // Restore and focus the existing main window if another instance is launched
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            // On macOS re-create or restore window when dock icon is clicked
            if (mainWindow === null) {
                createWindow();
            } else {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
