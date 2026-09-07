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

export type CameraPreset =
  | 'iso'
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom';

export type LightingPreset =
  | 'studio'
  | 'natural'
  | 'dramatic'
  | 'technical';

export interface ViewportPersistedSettings {
  viewportTheme?: 'dark' | 'light';
  environmentPreset?: EnvironmentPreset;
  showEnvironmentBackground?: boolean;
  environmentIntensity?: number;
  showDimensions?: boolean;
  showWireframe?: boolean;
  showGrid?: boolean;
  showContactShadows?: boolean;
  lightingPreset?: LightingPreset;
  sunAzimuth?: number;
  sunElevation?: number;
  keyLightIntensity?: number;
  ambientLightIntensity?: number;
  fillLightIntensity?: number;
  directionalShadows?: boolean;
  contactShadowOpacity?: number;
  cameraFov?: number;
  isOrthographic?: boolean;
}

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
  cameraZoomAction: number;

  // Camera controls & presets
  cameraPreset: CameraPreset | null;
  cameraPresetCounter: number;
  cameraFov: number;
  isOrthographic: boolean;
  fitToModelCounter: number;

  // Lighting controls & presets
  lightingPreset: LightingPreset;
  sunAzimuth: number; // 0 to 360 degrees
  sunElevation: number; // 10 to 85 degrees
  keyLightIntensity: number;
  ambientLightIntensity: number;
  fillLightIntensity: number;
  directionalShadows: boolean;
  contactShadowOpacity: number;

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

  // Camera Actions
  setCameraPreset: (preset: CameraPreset) => void;
  setCameraFov: (fov: number) => void;
  toggleOrthographic: () => void;
  triggerFitToModel: () => void;

  // Lighting Actions
  setLightingPreset: (preset: LightingPreset) => void;
  setSunAzimuth: (val: number) => void;
  setSunElevation: (val: number) => void;
  setKeyLightIntensity: (val: number) => void;
  setAmbientLightIntensity: (val: number) => void;
  setFillLightIntensity: (val: number) => void;
  toggleDirectionalShadows: () => void;
  setContactShadowOpacity: (val: number) => void;

  // File Persistence
  applyPersistedSettings: (settings: ViewportPersistedSettings) => void;
  getPersistableSettings: () => ViewportPersistedSettings;
}

let syncTimeout: any = null;
const requestSaveSettings = () => {
  if (typeof window === 'undefined' || !window.electronAPI?.saveSettings) return;
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      const current = await window.electronAPI.loadSettings().catch(() => ({}));
      const vp = useViewportStore.getState().getPersistableSettings();
      await window.electronAPI.saveSettings({
        ...current,
        viewport: vp
      });
    } catch (err) {
      console.warn('[ViewportStore] Failed to save settings to disk:', err);
    }
  }, 400);
};

export const useViewportStore = create<ViewportState>((set, get) => ({
  viewportTheme: 'dark',
  environmentPreset: 'city',
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

  // Camera initial state
  cameraPreset: 'iso',
  cameraPresetCounter: 0,
  cameraFov: 50,
  isOrthographic: false,
  fitToModelCounter: 0,

  // Lighting initial state
  lightingPreset: 'studio',
  sunAzimuth: 45,
  sunElevation: 45,
  keyLightIntensity: 1.2,
  ambientLightIntensity: 0.6,
  fillLightIntensity: 0.4,
  directionalShadows: true,
  contactShadowOpacity: 0.4,

  toggleViewportTheme: () => {
    set((state) => ({ viewportTheme: state.viewportTheme === 'dark' ? 'light' : 'dark' }));
    requestSaveSettings();
  },
  setViewportTheme: (theme) => {
    set({ viewportTheme: theme });
    requestSaveSettings();
  },
  setEnvironmentPreset: (preset) => {
    set({ environmentPreset: preset, customHdrUrl: null, customHdrName: null });
    requestSaveSettings();
  },
  toggleEnvironmentBackground: () => {
    set((state) => ({ showEnvironmentBackground: !state.showEnvironmentBackground }));
    requestSaveSettings();
  },
  setShowEnvironmentBackground: (val) => {
    set({ showEnvironmentBackground: val });
    requestSaveSettings();
  },
  setCustomHdr: (url, name) => set({ customHdrUrl: url, customHdrName: name }),
  toggleAutoRotate: () => set((state) => ({ autoRotate: !state.autoRotate })),
  toggleDimensions: () => {
    set((state) => ({ showDimensions: !state.showDimensions }));
    requestSaveSettings();
  },
  toggleWireframe: () => set((state) => ({ showWireframe: !state.showWireframe })),
  toggleGrid: () => {
    set((state) => ({ showGrid: !state.showGrid }));
    requestSaveSettings();
  },
  toggleContactShadows: () => {
    set((state) => ({ showContactShadows: !state.showContactShadows }));
    requestSaveSettings();
  },
  setEnvironmentIntensity: (val) => {
    set({ environmentIntensity: val });
    requestSaveSettings();
  },
  triggerResetCamera: () => set((state) => ({ resetCameraCounter: state.resetCameraCounter + 1 })),
  zoomIn3D: () => set((state) => ({ cameraZoomAction: state.cameraZoomAction + 1 })),
  zoomOut3D: () => set((state) => ({ cameraZoomAction: state.cameraZoomAction - 1 })),

  // Camera Actions
  setCameraPreset: (preset) =>
    set((state) => ({
      cameraPreset: preset,
      cameraPresetCounter: state.cameraPresetCounter + 1
    })),
  setCameraFov: (fov) => {
    set({ cameraFov: Math.max(15, Math.min(90, fov)) });
    requestSaveSettings();
  },
  toggleOrthographic: () => {
    set((state) => ({ isOrthographic: !state.isOrthographic }));
    requestSaveSettings();
  },
  triggerFitToModel: () =>
    set((state) => ({ fitToModelCounter: state.fitToModelCounter + 1 })),

  // Lighting Actions
  setLightingPreset: (preset) => {
    if (preset === 'studio') {
      set({
        lightingPreset: 'studio',
        sunAzimuth: 45,
        sunElevation: 45,
        keyLightIntensity: 1.2,
        ambientLightIntensity: 0.6,
        fillLightIntensity: 0.4,
        directionalShadows: true,
        contactShadowOpacity: 0.4
      });
    } else if (preset === 'natural') {
      set({
        lightingPreset: 'natural',
        sunAzimuth: 65,
        sunElevation: 55,
        keyLightIntensity: 1.6,
        ambientLightIntensity: 0.4,
        fillLightIntensity: 0.3,
        directionalShadows: true,
        contactShadowOpacity: 0.5
      });
    } else if (preset === 'dramatic') {
      set({
        lightingPreset: 'dramatic',
        sunAzimuth: 135,
        sunElevation: 25,
        keyLightIntensity: 2.0,
        ambientLightIntensity: 0.2,
        fillLightIntensity: 0.1,
        directionalShadows: true,
        contactShadowOpacity: 0.6
      });
    } else if (preset === 'technical') {
      set({
        lightingPreset: 'technical',
        sunAzimuth: 0,
        sunElevation: 85,
        keyLightIntensity: 0.8,
        ambientLightIntensity: 1.2,
        fillLightIntensity: 0.8,
        directionalShadows: false,
        contactShadowOpacity: 0.2
      });
    }
    requestSaveSettings();
  },
  setSunAzimuth: (val) => {
    set({ sunAzimuth: ((val % 360) + 360) % 360 });
    requestSaveSettings();
  },
  setSunElevation: (val) => {
    set({ sunElevation: Math.max(10, Math.min(85, val)) });
    requestSaveSettings();
  },
  setKeyLightIntensity: (val) => {
    set({ keyLightIntensity: Math.max(0, Math.min(4, val)) });
    requestSaveSettings();
  },
  setAmbientLightIntensity: (val) => {
    set({ ambientLightIntensity: Math.max(0, Math.min(3, val)) });
    requestSaveSettings();
  },
  setFillLightIntensity: (val) => {
    set({ fillLightIntensity: Math.max(0, Math.min(3, val)) });
    requestSaveSettings();
  },
  toggleDirectionalShadows: () => {
    set((state) => ({ directionalShadows: !state.directionalShadows }));
    requestSaveSettings();
  },
  setContactShadowOpacity: (val) => {
    set({ contactShadowOpacity: Math.max(0, Math.min(1, val)) });
    requestSaveSettings();
  },

  applyPersistedSettings: (settings) => {
    set((state) => ({
      ...state,
      ...(settings.viewportTheme ? { viewportTheme: settings.viewportTheme } : {}),
      ...(settings.environmentPreset ? { environmentPreset: settings.environmentPreset } : {}),
      ...(settings.showEnvironmentBackground !== undefined ? { showEnvironmentBackground: settings.showEnvironmentBackground } : {}),
      ...(settings.environmentIntensity !== undefined ? { environmentIntensity: settings.environmentIntensity } : {}),
      ...(settings.showDimensions !== undefined ? { showDimensions: settings.showDimensions } : {}),
      ...(settings.showWireframe !== undefined ? { showWireframe: settings.showWireframe } : {}),
      ...(settings.showGrid !== undefined ? { showGrid: settings.showGrid } : {}),
      ...(settings.showContactShadows !== undefined ? { showContactShadows: settings.showContactShadows } : {}),
      ...(settings.lightingPreset ? { lightingPreset: settings.lightingPreset } : {}),
      ...(settings.sunAzimuth !== undefined ? { sunAzimuth: settings.sunAzimuth } : {}),
      ...(settings.sunElevation !== undefined ? { sunElevation: settings.sunElevation } : {}),
      ...(settings.keyLightIntensity !== undefined ? { keyLightIntensity: settings.keyLightIntensity } : {}),
      ...(settings.ambientLightIntensity !== undefined ? { ambientLightIntensity: settings.ambientLightIntensity } : {}),
      ...(settings.fillLightIntensity !== undefined ? { fillLightIntensity: settings.fillLightIntensity } : {}),
      ...(settings.directionalShadows !== undefined ? { directionalShadows: settings.directionalShadows } : {}),
      ...(settings.contactShadowOpacity !== undefined ? { contactShadowOpacity: settings.contactShadowOpacity } : {}),
      ...(settings.cameraFov !== undefined ? { cameraFov: settings.cameraFov } : {}),
      ...(settings.isOrthographic !== undefined ? { isOrthographic: settings.isOrthographic } : {})
    }));
  },

  getPersistableSettings: () => {
    const s = get();
    return {
      viewportTheme: s.viewportTheme,
      environmentPreset: s.environmentPreset,
      showEnvironmentBackground: s.showEnvironmentBackground,
      environmentIntensity: s.environmentIntensity,
      showDimensions: s.showDimensions,
      showWireframe: s.showWireframe,
      showGrid: s.showGrid,
      showContactShadows: s.showContactShadows,
      lightingPreset: s.lightingPreset,
      sunAzimuth: s.sunAzimuth,
      sunElevation: s.sunElevation,
      keyLightIntensity: s.keyLightIntensity,
      ambientLightIntensity: s.ambientLightIntensity,
      fillLightIntensity: s.fillLightIntensity,
      directionalShadows: s.directionalShadows,
      contactShadowOpacity: s.contactShadowOpacity,
      cameraFov: s.cameraFov,
      isOrthographic: s.isOrthographic
    };
  }
}));
