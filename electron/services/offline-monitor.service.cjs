'use strict';

/**
 * Offline Monitor Service — Milestone 19
 *
 * Tracks network reachability from the Electron main process and broadcasts
 * connectivity-change events to the renderer so the React app can degrade
 * gracefully when the user is offline.
 *
 * Strategy:
 *   • Primary: probe a lightweight DNS endpoint every POLL_INTERVAL_MS using
 *     Node's net.Socket so the check works without an HTTP round-trip and
 *     does not make any requests to external servers unnecessarily.
 *   • We probe dns.google (8.8.8.8:53) and fall back to Cloudflare (1.1.1.1:53).
 *   • The result is debounced: the status must be stable for DEBOUNCE_TICKS
 *     consecutive polls before it is broadcast to avoid noise from brief dropouts.
 *   • In development (isDev=true) the interval is longer to avoid log spam.
 *
 * Exported API:
 *   initOfflineMonitor(mainWindow)   — start monitoring; call once after window ready
 *   stopOfflineMonitor()             — clean up timers (called on window close)
 *   getConnectivity()                → { online: boolean, since: string }
 */

const net  = require('net');
const { app } = require('electron');

// ─── Configuration ────────────────────────────────────────────────────────────

const POLL_INTERVAL_ONLINE  = 15_000;   // ms between checks when online
const POLL_INTERVAL_OFFLINE = 5_000;    // ms between checks when offline (retry faster)
const PROBE_TIMEOUT         = 4_000;    // ms per DNS probe attempt
const DEBOUNCE_TICKS        = 2;        // consecutive same-result polls before flip
const PROBE_HOSTS = [
  { host: '8.8.8.8',   port: 53 },     // Google Public DNS
  { host: '1.1.1.1',   port: 53 },     // Cloudflare DNS
];

// ─── Internal state ───────────────────────────────────────────────────────────

/** @type {Electron.BrowserWindow | null} */
let _win        = null;
let _timerId    = null;
let _online     = true;          // optimistic initial assumption
let _since      = new Date().toISOString();
let _tickSame   = 0;             // debounce counter
let _pendingResult = null;       // result that hasn't yet been confirmed

// ─── Probe ────────────────────────────────────────────────────────────────────

/**
 * Attempts a TCP connection to one of the probe hosts.
 * Resolves true if the connection succeeds, false otherwise.
 * Tries hosts in order and returns as soon as one succeeds.
 * @returns {Promise<boolean>}
 */
function probeNetwork() {
  return new Promise((resolve) => {
    let idx = 0;

    function tryNext() {
      if (idx >= PROBE_HOSTS.length) {
        resolve(false);
        return;
      }
      const { host, port } = PROBE_HOSTS[idx++];
      const sock = new net.Socket();
      let settled = false;

      const done = (result) => {
        if (settled) return;
        settled = true;
        sock.destroy();
        if (result) {
          resolve(true);
        } else {
          tryNext();
        }
      };

      sock.setTimeout(PROBE_TIMEOUT);
      sock.connect(port, host, () => done(true));
      sock.on('error',   () => done(false));
      sock.on('timeout', () => done(false));
    }

    tryNext();
  });
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

function broadcast() {
  if (!_win || _win.isDestroyed()) return;
  _win.webContents.send('desktop:connectivity-changed', getConnectivity());
}

// ─── Poll loop ────────────────────────────────────────────────────────────────

async function poll() {
  let result;
  try {
    result = await probeNetwork();
  } catch {
    result = false;
  }

  // Debounce: only flip state after DEBOUNCE_TICKS consecutive same results
  if (result === _pendingResult) {
    _tickSame++;
  } else {
    _pendingResult = result;
    _tickSame = 1;
  }

  if (_tickSame >= DEBOUNCE_TICKS && result !== _online) {
    _online = result;
    _since  = new Date().toISOString();
    _tickSame = 0;
    console.log(`[OfflineMonitor] Connectivity changed → ${_online ? 'online' : 'offline'} (since ${_since})`);
    broadcast();
  }

  // Schedule next poll — faster cadence when offline for quicker recovery detection
  const delay = _online ? POLL_INTERVAL_ONLINE : POLL_INTERVAL_OFFLINE;
  _timerId = setTimeout(poll, delay);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the current connectivity snapshot.
 * @returns {{ online: boolean, since: string }}
 */
function getConnectivity() {
  return { online: _online, since: _since };
}

/**
 * Starts the offline monitor.  Should be called once, inside `did-finish-load`,
 * so the renderer is ready to receive the first `desktop:connectivity-changed`
 * push event when the monitor detects a transition.
 *
 * @param {Electron.BrowserWindow} mainWindow
 */
function initOfflineMonitor(mainWindow) {
  _win = mainWindow;

  // Clean up if the window is replaced (e.g. macOS re-create on activate)
  mainWindow.on('closed', () => {
    stopOfflineMonitor();
  });

  // Kick off the first probe immediately (no initial delay)
  if (_timerId) clearTimeout(_timerId);
  _pendingResult = null;
  _tickSame = 0;

  // Run first poll immediately, then schedule cadence from within poll()
  poll().catch((err) => {
    console.error('[OfflineMonitor] Initial probe error:', err);
  });

  console.log('[OfflineMonitor] Started. Probing every', POLL_INTERVAL_ONLINE / 1000, 's (online) /', POLL_INTERVAL_OFFLINE / 1000, 's (offline).');
}

/**
 * Stops the polling timer and releases the window reference.
 * Safe to call multiple times.
 */
function stopOfflineMonitor() {
  if (_timerId) {
    clearTimeout(_timerId);
    _timerId = null;
  }
  _win = null;
  console.log('[OfflineMonitor] Stopped.');
}

module.exports = { initOfflineMonitor, stopOfflineMonitor, getConnectivity };
