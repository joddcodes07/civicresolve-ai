'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const Module = require('node:module');

const electronDirectory = path.resolve(__dirname, '..');

function loadIpcModule(modulePath, serviceModule, serviceMocks) {
  const handlers = new Map();
  const trustedWindow = { isDestroyed: () => false };
  const electronMock = {
    app: {},
    BrowserWindow: {
      fromWebContents: (contents) => contents?.isTestSender ? trustedWindow : null,
    },
    ipcMain: {
      handle: (channel, handler) => handlers.set(channel, handler),
    },
    shell: {},
  };
  const resolvedTarget = require.resolve(modulePath);
  const resolvedService = require.resolve(serviceModule);
  delete require.cache[resolvedTarget];
  delete require.cache[resolvedService];

  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'electron') return electronMock;
    if (parent?.filename === resolvedTarget && request === serviceModule) return serviceMocks;
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const ipcModule = require(resolvedTarget);
    const register = Object.values(ipcModule)[0];
    register();
  } finally {
    Module._load = originalLoad;
  }

  return { handlers, trustedWindow };
}

test('accessibility IPC uses the shared sender validator and serves getInfo', async () => {
  const info = { zoomFactor: 1, isFullScreen: false };
  const { handlers, trustedWindow } = loadIpcModule(
    path.resolve(electronDirectory, 'ipc/accessibility.ipc.cjs'),
    '../services/accessibility.service.cjs',
    { getAccessibilityInfo: (window) => window === trustedWindow ? info : null },
  );
  const getInfo = handlers.get('desktop:accessibility:getInfo');

  assert.deepEqual(await getInfo({
    sender: {
      isTestSender: true,
      getURL: () => '',
      getOwnerBrowserWindow: () => trustedWindow,
    },
  }), info);
  await assert.rejects(
    getInfo({ sender: { isTestSender: false, getOwnerBrowserWindow: () => null } }),
    /Unauthorized IPC sender/,
  );
});

test('attachment IPC rejects an unrecognized sender through the shared validator', async () => {
  const { handlers } = loadIpcModule(
    path.resolve(electronDirectory, 'ipc/attachment.ipc.cjs'),
    '../services/attachment.service.cjs',
    {},
  );
  const constraints = handlers.get('desktop:attachment:constraints');

  await assert.rejects(
    constraints({ sender: { isTestSender: false } }),
    /Unauthorized IPC sender/,
  );
});
