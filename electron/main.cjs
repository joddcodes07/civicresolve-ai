const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const isDev = !app.isPackaged;

ipcMain.handle('desktop:get-app-info', () => {
    return {
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
        isPackaged: app.isPackaged
    };
});

ipcMain.handle('desktop:select-images', async (event, maxFiles = 3) => {
    // Restrict the number of files requested by the renderer
    const safeMax = Math.max(1, Math.min(Number(maxFiles) || 3, 3));

    // Only allow requests from this app's own window
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!senderWindow) {
        throw new Error('Invalid desktop window');
    }

    const result = await dialog.showOpenDialog(senderWindow, {
        title: 'Select complaint evidence',
        buttonLabel: 'Choose Photos',
        properties: ['openFile', 'multiSelections'],
        filters: [
            {
                name: 'Images',
                extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif']
            }
        ]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return [];
    }

    const selectedPaths = result.filePaths.slice(0, safeMax);

    const images = await Promise.all(
        selectedPaths.map(async (filePath) => {
            const buffer = await fs.readFile(filePath);
            const extension = path.extname(filePath).toLowerCase();

            const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.webp': 'image/webp',
                '.gif': 'image/gif'
            };

            return {
                name: path.basename(filePath),
                mimeType: mimeTypes[extension],
                base64: buffer.toString('base64')
            };
        })
    );

    return images;
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
