import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => `/mock/${name}`),
    commandLine: {
      appendSwitch: vi.fn()
    }
  }
}));

import {
  SettingsService,
  deepMerge,
  DeepPartial,
  MirageSettings,
  DEFAULT_SETTINGS as CANONICAL_DEFAULT_SETTINGS
} from '../../../main/settingsService';

export interface AppSettings {
  theme: {
    mode: 'dark' | 'light' | 'system';
    fontDensity: 'compact' | 'comfortable';
  };
  viewport: {
    sunElevation: number;
    sunAzimuth: number;
    exposure: number;
    environmentPreset: string;
  };
  general: {
    autoSave: boolean;
    recentFilesLimit: number;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: {
    mode: 'dark',
    fontDensity: 'compact'
  },
  viewport: {
    sunElevation: 30,
    sunAzimuth: 45,
    exposure: 1.0,
    environmentPreset: 'studio'
  },
  general: {
    autoSave: true,
    recentFilesLimit: 10
  }
};

describe('settingsService', () => {
  let testDir: string;
  let settingsFile: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mirage-settings-test-'));
    settingsFile = path.join(testDir, 'settings.json');
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('deepMerge utility', () => {
    it('merges partial nested updates without mutating unrelated keys', () => {
      const original: AppSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      const partial: DeepPartial<AppSettings> = {
        theme: {
          mode: 'light'
        }
      };

      const merged = deepMerge(original, partial);

      expect(merged.theme.mode).toBe('light');
      expect(merged.theme.fontDensity).toBe('compact'); // preserved
      expect(merged.viewport.exposure).toBe(1.0); // preserved
      expect(merged.general.autoSave).toBe(true); // preserved
    });

    it('ignores undefined partial values', () => {
      const original = { a: 1, b: 2 };
      const merged = deepMerge(original, { b: undefined, a: 10 } as any);

      expect(merged).toEqual({ a: 10, b: 2 });
    });
  });

  describe('Atomic persistence mechanics', () => {
    it('performs atomic write and persists settings to disk', async () => {
      const service = new SettingsService(settingsFile, DEFAULT_SETTINGS as any, 0);

      const res = await service.update({
        theme: { mode: 'light' },
        viewport: { exposure: 1.8 }
      } as any);

      expect(res.success).toBe(true);
      expect((res.settings as any).theme.mode).toBe('light');
      expect((res.settings as any).viewport.exposure).toBe(1.8);

      // Verify file on disk exists and contains correct JSON
      const fileExists = await fs.stat(settingsFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      const diskContent = JSON.parse(await fs.readFile(settingsFile, 'utf-8'));
      expect(diskContent.theme.mode).toBe('light');
      expect(diskContent.viewport.exposure).toBe(1.8);

      // Verify temporary file does NOT linger after atomic rename
      const tempExists = await fs.stat(`${settingsFile}.tmp`).then(() => true).catch(() => false);
      expect(tempExists).toBe(false);
    });

    it('preserves existing file if writing to temp file fails', async () => {
      const service = new SettingsService(settingsFile, DEFAULT_SETTINGS as any, 0);

      // Initial valid write
      await service.update({ theme: { mode: 'light' } } as any);
      const initialDiskContent = await fs.readFile(settingsFile, 'utf-8');

      // Create a directory at the temp file path so fs.writeFile fails with EISDIR
      const tempPath = `${settingsFile}.tmp`;
      await fs.mkdir(tempPath);

      // Attempt update: write to temp file will fail with EISDIR
      await service.update({ theme: { mode: 'dark' } } as any);

      // Original file content on disk must remain uncorrupted
      const afterDiskContent = await fs.readFile(settingsFile, 'utf-8');
      expect(afterDiskContent).toBe(initialDiskContent);

      // Clean up the collision directory
      await fs.rmdir(tempPath);
    });

    it('recovers gracefully with defaults when loading corrupted JSON from disk', async () => {
      // Write corrupted JSON to disk
      await fs.writeFile(settingsFile, '{ "theme": { "mode": "dark", BROKEN_JSON', 'utf-8');

      const service = new SettingsService(settingsFile, DEFAULT_SETTINGS as any, 0);
      const loaded = (await service.load()) as any;

      expect(loaded.theme.mode).toBe('dark');
      expect(loaded.viewport.exposure).toBe(1.0);
    });
  });

  describe('Serialized write queue and concurrent updates', () => {
    it('serializes concurrent write requests and preserves all merged updates', async () => {
      const service = new SettingsService(settingsFile, DEFAULT_SETTINGS as any, 0);

      // Fire 5 concurrent updates from different simulated subsystems simultaneously
      const updates = [
        service.update({ theme: { mode: 'light' } } as any),
        service.update({ viewport: { sunElevation: 65 } } as any),
        service.update({ viewport: { sunAzimuth: 180 } } as any),
        service.update({ general: { autoSave: false } } as any),
        service.update({ viewport: { exposure: 2.2 } } as any)
      ];

      const results = await Promise.all(updates);

      // All 5 updates should resolve successfully
      for (const r of results) {
        expect(r.success).toBe(true);
      }

      // Read final disk state
      const finalDiskJson = JSON.parse(await fs.readFile(settingsFile, 'utf-8'));

      expect(finalDiskJson.theme.mode).toBe('light');
      expect(finalDiskJson.viewport.sunElevation).toBe(65);
      expect(finalDiskJson.viewport.sunAzimuth).toBe(180);
      expect(finalDiskJson.general.autoSave).toBe(false);
      expect(finalDiskJson.viewport.exposure).toBe(2.2);

      // In-memory state should also match
      const mem = service.getSettings() as any;
      expect(mem.theme.mode).toBe('light');
      expect(mem.viewport.exposure).toBe(2.2);
    });
  });

  describe('Debounced write and flush mechanics', () => {
    it('coalesces rapid updates with trailing debounce and flushes to disk', async () => {
      const service = new SettingsService(settingsFile, DEFAULT_SETTINGS as any, 50, 200);

      // Send 3 rapid updates
      service.updateSettings({ theme: { mode: 'light' } } as any);
      service.updateSettings({ viewport: { exposure: 1.5 } } as any);
      const lastRes = await service.updateSettings({ general: { autoSave: false } } as any);

      expect(lastRes.success).toBe(true);

      // In-memory state is immediately updated
      const inMem = service.getSettings() as any;
      expect(inMem.theme.mode).toBe('light');
      expect(inMem.viewport.exposure).toBe(1.5);
      expect(inMem.general.autoSave).toBe(false);

      // Manually flush or wait for debounce
      await service.flush();

      // Verify written to disk
      const diskContent = JSON.parse(await fs.readFile(settingsFile, 'utf-8'));
      expect(diskContent.theme.mode).toBe('light');
      expect(diskContent.viewport.exposure).toBe(1.5);
      expect(diskContent.general.autoSave).toBe(false);
    });
  });
});
