const { Menu, MenuItem, shell, clipboard } = require('electron');

/**
 * Builds and displays a contextual menu based on right-click target parameters.
 * @param {Electron.BrowserWindow} window
 * @param {Electron.ContextMenuParams} params
 * @param {boolean} [isDev=false]
 */
function showContextMenu(window, params, isDev = false) {
  if (!window || window.isDestroyed()) return;

  const menu = new Menu();
  const { isEditable, selectionText, linkURL, mediaType, x, y } = params;

  // 1. Text Selection Items
  if (selectionText && selectionText.trim().length > 0) {
    menu.append(
      new MenuItem({
        role: 'copy',
        accelerator: 'CmdOrCtrl+C'
      })
    );

    if (process.platform === 'darwin') {
      menu.append(
        new MenuItem({
          role: 'lookup',
          label: `Look Up "${selectionText.trim().slice(0, 20)}${selectionText.trim().length > 20 ? '…' : ''}"`
        })
      );
    }
  }

  // 2. Editable Field Items (Inputs / Textareas)
  if (isEditable) {
    if (menu.items.length > 0) {
      menu.append(new MenuItem({ type: 'separator' }));
    }

    menu.append(new MenuItem({ role: 'undo' }));
    menu.append(new MenuItem({ role: 'redo' }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({ role: 'cut' }));
    menu.append(new MenuItem({ role: 'copy' }));
    menu.append(new MenuItem({ role: 'paste' }));
    menu.append(new MenuItem({ role: 'selectAll' }));
  }

  // 3. Link Items
  if (linkURL && linkURL.trim().length > 0) {
    if (menu.items.length > 0) {
      menu.append(new MenuItem({ type: 'separator' }));
    }

    menu.append(
      new MenuItem({
        label: 'Open Link in System Browser',
        click: () => {
          try {
            shell.openExternal(linkURL).catch((err) => {
              console.error('[ContextMenu] Failed to open external link:', err);
            });
          } catch (err) {
            console.error('[ContextMenu] Error opening external link:', err);
          }
        }
      })
    );

    menu.append(
      new MenuItem({
        label: 'Copy Link Address',
        click: () => {
          clipboard.writeText(linkURL);
        }
      })
    );
  }

  // 4. Image Items
  if (mediaType === 'image') {
    if (menu.items.length > 0) {
      menu.append(new MenuItem({ type: 'separator' }));
    }

    if (params.srcURL) {
      menu.append(
        new MenuItem({
          label: 'Copy Image Address',
          click: () => {
            clipboard.writeText(params.srcURL);
          }
        })
      );
    }
  }

  // 5. Developer Tools Inspection (in Dev Mode)
  if (isDev) {
    if (menu.items.length > 0) {
      menu.append(new MenuItem({ type: 'separator' }));
    }

    menu.append(
      new MenuItem({
        label: 'Inspect Element',
        click: () => {
          window.webContents.inspectElement(x, y);
        }
      })
    );
  }

  // Only display the context menu if there are relevant actions
  if (menu.items.length > 0) {
    menu.popup({ window, x, y });
  }
}

/**
 * Generates an array of menu item descriptors for testing and inspection.
 * @param {Electron.ContextMenuParams} params
 * @param {boolean} [isDev=false]
 * @returns {Array<{label?: string, role?: string, type?: string}>}
 */
function buildContextMenuTemplate(params, isDev = false) {
  const items = [];
  const { isEditable, selectionText, linkURL, mediaType } = params || {};

  if (selectionText && selectionText.trim().length > 0) {
    items.push({ role: 'copy' });
    if (process.platform === 'darwin') {
      items.push({ role: 'lookup' });
    }
  }

  if (isEditable) {
    if (items.length > 0) items.push({ type: 'separator' });
    items.push(
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' }
    );
  }

  if (linkURL && linkURL.trim().length > 0) {
    if (items.length > 0) items.push({ type: 'separator' });
    items.push({ label: 'Open Link in System Browser' }, { label: 'Copy Link Address' });
  }

  if (mediaType === 'image') {
    if (items.length > 0) items.push({ type: 'separator' });
    if (params.srcURL) {
      items.push({ label: 'Copy Image Address' });
    }
  }

  if (isDev) {
    if (items.length > 0) items.push({ type: 'separator' });
    items.push({ label: 'Inspect Element' });
  }

  return items;
}

module.exports = {
  showContextMenu,
  buildContextMenuTemplate
};
