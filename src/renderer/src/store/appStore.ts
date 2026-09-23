import { create } from 'zustand';
import { LibraryEntry } from '../types/library';
import { useViewportStore } from './viewportStore';

export type AppView = 'hub' | 'workbench' | 'library' | 'entryDetail' | 'settings' | 'agent';
export type ThemeMode = 'dark' | 'light' | 'system';
export type FontDensity = 'standard' | 'compact' | 'dense';

export interface AppSettings {
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

  /** Whether the global save piece modal is open. */
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
  setThemeMode: (mode: ThemeMode) => void;
  setFontDensity: (density: FontDensity) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  setLibraryPath: (path: string) => void;
  setActiveEntrySlug: (slug: string | null) => void;
  setActiveEntry: (entry: LibraryEntry | null) => void;
  resolveTheme: () => 'dark' | 'light';
}

const getStoredSettings = (): AppSettings => {
  const defaults: AppSettings = {
    themeMode: 'dark',
    fontDensity: 'standard',
    defaultContactShadows: true,
    defaultGroundGrid: true,
    defaultAutoRotate: false,
    defaultExportFormat: 'webp'
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const raw = localStorage.getItem('sera-app-settings');
    if (raw) {
      return { ...defaults, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to parse sera-app-settings:', e);
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

const resolveThemeClass = (mode: ThemeMode): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  let resolved: 'dark' | 'light' = 'dark';
  if (mode === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    resolved = mode;
  }

  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
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

export const initSettingsFromFile = async () => {
  if (typeof window !== 'undefined' && window.electronAPI?.loadSettings) {
    try {
      await useViewportStore.getState().loadCustomHdrs();
      const data = await window.electronAPI.loadSettings();
      if (data) {
        useAppStore.getState().updateSettings({
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
    } catch (err) {
      console.warn('[appStore] Error loading settings from disk:', err);
    }
  }
};

const initialSettings = getStoredSettings();
const initialResolvedTheme = resolveThemeClass(initialSettings.themeMode);
applyDensityClass(initialSettings.fontDensity);

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'hub',
  settings: initialSettings,
  resolvedTheme: initialResolvedTheme,
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
    const maxWidth = Math.max(minWidth, Math.min(840, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 380));
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

  setThemeMode: (mode: ThemeMode) => {
    const newSettings = { ...get().settings, themeMode: mode };
    localStorage.setItem('sera-app-settings', JSON.stringify(newSettings));
    const resolved = resolveThemeClass(mode);
    set({ settings: newSettings, resolvedTheme: resolved });
    persistSettingsToFile();
  },

  setFontDensity: (density: FontDensity) => {
    const newSettings = { ...get().settings, fontDensity: density };
    localStorage.setItem('sera-app-settings', JSON.stringify(newSettings));
    applyDensityClass(density);
    set({ settings: newSettings });
    persistSettingsToFile();
  },

  updateSettings: (partial: Partial<AppSettings>) => {
    const newSettings = { ...get().settings, ...partial };
    localStorage.setItem('sera-app-settings', JSON.stringify(newSettings));
    if (partial.themeMode) {
      resolveThemeClass(partial.themeMode);
    }
    if (partial.fontDensity) {
      applyDensityClass(partial.fontDensity);
    }
    set({ settings: newSettings });
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
    const mode = get().settings.themeMode;
    const resolved = resolveThemeClass(mode);
    set({ resolvedTheme: resolved });
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
