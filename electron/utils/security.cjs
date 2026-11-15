const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

/**
 * Checks whether a URL belongs to a trusted application origin.
 * @param {string} urlStr
 * @returns {boolean}
 */
function isTrustedOrigin(urlStr) {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);

    // Development web server
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
        return parsed.port === '5173';
      }
      return false;
    }

    // Production packaged files
    if (parsed.protocol === 'file:') {
      const appRoot = app.isReady() ? app.getAppPath() : path.resolve(__dirname, '../..');
      const allowedDist = path.resolve(appRoot, 'client/dist');
      const targetPath = path.resolve(decodeURIComponent(parsed.pathname));
      return targetPath.startsWith(allowedDist);
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Validates that an IPC event originates from a valid, recognized, trusted application window.
 * @param {Electron.IpcMainInvokeEvent} event
 * @returns {Electron.BrowserWindow}
 */
function validateSender(event) {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (!senderWindow || senderWindow.isDestroyed()) {
    throw new Error('Unauthorized IPC sender: window not recognized or destroyed');
  }

  const senderUrl = event.senderFrame?.url || event.sender?.getURL();
  if (senderUrl && !isTrustedOrigin(senderUrl)) {
    throw new Error(`Unauthorized IPC sender origin: ${senderUrl}`);
  }

  return senderWindow;
}

/**
 * Attaches security guards to prevent unwanted window creation, unsafe navigation,
 * and unauthorized permission requests.
 * @param {Electron.BrowserWindow} window
 */
function configureSecurityHandlers(window) {
  // Prevent creation of new Electron windows; route external links to OS default browser
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url).catch((err) => {
          console.error('Failed to open external link in system browser:', err);
        });
      }
    } catch {
      // Ignore malformed URLs
    }
    return { action: 'deny' };
  });

  // Prevent in-window navigation away from trusted application origins
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isTrustedOrigin(navigationUrl)) {
      event.preventDefault();
      try {
        const parsed = new URL(navigationUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          shell.openExternal(navigationUrl).catch((err) => {
            console.error('Failed to open external navigation URL:', err);
          });
        }
      } catch {
        // Ignore malformed URLs
      }
    }
  });

  // Restrict system permissions to trusted origins for supported features (geolocation, speech media)
  const session = window.webContents.session;
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    const requestingUrl = webContents.getURL();
    if (!isTrustedOrigin(requestingUrl)) {
      return callback(false);
    }

    // CivicResolve AI needs geolocation for complaint mapping and media for speech input
    const ALLOWED_PERMISSIONS = ['geolocation', 'media'];
    if (ALLOWED_PERMISSIONS.includes(permission)) {
      return callback(true);
    }

    return callback(false);
  });
}

module.exports = {
  isTrustedOrigin,
  validateSender,
  configureSecurityHandlers
};
