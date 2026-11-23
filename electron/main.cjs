const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc/index.cjs');
const { configureSecurityHandlers } = require('./utils/security.cjs');
const { setupApplicationMenu } = require('./menu/app.menu.cjs');
const { showContextMenu } = require('./menu/context.menu.cjs');
const { loadWindowState, trackWindowState } = require('./services/window-state.service.cjs');
const { dispatchDeepLink } = require('./services/deep-link.service.cjs');
const { initUpdater } = require('./services/updater.service.cjs');
const { initCrashReporter, attachWindowCrashHandlers } = require('./services/crash-reporter.service.cjs');
const { initOfflineMonitor } = require('./services/offline-monitor.service.cjs');
const { configureSessionCache } = require('./services/performance.service.cjs');
const { createTray, destroyTray } = require('./services/tray.service.cjs');
const { clearAttention } = require('./services/badge.service.cjs');
const { registerGlobalShortcuts, unregisterGlobalShortcuts } = require('./services/global-shortcut.service.cjs');
const { closeAllSecondaryWindows } = require('./services/window-manager.service.cjs');

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

// Initialise crash reporter as early as possible so all process-level errors
// are captured from the first tick, before app.whenReady() fires.
// initCrashReporter installs its own uncaughtException/unhandledRejection handlers,
// replacing the stubs below, and also listens for gpu-process-crashed / child-process-gone.
initCrashReporter({ isDev: !app.isPackaged });

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
            show: false,

            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
                webSecurity: true,
                allowRunningInsecureContent: false
            }
        });

        // Smooth window display without white/blank flash
        mainWindow.once('ready-to-show', () => {
            if (windowState.isMaximized) {
                mainWindow.maximize();
            }
            mainWindow.show();
        });

        trackWindowState(mainWindow);

        // Enforce origin, navigation, and window open security guards
        configureSecurityHandlers(mainWindow);

        // Attach native contextual right-click menu
        mainWindow.webContents.on('context-menu', (event, params) => {
            showContextMenu(mainWindow, params, isDev);
        });

        // Monitor renderer crash and unresponsiveness (Milestone 18: via crash reporter)
        attachWindowCrashHandlers(mainWindow);

        // Clear taskbar attention/flashing when window gains focus
        mainWindow.on('focus', () => {
            clearAttention(mainWindow);
        });

        // Hide to tray instead of quitting when user closes the window
        mainWindow.on('close', (event) => {
            if (!app.isQuitting) {
                event.preventDefault();
                mainWindow.hide();
            }
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

        // Flush any pending deep link navigation once renderer finishes loading.
        // Also initialise the auto-updater so it has a valid mainWindow reference
        // and the renderer is ready to receive push events.
        mainWindow.webContents.on('did-finish-load', () => {
            if (appState.pendingDeepLink) {
                mainWindow.webContents.send('desktop:navigate', appState.pendingDeepLink);
                appState.pendingDeepLink = null;
            }

            // Initialise auto-updater once per window lifetime (no-op in dev).
            initUpdater(mainWindow);

            // Start offline monitor so the renderer receives connectivity events.
            initOfflineMonitor(mainWindow);
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
        configureSessionCache();
        setupApplicationMenu(isDev);
        createWindow();
        createTray(mainWindow);
        registerGlobalShortcuts(mainWindow);

        app.on('activate', () => {
            // On macOS re-create or restore window when dock icon is clicked
            if (mainWindow === null) {
                createWindow();
            } else {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
            }
        });
    });

    app.on('before-quit', () => {
        app.isQuitting = true;
        closeAllSecondaryWindows();
        unregisterGlobalShortcuts();
        destroyTray();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
