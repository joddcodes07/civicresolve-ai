const { BrowserWindow } = require('electron');

/**
 * Validates that an IPC event originates from a valid, recognized BrowserWindow.
 * @param {Electron.IpcMainInvokeEvent} event
 * @returns {Electron.BrowserWindow}
 */
function validateSender(event) {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (!senderWindow || senderWindow.isDestroyed()) {
    throw new Error('Unauthorized IPC sender: window not recognized or destroyed');
  }
  return senderWindow;
}

module.exports = { validateSender };
