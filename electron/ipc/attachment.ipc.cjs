'use strict';

/**
 * Milestone 29 — Attachment IPC handlers
 *
 * Channel prefix: desktop:attachment:*
 *
 * Channels:
 *   desktop:attachment:save      – copy a file into the attachment store
 *   desktop:attachment:list      – enumerate stored attachments (optional sessionId filter)
 *   desktop:attachment:read      – read an attachment as Base64 for API upload
 *   desktop:attachment:remove    – delete a single attachment
 *   desktop:attachment:clearSession – remove all attachments for a session
 *   desktop:attachment:open      – open in OS default viewer
 *   desktop:attachment:constraints – return allowed-types / size limits
 */

const { ipcMain } = require('electron');
const {
  saveAttachment,
  listAttachments,
  readAttachmentAsBase64,
  removeAttachment,
  clearSessionAttachments,
  openAttachment,
  getAttachmentConstraints,
} = require('../services/attachment.service.cjs');
const { validateSender }      = require('../utils/security.cjs');
const { validateSafeString }  = require('../utils/validators.cjs');

// ── Register ─────────────────────────────────────────────────────────────────

function registerAttachmentIpc() {

  // ── desktop:attachment:save ──────────────────────────────────────────────
  ipcMain.handle('desktop:attachment:save', async (event, srcPath, mimeType, sessionId) => {
    validateSender(event);
    const safeSrc       = validateSafeString(srcPath,   2048);
    const safeMime      = validateSafeString(mimeType   || '', 128);
    const safeSession   = validateSafeString(sessionId  || '', 128);

    try {
      const entry = saveAttachment(safeSrc, safeMime, safeSession);
      // Strip the absolute storedPath from the returned record — the renderer
      // never needs to know the host file-system path.
      const { storedPath: _omit, ...safe } = entry;
      return { success: true, attachment: safe };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── desktop:attachment:list ──────────────────────────────────────────────
  ipcMain.handle('desktop:attachment:list', async (event, sessionId) => {
    validateSender(event);
    const safeSession = validateSafeString(sessionId || '', 128);

    try {
      const entries = listAttachments(safeSession);
      // Strip storedPath from every entry before sending to renderer
      return entries.map(({ storedPath: _omit, ...safe }) => safe);
    } catch (err) {
      return [];
    }
  });

  // ── desktop:attachment:read ──────────────────────────────────────────────
  ipcMain.handle('desktop:attachment:read', async (event, id) => {
    validateSender(event);
    const safeId = validateSafeString(id, 64);

    try {
      const result = readAttachmentAsBase64(safeId);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── desktop:attachment:remove ────────────────────────────────────────────
  ipcMain.handle('desktop:attachment:remove', async (event, id) => {
    validateSender(event);
    const safeId = validateSafeString(id, 64);

    try {
      return removeAttachment(safeId);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── desktop:attachment:clearSession ─────────────────────────────────────
  ipcMain.handle('desktop:attachment:clearSession', async (event, sessionId) => {
    validateSender(event);
    const safeSession = validateSafeString(sessionId, 128);

    try {
      return clearSessionAttachments(safeSession);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── desktop:attachment:open ──────────────────────────────────────────────
  ipcMain.handle('desktop:attachment:open', async (event, id) => {
    validateSender(event);
    const safeId = validateSafeString(id, 64);

    try {
      return await openAttachment(safeId);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── desktop:attachment:constraints ──────────────────────────────────────
  ipcMain.handle('desktop:attachment:constraints', async (event) => {
    validateSender(event);
    return getAttachmentConstraints();
  });
}

module.exports = { registerAttachmentIpc };
