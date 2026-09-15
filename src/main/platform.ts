import { app, shell } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { spawn } from 'node:child_process';

export const isWindows = process.platform === 'win32';
export const isLinux = process.platform === 'linux';
export const isMacOS = process.platform === 'darwin';

/**
 * Detects whether the current Linux session is running under Wayland.
 */
export function isWaylandSession(): boolean {
  if (!isLinux) return false;
  return Boolean(
    process.env.WAYLAND_DISPLAY ||
    process.env.XDG_SESSION_TYPE === 'wayland' ||
    process.env.XDG_CURRENT_DESKTOP?.toLowerCase().includes('wayland') ||
    process.env.XDG_CURRENT_DESKTOP?.toLowerCase().includes('hyprland') ||
    process.env.HYPRLAND_INSTANCE_SIGNATURE
  );
}

/**
 * Initializes Linux-specific flags for Wayland, Ozone, and dark GTK Portal dialogs.
 */
export function initLinuxPlatformFlags(): void {
  if (!isLinux) return;

  if (isWaylandSession()) {
    app.commandLine.appendSwitch('ozone-platform-hint', 'wayland');
  } else {
    app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
  }

  app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations,UsePortal');

  // Enforce system dark theme portal for native GTK / Qt file chooser dialogs
  if (!process.env.GTK_USE_PORTAL) {
    process.env.GTK_USE_PORTAL = '1';
  }
}

/**
 * Resolves the root application data directory:
 * - Linux: $XDG_DATA_HOME/mirage (default: ~/.local/share/mirage)
 * - Windows: %LOCALAPPDATA%/mirage (or %APPDATA%/mirage)
 * - macOS: ~/Library/Application Support/mirage
 */
export function getMirageDataDir(): string {
  if (isLinux) {
    const xdgDataHome = process.env.XDG_DATA_HOME;
    if (xdgDataHome) {
      return path.join(xdgDataHome, 'mirage');
    }
    const home = process.env.HOME || '';
    return path.join(home, '.local', 'share', 'mirage');
  }

  if (isWindows) {
    const localAppData = process.env.LOCALAPPDATA || process.env.APPDATA;
    if (localAppData) {
      return path.join(localAppData, 'mirage');
    }
    return path.join(app.getPath('userData'), 'mirage');
  }

  const home = process.env.HOME || '';
  return path.join(home, 'Library', 'Application Support', 'mirage');
}

/**
 * Resolves the application cache directory:
 * - Linux: $XDG_CACHE_HOME/mirage (default: ~/.cache/mirage)
 * - Windows: %LOCALAPPDATA%/mirage/cache (or %APPDATA%/mirage/cache)
 * - macOS: ~/Library/Caches/mirage
 */
export function getMirageCacheDir(): string {
  if (isLinux) {
    const xdgCacheHome = process.env.XDG_CACHE_HOME;
    if (xdgCacheHome) {
      return path.join(xdgCacheHome, 'mirage');
    }
    const home = process.env.HOME || '';
    return path.join(home, '.cache', 'mirage');
  }

  if (isWindows) {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      return path.join(localAppData, 'mirage', 'cache');
    }
    const appData = process.env.APPDATA;
    if (appData) {
      return path.join(appData, 'mirage', 'cache');
    }
    try {
      if (app?.getPath) {
        return path.join(app.getPath('temp'), 'mirage', 'cache');
      }
    } catch {
      // Ignore
    }
    return path.join(process.env.TEMP || process.env.TMP || '/tmp', 'mirage-cache');
  }

  const home = process.env.HOME || '';
  return path.join(home, 'Library', 'Caches', 'mirage');
}

/**
 * Resolves the dedicated thumbnails cache directory:
 * - Linux: ~/.cache/mirage/thumbnails
 * - Windows: %LOCALAPPDATA%/mirage/cache/thumbnails
 * - macOS: ~/Library/Caches/mirage/thumbnails
 */
export function getThumbnailsCacheDir(): string {
  return path.join(getMirageCacheDir(), 'thumbnails');
}

/**
 * Resolves legacy application data directory for automatic migration from mirage-sera to mirage.
 */
export function getLegacyMirageDataDir(): string {
  if (isLinux) {
    const xdgDataHome = process.env.XDG_DATA_HOME;
    if (xdgDataHome) {
      return path.join(xdgDataHome, 'mirage-sera');
    }
    const home = process.env.HOME || '';
    return path.join(home, '.local', 'share', 'mirage-sera');
  }

  if (isWindows) {
    const localAppData = process.env.LOCALAPPDATA || process.env.APPDATA;
    if (localAppData) {
      return path.join(localAppData, 'mirage-sera');
    }
    return path.join(app.getPath('userData'), 'mirage-sera');
  }

  const home = process.env.HOME || '';
  return path.join(home, 'Library', 'Application Support', 'mirage-sera');
}

/**
 * Resolves the standard library storage path:
 * ~/.local/share/mirage/library (or Windows/macOS equivalent)
 */
export function getLibraryBasePath(): string {
  return path.join(getMirageDataDir(), 'library');
}

/**
 * Resolves the user keybinds configuration file path:
 * ~/.local/share/mirage/keybinds.json (or Windows/macOS equivalent)
 */
export function getKeybindsPath(): string {
  return path.join(getMirageDataDir(), 'keybinds.json');
}

/**
 * Resolves the user app settings configuration file path:
 * ~/.local/share/mirage/settings.json (or Windows/macOS equivalent)
 */
export function getSettingsPath(): string {
  return path.join(getMirageDataDir(), 'settings.json');
}

/**
 * Safely opens a path in the system file explorer without blocking or freezing the application.
 * Solves Electron issue #47668 on Linux where shell.openPath synchronously waits for xdg-open/file manager.
 */
export async function openPathInSystemExplorer(targetPath: string): Promise<boolean> {
  if (!targetPath || typeof targetPath !== 'string') return false;

  const cleanPath = targetPath.trim();
  if (!cleanPath) return false;

  const resolved = path.resolve(cleanPath);
  let folderToOpen = resolved;

  try {
    const stats = await fs.stat(resolved);
    if (stats.isFile()) {
      folderToOpen = path.dirname(resolved);
    }
  } catch {
    // If target path does not exist, determine if it has a file extension
    try {
      if (path.extname(resolved)) {
        folderToOpen = path.dirname(resolved);
      }
      await fs.mkdir(folderToOpen, { recursive: true });
    } catch {
      folderToOpen = path.dirname(resolved);
    }
  }

  // Linux: Electron 34 shell.openPath/showItemInFolder blocks the main event loop
  // until the file manager window closes (Electron #47668).
  // Spawn detached xdg-open/gio and unref to guarantee immediate non-blocking return.
  if (isLinux) {
    return new Promise<boolean>((resolve) => {
      // Resolves once the process has actually spawned (not once it exits), so
      // the UI stays responsive while still reporting a genuine failure.
      const tryGio = () => {
        try {
          const gio = spawn('gio', ['open', folderToOpen], {
            detached: true,
            stdio: 'ignore'
          });
          gio.once('spawn', () => {
            gio.unref();
            resolve(true);
          });
          gio.once('error', (gioErr) => {
            console.error('[openPathInSystemExplorer] gio open failed:', gioErr);
            resolve(false);
          });
        } catch (err) {
          console.error('[openPathInSystemExplorer] Failed to spawn gio:', err);
          resolve(false);
        }
      };

      try {
        const child = spawn('xdg-open', [folderToOpen], {
          detached: true,
          stdio: 'ignore'
        });

        child.once('spawn', () => {
          child.unref();
          resolve(true);
        });

        child.once('error', (err) => {
          console.warn('[openPathInSystemExplorer] xdg-open error, trying gio open fallback:', err);
          tryGio();
        });
      } catch (err) {
        console.error('[openPathInSystemExplorer] Failed to spawn xdg-open:', err);
        tryGio();
      }
    });
  }

  // macOS: open command detached
  if (isMacOS) {
    return new Promise<boolean>((resolve) => {
      const fallback = () => {
        shell
          .openPath(folderToOpen)
          .then((err) => resolve(!err))
          .catch(() => resolve(false));
      };

      try {
        const child = spawn('open', [folderToOpen], {
          detached: true,
          stdio: 'ignore'
        });
        child.once('spawn', () => {
          child.unref();
          resolve(true);
        });
        child.once('error', () => fallback());
      } catch {
        fallback();
      }
    });
  }

  // Windows: shell.openPath uses ShellExecuteEx non-blocking
  try {
    const errorMsg = await shell.openPath(folderToOpen);
    return !errorMsg;
  } catch (err) {
    console.error('[openPathInSystemExplorer] Windows shell.openPath error:', err);
    return false;
  }
}
