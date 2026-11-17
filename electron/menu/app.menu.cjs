const { app, Menu, shell, nativeTheme } = require('electron');

/**
 * Builds and sets the native operating system application menu.
 * Ensures standard macOS clipboard, windowing, and navigation shortcuts operate properly.
 * @param {boolean} [isDev=false]
 */
function setupApplicationMenu(isDev = false) {
  const isMac = process.platform === 'darwin';

  const sendNavigation = (targetPath) => (item, focusedWindow) => {
    if (focusedWindow && !focusedWindow.isDestroyed()) {
      focusedWindow.webContents.send('desktop:navigate', targetPath);
    }
  };

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Preferences…',
                accelerator: 'CmdOrCtrl+,',
                click: sendNavigation('/admin/settings')
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        ...(!isMac
          ? [
              {
                label: 'Preferences…',
                accelerator: 'CmdOrCtrl+,',
                click: sendNavigation('/admin/settings')
              },
              { type: 'separator' }
            ]
          : []),
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [
                  { role: 'startSpeaking' },
                  { role: 'stopSpeaking' }
                ]
              }
            ]
          : [
              { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll' }
            ])
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Citizen Home',
          accelerator: 'CmdOrCtrl+1',
          click: sendNavigation('/')
        },
        {
          label: 'Lodge Grievance',
          accelerator: 'CmdOrCtrl+2',
          click: sendNavigation('/lodge')
        },
        {
          label: 'Track Complaints',
          accelerator: 'CmdOrCtrl+3',
          click: sendNavigation('/track')
        },
        {
          label: 'Public Map',
          accelerator: 'CmdOrCtrl+4',
          click: sendNavigation('/map')
        },
        {
          label: 'Chat Assistant',
          accelerator: 'CmdOrCtrl+5',
          click: sendNavigation('/chat')
        },
        { type: 'separator' },
        {
          label: 'Officer Queue',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: sendNavigation('/officer')
        },
        {
          label: 'Admin Overview',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: sendNavigation('/admin')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        {
          label: 'Theme',
          submenu: [
            {
              label: 'System Default',
              type: 'radio',
              checked: nativeTheme.themeSource === 'system',
              click: () => {
                nativeTheme.themeSource = 'system';
              }
            },
            {
              label: 'Light Theme',
              type: 'radio',
              checked: nativeTheme.themeSource === 'light',
              click: () => {
                nativeTheme.themeSource = 'light';
              }
            },
            {
              label: 'Dark Theme',
              type: 'radio',
              checked: nativeTheme.themeSource === 'dark',
              click: () => {
                nativeTheme.themeSource = 'dark';
              }
            }
          ]
        },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [{ role: 'close' }])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'CivicResolve AI Overview',
          click: async () => {
            try {
              await shell.openExternal('https://github.com/joddcodes07/civicresolve-ai');
            } catch (err) {
              console.error('Failed to open help link:', err);
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { setupApplicationMenu };
