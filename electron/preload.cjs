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
        ipcRenderer.invoke('desktop:set-tray-badge', hasAlert),

    // ── Badging & Taskbar Alerts (Milestone 22) ──────────────────────────────

    /**
     * Sets numeric badge count on macOS dock or Windows/Linux taskbar.
     * @param {number} count Non-negative integer (0 clears badge)
     * @returns {Promise<{ success: boolean, count: number }>}
     */
    setBadgeCount: (count) =>
        ipcRenderer.invoke('desktop:set-badge-count', count),

    /**
     * Requests user attention (dock bounce on macOS, taskbar flash on Windows/Linux).
     * @param {boolean} [critical=false]
     * @returns {Promise<{ success: boolean }>}
     */
    requestAttention: (critical = false) =>
        ipcRenderer.invoke('desktop:request-attention', critical),

    /**
     * Manually clears attention / taskbar flashing.
     * @returns {Promise<{ success: boolean }>}
     */
    clearAttention: () =>
        ipcRenderer.invoke('desktop:clear-attention'),

    /**
     * Sets progress bar on dock icon or taskbar button.
     * @param {number} progress 0.0 to 1.0 (-1 to clear)
     * @param {{ mode?: 'none'|'normal'|'indeterminate'|'error'|'paused' }} [options]
     * @returns {Promise<{ success: boolean }>}
     */
    setProgressBar: (progress, options = {}) =>
        ipcRenderer.invoke('desktop:set-progress-bar', progress, options),

    // ── Native Print & PDF Export (Milestone 23) ─────────────────────────────

    /**
     * Triggers native print dialog.
     * @param {object} [options]
     * @returns {Promise<{ success: boolean, failureReason?: string }>}
     */
    print: (options = {}) =>
        ipcRenderer.invoke('desktop:print', options),

    /**
     * Generates a PDF of the current view and prompts native save dialog.
     * @param {object} [options]
     * @returns {Promise<{ success: boolean, filePath?: string, canceled: boolean, error?: string }>}
     */
    exportPdf: (options = {}) =>
        ipcRenderer.invoke('desktop:export-pdf', options),

    // ── Safe Storage & Keychain Vault (Milestone 24) ─────────────────────────

    safeStorage: {
        /**
         * Checks whether OS-level keychain encryption is available.
         * @returns {Promise<boolean>}
         */
        isAvailable: () =>
            ipcRenderer.invoke('desktop:safe-storage:is-available'),

        /**
         * Encrypts and securely persists a secret.
         * @param {string} key
         * @param {string} value
         * @returns {Promise<boolean>}
         */
        setSecret: (key, value) =>
            ipcRenderer.invoke('desktop:safe-storage:set', key, value),

        /**
         * Decrypts and retrieves a stored secret.
         * @param {string} key
         * @returns {Promise<string | null>}
         */
        getSecret: (key) =>
            ipcRenderer.invoke('desktop:safe-storage:get', key),

        /**
         * Removes a stored secret from the vault.
         * @param {string} key
         * @returns {Promise<boolean>}
         */
        removeSecret: (key) =>
            ipcRenderer.invoke('desktop:safe-storage:remove', key),

        /**
         * Clears all stored secrets.
         * @returns {Promise<boolean>}
         */
        clearSecrets: () =>
            ipcRenderer.invoke('desktop:safe-storage:clear')
    },

    // ── Global Shortcuts & Quick Capture (Milestone 25) ──────────────────────

    globalShortcuts: {
        /**
         * Gets status of active system-wide global shortcuts.
         * @returns {Promise<Array<{ accelerator: string, action: string, registered: boolean }>>}
         */
        getStatus: () =>
            ipcRenderer.invoke('desktop:global-shortcuts:get-status'),

        /**
         * Registers a custom global shortcut.
         * @param {string} accelerator
         * @param {string} [action]
         * @returns {Promise<boolean>}
         */
        register: (accelerator, action) =>
            ipcRenderer.invoke('desktop:global-shortcuts:register', accelerator, action),

        /**
         * Unregisters a global shortcut.
         * @param {string} accelerator
         * @returns {Promise<boolean>}
         */
        unregister: (accelerator) =>
            ipcRenderer.invoke('desktop:global-shortcuts:unregister', accelerator),

        /**
         * Subscribes to custom shortcut triggers.
         * @param {(data: { accelerator: string, action: string }) => void} callback
         * @returns {() => void}
         */
        onTriggered: (callback) => {
            if (typeof callback !== 'function') return () => { };
            const handler = (_event, data) => callback(data);
            ipcRenderer.on('desktop:shortcut-triggered', handler);
            return () => ipcRenderer.removeListener('desktop:shortcut-triggered', handler);
        }
    },

    // ── Multi-Window & Secondary Windows (Milestone 26) ──────────────────────

    windows: {
        /**
         * Opens or focuses a secondary application window.
         * @param {object} options
         * @param {string} options.id Unique identifier (e.g. 'detached-map')
         * @param {string} [options.route] Route to navigate to
         * @param {string} [options.title] Window title
         * @param {number} [options.width] Window width
         * @param {number} [options.height] Window height
         * @returns {Promise<{ id: string, action: 'focused' | 'opened' }>}
         */
        open: (options = {}) =>
            ipcRenderer.invoke('desktop:window:open', options),

        /**
         * Closes a secondary window by id.
         * @param {string} id
         * @returns {Promise<{ id: string, closed: boolean }>}
         */
        close: (id) =>
            ipcRenderer.invoke('desktop:window:close', id),

        /**
         * Brings an open secondary window to the front.
         * @param {string} id
         * @returns {Promise<{ id: string, focused: boolean }>}
         */
        focus: (id) =>
            ipcRenderer.invoke('desktop:window:focus', id),

        /**
         * Lists all open secondary windows.
         * @returns {Promise<Array<{ id: string, title: string, isVisible: boolean }>>}
         */
        list: () =>
            ipcRenderer.invoke('desktop:window:list')
    },

    // ── Power & Idle State Management (Milestone 27) ─────────────────────────

    power: {
        /**
         * Returns current system idle duration in seconds.
         * @returns {Promise<number>}
         */
        getIdleTime: () =>
            ipcRenderer.invoke('desktop:power:get-idle-time'),

        /**
         * Returns system idle status ('active' | 'idle' | 'locked' | 'unknown').
         * @param {number} [thresholdSeconds=60]
         * @returns {Promise<'active' | 'idle' | 'locked' | 'unknown'>}
         */
        getIdleState: (thresholdSeconds = 60) =>
            ipcRenderer.invoke('desktop:power:get-idle-state', thresholdSeconds),

        /**
         * Returns true if device is running on battery power.
         * @returns {Promise<boolean>}
         */
        isOnBattery: () =>
            ipcRenderer.invoke('desktop:power:is-on-battery'),

        /**
         * Prevents display sleep or OS suspension during mission-critical tasks.
         * @param {'prevent-display-sleep' | 'prevent-app-suspension'} [type='prevent-display-sleep']
         * @returns {Promise<number | null>} Blocker ID
         */
        blockSleep: (type = 'prevent-display-sleep') =>
            ipcRenderer.invoke('desktop:power:block-sleep', type),

        /**
         * Releases an active display sleep or app suspension blocker.
         * @param {number} blockerId
         * @returns {Promise<boolean>}
         */
        unblockSleep: (blockerId) =>
            ipcRenderer.invoke('desktop:power:unblock-sleep', blockerId),

        /**
         * Subscribes to system power events (sleep, resume, lock, unlock, AC, battery).
         * @param {(data: { event: string, timestamp: string }) => void} callback
         * @returns {() => void}
         */
        onPowerStateChanged: (callback) => {
            if (typeof callback !== 'function') return () => { };
            const handler = (_event, data) => callback(data);
            ipcRenderer.on('desktop:power-state-changed', handler);
            return () => ipcRenderer.removeListener('desktop:power-state-changed', handler);
        }
    },

    // ── Offline Queue & Form Drafts (Milestone 28) ───────────────────────────

    offlineQueue: {
        /**
         * Adds an item to the persistent outbox queue.
         * @param {object} payload
         * @returns {Promise<{ success: boolean, item?: object, error?: string }>}
         */
        add: (payload) =>
            ipcRenderer.invoke('desktop:queue:add', payload),

        /**
         * Lists all queued items in the outbox.
         * @returns {Promise<Array<object>>}
         */
        list: () =>
            ipcRenderer.invoke('desktop:queue:list'),

        /**
         * Removes a successfully synced item from the outbox.
         * @param {string} id
         * @returns {Promise<{ success: boolean }>}
         */
        remove: (id) =>
            ipcRenderer.invoke('desktop:queue:remove', id),

        /**
         * Updates status or metadata of a queued item.
         * @param {string} id
         * @param {object} updates
         * @returns {Promise<{ success: boolean }>}
         */
        update: (id, updates) =>
            ipcRenderer.invoke('desktop:queue:update', id, updates),

        /**
         * Clears all items in the outbox.
         * @returns {Promise<{ success: boolean }>}
         */
        clear: () =>
            ipcRenderer.invoke('desktop:queue:clear'),

        /**
         * Auto-saves a form draft.
         * @param {string} key
         * @param {object} data
         * @returns {Promise<{ success: boolean }>}
         */
        saveDraft: (key, data) =>
            ipcRenderer.invoke('desktop:draft:save', key, data),

        /**
         * Retrieves a previously saved form draft.
         * @param {string} key
         * @returns {Promise<object | null>}
         */
        getDraft: (key) =>
            ipcRenderer.invoke('desktop:draft:get', key),

        /**
         * Clears a saved form draft.
         * @param {string} key
         * @returns {Promise<{ success: boolean }>}
         */
        clearDraft: (key) =>
            ipcRenderer.invoke('desktop:draft:clear', key)
    },

    // ── Native File Attachments (Milestone 29) ────────────────────────────

    attachments: {
        /**
         * Copies a user-chosen file into the native attachment store.
         * The renderer receives safe metadata only — no host paths.
         *
         * @param {string} srcPath    Absolute path the user dropped/selected
         * @param {string} [mimeType] Optional MIME hint
         * @param {string} [sessionId] Form/session key for grouping
         * @returns {Promise<{ success: boolean, attachment?: object, error?: string }>}
         */
        save: (srcPath, mimeType, sessionId) =>
            ipcRenderer.invoke('desktop:attachment:save', srcPath, mimeType, sessionId),

        /**
         * Lists all stored attachments, optionally filtered by sessionId.
         * @param {string} [sessionId]
         * @returns {Promise<Array<object>>}
         */
        list: (sessionId) =>
            ipcRenderer.invoke('desktop:attachment:list', sessionId),

        /**
         * Reads an attachment as Base64 for uploading to the API.
         * @param {string} id
         * @returns {Promise<{ success: boolean, id, name, mimeType, size, base64 }>}
         */
        read: (id) =>
            ipcRenderer.invoke('desktop:attachment:read', id),

        /**
         * Removes a single stored attachment.
         * @param {string} id
         * @returns {Promise<{ success: boolean }>}
         */
        remove: (id) =>
            ipcRenderer.invoke('desktop:attachment:remove', id),

        /**
         * Removes all attachments for a completed/cancelled session.
         * @param {string} sessionId
         * @returns {Promise<{ removed: number }>}
         */
        clearSession: (sessionId) =>
            ipcRenderer.invoke('desktop:attachment:clearSession', sessionId),

        /**
         * Opens an attachment in the OS default viewer.
         * @param {string} id
         * @returns {Promise<{ success: boolean, error?: string }>}
         */
        open: (id) =>
            ipcRenderer.invoke('desktop:attachment:open', id),

        /**
         * Returns allowed file types and size limits.
         * @returns {Promise<{ maxFileSizeBytes, maxFileSizeMB, allowedExtensions }>}
         */
        constraints: () =>
            ipcRenderer.invoke('desktop:attachment:constraints'),
    },

    // ── Desktop Accessibility, Zoom & Kiosk Mode (Milestone 30) ──────────────

    accessibility: {
        /**
         * Gets current accessibility, zoom, kiosk and high-contrast status.
         * @returns {Promise<{ zoomFactor: number, minZoom: number, maxZoom: number, isKiosk: boolean, isFullScreen: boolean, highContrast: boolean, invertedColors: boolean, screenReaderEnabled: boolean, platform: string }>}
         */
        getInfo: () =>
            ipcRenderer.invoke('desktop:accessibility:getInfo'),

        /**
         * Gets current window zoom factor (e.g. 1.0 = 100%).
         * @returns {Promise<number>}
         */
        getZoom: () =>
            ipcRenderer.invoke('desktop:accessibility:getZoom'),

        /**
         * Sets window zoom factor (clamped between 0.5 and 3.0).
         * @param {number} factor
         * @returns {Promise<number>}
         */
        setZoom: (factor) =>
            ipcRenderer.invoke('desktop:accessibility:setZoom', factor),

        /**
         * Increments zoom factor by 0.1.
         * @returns {Promise<number>}
         */
        zoomIn: () =>
            ipcRenderer.invoke('desktop:accessibility:zoomIn'),

        /**
         * Decrements zoom factor by 0.1.
         * @returns {Promise<number>}
         */
        zoomOut: () =>
            ipcRenderer.invoke('desktop:accessibility:zoomOut'),

        /**
         * Resets zoom factor to 1.0 (100%).
         * @returns {Promise<number>}
         */
        resetZoom: () =>
            ipcRenderer.invoke('desktop:accessibility:resetZoom'),

        /**
         * Sets or toggles kiosk mode.
         * @param {boolean} [enabled]
         * @returns {Promise<boolean>}
         */
        setKiosk: (enabled) =>
            ipcRenderer.invoke('desktop:accessibility:setKiosk', enabled),

        /**
         * Toggles full-screen mode.
         * @returns {Promise<boolean>}
         */
        toggleFullScreen: () =>
            ipcRenderer.invoke('desktop:accessibility:toggleFullScreen'),

        /**
         * Enables or disables accessibility support in Chromium.
         * @param {boolean} enabled
         * @returns {Promise<boolean>}
         */
        setSupport: (enabled) =>
            ipcRenderer.invoke('desktop:accessibility:setSupport', enabled),

        /**
         * Subscribes to accessibility, zoom or kiosk state change events.
         * @param {(info: object) => void} callback
         * @returns {() => void} Unsubscribe function
         */
        onStateChanged: (callback) => {
            if (typeof callback !== 'function') return () => { };
            const handler = (_event, info) => callback(info);
            ipcRenderer.on('desktop:accessibility:state-changed', handler);
            return () => ipcRenderer.removeListener('desktop:accessibility:state-changed', handler);
        }
    }
});
