const { app, screen } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 850;
const MIN_WIDTH = 1000;
const MIN_HEIGHT = 650;

/**
 * Returns the file path for storing window bounds.
 * @returns {string}
 */
function getStateFilePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

/**
 * Loads the saved window state or returns safe default values.
 * @returns {{ width: number, height: number, x?: number, y?: number, isMaximized: boolean }}
 */
function loadWindowState() {
  const defaults = {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    isMaximized: false
  };

  try {
    const filePath = getStateFilePath();
    if (!fs.existsSync(filePath)) {
      return defaults;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    // Validate dimensions
    const width = Number.isInteger(data.width) && data.width >= MIN_WIDTH ? data.width : DEFAULT_WIDTH;
    const height = Number.isInteger(data.height) && data.height >= MIN_HEIGHT ? data.height : DEFAULT_HEIGHT;
    const isMaximized = Boolean(data.isMaximized);

    // Validate coordinates against connected displays
    let x = Number.isInteger(data.x) ? data.x : undefined;
    let y = Number.isInteger(data.y) ? data.y : undefined;

    if (x !== undefined && y !== undefined) {
      const visibleOnDisplay = screen.getAllDisplays().some((display) => {
        const { bounds } = display;
        return (
          x >= bounds.x - 20 &&
          x < bounds.x + bounds.width - 50 &&
          y >= bounds.y - 20 &&
          y < bounds.y + bounds.height - 50
        );
      });

      if (!visibleOnDisplay) {
        x = undefined;
        y = undefined;
      }
    }

    return {
      width,
      height,
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      x,
      y,
      isMaximized
    };
  } catch (err) {
    console.warn('[Window State] Failed to load saved window state, using defaults:', err.message);
    return defaults;
  }
}

/**
 * Persists the window state to disk.
 * @param {Electron.BrowserWindow} window
 */
function saveWindowState(window) {
  if (!window || window.isDestroyed()) return;

  try {
    const isMaximized = window.isMaximized();
    let bounds;

    if (isMaximized) {
      // If maximized, we preserve normal bounds before maximization
      bounds = window.getNormalBounds ? window.getNormalBounds() : window.getBounds();
    } else {
      bounds = window.getBounds();
    }

    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized
    };

    const filePath = getStateFilePath();
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('[Window State] Failed to save window state:', err.message);
  }
}

/**
 * Tracks window events and debounces saving state.
 * @param {Electron.BrowserWindow} window
 */
function trackWindowState(window) {
  let debounceTimeout = null;

  const debouncedSave = () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      saveWindowState(window);
    }, 500);
  };

  window.on('resize', debouncedSave);
  window.on('move', debouncedSave);
  window.on('close', () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    saveWindowState(window);
  });
}

module.exports = {
  loadWindowState,
  saveWindowState,
  trackWindowState,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  MIN_WIDTH,
  MIN_HEIGHT
};
