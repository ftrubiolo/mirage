import { create } from 'zustand';

export type EnvironmentPreset =
  | 'city'
  | 'studio'
  | 'warehouse'
  | 'apartment'
  | 'sunset'
  | 'night'
  | 'park'
  | 'lobby';

interface ViewportState {
  viewportTheme: 'dark' | 'light';
  environmentPreset: EnvironmentPreset;
  showEnvironmentBackground: boolean;
  customHdrUrl: string | null;
  customHdrName: string | null;
  autoRotate: boolean;
  showDimensions: boolean;
  showWireframe: boolean;
  showGrid: boolean;
  showContactShadows: boolean;
  environmentIntensity: number;
  resetCameraCounter: number;
  cameraZoomAction: number; // incremented on zoom in (+1) or zoom out (-1)
  
  // Actions
  toggleViewportTheme: () => void;
  setViewportTheme: (theme: 'dark' | 'light') => void;
  setEnvironmentPreset: (preset: EnvironmentPreset) => void;
  toggleEnvironmentBackground: () => void;
  setShowEnvironmentBackground: (val: boolean) => void;
  setCustomHdr: (url: string | null, name: string | null) => void;
  toggleAutoRotate: () => void;
  toggleDimensions: () => void;
  toggleWireframe: () => void;
  toggleGrid: () => void;
  toggleContactShadows: () => void;
  setEnvironmentIntensity: (val: number) => void;
  triggerResetCamera: () => void;
  zoomIn3D: () => void;
  zoomOut3D: () => void;
}

const getInitialViewportTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('sera-viewport-theme') as 'dark' | 'light' | null;
    if (saved === 'dark' || saved === 'light') return saved;
  }
  return 'dark';
};

const getInitialEnvPreset = (): EnvironmentPreset => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('sera-env-preset') as EnvironmentPreset | null;
    if (saved) return saved;
  }
  return 'city';
};

export const useViewportStore = create<ViewportState>((set) => ({
  viewportTheme: getInitialViewportTheme(),
  environmentPreset: getInitialEnvPreset(),
  showEnvironmentBackground: false,
  customHdrUrl: null,
  customHdrName: null,
  autoRotate: false,
  showDimensions: false,
  showWireframe: false,
  showGrid: true,
  showContactShadows: true,
  environmentIntensity: 1.0,
  resetCameraCounter: 0,
  cameraZoomAction: 0,

  toggleViewportTheme: () =>
    set((state) => {
      const next = state.viewportTheme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('sera-viewport-theme', next);
      }
      return { viewportTheme: next };
    }),
  setViewportTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sera-viewport-theme', theme);
    }
    set({ viewportTheme: theme });
  },
  setEnvironmentPreset: (preset) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sera-env-preset', preset);
    }
    set({ environmentPreset: preset, customHdrUrl: null, customHdrName: null });
  },
  toggleEnvironmentBackground: () =>
    set((state) => ({ showEnvironmentBackground: !state.showEnvironmentBackground })),
  setShowEnvironmentBackground: (val) => set({ showEnvironmentBackground: val }),
  setCustomHdr: (url, name) => set({ customHdrUrl: url, customHdrName: name }),
  toggleAutoRotate: () => set((state) => ({ autoRotate: !state.autoRotate })),
  toggleDimensions: () => set((state) => ({ showDimensions: !state.showDimensions })),
  toggleWireframe: () => set((state) => ({ showWireframe: !state.showWireframe })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleContactShadows: () => set((state) => ({ showContactShadows: !state.showContactShadows })),
  setEnvironmentIntensity: (val) => set({ environmentIntensity: val }),
  triggerResetCamera: () => set((state) => ({ resetCameraCounter: state.resetCameraCounter + 1 })),
  zoomIn3D: () => set((state) => ({ cameraZoomAction: state.cameraZoomAction + 1 })),
  zoomOut3D: () => set((state) => ({ cameraZoomAction: state.cameraZoomAction - 1 }))
}));
