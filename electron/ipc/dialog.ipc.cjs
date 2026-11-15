const { ipcMain, dialog } = require('electron');
const path = require('path');
const { validateSender } = require('../utils/security.cjs');
const { validatePositiveInteger, validateSafeString } = require('../utils/validators.cjs');
const { readImageFile, readDocumentFile, saveFileSafe } = require('../services/file.service.cjs');

function registerDialogIpc() {
  ipcMain.handle('desktop:select-images', async (event, maxFiles = 3) => {
    // Restrict the number of files requested by the renderer
    const safeMax = validatePositiveInteger(maxFiles, 3, 1, 3);

    // Only allow requests from this app's own valid, trusted window
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

  ipcMain.handle('desktop:select-documents', async (event, options = {}) => {
    const safeMax = validatePositiveInteger(options?.maxFiles, 1, 1, 5);
    const senderWindow = validateSender(event);

    const result = await dialog.showOpenDialog(senderWindow, {
      title: options?.title || 'Select supporting document',
      buttonLabel: 'Choose Document',
      properties: ['openFile', ...(safeMax > 1 ? ['multiSelections'] : [])],
      filters: [
        {
          name: 'Supported Documents',
          extensions: ['pdf', 'txt', 'csv', 'json', 'jpg', 'jpeg', 'png']
        },
        {
          name: 'PDF Documents',
          extensions: ['pdf']
        },
        {
          name: 'Data Files (CSV, JSON, TXT)',
          extensions: ['csv', 'json', 'txt']
        },
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
    const documents = [];

    for (const filePath of selectedPaths) {
      try {
        const doc = await readDocumentFile(filePath);
        documents.push(doc);
      } catch (err) {
        console.warn(`[Dialog IPC] Skipping invalid file "${filePath}":`, err.message);
      }
    }

    return documents;
  });

  ipcMain.handle('desktop:save-file', async (event, options = {}) => {
    const senderWindow = validateSender(event);

    const defaultName = validateSafeString(options?.defaultName, 255) || 'export.txt';
    const sanitizedName = path.basename(defaultName);

    if (typeof options?.content !== 'string') {
      throw new Error('Content must be a string');
    }

    const result = await dialog.showSaveDialog(senderWindow, {
      title: options?.title || 'Save File',
      defaultPath: sanitizedName,
      filters: Array.isArray(options?.filters) && options.filters.length > 0
        ? options.filters
        : [{ name: 'All Files', extensions: ['*'] }]
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    return await saveFileSafe({
      filePath: result.filePath,
      content: options.content,
      isBase64: Boolean(options.isBase64)
    });
  });
}

module.exports = { registerDialogIpc };
