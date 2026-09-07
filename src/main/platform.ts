import { app } from 'electron';
import * as path from 'node:path';

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
