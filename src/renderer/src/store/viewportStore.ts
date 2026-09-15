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

export type TransformGizmoMode = 'none' | 'translate' | 'rotate';

export const DEFAULT_TOOLBAR_ITEMS: string[] = [
  'channel-dropdown',
  'overlays',
  'transform-gizmo',
  'theme-toggle',
  'spacer-1',
  'camera-orientation',
  'projection-toggle',
  'fit-model',
  'auto-rotate',
  'spacer-2',
  'environment-hdri',
  'lighting-intensity',
  'snapshot-button'
];

export const DEFAULT_STATUSBAR_ITEMS: string[] = [
  'variant-picker',
  'spacer-sb-1',
  'model-stats'
];

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
  toolbarItems?: string[];
  hiddenToolbarItems?: string[];
  iconOnlyToolbarItems?: string[];
  statusBarItems?: string[];
  hiddenStatusBarItems?: string[];
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

  // Transform Gizmo state
  transformGizmoMode: TransformGizmoMode;
  setTransformGizmoMode: (mode: TransformGizmoMode) => void;

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

  // Toolbar Layout & Reordering Actions
  toolbarItems: string[];
  hiddenToolbarItems: string[];
  iconOnlyToolbarItems: string[];
  reorderToolbarItems: (newOrder: string[]) => void;
  toggleToolbarItemVisibility: (itemId: string) => void;
  setToolbarItemVisibility: (itemId: string, visible: boolean) => void;
  toggleToolbarItemIconOnly: (itemId: string) => void;
  setToolbarItemIconOnly: (itemId: string, iconOnly: boolean) => void;
  setAllToolbarItemsIconOnly: (iconOnly: boolean) => void;
  addToolbarSpacer: (afterId?: string) => void;
  removeToolbarSpacer: (spacerId: string) => void;
  resetToolbarItems: () => void;

  // Status Bar Layout & Reordering Actions
  statusBarItems: string[];
  hiddenStatusBarItems: string[];
  reorderStatusBarItems: (newOrder: string[]) => void;
  toggleStatusBarItemVisibility: (itemId: string) => void;
  setStatusBarItemVisibility: (itemId: string, visible: boolean) => void;
  addStatusBarSpacer: (afterId?: string) => void;
  removeStatusBarSpacer: (spacerId: string) => void;
  resetStatusBarItems: () => void;

  // Cross-Bar Actions
  moveBarItem: (
    itemId: string,
    sourceBar: 'toolbar' | 'statusbar',
    targetBar: 'toolbar' | 'statusbar',
    targetIndex?: number,
    targetItemId?: string,
    position?: 'before' | 'after'
  ) => void;
  moveItemToOtherBar: (itemId: string, currentBar: 'toolbar' | 'statusbar') => void;
  resetAllBars: () => void;

  // File Persistence
  applyPersistedSettings: (settings: ViewportPersistedSettings) => void;
  getPersistableSettings: () => ViewportPersistedSettings;
}

let syncTimeout: any = null;
const requestSaveSettings = () => {
  if (typeof window === 'undefined' || !window.electronAPI?.updateSettings) return;
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      // Sends only the viewport slice; the main process merges it into the
      // canonical document under a write mutex. Reading the whole document
      // first and writing it back would reintroduce a lost-update race.
      const vp = useViewportStore.getState().getPersistableSettings();
      await window.electronAPI.updateSettings({ viewport: vp });
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

  // Transform Gizmo initial state
  transformGizmoMode: 'none',
  setTransformGizmoMode: (mode: TransformGizmoMode) => set({ transformGizmoMode: mode }),

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

  // Toolbar state & actions
  toolbarItems: [...DEFAULT_TOOLBAR_ITEMS],
  hiddenToolbarItems: [],
  iconOnlyToolbarItems: [],
  reorderToolbarItems: (newOrder: string[]) => {
    set({ toolbarItems: newOrder });
    requestSaveSettings();
  },
  toggleToolbarItemVisibility: (itemId: string) => {
    set((state) => {
      const isHidden = state.hiddenToolbarItems.includes(itemId);
      const nextHidden = isHidden
        ? state.hiddenToolbarItems.filter((id) => id !== itemId)
        : [...state.hiddenToolbarItems, itemId];
      return { hiddenToolbarItems: nextHidden };
    });
    requestSaveSettings();
  },
  setToolbarItemVisibility: (itemId: string, visible: boolean) => {
    set((state) => {
      const isHidden = state.hiddenToolbarItems.includes(itemId);
      if (visible && isHidden) {
        return { hiddenToolbarItems: state.hiddenToolbarItems.filter((id) => id !== itemId) };
      }
      if (!visible && !isHidden) {
        return { hiddenToolbarItems: [...state.hiddenToolbarItems, itemId] };
      }
      return state;
    });
    requestSaveSettings();
  },
  toggleToolbarItemIconOnly: (itemId: string) => {
    set((state) => {
      const isIconOnly = state.iconOnlyToolbarItems.includes(itemId);
      const next = isIconOnly
        ? state.iconOnlyToolbarItems.filter((id) => id !== itemId)
        : [...state.iconOnlyToolbarItems, itemId];
      return { iconOnlyToolbarItems: next };
    });
    requestSaveSettings();
  },
  setToolbarItemIconOnly: (itemId: string, iconOnly: boolean) => {
    set((state) => {
      const isIconOnly = state.iconOnlyToolbarItems.includes(itemId);
      if (iconOnly && !isIconOnly) {
        return { iconOnlyToolbarItems: [...state.iconOnlyToolbarItems, itemId] };
      }
      if (!iconOnly && isIconOnly) {
        return { iconOnlyToolbarItems: state.iconOnlyToolbarItems.filter((id) => id !== itemId) };
      }
      return state;
    });
    requestSaveSettings();
  },
  setAllToolbarItemsIconOnly: (iconOnly: boolean) => {
    const allTextItemIds = [
      'channel-dropdown',
      'camera-orientation',
      'environment-hdri',
      'projection-toggle',
      'variant-picker',
      'model-stats'
    ];
    set({
      iconOnlyToolbarItems: iconOnly ? [...allTextItemIds] : []
    });
    requestSaveSettings();
  },
  addToolbarSpacer: (afterId?: string) => {
    set((state) => {
      const newSpacerId = `spacer-${Date.now()}`;
      if (!afterId) {
        return { toolbarItems: [...state.toolbarItems, newSpacerId] };
      }
      const idx = state.toolbarItems.indexOf(afterId);
      if (idx === -1) {
        return { toolbarItems: [...state.toolbarItems, newSpacerId] };
      }
      const next = [...state.toolbarItems];
      next.splice(idx + 1, 0, newSpacerId);
      return { toolbarItems: next };
    });
    requestSaveSettings();
  },
  removeToolbarSpacer: (spacerId: string) => {
    set((state) => ({
      toolbarItems: state.toolbarItems.filter((id) => id !== spacerId),
      hiddenToolbarItems: state.hiddenToolbarItems.filter((id) => id !== spacerId),
      iconOnlyToolbarItems: state.iconOnlyToolbarItems.filter((id) => id !== spacerId)
    }));
    requestSaveSettings();
  },
  resetToolbarItems: () => {
    set({ toolbarItems: [...DEFAULT_TOOLBAR_ITEMS], hiddenToolbarItems: [], iconOnlyToolbarItems: [] });
    requestSaveSettings();
  },

  // Status Bar state & actions
  statusBarItems: [...DEFAULT_STATUSBAR_ITEMS],
  hiddenStatusBarItems: [],
  reorderStatusBarItems: (newOrder: string[]) => {
    set({ statusBarItems: newOrder });
    requestSaveSettings();
  },
  toggleStatusBarItemVisibility: (itemId: string) => {
    set((state) => {
      const isHidden = state.hiddenStatusBarItems.includes(itemId);
      const nextHidden = isHidden
        ? state.hiddenStatusBarItems.filter((id) => id !== itemId)
        : [...state.hiddenStatusBarItems, itemId];
      return { hiddenStatusBarItems: nextHidden };
    });
    requestSaveSettings();
  },
  setStatusBarItemVisibility: (itemId: string, visible: boolean) => {
    set((state) => {
      const isHidden = state.hiddenStatusBarItems.includes(itemId);
      if (visible && isHidden) {
        return { hiddenStatusBarItems: state.hiddenStatusBarItems.filter((id) => id !== itemId) };
      }
      if (!visible && !isHidden) {
        return { hiddenStatusBarItems: [...state.hiddenStatusBarItems, itemId] };
      }
      return state;
    });
    requestSaveSettings();
  },
  addStatusBarSpacer: (afterId?: string) => {
    set((state) => {
      const newSpacerId = `spacer-sb-${Date.now()}`;
      if (!afterId) {
        return { statusBarItems: [...state.statusBarItems, newSpacerId] };
      }
      const idx = state.statusBarItems.indexOf(afterId);
      if (idx === -1) {
        return { statusBarItems: [...state.statusBarItems, newSpacerId] };
      }
      const next = [...state.statusBarItems];
      next.splice(idx + 1, 0, newSpacerId);
      return { statusBarItems: next };
    });
    requestSaveSettings();
  },
  removeStatusBarSpacer: (spacerId: string) => {
    set((state) => ({
      statusBarItems: state.statusBarItems.filter((id) => id !== spacerId),
      hiddenStatusBarItems: state.hiddenStatusBarItems.filter((id) => id !== spacerId),
      iconOnlyToolbarItems: state.iconOnlyToolbarItems.filter((id) => id !== spacerId)
    }));
    requestSaveSettings();
  },
  resetStatusBarItems: () => {
    set({ statusBarItems: [...DEFAULT_STATUSBAR_ITEMS], hiddenStatusBarItems: [] });
    requestSaveSettings();
  },

  // Cross-Bar Actions
  moveBarItem: (itemId, sourceBar, targetBar, targetIndex, targetItemId, position = 'before') => {
    set((state) => {
      const nextToolbar = [...state.toolbarItems];
      const nextStatusBar = [...state.statusBarItems];

      // Remove from source
      if (sourceBar === 'toolbar') {
        const fromIdx = nextToolbar.indexOf(itemId);
        if (fromIdx !== -1) nextToolbar.splice(fromIdx, 1);
      } else {
        const fromIdx = nextStatusBar.indexOf(itemId);
        if (fromIdx !== -1) nextStatusBar.splice(fromIdx, 1);
      }

      // Ensure it's removed if it already existed in target
      const existingInTarget =
        targetBar === 'toolbar' ? nextToolbar.indexOf(itemId) : nextStatusBar.indexOf(itemId);
      if (existingInTarget !== -1) {
        if (targetBar === 'toolbar') nextToolbar.splice(existingInTarget, 1);
        else nextStatusBar.splice(existingInTarget, 1);
      }

      const targetList = targetBar === 'toolbar' ? nextToolbar : nextStatusBar;

      let insertAt: number;
      if (targetItemId) {
        const tIndex = targetList.indexOf(targetItemId);
        if (tIndex !== -1) {
          insertAt = position === 'after' ? tIndex + 1 : tIndex;
        } else {
          insertAt = targetIndex !== undefined ? targetIndex : targetList.length;
        }
      } else if (targetIndex !== undefined) {
        insertAt = targetIndex;
      } else {
        insertAt = targetList.length;
      }

      insertAt = Math.max(0, Math.min(targetList.length, insertAt));
      targetList.splice(insertAt, 0, itemId);

      return {
        toolbarItems: nextToolbar,
        statusBarItems: nextStatusBar
      };
    });
    requestSaveSettings();
  },

  moveItemToOtherBar: (itemId, currentBar) => {
    const targetBar = currentBar === 'toolbar' ? 'statusbar' : 'toolbar';
    const state = get();
    const targetLength =
      targetBar === 'toolbar' ? state.toolbarItems.length : state.statusBarItems.length;
    state.moveBarItem(itemId, currentBar, targetBar, targetLength);
  },

  resetAllBars: () => {
    set({
      toolbarItems: [...DEFAULT_TOOLBAR_ITEMS],
      statusBarItems: [...DEFAULT_STATUSBAR_ITEMS],
      hiddenToolbarItems: [],
      hiddenStatusBarItems: [],
      iconOnlyToolbarItems: []
    });
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
      ...(settings.isOrthographic !== undefined ? { isOrthographic: settings.isOrthographic } : {}),
      ...(settings.toolbarItems && Array.isArray(settings.toolbarItems) ? { toolbarItems: settings.toolbarItems } : {}),
      ...(settings.hiddenToolbarItems && Array.isArray(settings.hiddenToolbarItems) ? { hiddenToolbarItems: settings.hiddenToolbarItems } : {}),
      ...(settings.iconOnlyToolbarItems && Array.isArray(settings.iconOnlyToolbarItems) ? { iconOnlyToolbarItems: settings.iconOnlyToolbarItems } : {}),
      ...(settings.statusBarItems && Array.isArray(settings.statusBarItems) ? { statusBarItems: settings.statusBarItems } : {}),
      ...(settings.hiddenStatusBarItems && Array.isArray(settings.hiddenStatusBarItems) ? { hiddenStatusBarItems: settings.hiddenStatusBarItems } : {})
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
      isOrthographic: s.isOrthographic,
      toolbarItems: s.toolbarItems,
      hiddenToolbarItems: s.hiddenToolbarItems,
      iconOnlyToolbarItems: s.iconOnlyToolbarItems,
      statusBarItems: s.statusBarItems,
      hiddenStatusBarItems: s.hiddenStatusBarItems
    };
  }
}));
