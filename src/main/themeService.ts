import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chokidar, { FSWatcher } from 'chokidar';
import { BrowserWindow } from 'electron';
import { getThemesPath } from './platform';
import {
  BUILTIN_THEMES,
  MirageThemeDefinition,
  parseThemeFileJson,
  serializeThemeFile
} from '../shared/themes';

const README_CONTENT = `Mirage Themes
=============

Every *.json file (or symlink to a *.json file) in this directory appears
as a swappable theme in Mirage and hot-reloads whenever modified.

Quick Start:
  1. Copy "basalt.json", "mirage.json", or "_template.json" to "my-theme.json".
  2. Change "id", "name", and the hex colors you want.
  3. Any omitted stepped surface, hairline, or 3D viewport tokens are
     derived automatically from "canvas", "inkPrimary", and "action".

External Generators (Omarchy, Pywal, Matugen, etc.):
  Point your generator's output here, or symlink it into this folder:
    Omarchy: ln -sf ~/.local/state/omarchy/current/theme/mirage.json ~/.config/mirage/themes/omarchy.json
    Pywal:   ln -sf ~/.cache/wal/mirage.json ~/.config/mirage/themes/pywal.json
`;

const MINIMAL_TEMPLATE = {
  id: 'my-custom-theme',
  name: 'Custom Studio',
  description: 'Minimal template: omitted surface, hairline, and viewport tokens auto-derive.',
  author: 'You',
  light: {
    canvas: '#fcfcfd',
    surfaceLowest: '#ffffff',
    inkPrimary: '#181a1b',
    action: '#2cb696'
  },
  dark: {
    canvas: '#1e2123',
    surfaceLowest: '#24282b',
    inkPrimary: '#e7e9eb',
    action: '#41c9b4'
  }
};

let themeWatcher: FSWatcher | null = null;
let reloadTimer: NodeJS.Timeout | null = null;
let seeded = false;

async function writeIfMissing(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content, { encoding: 'utf-8', flag: 'wx' });
  } catch (err: any) {
    if (err?.code !== 'EEXIST') {
      console.warn(`[ThemeService] Could not seed ${filePath}:`, err);
    }
  }
}

/**
 * Ensures `~/.config/mirage/themes/` exists and seeds the built-in themes
 * (including `mirage.json` and the original `basalt.json` template) without
 * ever overwriting user modifications.
 */
export async function seedDefaultThemes(themesDir = getThemesPath()): Promise<void> {
  await fs.mkdir(themesDir, { recursive: true });

  for (const theme of BUILTIN_THEMES) {
    const target = path.join(themesDir, `${theme.id}.json`);
    await writeIfMissing(target, JSON.stringify(serializeThemeFile(theme), null, 2) + '\n');
  }

  await writeIfMissing(
    path.join(themesDir, '_template.json'),
    JSON.stringify(MINIMAL_TEMPLATE, null, 2) + '\n'
  );
  await writeIfMissing(path.join(themesDir, 'README.txt'), README_CONTENT);
  seeded = true;
}

/**
 * Discovers all available themes:
 *   1. Built-in themes (overridden if edited in `~/.config/mirage/themes/<id>.json`)
 *   2. Custom or symlinked `*.json` themes placed in `~/.config/mirage/themes/`
 */
export async function discoverThemes(themesDir = getThemesPath()): Promise<MirageThemeDefinition[]> {
  if (!seeded && themesDir === getThemesPath()) {
    await seedDefaultThemes(themesDir);
  } else {
    await fs.mkdir(themesDir, { recursive: true });
  }

  const themeMap = new Map<string, MirageThemeDefinition>();
  for (const builtin of BUILTIN_THEMES) {
    themeMap.set(builtin.id, {
      ...builtin,
      filePath: path.join(themesDir, `${builtin.id}.json`)
    });
  }

  const builtinIds = new Set(BUILTIN_THEMES.map((t) => t.id));

  try {
    const entries = await fs.readdir(themesDir, { withFileTypes: true });
    const jsonEntries = entries
      .filter(
        (e) =>
          (e.isFile() || e.isSymbolicLink()) &&
          e.name.endsWith('.json') &&
          !e.name.startsWith('_') &&
          !e.name.startsWith('.')
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of jsonEntries) {
      const fullPath = path.join(themesDir, entry.name);
      const fallbackId = path.basename(entry.name, '.json').toLowerCase();
      try {
        const stat = await fs.stat(fullPath);
        if (!stat.isFile()) continue;
        const raw = await fs.readFile(fullPath, 'utf-8');
        const source = builtinIds.has(fallbackId) ? 'builtin' : 'local';
        const parsed = parseThemeFileJson(raw, fallbackId, source, fullPath);
        if (parsed) {
          themeMap.set(parsed.id, {
            ...parsed,
            source: builtinIds.has(parsed.id) ? 'builtin' : 'local'
          });
        }
      } catch {
        // Broken symlink or unreadable file: skip quietly
      }
    }
  } catch (err) {
    console.warn('[ThemeService] Could not scan themes directory:', err);
  }

  return Array.from(themeMap.values());
}

/**
 * Collects `~/.config/mirage/themes/` plus any existing symlink target paths
 * (and their parent directories) so atomic directory swaps (e.g. Omarchy) also
 * trigger hot-reload when symlinked into `themes/`.
 */
async function collectWatchTargets(themesDir: string): Promise<string[]> {
  const targets = new Set<string>([themesDir]);
  try {
    const entries = await fs.readdir(themesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isSymbolicLink() || !entry.name.endsWith('.json')) continue;
      const linkPath = path.join(themesDir, entry.name);
      try {
        const linkDest = await fs.readlink(linkPath);
        const absDest = path.resolve(themesDir, linkDest);
        // Watch the deepest existing ancestor (up to 3 levels) so atomic swaps of
        // parent folders like `current/theme/` are caught too.
        let candidate = absDest;
        for (let i = 0; i < 3; i++) {
          try {
            await fs.access(candidate);
            targets.add(candidate);
          } catch {
            // Target doesn't exist yet; watch its parent if available
          }
          const parent = path.dirname(candidate);
          if (parent === candidate) break;
          candidate = parent;
        }
      } catch {
        // Ignore unreadable symlink
      }
    }
  } catch {
    // Ignore
  }
  return Array.from(targets);
}

/**
 * Watches `~/.config/mirage/themes/` (and resolved symlink targets) so adding,
 * editing, or regenerating a JSON theme hot-swaps Mirage immediately.
 */
export async function startWatchingThemes(getWindow: () => BrowserWindow | null): Promise<void> {
  stopWatchingThemes();

  const themesDir = getThemesPath();
  await seedDefaultThemes(themesDir);

  const watchTargets = await collectWatchTargets(themesDir);

  const scheduleBroadcast = () => {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => {
      reloadTimer = null;
      const win = getWindow();
      if (!win || win.isDestroyed()) return;
      try {
        const themes = await discoverThemes();
        if (!win.isDestroyed()) {
          win.webContents.send('themes:changed', themes);
        }
      } catch (err) {
        console.warn('[ThemeService] Error broadcasting theme update:', err);
      }
    }, 120);
  };

  themeWatcher = chokidar.watch(watchTargets, {
    persistent: true,
    ignoreInitial: true,
    followSymlinks: true,
    depth: 2,
    awaitWriteFinish: {
      stabilityThreshold: 120,
      pollInterval: 50
    }
  });

  themeWatcher.on('error', (err) => {
    console.warn('[ThemeService] Theme watcher warning:', err);
  });

  const handleFsEvent = (changedPath: string) => {
    if (changedPath.endsWith('.json') || path.basename(changedPath) === 'theme.generation') {
      scheduleBroadcast();
    }
  };

  themeWatcher.on('add', (changedPath) => {
    handleFsEvent(changedPath);
    // If a new symlink was dropped directly into themesDir, rebuild watches to follow its target.
    if (path.dirname(changedPath) === themesDir && changedPath.endsWith('.json')) {
      void startWatchingThemes(getWindow);
    }
  });

  themeWatcher.on('change', handleFsEvent);

  themeWatcher.on('unlink', (changedPath) => {
    if (changedPath.endsWith('.json')) {
      scheduleBroadcast();
    }
  });
}

export function stopWatchingThemes(): void {
  if (reloadTimer) {
    clearTimeout(reloadTimer);
    reloadTimer = null;
  }
  if (themeWatcher) {
    themeWatcher.removeAllListeners();
    void themeWatcher.close().catch(() => {});
    themeWatcher = null;
  }
}
