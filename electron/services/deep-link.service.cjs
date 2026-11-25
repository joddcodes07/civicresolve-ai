/**
 * Desktop Deep Linking Service for CivicResolve AI.
 * Handles parsing, sanitization, and routing of "civicresolve://" protocol URLs.
 */

const ALLOWED_ROUTES = ['/', '/lodge', '/track', '/map', '/chat', '/officer', '/admin'];

/**
 * Parses and sanitizes a custom protocol URL into an internal React Router path.
 * Supported formats:
 * - civicresolve://track/PUN-2026-0001 -> /track?code=PUN-2026-0001
 * - civicresolve://track?code=PUN-2026-0001 -> /track?code=PUN-2026-0001
 * - civicresolve://lodge -> /lodge
 * - civicresolve://map -> /map
 * - civicresolve://chat -> /chat
 * - civicresolve://officer -> /officer
 * - civicresolve://admin -> /admin
 *
 * @param {string} rawUrl
 * @returns {string|null} Sanitized target path or null if invalid
 */
function parseDeepLinkUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  try {
    const trimmed = rawUrl.trim();
    if (!/^civicresolve:\/\//i.test(trimmed)) return null;

    // Remove protocol prefix and normalize leading slashes
    const afterProtocol = trimmed.replace(/^civicresolve:\/+/i, '');
    const urlObj = new URL(`https://app.local/${afterProtocol}`);

    let route = urlObj.pathname.replace(/\/+/g, '/').replace(/\/$/, '');
    if (!route) route = '/';

    // Route-specific handling for /track with ticket code
    // Example: civicresolve://track/PUN-2026-0001
    if (route.startsWith('/track/')) {
      let rawCode = '';
      try {
        rawCode = decodeURIComponent(route.replace('/track/', '')).trim();
      } catch {
        rawCode = route.replace('/track/', '').trim();
      }
      const sanitizedCode = rawCode.replace(/[^a-zA-Z0-9_-]/g, '');
      return sanitizedCode ? `/track?code=${sanitizedCode}` : '/track';
    }

    // Example with query param: civicresolve://track?code=PUN-2026-0001
    if (route === '/track' && urlObj.searchParams.has('code')) {
      let rawCode = '';
      try {
        rawCode = decodeURIComponent(urlObj.searchParams.get('code')).trim();
      } catch {
        rawCode = urlObj.searchParams.get('code').trim();
      }
      const code = rawCode.replace(/[^a-zA-Z0-9_-]/g, '');
      return code ? `/track?code=${code}` : '/track';
    }

    // Check if the route starts with any of the allowed application routes
    const isAllowed = ALLOWED_ROUTES.some((allowed) => route === allowed || route.startsWith(`${allowed}/`));
    if (!isAllowed) {
      console.warn(`[DeepLink] Rejected unauthorized deep link route: ${route}`);
      return null;
    }

    // Strict character whitelist to prevent script injection or path traversal
    if (!/^[a-zA-Z0-9/_\-?&=]+$/.test(route)) {
      return null;
    }

    return route;
  } catch (err) {
    console.error('[DeepLink] Failed to parse deep link URL:', err.message);
    return null;
  }
}

/**
 * Handles dispatching a deep link URL to the main application window.
 * If the window is still loading, stores it as pending until load finishes.
 * @param {string} rawUrl
 * @param {Electron.BrowserWindow|null} mainWindow
 * @param {object} state
 */
function dispatchDeepLink(rawUrl, mainWindow, state = {}) {
  const targetPath = parseDeepLinkUrl(rawUrl);
  if (!targetPath) return;

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();

    if (mainWindow.webContents.isLoading()) {
      state.pendingDeepLink = targetPath;
    } else {
      mainWindow.webContents.send('desktop:navigate', targetPath);
    }
  } else {
    state.pendingDeepLink = targetPath;
  }
}

module.exports = {
  parseDeepLinkUrl,
  dispatchDeepLink,
  ALLOWED_ROUTES
};
