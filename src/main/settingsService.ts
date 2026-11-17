import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getSettingsPath, getMirageDataDir } from './platform';

export interface ViewportSettings {
  viewportTheme: string;
  environmentPreset: string;
  lightingPreset: string;
  sunAzimuth: number;
  sunElevation: number;
  keyLightIntensity: number;
  ambientLightIntensity: number;
  fillLightIntensity: number;
  environmentIntensity: number;
  directionalShadows: boolean;
  contactShadowOpacity: number;
  cameraFov: number;
  isOrthographic: boolean;
  showEnvironmentBackground?: boolean;
  showDimensions?: boolean;
  showWireframe?: boolean;
  showGrid?: boolean;
  showContactShadows?: boolean;
  [key: string]: any;
}

export interface MirageSettings {
  themeId: string;
  themeMode: 'dark' | 'light' | 'system';
  fontDensity: 'standard' | 'compact' | 'dense';
  defaultContactShadows: boolean;
  defaultGroundGrid: boolean;
  defaultAutoRotate: boolean;
  defaultExportFormat: 'webp' | 'png';
  viewport: ViewportSettings;
  [key: string]: any;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? T[P]
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

export const DEFAULT_SETTINGS: MirageSettings = {
  themeId: 'mirage',
  themeMode: 'dark',
  fontDensity: 'standard',
  defaultContactShadows: true,
  defaultGroundGrid: true,
  defaultAutoRotate: false,
  defaultExportFormat: 'webp',
  viewport: {
    viewportTheme: 'dark',
    environmentPreset: 'city',
    lightingPreset: 'studio',
    sunAzimuth: 45,
    sunElevation: 45,
    keyLightIntensity: 1.2,
    ambientLightIntensity: 0.6,
    fillLightIntensity: 0.4,
    environmentIntensity: 1.0,
    directionalShadows: true,
    contactShadowOpacity: 0.4,
    cameraFov: 50,
    isOrthographic: false,
    showEnvironmentBackground: true,
    showDimensions: false,
    showWireframe: false,
    showGrid: true,
    showContactShadows: true
  }
};

/**
 * Keys that must never be assigned from a parsed payload: writing them walks
 * the prototype chain and can pollute Object.prototype for the whole process.
 */
const FORBIDDEN_MERGE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Deeply merges source properties into target object.
 * Does not mutate input objects; preserves existing sub-objects unless overridden.
 *
 * Prototype-polluting keys are dropped, and only own enumerable properties are
 * read, so a hostile settings payload cannot reach `Object.prototype`.
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: DeepPartial<T> | Record<string, any>
): T {
  const result: Record<string, any> = { ...target };

  if (!source || typeof source !== 'object') {
    return result as T;
  }

  for (const key of Object.keys(source)) {
    if (FORBIDDEN_MERGE_KEYS.has(key)) {
      console.warn(`[SettingsService] Ignored forbidden settings key: ${key}`);
      continue;
    }

    const sourceVal = (source as any)[key];
    const targetVal = result[key];

    if (sourceVal === undefined) {
      continue;
    }

    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else {
      result[key] = sourceVal;
    }
  }

  return result as T;
}

/**
 * SettingsService provides unified, race-free application settings persistence:
 * - In-memory cache for synchronous access
 * - Serialized write queue (Promise mutex) to prevent concurrent write clobbering
 * - Trailing debounce (350ms) with maxWait ceiling (1500ms) to coalesce rapid updates
 * - Atomic persistence writing to `settings.json.tmp` followed by atomic rename to `settings.json`
 * - Deep merge for partial settings updates
 */
export class SettingsService {
  private static instance: SettingsService | null = null;
  private inMemory: MirageSettings;
  private readonly defaultSettings: MirageSettings;
  private readonly filePath: string;
  private readonly tempFilePath: string;
  private readonly debounceMs: number;
  private readonly maxWaitMs: number;
  private isDirty = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private maxWaitTimer: NodeJS.Timeout | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    filePath?: string,
    defaultSettings: Partial<MirageSettings> = DEFAULT_SETTINGS,
    debounceMs = 0,
    maxWaitMs = 1500
  ) {
    this.filePath = filePath || getSettingsPath();
    this.tempFilePath = `${this.filePath}.tmp`;
    this.debounceMs = debounceMs;
    this.maxWaitMs = maxWaitMs;
    this.defaultSettings = deepMerge(DEFAULT_SETTINGS, defaultSettings) as MirageSettings;
    this.inMemory = JSON.parse(JSON.stringify(this.defaultSettings));
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      // Production instance uses 350ms trailing debounce and canonical storage path
      SettingsService.instance = new SettingsService(getSettingsPath(), DEFAULT_SETTINGS, 350, 1500);
    }
    return SettingsService.instance;
  }

  public getSettingsPath(): string {
    return this.filePath;
  }

  public getDataDir(): string {
    return getMirageDataDir();
  }

  public getSettings(): MirageSettings {
    return JSON.parse(JSON.stringify(this.inMemory));
  }

  /**
   * Loads settings from disk. Falls back to default settings on missing file or parse error.
   */
  public async loadSettings(): Promise<MirageSettings> {
    const parentDir = path.dirname(this.filePath);
    await fs.mkdir(parentDir, { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      this.inMemory = deepMerge(this.defaultSettings, parsed);
      return this.getSettings();
    } catch {
      // File does not exist or JSON corrupted, ensure default settings are written
      try {
        await this.performAtomicWrite(this.inMemory);
      } catch {
        // Suppress initial write error if directory is not writable
      }
      return this.getSettings();
    }
  }

  /**
   * Alias for loadSettings()
   */
  public async load(): Promise<MirageSettings> {
    return this.loadSettings();
  }

  /**
   * Updates in-memory settings with a partial object, deep-merges, and schedules atomic write.
   */
  public async updateSettings(
    partial: DeepPartial<MirageSettings>
  ): Promise<{ success: boolean; settings: MirageSettings }> {
    this.inMemory = deepMerge(this.inMemory, partial);
    this.isDirty = true;
    const snapshot = this.getSettings();

    if (this.debounceMs <= 0) {
      await this.flush();
    } else {
      this.scheduleDebouncedFlush();
    }

    return {
      success: true,
      settings: snapshot
    };
  }

  /**
   * Alias for updateSettings()
   */
  public async update(
    partial: DeepPartial<MirageSettings>
  ): Promise<{ success: boolean; settings: MirageSettings }> {
    return this.updateSettings(partial);
  }

  /**
   * Saves full or partial settings object and flushes to disk.
   */
  public async saveSettings(settings: any): Promise<boolean> {
    if (!settings || typeof settings !== 'object') {
      return false;
    }
    this.inMemory = deepMerge(this.inMemory, settings);
    this.isDirty = true;
    await this.flush();
    return true;
  }

  /**
   * Immediately flushes any pending debounced writes through the serialized mutex queue.
   */
  public async flush(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
    if (!this.isDirty) {
      return;
    }

    this.isDirty = false;
    const snapshot = this.getSettings();

    this.writeQueue = this.writeQueue
      .then(async () => {
        await this.performAtomicWrite(snapshot);
      })
      .catch((err) => {
        console.error('[SettingsService] Serialized write error:', err);
      });

    await this.writeQueue;
  }

  private scheduleDebouncedFlush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (!this.maxWaitTimer) {
      this.maxWaitTimer = setTimeout(() => {
        this.flush().catch(() => {});
      }, this.maxWaitMs);
    }
    this.debounceTimer = setTimeout(() => {
      this.flush().catch(() => {});
    }, this.debounceMs);
  }

  private async performAtomicWrite(snapshot: MirageSettings): Promise<void> {
    const parentDir = path.dirname(this.filePath);
    await fs.mkdir(parentDir, { recursive: true });

    const payload = JSON.stringify(snapshot, null, 2);

    // Write to .tmp file first
    await fs.writeFile(this.tempFilePath, payload, 'utf-8');

    // Atomically rename .tmp over canonical settings.json
    try {
      await fs.rename(this.tempFilePath, this.filePath);
    } catch (err: any) {
      if (process.platform === 'win32' && (err.code === 'EPERM' || err.code === 'EBUSY')) {
        let renamed = false;
        for (let i = 0; i < 5; i++) {
          await new Promise((r) => setTimeout(r, 50 * (i + 1)));
          try {
            await fs.rename(this.tempFilePath, this.filePath);
            renamed = true;
            break;
          } catch {}
        }
        if (!renamed) {
          await fs.unlink(this.tempFilePath).catch(() => {});
          throw err;
        }
      } else {
        await fs.unlink(this.tempFilePath).catch(() => {});
        throw err;
      }
    }
  }
}
