const { ipcMain, dialog } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const { readImageFile } = require('../services/file.service.cjs');

function registerDialogIpc() {
  ipcMain.handle('desktop:select-images', async (event, maxFiles = 3) => {
    // Restrict the number of files requested by the renderer
    const safeMax = Math.max(1, Math.min(Number(maxFiles) || 3, 3));

    // Only allow requests from this app's own valid window
    const senderWindow = validateSender(event);

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
        return readImageFile(filePath);
      })
    );

    return images;
  });
}

module.exports = { registerDialogIpc };
