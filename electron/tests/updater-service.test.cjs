'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Module = require('node:module');

const updaterModulePath = path.resolve(__dirname, '../services/updater.service.cjs');

function loadUpdaterService(resourcesPath) {
  const calls = { checks: 0, statuses: [], listeners: new Map() };
  const app = { isPackaged: true, getVersion: () => '1.0.0' };
  const autoUpdater = {
    on: (event, listener) => calls.listeners.set(event, listener),
    checkForUpdatesAndNotify: () => { calls.checks += 1; return Promise.resolve(); },
    quitAndInstall: () => {},
  };
  const previousResourcesPath = Object.getOwnPropertyDescriptor(process, 'resourcesPath');
  Object.defineProperty(process, 'resourcesPath', { configurable: true, value: resourcesPath });
  delete require.cache[updaterModulePath];

  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'electron') return { app };
    if (request === 'electron-updater') return { autoUpdater };
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const service = require(updaterModulePath);
    return {
      ...service,
      calls,
      window: {
        isDestroyed: () => false,
        webContents: { send: (channel, payload) => calls.statuses.push({ channel, payload }) },
      },
      restore() {
        delete require.cache[updaterModulePath];
        if (previousResourcesPath) Object.defineProperty(process, 'resourcesPath', previousResourcesPath);
        else delete process.resourcesPath;
      },
    };
  } finally {
    Module._load = originalLoad;
    if (!require.cache[updaterModulePath]) {
      if (previousResourcesPath) Object.defineProperty(process, 'resourcesPath', previousResourcesPath);
      else delete process.resourcesPath;
    }
  }
}

test('missing packaged updater metadata skips startup and manual checks', (t) => {
  const resourcesPath = fs.mkdtempSync(path.join(os.tmpdir(), 'civicresolve-updater-no-provider-'));
  t.after(() => fs.rmSync(resourcesPath, { recursive: true, force: true }));
  const service = loadUpdaterService(resourcesPath);
  t.after(service.restore);

  const scheduled = [];
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = (callback, delay) => { scheduled.push({ callback, delay }); return 0; };
  try {
    service.initUpdater(service.window);
  } finally {
    global.setTimeout = originalSetTimeout;
  }

  service.checkForUpdate();
  assert.deepEqual(scheduled, []);
  assert.equal(service.calls.checks, 0);
  assert.deepEqual(service.calls.statuses.at(-1), {
    channel: 'desktop:update-status',
    payload: { status: 'not-available', version: '1.0.0' },
  });
});

test('configured packaged updater metadata preserves automatic checks', () => {
  const resourcesPath = fs.mkdtempSync(path.join(os.tmpdir(), 'civicresolve-updater-provider-'));
  try {
    fs.writeFileSync(path.join(resourcesPath, 'app-update.yml'), 'provider: github\nowner: test\nrepo: app\n');
    const service = loadUpdaterService(resourcesPath);
    try {
      const scheduled = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = (callback, delay) => { scheduled.push({ callback, delay }); return 0; };
      try {
        service.initUpdater(service.window);
      } finally {
        global.setTimeout = originalSetTimeout;
      }

      service.checkForUpdate();
      assert.equal(scheduled.length, 1);
      assert.equal(scheduled[0].delay, 10_000);
      assert.equal(service.calls.checks, 1);
    } finally {
      service.restore();
    }
  } finally {
    fs.rmSync(resourcesPath, { recursive: true, force: true });
  }
});
