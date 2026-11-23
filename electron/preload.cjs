const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
    isElectron: true,

    platform: process.platform,

    getAppInfo: () => ipcRenderer.invoke('desktop:get-app-info'),

    selectImages: (maxFiles = 3) =>
        ipcRenderer.invoke('desktop:select-images', maxFiles),

    selectDocuments: (options = {}) =>
        ipcRenderer.invoke('desktop:select-documents', options),

    saveFile: (options = {}) =>
        ipcRenderer.invoke('desktop:save-file', options),

    showNotification: (options = {}) =>
        ipcRenderer.invoke('desktop:show-notification', options),

    isNotificationSupported: () =>
        ipcRenderer.invoke('desktop:is-notification-supported'),

    onNavigate: (callback) => {
        if (typeof callback !== 'function') return () => { };
        const handler = (_event, targetPath) => callback(targetPath);
        ipcRenderer.on('desktop:navigate', handler);
        return () => ipcRenderer.removeListener('desktop:navigate', handler);
    },

    getTheme: () => ipcRenderer.invoke('desktop:get-theme'),

    setThemeSource: (source) =>
        ipcRenderer.invoke('desktop:set-theme-source', source),

    onThemeChanged: (callback) => {
        if (typeof callback !== 'function') return () => { };
        const handler = (_event, themeInfo) => callback(themeInfo);
        ipcRenderer.on('desktop:theme-changed', handler);
        return () => ipcRenderer.removeListener('desktop:theme-changed', handler);
    },

    // ── Auto-updater (Milestone 16) ──────────────────────────────────────────

    /**
     * Manually trigger an update check.
     * Results arrive asynchronously via onUpdateStatus().
     * @returns {Promise<{triggered: boolean}>}
     */
    checkForUpdate: () => ipcRenderer.invoke('desktop:check-for-update'),

    /**
     * Quit and install a previously downloaded update.
     * Only call this after receiving status === 'ready' from onUpdateStatus().
     * @returns {Promise<{installing: boolean}>}
     */
    installUpdate: () => ipcRenderer.invoke('desktop:install-update'),

    /**
     * Subscribe to update-status push events from the main process.
     * @param {(payload: UpdateStatusPayload) => void} callback
     * @returns {() => void}  unsubscribe function
     *
     * UpdateStatusPayload shapes:
     *   { status: 'checking' }
     *   { status: 'available',     version, releaseDate, releaseNotes }
     *   { status: 'not-available', version }
     *   { status: 'downloading',   percent, transferred, total, bytesPerSecond }
     *   { status: 'ready',         version, releaseDate }
     *   { status: 'error',         message }
     */
    onUpdateStatus: (callback) => {
        if (typeof callback !== 'function') return () => { };
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('desktop:update-status', handler);
        return () => ipcRenderer.removeListener('desktop:update-status', handler);
    },

    // ── Crash Reporter (Milestone 18) ────────────────────────────────────────

    /**
     * Returns up to `limit` persisted crash reports (newest first).
     * @param {number} [limit=20]
     * @returns {Promise<object[]>}
     */
    getCrashReports: (limit = 20) =>
        ipcRenderer.invoke('desktop:get-crash-reports', limit),

    /**
     * Deletes all persisted crash log files.
     * @returns {Promise<{deleted: number}>}
     */
    clearCrashReports: () =>
        ipcRenderer.invoke('desktop:clear-crash-reports'),

    /**
     * Returns the absolute filesystem path of the crash-reports directory.
     * Useful for a "Show in Finder/Explorer" button in the UI.
     * @returns {Promise<string>}
     */
    getCrashReportDir: () =>
        ipcRenderer.invoke('desktop:get-crash-report-dir'),

    /**
     * Sends a renderer-side error (from an ErrorBoundary or window.onerror)
     * to the main process for structured crash logging.
     * @param {{ message: string, stack?: string, componentStack?: string, url?: string }} payload
     * @returns {Promise<{captured: boolean}>}
     */
    reportRendererError: (payload = {}) =>
        ipcRenderer.invoke('desktop:report-renderer-error', payload),

    // ── Offline / Connectivity Monitor (Milestone 19) ────────────────────────

    /**
     * Returns the current connectivity state cached by the main-process monitor.
     * Call once on mount to hydrate before push events arrive.
     * @returns {Promise<{ online: boolean, since: string }>}
     */
    getConnectivity: () =>
        ipcRenderer.invoke('desktop:get-connectivity'),

    /**
     * Subscribe to connectivity-change push events from the main process.
     * Fires whenever the network transitions between online ↔ offline.
     * @param {(state: { online: boolean, since: string }) => void} callback
     * @returns {() => void}  unsubscribe function
     */
    onConnectivityChanged: (callback) => {
        if (typeof callback !== 'function') return () => { };
        const handler = (_event, state) => callback(state);
        ipcRenderer.on('desktop:connectivity-changed', handler);
        return () => ipcRenderer.removeListener('desktop:connectivity-changed', handler);
    },

    // ── Performance & Cache Diagnostics (Milestone 20) ───────────────────────

    /**
     * Inspects application cache size on disk.
     * @returns {Promise<{ cacheSizeBytes: number, cacheSizeMB: number }>}
     */
    getCacheStats: () =>
        ipcRenderer.invoke('desktop:get-cache-stats'),

    /**
     * Clears non-credential disk and memory cache.
     * @returns {Promise<{ cleared: boolean }>}
     */
    clearCache: () =>
        ipcRenderer.invoke('desktop:clear-cache'),

    /**
     * Returns system process and memory usage diagnostics.
     * @returns {Promise<object>}
     */
    getMemoryMetrics: () =>
        ipcRenderer.invoke('desktop:get-memory-metrics'),

    // ── System Tray (Milestone 21) ───────────────────────────────────────────

    /**
     * Updates the system tray tooltip text.
     * @param {string} tooltip
     * @returns {Promise<{ success: boolean }>}
     */
    setTrayTooltip: (tooltip) =>
        ipcRenderer.invoke('desktop:set-tray-tooltip', tooltip),

    /**
     * Updates the system tray alert/badge state.
     * @param {boolean} hasAlert
     * @returns {Promise<{ success: boolean }>}
     */
    setTrayBadge: (hasAlert) =>
        ipcRenderer.invoke('desktop:set-tray-badge', hasAlert)
});
