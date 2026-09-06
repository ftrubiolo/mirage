import { app, BrowserWindow, shell, protocol, nativeTheme } from 'electron';
import * as path from 'node:path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { registerLocalAssetProtocol } from './protocol';
import { registerIpcHandlers } from './ipcHandlers';
import { stopWatching } from './fileWatcher';
import { initLinuxPlatformFlags, isMacOS } from './platform';

let mainWindow: BrowserWindow | null = null;

// Register privileged custom scheme BEFORE app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-asset',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
      stream: true
    }
  }
]);

// Optimize Linux / Wayland windowing and use system portal file dialogs
initLinuxPlatformFlags();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'Mirage — 3D Model & Texture Workbench',
    backgroundColor: '#0f0f11',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Enable smooth Ctrl + / Ctrl - / Ctrl 0 zoom without breaking layout
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control || input.meta) {
      const isPlus =
        input.key === '=' ||
        input.key === '+' ||
        input.code === 'NumpadAdd' ||
        input.code === 'Equal';
      const isMinus =
        input.key === '-' ||
        input.code === 'NumpadSubtract' ||
        input.code === 'Minus';
      const isZero =
        input.key === '0' ||
        input.code === 'Digit0' ||
        input.code === 'Numpad0';

      if (isPlus || isMinus || isZero) {
        event.preventDefault(); // Prevent Chromium double-zoom

        if (input.type === 'keyDown') {
          const currentFactor = mainWindow!.webContents.getZoomFactor();
          if (isPlus) {
            const nextFactor = Math.min(Number((currentFactor + 0.05).toFixed(2)), 1.30);
            mainWindow!.webContents.setZoomFactor(nextFactor);
          } else if (isMinus) {
            const nextFactor = Math.max(Number((currentFactor - 0.05).toFixed(2)), 0.75);
            mainWindow!.webContents.setZoomFactor(nextFactor);
          } else if (isZero) {
            mainWindow!.webContents.setZoomFactor(1.0);
          }
        }
      }
    }
  });

  // Forward console messages to terminal logs for instant diagnosis
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    console.log(`[Renderer ${levels[level] || level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, detailed) => {
    console.error('[Main] Render process gone:', detailed);
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  registerIpcHandlers(mainWindow);

  // HMR for renderer based on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  // Set dark theme for native GTK / Qt file dialogs and window borders
  nativeTheme.themeSource = 'dark';

  registerLocalAssetProtocol();

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.ftrubiolo.mirage');

  // Watch F12 for devtools
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window, { escToCloseWindow: false, zoom: true });
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopWatching();
  if (!isMacOS) {
    app.quit();
  }
});
