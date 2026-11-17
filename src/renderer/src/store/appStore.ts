import { create } from 'zustand';
import { LibraryEntry } from '../types/library';
import { useViewportStore } from './viewportStore';
import { readMigratedStorage } from '../utils/storageMigration';
import {
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  MirageThemeDefinition,
  getBuiltinTheme,
  tokensToCssVars
} from '../../../shared/themes';

const APP_SETTINGS_KEY = 'mirage-app-settings';
const LEGACY_APP_SETTINGS_KEY = 'sera-app-settings';

export type AppView = 'hub' | 'workbench' | 'library' | 'entryDetail' | 'settings' | 'agent';
export type ThemeMode = 'dark' | 'light' | 'system';
export type FontDensity = 'standard' | 'compact' | 'dense';

export interface AppSettings {
  themeId: string;
  themeMode: ThemeMode;
  fontDensity: FontDensity;
  defaultContactShadows: boolean;
  defaultGroundGrid: boolean;
  defaultAutoRotate: boolean;
  defaultExportFormat: 'webp' | 'png';
}

interface AppState {
  currentView: AppView;
  settings: AppSettings;
  resolvedTheme: 'dark' | 'light';
  availableThemes: MirageThemeDefinition[];
  themesDirPath: string;
  activeTheme: MirageThemeDefinition;
  libraryPath: string;
  activeEntrySlug: string | null;
  activeEntry: LibraryEntry | null;
  selectedEntryForDetail: LibraryEntry | null;
  isAutoSaving: boolean;
  lastAutoSavedAt: string | null;

  workbenchSidebarWidth: number;
  workbenchSidebarPosition: 'left' | 'right';
  isWorkbenchSidebarCollapsed: boolean;
  setWorkbenchSidebarWidth: (width: number) => void;
  setWorkbenchSidebarPosition: (position: 'left' | 'right') => void;
  setWorkbenchSidebarCollapsed: (collapsed: boolean) => void;
  toggleWorkbenchSidebar: () => void;

  /** Whether the global save model modal is open. */
  isSaveModalOpen: boolean;
  openSaveModal: () => void;
  closeSaveModal: () => void;

  /** Whether the global Sharp ORM packer dialog is open. UI state, not model state. */
  isOrmPackerOpen: boolean;
  openOrmPacker: () => void;
  closeOrmPacker: () => void;

  setView: (view: AppView) => void;
  setSelectedEntryForDetail: (entry: LibraryEntry | null) => void;
  setIsAutoSaving: (saving: boolean) => void;
  setLastAutoSavedAt: (time: string | null) => void;
  setThemeId: (themeId: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAvailableThemes: (themes: MirageThemeDefinition[]) => void;
  refreshThemes: () => Promise<void>;
  setFontDensity: (density: FontDensity) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  setLibraryPath: (path: string) => void;
  setActiveEntrySlug: (slug: string | null) => void;
  setActiveEntry: (entry: LibraryEntry | null) => void;
  resolveTheme: () => 'dark' | 'light';
}

const getStoredSettings = (): AppSettings => {
  const defaults: AppSettings = {
    themeId: DEFAULT_THEME_ID,
    themeMode: 'dark',
    fontDensity: 'standard',
    defaultContactShadows: true,
    defaultGroundGrid: true,
    defaultAutoRotate: false,
    defaultExportFormat: 'webp'
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const raw = readMigratedStorage(APP_SETTINGS_KEY, LEGACY_APP_SETTINGS_KEY);
    if (raw) {
      return { ...defaults, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to parse mirage-app-settings:', e);
  }
  return defaults;
};

const getStoredSidebarWidth = (): number => {
  if (typeof window === 'undefined') return 460;
  try {
    const raw = localStorage.getItem('mirage-workbench-sidebar-width');
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 340 && parsed <= 900) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse mirage-workbench-sidebar-width:', e);
  }
  return 460;
};

const getStoredSidebarCollapsed = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('mirage-workbench-sidebar-collapsed') === 'true';
  } catch (e) {
    console.warn('Failed to parse mirage-workbench-sidebar-collapsed:', e);
  }
  return false;
};

const getStoredSidebarPosition = (): 'left' | 'right' => {
  if (typeof window === 'undefined') return 'right';
  try {
    const raw = localStorage.getItem('mirage-workbench-sidebar-position');
    if (raw === 'left' || raw === 'right') return raw;
  } catch (e) {
    console.warn('Failed to parse mirage-workbench-sidebar-position:', e);
  }
  return 'right';
};

const findThemeById = (
  themes: MirageThemeDefinition[],
  themeId: string
): MirageThemeDefinition => {
  return themes.find((t) => t.id === themeId) || getBuiltinTheme(themeId);
};

const resolveModeForTheme = (
  mode: ThemeMode,
  theme?: MirageThemeDefinition
): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  if (mode === 'system') {
    if (theme?.preferredMode) {
      return theme.preferredMode;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
};

const applyThemeToDocument = (
  theme: MirageThemeDefinition,
  mode: ThemeMode
): 'dark' | 'light' => {
  const resolved = resolveModeForTheme(mode, theme);
  if (typeof document === 'undefined') return resolved;

  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.setAttribute('data-theme', theme.id);
  root.style.colorScheme = resolved;

  const palette = resolved === 'dark' ? theme.dark : theme.light;
  const vars = tokensToCssVars(palette);
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }

  if (theme.fonts?.primary) {
    root.style.setProperty('--font-primary', theme.fonts.primary);
  } else {
    root.style.removeProperty('--font-primary');
  }
  if (theme.fonts?.body) {
    root.style.setProperty('--font-body', theme.fonts.body);
  } else {
    root.style.removeProperty('--font-body');
  }
  if (theme.fonts?.mono) {
    root.style.setProperty('--font-mono', theme.fonts.mono);
  } else {
    root.style.removeProperty('--font-mono');
  }

  return resolved;
};

const applyDensityClass = (density: FontDensity) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-density', density);
  }
};

let appSettingsTimeout: any = null;
const persistSettingsToFile = () => {
  if (typeof window === 'undefined' || !window.electronAPI?.updateSettings) return;
  clearTimeout(appSettingsTimeout);
  appSettingsTimeout = setTimeout(async () => {
    try {
      // Only this store's own slice is sent. The main process deep-merges it
      // into the canonical document under a write mutex, so a concurrent
      // viewport-store save can no longer be clobbered by a stale snapshot.
      await window.electronAPI.updateSettings({ ...useAppStore.getState().settings });
    } catch (err) {
      console.warn('[appStore] Error saving settings to disk:', err);
    }
  }, 400);
};

let themesSubscriptionBound = false;

export const initSettingsFromFile = async () => {
  if (typeof window === 'undefined' || !window.electronAPI) return;

  try {
    if (window.electronAPI.listThemes) {
      const [themes, themesPath] = await Promise.all([
        window.electronAPI.listThemes(),
        window.electronAPI.getThemesPath ? window.electronAPI.getThemesPath() : Promise.resolve('')
      ]);
      if (Array.isArray(themes) && themes.length > 0) {
        useAppStore.setState({ themesDirPath: themesPath || '' });
        useAppStore.getState().setAvailableThemes(themes);
      }
      if (!themesSubscriptionBound && window.electronAPI.onThemesChanged) {
        themesSubscriptionBound = true;
        window.electronAPI.onThemesChanged((updatedThemes) => {
          if (Array.isArray(updatedThemes) && updatedThemes.length > 0) {
            useAppStore.getState().setAvailableThemes(updatedThemes);
          }
        });
      }
    }

    if (window.electronAPI.loadSettings) {
      await useViewportStore.getState().loadCustomHdrs();
      const data = await window.electronAPI.loadSettings();
      if (data) {
        useAppStore.getState().updateSettings({
          themeId: data.themeId || DEFAULT_THEME_ID,
          themeMode: data.themeMode,
          fontDensity: data.fontDensity,
          defaultContactShadows: data.defaultContactShadows,
          defaultGroundGrid: data.defaultGroundGrid,
          defaultAutoRotate: data.defaultAutoRotate,
          defaultExportFormat: data.defaultExportFormat
        });
        if (data.viewport) {
          useViewportStore.getState().applyPersistedSettings(data.viewport);
        }
      }
    }
  } catch (err) {
    console.warn('[appStore] Error loading settings from disk:', err);
  }
};

const initialSettings = getStoredSettings();
const initialTheme = findThemeById(BUILTIN_THEMES, initialSettings.themeId);
const initialResolvedTheme = applyThemeToDocument(initialTheme, initialSettings.themeMode);
applyDensityClass(initialSettings.fontDensity);

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'hub',
  settings: initialSettings,
  resolvedTheme: initialResolvedTheme,
  availableThemes: BUILTIN_THEMES,
  themesDirPath: '',
  activeTheme: initialTheme,
  libraryPath: '',
  activeEntrySlug: null,
  activeEntry: null,
  selectedEntryForDetail: null,
  isAutoSaving: false,
  lastAutoSavedAt: null,
  workbenchSidebarWidth: getStoredSidebarWidth(),
  workbenchSidebarPosition: getStoredSidebarPosition(),
  isWorkbenchSidebarCollapsed: getStoredSidebarCollapsed(),
  isSaveModalOpen: false,
  isOrmPackerOpen: false,

  openSaveModal: () => set({ isSaveModalOpen: true }),
  closeSaveModal: () => set({ isSaveModalOpen: false }),
  openOrmPacker: () => set({ isOrmPackerOpen: true }),
  closeOrmPacker: () => set({ isOrmPackerOpen: false }),

  setWorkbenchSidebarPosition: (position: 'left' | 'right') => {
    try {
      localStorage.setItem('mirage-workbench-sidebar-position', position);
    } catch {}
    set({ workbenchSidebarPosition: position });
  },

  setWorkbenchSidebarWidth: (width: number) => {
    const minWidth = 340;
    const maxWidth = Math.max(
      minWidth,
      Math.min(840, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 380)
    );
    const clamped = Math.max(minWidth, Math.min(maxWidth, width));
    try {
      localStorage.setItem('mirage-workbench-sidebar-width', String(clamped));
    } catch {}
    set({ workbenchSidebarWidth: clamped });
  },

  setWorkbenchSidebarCollapsed: (collapsed: boolean) => {
    try {
      localStorage.setItem('mirage-workbench-sidebar-collapsed', String(collapsed));
    } catch {}
    set({ isWorkbenchSidebarCollapsed: collapsed });
  },

  toggleWorkbenchSidebar: () => {
    const next = !get().isWorkbenchSidebarCollapsed;
    try {
      localStorage.setItem('mirage-workbench-sidebar-collapsed', String(next));
    } catch {}
    set({ isWorkbenchSidebarCollapsed: next });
  },

  setView: (view: AppView) => set({ currentView: view }),
  setSelectedEntryForDetail: (entry: LibraryEntry | null) => set({ selectedEntryForDetail: entry }),
  setIsAutoSaving: (saving: boolean) => set({ isAutoSaving: saving }),
  setLastAutoSavedAt: (time: string | null) => set({ lastAutoSavedAt: time }),

  setThemeId: (themeId: string) => {
    const themes = get().availableThemes;
    const targetTheme = findThemeById(themes, themeId);
    const nextMode =
      targetTheme.preferredMode && targetTheme.source === 'local'
        ? 'system'
        : get().settings.themeMode;
    const newSettings = { ...get().settings, themeId: targetTheme.id, themeMode: nextMode };
    try {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {}
    const resolved = applyThemeToDocument(targetTheme, nextMode);
    set({
      settings: newSettings,
      activeTheme: targetTheme,
      resolvedTheme: resolved
    });
    persistSettingsToFile();
  },

  setThemeMode: (mode: ThemeMode) => {
    const newSettings = { ...get().settings, themeMode: mode };
    try {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {}
    const activeTheme = findThemeById(get().availableThemes, newSettings.themeId);
    const resolved = applyThemeToDocument(activeTheme, mode);
    set({ settings: newSettings, activeTheme, resolvedTheme: resolved });
    persistSettingsToFile();
  },

  setAvailableThemes: (themes: MirageThemeDefinition[]) => {
    const currentId = get().settings.themeId;
    const activeTheme = findThemeById(themes, currentId);
    const resolved = applyThemeToDocument(activeTheme, get().settings.themeMode);
    set({
      availableThemes: themes,
      activeTheme,
      resolvedTheme: resolved
    });
  },

  refreshThemes: async () => {
    if (typeof window === 'undefined' || !window.electronAPI?.listThemes) return;
    try {
      const [themes, themesPath] = await Promise.all([
        window.electronAPI.listThemes(),
        window.electronAPI.getThemesPath ? window.electronAPI.getThemesPath() : Promise.resolve('')
      ]);
      if (themesPath) {
        set({ themesDirPath: themesPath });
      }
      if (Array.isArray(themes) && themes.length > 0) {
        get().setAvailableThemes(themes);
      }
    } catch (err) {
      console.warn('[appStore] Error refreshing themes:', err);
    }
  },

  setFontDensity: (density: FontDensity) => {
    const newSettings = { ...get().settings, fontDensity: density };
    try {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {}
    applyDensityClass(density);
    set({ settings: newSettings });
    persistSettingsToFile();
  },

  updateSettings: (partial: Partial<AppSettings>) => {
    const newSettings = { ...get().settings, ...partial };
    try {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {}
    const activeTheme = findThemeById(get().availableThemes, newSettings.themeId);
    const resolved = applyThemeToDocument(activeTheme, newSettings.themeMode);
    if (partial.fontDensity) {
      applyDensityClass(partial.fontDensity);
    }
    set({
      settings: newSettings,
      activeTheme,
      resolvedTheme: resolved
    });
    persistSettingsToFile();
  },

  setLibraryPath: (path: string) => set({ libraryPath: path }),

  setActiveEntrySlug: (slug: string | null) => set({ activeEntrySlug: slug }),

  setActiveEntry: (entry: LibraryEntry | null) =>
    set({
      activeEntry: entry,
      activeEntrySlug: entry ? entry.slug : null
    }),

  resolveTheme: () => {
    const state = get();
    const activeTheme = findThemeById(state.availableThemes, state.settings.themeId);
    const resolved = applyThemeToDocument(activeTheme, state.settings.themeMode);
    set({ activeTheme, resolvedTheme: resolved });
    return resolved;
  }
}));

// Listen to OS prefers-color-scheme changes when in system mode
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const state = useAppStore.getState();
    if (state.settings.themeMode === 'system') {
      state.resolveTheme();
    }
  });
}
