import { create } from 'zustand';
import { LibraryEntry } from '../types/library';

export type AppView = 'hub' | 'workbench' | 'library' | 'entryDetail' | 'settings';
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

  setView: (view: AppView) => set({ currentView: view }),
  setSelectedEntryForDetail: (entry: LibraryEntry | null) => set({ selectedEntryForDetail: entry }),
  setIsAutoSaving: (saving: boolean) => set({ isAutoSaving: saving }),
  setLastAutoSavedAt: (time: string | null) => set({ lastAutoSavedAt: time }),

  setThemeMode: (mode: ThemeMode) => {
    const newSettings = { ...get().settings, themeMode: mode };
    localStorage.setItem('sera-app-settings', JSON.stringify(newSettings));
    const resolved = resolveThemeClass(mode);
    set({ settings: newSettings, resolvedTheme: resolved });
  },

  setFontDensity: (density: FontDensity) => {
    const newSettings = { ...get().settings, fontDensity: density };
    localStorage.setItem('sera-app-settings', JSON.stringify(newSettings));
    applyDensityClass(density);
    set({ settings: newSettings });
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
