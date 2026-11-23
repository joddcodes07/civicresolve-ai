'use strict';

/**
 * Print & PDF Export Service — Milestone 23
 *
 * Provides native printing and PDF generation for citizen grievance receipts,
 * acknowledgements, and officer reports.
 *
 * Capabilities:
 *   • printPage(options, win): Prompts native OS print dialog or silent print.
 *   • exportPdf(options, win): Generates high-fidelity PDF from the current view
 *     and prompts native save dialog to persist it safely.
 */

const { dialog } = require('electron');
const path = require('path');
const { saveFileSafe } = require('./file.service.cjs');

/**
 * Triggers native printing for the given window.
 * @param {object} options
 * @param {boolean} [options.silent=false]
 * @param {boolean} [options.printBackground=true]
 * @param {string} [options.deviceName]
 * @param {Electron.BrowserWindow} win
 * @returns {Promise<{ success: boolean, failureReason?: string }>}
 */
async function printPage(options = {}, win) {
  if (!win || win.isDestroyed()) {
    return { success: false, failureReason: 'Window is destroyed or unavailable' };
  }

  const printOptions = {
    silent: Boolean(options.silent),
    printBackground: options.printBackground !== false,
    color: options.color !== false,
    margins: options.margins || { marginType: 'default' },
    landscape: Boolean(options.landscape),
    copies: Math.max(1, Math.min(Math.floor(Number(options.copies) || 1), 10))
  };

  if (typeof options.deviceName === 'string' && options.deviceName.trim()) {
    printOptions.deviceName = options.deviceName.trim();
  }

  return new Promise((resolve) => {
    win.webContents.print(printOptions, (success, failureReason) => {
      if (success) {
        resolve({ success: true });
      } else {
        console.warn('[PrintService] Native print unsuccessful:', failureReason);
        resolve({ success: false, failureReason: failureReason || 'User cancelled or printer unavailable' });
      }
    });
  });
}

/**
 * Generates a PDF of the current view and prompts native save dialog.
 * @param {object} options
 * @param {string} [options.defaultFilename]
 * @param {string} [options.pageSize='A4']
 * @param {boolean} [options.landscape=false]
 * @param {boolean} [options.printBackground=true]
 * @param {Electron.BrowserWindow} win
 * @returns {Promise<{ success: boolean, filePath?: string, canceled: boolean, error?: string }>}
 */
async function exportPdf(options = {}, win) {
  if (!win || win.isDestroyed()) {
    return { success: false, canceled: false, error: 'Window unavailable' };
  }

  const pdfOptions = {
    pageSize: options.pageSize === 'Letter' ? 'Letter' : 'A4',
    landscape: Boolean(options.landscape),
    printBackground: options.printBackground !== false,
    preferCSSPageSize: true
  };

  try {
    // Generate PDF buffer from renderer webContents
    const pdfBuffer = await win.webContents.printToPDF(pdfOptions);

    const safeDefaultName = typeof options.defaultFilename === 'string' && options.defaultFilename.trim()
      ? options.defaultFilename.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
      : `CivicResolve-Receipt-${Date.now()}`;

    const saveResult = await dialog.showSaveDialog(win, {
      title: 'Export Grievance Receipt (PDF)',
      defaultPath: `${safeDefaultName}.pdf`,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { success: false, canceled: true };
    }

    // Persist via safe file service with restricted system directory checks
    await saveFileSafe({
      filePath: saveResult.filePath,
      content: pdfBuffer.toString('base64'),
      isBase64: true
    });

    console.log('[PrintService] PDF exported successfully:', saveResult.filePath);
    return {
      success: true,
      canceled: false,
      filePath: saveResult.filePath
    };
  } catch (err) {
    console.error('[PrintService] exportPdf error:', err);
    return {
      success: false,
      canceled: false,
      error: err?.message || 'Failed to generate or save PDF'
    };
  }
}

module.exports = {
  printPage,
  exportPdf
};
