import { app, BrowserWindow, shell, protocol, nativeTheme, session } from 'electron';
import * as path from 'node:path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { registerLocalAssetProtocol } from './protocol';
import { registerIpcHandlers, setTargetWindow, shutdownIpcResources } from './ipcHandlers';
import { stopWatching } from './fileWatcher';
import { initLinuxPlatformFlags, isMacOS } from './platform';
import { initAccessPolicy } from './accessPolicy';

let mainWindow: BrowserWindow | null = null;

// Register privileged custom scheme BEFORE app is ready.
//
// `bypassCSP` is deliberately NOT granted: the local-asset scheme is confined to
// approved roots in `accessPolicy`, and it must not also be able to sidestep the
// content security policy. `corsEnabled` stays because the renderer page lives
// on a different origin (http://localhost in dev, file:// when packaged) and
// three.js fetches .glb/.hdr through this scheme.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-asset',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

/**
 * Content Security Policy applied in packaged builds.
 *
 * Dev mode is exempt because Vite's HMR client requires `eval` and inline
 * scripts; imposing this policy there would break hot reload rather than add
 * security.
 */
const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Tailwind injects a stylesheet at runtime; Google Fonts serves the webfont CSS.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Asset streaming through the custom scheme, plus generated previews.
  "img-src 'self' data: blob: local-asset:",
  "media-src 'self' data: blob: local-asset:",
  // Provider endpoints are user-configurable, so both schemes are permitted here.
  "connect-src 'self' data: blob: local-asset: https: http:",
  // DRACO decoder and canvas processing workers.
  "worker-src 'self' blob:",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ');

function applyContentSecurityPolicy(): void {
  if (is.dev) return;
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [PRODUCTION_CSP]
      }
    });
  });
}

/** Only these schemes may be handed to the operating system. */
const EXTERNAL_PROTOCOL_ALLOWLIST = new Set(['http:', 'https:', 'mailto:']);

function openExternalIfAllowed(rawUrl: string): void {
  try {
    const parsed = new URL(rawUrl);
    if (!EXTERNAL_PROTOCOL_ALLOWLIST.has(parsed.protocol)) {
      console.warn('[Main] Blocked openExternal for disallowed scheme:', parsed.protocol);
      return;
    }
    void shell.openExternal(parsed.toString());
  } catch {
    console.warn('[Main] Blocked openExternal for unparseable URL');
  }
}

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
      // The renderer parses untrusted 3D/2D asset binaries. It must not share a
      // process-level Node context with the preload.
      sandbox: true,
      contextIsolation: true,
      webSecurity: true,
      nodeIntegration: false,
      spellcheck: false
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
          const contents = mainWindow?.webContents;
          if (!contents) return;
          const currentFactor = contents.getZoomFactor();
          if (isPlus) {
            const nextFactor = Math.min(Number((currentFactor + 0.05).toFixed(2)), 1.30);
            contents.setZoomFactor(nextFactor);
          } else if (isMinus) {
            const nextFactor = Math.max(Number((currentFactor - 0.05).toFixed(2)), 0.75);
            contents.setZoomFactor(nextFactor);
          } else if (isZero) {
            contents.setZoomFactor(1.0);
          }
        }
      }
    }
  });

  // Forward renderer logs to the terminal. In production only warnings and
  // errors are relayed, so a chatty renderer cannot flood the console.
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (!is.dev && level < 2) return;
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    console.log(`[Renderer ${levels[level] || level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, detailed) => {
    console.error('[Main] Render process gone:', detailed);
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    openExternalIfAllowed(details.url);
    return { action: 'deny' };
  });

  // Block in-page navigation away from the app shell.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL();
    if (current && url !== current) {
      event.preventDefault();
      console.warn('[Main] Blocked in-app navigation to:', url);
    }
  });

  setTargetWindow(mainWindow);
  registerIpcHandlers(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
    setTargetWindow(null);
  });

  // HMR for renderer based on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

// Two concurrent instances would race on settings.json and each spawn their own
// file watchers and MCP child processes.
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });

  app.whenReady().then(async () => {
    // Set dark theme for native GTK / Qt file dialogs and window borders
    nativeTheme.themeSource = 'dark';

    // Filesystem policy must be in place before any handler or protocol can be used.
    await initAccessPolicy();

    applyContentSecurityPolicy();
    registerLocalAssetProtocol();

    // Set app user model id for windows
    electronApp.setAppUserModelId('com.ftrubolio.mirage');

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

  // Flush pending settings and stop child processes before exiting. Without
  // this, the debounced settings write is lost and MCP/sharp children outlive
  // the app.
  //
  // The teardown is bounded: quitting must never be blockable by a child
  // process that refuses to close. If cleanup does not finish in time the app
  // exits anyway.
  const TEARDOWN_TIMEOUT_MS = 3000;
  let teardownDone = false;

  app.on('before-quit', (event) => {
    if (teardownDone) return;
    event.preventDefault();

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      teardownDone = true;
      app.quit();
    };

    const timeout = setTimeout(() => {
      console.warn('[Main] Teardown timed out; quitting anyway.');
      finish();
    }, TEARDOWN_TIMEOUT_MS);

    stopWatching();
    void shutdownIpcResources()
      .catch((err) => console.warn('[Main] Teardown error:', err))
      .finally(() => {
        clearTimeout(timeout);
        finish();
      });
  });
}
