'use strict';

/**
 * Print & PDF Export IPC Handlers — Milestone 23
 *
 * Channels:
 *   desktop:print      → triggers native OS print dialog
 *   desktop:export-pdf → generates PDF and prompts native save dialog
 */

const { ipcMain } = require('electron');
const { validateSender } = require('../utils/security.cjs');
const { printPage, exportPdf } = require('../services/print.service.cjs');

function registerPrintIpc() {
  ipcMain.handle('desktop:print', async (event, options = {}) => {
    const senderWindow = validateSender(event);
    return await printPage(options, senderWindow);
  });

  ipcMain.handle('desktop:export-pdf', async (event, options = {}) => {
    const senderWindow = validateSender(event);
    return await exportPdf(options, senderWindow);
  });
}

module.exports = { registerPrintIpc };
