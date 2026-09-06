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
 * Resolves the standard library storage path adhering to OS conventions:
 * - Linux: $XDG_DATA_HOME/mirage-sera/library (default: ~/.local/share/mirage-sera/library)
 * - Windows: %LOCALAPPDATA%/mirage-sera/library (or %APPDATA%/mirage-sera/library)
 * - macOS: ~/Library/Application Support/mirage-sera/library
 */
export function getLibraryBasePath(): string {
  if (isLinux) {
    const xdgDataHome = process.env.XDG_DATA_HOME;
    if (xdgDataHome) {
      return path.join(xdgDataHome, 'mirage-sera', 'library');
    }
    const home = process.env.HOME || '';
    return path.join(home, '.local', 'share', 'mirage-sera', 'library');
  }

  if (isWindows) {
    const localAppData = process.env.LOCALAPPDATA || process.env.APPDATA;
    if (localAppData) {
      return path.join(localAppData, 'mirage-sera', 'library');
    }
    return path.join(app.getPath('userData'), 'library');
  }

  return path.join(app.getPath('userData'), 'library');
}
