const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc/index.cjs');
const { configureSecurityHandlers } = require('./utils/security.cjs');
const { setupApplicationMenu } = require('./menu/app.menu.cjs');
const { loadWindowState, trackWindowState } = require('./services/window-state.service.cjs');
const { dispatchDeepLink } = require('./services/deep-link.service.cjs');

// Configure application metadata
app.setName('CivicResolve AI');
if (process.platform === 'win32') {
    app.setAppUserModelId('com.civicresolve.ai');
}

// Register custom protocol client for desktop deep linking (civicresolve://)
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('civicresolve', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('civicresolve');
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
    const appState = {
        pendingDeepLink: null
    };

    // Register modular IPC handlers
    registerIpcHandlers();

    function createWindow() {
        const windowState = loadWindowState();

        const isDark = nativeTheme.shouldUseDarkColors;

        mainWindow = new BrowserWindow({
            width: windowState.width,
            height: windowState.height,
            minWidth: windowState.minWidth,
            minHeight: windowState.minHeight,
            x: windowState.x,
            y: windowState.y,
            title: 'CivicResolve AI',
            backgroundColor: isDark ? '#0f172a' : '#f4f2ec',

            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
                webSecurity: true,
                allowRunningInsecureContent: false
            }
        });

        if (windowState.isMaximized) {
            mainWindow.maximize();
        }

        trackWindowState(mainWindow);

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

        // Flush any pending deep link navigation once renderer finishes loading
        mainWindow.webContents.on('did-finish-load', () => {
            if (appState.pendingDeepLink) {
                mainWindow.webContents.send('desktop:navigate', appState.pendingDeepLink);
                appState.pendingDeepLink = null;
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

    app.on('second-instance', (event, commandLine) => {
        // Restore and focus the existing main window if another instance is launched
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }

        // On Windows and Linux, check for deep link in command-line arguments
        const deepLink = commandLine && commandLine.find((arg) => arg.startsWith('civicresolve://'));
        if (deepLink) {
            dispatchDeepLink(deepLink, mainWindow, appState);
        }
    });

    // Handle deep links on macOS
    app.on('open-url', (event, url) => {
        event.preventDefault();
        dispatchDeepLink(url, mainWindow, appState);
    });

    app.whenReady().then(() => {
        setupApplicationMenu(isDev);
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
