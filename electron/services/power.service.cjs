'use strict';

/**
 * Power & System State Monitor Service — Milestone 27
 *
 * Provides OS-level power event detection (sleep/wake, AC/battery, lock/unlock),
 * user idle time detection, and display sleep blockers for mission-critical
 * municipal operations.
 *
 * Capabilities:
 *   • initPowerMonitor(win): Broadcasts power and lock events to the renderer.
 *   • getSystemIdleTime(): Returns current idle duration in seconds.
 *   • getSystemIdleState(threshold): Returns 'active' | 'idle' | 'locked' | 'unknown'.
 *   • isOnBatteryPower(): Returns true if device is operating on battery power.
 *   • startPowerSaveBlocker(type): Prevents display sleep or OS suspension.
 *   • stopPowerSaveBlocker(id): Releases power save blocker.
 *   • cleanUpPowerBlockers(): Clean release of all active blockers on exit.
 */

const { powerMonitor, powerSaveBlocker } = require('electron');

/** @type {Electron.BrowserWindow | null} */
let _mainWindow = null;

// Track active power save blockers created by this application
const _activeBlockers = new Set();

/**
 * Broadcasts a power state change event to the renderer.
 * @param {string} eventName
 */
function broadcast(eventName) {
  if (!_mainWindow || _mainWindow.isDestroyed()) return;
  _mainWindow.webContents.send('desktop:power-state-changed', {
    event: eventName,
    timestamp: new Date().toISOString()
  });
}

/**
 * Initializes power monitor event listeners.
 * @param {Electron.BrowserWindow} mainWindow
 */
function initPowerMonitor(mainWindow) {
  _mainWindow = mainWindow;

  try {
    powerMonitor.on('suspend', () => {
      console.log('[PowerService] System suspending');
      broadcast('suspend');
    });

    powerMonitor.on('resume', () => {
      console.log('[PowerService] System resumed from sleep');
      broadcast('resume');
    });

    powerMonitor.on('on-ac', () => {
      console.log('[PowerService] System connected to AC power');
      broadcast('on-ac');
    });

    powerMonitor.on('on-battery', () => {
      console.log('[PowerService] System switched to battery power');
      broadcast('on-battery');
    });

    powerMonitor.on('lock-screen', () => {
      console.log('[PowerService] System screen locked');
      broadcast('lock-screen');
    });

    powerMonitor.on('unlock-screen', () => {
      console.log('[PowerService] System screen unlocked');
      broadcast('unlock-screen');
    });

    console.log('[PowerService] Power and idle monitor initialized');
  } catch (err) {
    console.error('[PowerService] Failed to attach power monitor listeners:', err);
  }
}

/**
 * Returns current system idle time in seconds.
 * @returns {number}
 */
function getSystemIdleTime() {
  try {
    return powerMonitor.getSystemIdleTime();
  } catch {
    return 0;
  }
}

/**
 * Returns the current idle state for a given threshold in seconds.
 * @param {number} thresholdSeconds Defaults to 60 seconds
 * @returns {'active' | 'idle' | 'locked' | 'unknown'}
 */
function getSystemIdleState(thresholdSeconds = 60) {
  const safeThreshold = Math.max(1, Math.min(Math.floor(Number(thresholdSeconds) || 60), 3600));
  try {
    return powerMonitor.getSystemIdleState(safeThreshold);
  } catch {
    return 'unknown';
  }
}

/**
 * Checks whether device is currently running on battery.
 * @returns {boolean}
 */
function isOnBatteryPower() {
  try {
    return powerMonitor.isOnBatteryPower();
  } catch {
    return false;
  }
}

/**
 * Starts a power save blocker to prevent display sleep or system suspension.
 * @param {'prevent-display-sleep' | 'prevent-app-suspension'} type
 * @returns {number | null} Blocker ID
 */
function startPowerSaveBlocker(type = 'prevent-display-sleep') {
  const safeType = type === 'prevent-app-suspension' ? 'prevent-app-suspension' : 'prevent-display-sleep';

  try {
    const id = powerSaveBlocker.start(safeType);
    _activeBlockers.add(id);
    console.log(`[PowerService] Started power blocker #${id} (${safeType})`);
    return id;
  } catch (err) {
    console.error('[PowerService] Failed to start power save blocker:', err);
    return null;
  }
}

/**
 * Stops an active power save blocker.
 * @param {number} blockerId
 * @returns {boolean}
 */
function stopPowerSaveBlocker(blockerId) {
  const id = Number(blockerId);
  if (!_activeBlockers.has(id)) return false;

  try {
    if (powerSaveBlocker.isStarted(id)) {
      powerSaveBlocker.stop(id);
    }
    _activeBlockers.delete(id);
    console.log(`[PowerService] Stopped power blocker #${id}`);
    return true;
  } catch (err) {
    console.error(`[PowerService] Failed to stop power save blocker #${id}:`, err);
    return false;
  }
}

/**
 * Cleanly releases all power blockers on application exit.
 */
function cleanUpPowerBlockers() {
  for (const id of _activeBlockers) {
    try {
      if (powerSaveBlocker.isStarted(id)) {
        powerSaveBlocker.stop(id);
      }
    } catch {
      /* ignore */
    }
  }
  _activeBlockers.clear();
  _mainWindow = null;
}

module.exports = {
  initPowerMonitor,
  getSystemIdleTime,
  getSystemIdleState,
  isOnBatteryPower,
  startPowerSaveBlocker,
  stopPowerSaveBlocker,
  cleanUpPowerBlockers
};
