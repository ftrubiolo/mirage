import { create } from 'zustand';
import { EntryVariantMapSlot } from '../types/library';

export type DebugChannel = 'lit' | 'albedo' | 'normal' | 'roughness' | 'metalness' | 'ao' | 'emissive' | 'wireframe';

export type SlotName =
  | 'baseColor'
  | 'normal'
  | 'orm'
  | 'metalRoughness'
  | 'ao'
  | 'roughness'
  | 'metalness'
  | 'emissive'
  | 'clearcoat'
  | 'sheen'
  | 'transmission'
  | 'alpha'
  | 'displacement';

export const ALL_SLOT_NAMES: SlotName[] = [
  'baseColor',
  'normal',
  'orm',
  'metalRoughness',
  'ao',
  'roughness',
  'metalness',
  'emissive',
  'clearcoat',
  'sheen',
  'transmission',
  'alpha',
  'displacement'
];

export interface PbrSlotMap {
  url: string | null;
  filePath: string | null;
  fileName: string | null;
  fileSize: number;
}

export const emptySlot: PbrSlotMap = {
  url: null,
  filePath: null,
  fileName: null,
  fileSize: 0
};

export const createDefaultSlotEnabled = (): Record<SlotName, boolean> => ({
  baseColor: true,
  normal: true,
  orm: true,
  metalRoughness: true,
  ao: true,
  roughness: true,
  metalness: true,
  emissive: true,
  clearcoat: true,
  sheen: true,
  transmission: true,
  alpha: true,
  displacement: true
});

export interface PbrMaterialParameters {
  normalScale: number;
  normalInvertY: boolean;
  roughnessFactor: number;
  metalnessFactor: number;
  aoIntensity: number;
  emissiveIntensity: number;
  emissiveColor: string;
  emissiveFullGlow: boolean;
  clearcoatFactor: number;
  clearcoatRoughness: number;
  sheenColor: string;
  sheenRoughness: number;
  transmissionFactor: number;
  ior: number;
  displacementScale: number;
}

export const defaultPbrParameters: PbrMaterialParameters = {
  normalScale: 1.0,
  normalInvertY: false,
  roughnessFactor: 1.0,
  metalnessFactor: 1.0,
  aoIntensity: 1.0,
  emissiveIntensity: 1.0,
  emissiveColor: '#ffffff',
  emissiveFullGlow: false,
  clearcoatFactor: 0.0,
  clearcoatRoughness: 0.1,
  sheenColor: '#ffffff',
  sheenRoughness: 0.5,
  transmissionFactor: 0.0,
  ior: 1.5,
  displacementScale: 0.02
};

export type MaterialPackingMode = 'orm' | 'metalRoughness' | 'separate';

export interface SingleMaterialSlotData extends PbrMaterialParameters {
  baseColorMap: PbrSlotMap;
  normalMap: PbrSlotMap;
  ormMap: PbrSlotMap;
  metalRoughnessMap: PbrSlotMap;
  aoMap: PbrSlotMap;
  roughnessMap: PbrSlotMap;
  metalnessMap: PbrSlotMap;
  emissiveMap: PbrSlotMap;
  clearcoatMap: PbrSlotMap;
  sheenMap: PbrSlotMap;
  transmissionMap: PbrSlotMap;
  alphaMap: PbrSlotMap;
  displacementMap: PbrSlotMap;
  slotEnabled: Record<SlotName, boolean>;
  useOrmPack: boolean;
  materialPackingMode: MaterialPackingMode;
  loadFromCache: boolean;
}

export interface PbrMaterialState extends PbrMaterialParameters {
  baseColorMap: PbrSlotMap;
  normalMap: PbrSlotMap;
  ormMap: PbrSlotMap;
  metalRoughnessMap: PbrSlotMap;
  aoMap: PbrSlotMap;
  roughnessMap: PbrSlotMap;
  metalnessMap: PbrSlotMap;
  emissiveMap: PbrSlotMap;
  clearcoatMap: PbrSlotMap;
  sheenMap: PbrSlotMap;
  transmissionMap: PbrSlotMap;
  alphaMap: PbrSlotMap;
  displacementMap: PbrSlotMap;

  slotEnabled: Record<SlotName, boolean>;
  useOrmPack: boolean;
  materialPackingMode: MaterialPackingMode;
  loadFromCache: boolean;
  debugChannel: DebugChannel;
  activeMapsCount: number;

  activeMaterialName: string | null;
  materialsState: Record<string, SingleMaterialSlotData>;

  setActiveMaterial: (name: string | null) => void;
  syncMaterialSlots: (materialNames: string[]) => void;

  setPbrProperty: <K extends keyof PbrMaterialParameters>(key: K, value: PbrMaterialParameters[K]) => void;

  setMapSlot: (slot: SlotName, data: PbrSlotMap) => void;
  clearMapSlot: (slot: SlotName) => void;
  setSlotEnabled: (slot: SlotName, enabled: boolean) => void;
  toggleSlotEnabled: (slot: SlotName) => void;
  setUseOrmPack: (val: boolean) => void;
  setMaterialPackingMode: (mode: MaterialPackingMode) => void;
  setLoadFromCache: (val: boolean) => void;
  toggleLoadFromCache: () => void;
  setDebugChannel: (channel: DebugChannel) => void;
  applyVariantMaterialState: (
    maps: Record<string, EntryVariantMapSlot>,
    slotEnabled?: Partial<Record<string, boolean>>,
    settings?: Partial<PbrMaterialParameters & { useOrmPack?: boolean; materialPackingMode?: MaterialPackingMode }>
  ) => void;
  resetPbrMaterials: () => void;
}

export const countActiveMaps = (state: any): number => {
  return ALL_SLOT_NAMES.filter((s) => {
    const isEnabled = state.slotEnabled ? (state.slotEnabled[s] ?? true) : true;
    return isEnabled && Boolean(state[`${s}Map`]?.url || state[`${s}Map`]?.filePath);
  }).length;
};

export const initialPbrMaps = {
  baseColorMap: { ...emptySlot },
  normalMap: { ...emptySlot },
  ormMap: { ...emptySlot },
  metalRoughnessMap: { ...emptySlot },
  aoMap: { ...emptySlot },
  roughnessMap: { ...emptySlot },
  metalnessMap: { ...emptySlot },
  emissiveMap: { ...emptySlot },
  clearcoatMap: { ...emptySlot },
  sheenMap: { ...emptySlot },
  transmissionMap: { ...emptySlot },
  alphaMap: { ...emptySlot },
  displacementMap: { ...emptySlot }
};

export const createDefaultMaterialSlotData = (): SingleMaterialSlotData => ({
  ...defaultPbrParameters,
  ...initialPbrMaps,
  slotEnabled: createDefaultSlotEnabled(),
  useOrmPack: true,
  materialPackingMode: 'orm',
  loadFromCache: false
});

export const extractCurrentMaterialSlotData = (state: PbrMaterialState): SingleMaterialSlotData => ({
  baseColorMap: state.baseColorMap,
  normalMap: state.normalMap,
  ormMap: state.ormMap,
  metalRoughnessMap: state.metalRoughnessMap,
  aoMap: state.aoMap,
  roughnessMap: state.roughnessMap,
  metalnessMap: state.metalnessMap,
  emissiveMap: state.emissiveMap,
  clearcoatMap: state.clearcoatMap,
  sheenMap: state.sheenMap,
  transmissionMap: state.transmissionMap,
  alphaMap: state.alphaMap,
  displacementMap: state.displacementMap,
  slotEnabled: { ...state.slotEnabled },
  useOrmPack: state.useOrmPack,
  materialPackingMode: state.materialPackingMode,
  loadFromCache: state.loadFromCache,
  normalScale: state.normalScale,
  normalInvertY: state.normalInvertY,
  roughnessFactor: state.roughnessFactor,
  metalnessFactor: state.metalnessFactor,
  aoIntensity: state.aoIntensity,
  emissiveIntensity: state.emissiveIntensity,
  emissiveColor: state.emissiveColor,
  emissiveFullGlow: state.emissiveFullGlow,
  clearcoatFactor: state.clearcoatFactor,
  clearcoatRoughness: state.clearcoatRoughness,
  sheenColor: state.sheenColor,
  sheenRoughness: state.sheenRoughness,
  transmissionFactor: state.transmissionFactor,
  ior: state.ior,
  displacementScale: state.displacementScale
});

export const usePbrMaterialStore = create<PbrMaterialState>((set, get) => ({
  ...defaultPbrParameters,
  ...initialPbrMaps,
  slotEnabled: createDefaultSlotEnabled(),
  useOrmPack: true,
  materialPackingMode: 'orm',
  loadFromCache: false,
  debugChannel: 'lit',
  activeMapsCount: 0,

  activeMaterialName: null,
  materialsState: {},

  setActiveMaterial: (name) => {
    set((state) => {
      if (state.activeMaterialName === name) return state;

      const updatedMaterialsState = { ...state.materialsState };
      if (state.activeMaterialName) {
        updatedMaterialsState[state.activeMaterialName] = extractCurrentMaterialSlotData(state);
      }

      if (!name) {
        return {
          activeMaterialName: null,
          materialsState: updatedMaterialsState
        };
      }

      const targetSlotData = updatedMaterialsState[name] || createDefaultMaterialSlotData();
      updatedMaterialsState[name] = targetSlotData;
      const count = countActiveMaps(targetSlotData);

      return {
        activeMaterialName: name,
        materialsState: updatedMaterialsState,
        ...targetSlotData,
        activeMapsCount: count
      };
    });
  },

  syncMaterialSlots: (materialNames) => {
    set((state) => {
      if (!materialNames || materialNames.length <= 1) {
        return {
          activeMaterialName: null,
          materialsState: {}
        };
      }

      const nextMaterialsState: Record<string, SingleMaterialSlotData> = {};
      for (const name of materialNames) {
        if (state.materialsState[name]) {
          nextMaterialsState[name] = state.materialsState[name];
        } else if (name === materialNames[0] && state.activeMaterialName === null) {
          nextMaterialsState[name] = extractCurrentMaterialSlotData(state);
        } else {
          nextMaterialsState[name] = createDefaultMaterialSlotData();
        }
      }

      const nextActive = state.activeMaterialName && materialNames.includes(state.activeMaterialName)
        ? state.activeMaterialName
        : materialNames[0];

      const targetSlotData = nextMaterialsState[nextActive] || createDefaultMaterialSlotData();
      const count = countActiveMaps(targetSlotData);

      return {
        activeMaterialName: nextActive,
        materialsState: nextMaterialsState,
        ...targetSlotData,
        activeMapsCount: count
      };
    });
  },

  setPbrProperty: (key, value) => {
    set((state) => {
      const updated = { [key]: value } as any;
      if (!state.activeMaterialName) return updated;
      const currentSlot = state.materialsState[state.activeMaterialName] || extractCurrentMaterialSlotData(state);
      return {
        ...updated,
        materialsState: {
          ...state.materialsState,
          [state.activeMaterialName]: {
            ...currentSlot,
            [key]: value
          }
        }
      };
    });
  },

  setMapSlot: (slot, data) => {
    set((state) => {
      const mapKey = `${slot}Map` as const;
      const partial = { [mapKey]: data };
      const all = { ...state, ...partial };
      const count = countActiveMaps(all);
      if (!state.activeMaterialName) {
        return { ...partial, activeMapsCount: count };
      }
      const currentSlot = state.materialsState[state.activeMaterialName] || extractCurrentMaterialSlotData(state);
      return {
        ...partial,
        activeMapsCount: count,
        materialsState: {
          ...state.materialsState,
          [state.activeMaterialName]: {
            ...currentSlot,
            [mapKey]: data
          }
        }
      };
    });
  },

  clearMapSlot: (slot) => {
    set((state) => {
      const mapKey = `${slot}Map` as const;
      const partial = { [mapKey]: { ...emptySlot } };
      const all = { ...state, ...partial };
      const count = countActiveMaps(all);
      if (!state.activeMaterialName) {
        return { ...partial, activeMapsCount: count };
      }
      const currentSlot = state.materialsState[state.activeMaterialName] || extractCurrentMaterialSlotData(state);
      return {
        ...partial,
        activeMapsCount: count,
        materialsState: {
          ...state.materialsState,
          [state.activeMaterialName]: {
            ...currentSlot,
            [mapKey]: { ...emptySlot }
          }
        }
      };
    });
  },

  setSlotEnabled: (slot, enabled) => {
    set((state) => {
      const nextSlotEnabled = { ...state.slotEnabled, [slot]: enabled };
      const nextState = { ...state, slotEnabled: nextSlotEnabled };
      const count = countActiveMaps(nextState);
      if (!state.activeMaterialName) {
        return { slotEnabled: nextSlotEnabled, activeMapsCount: count };
      }
      const currentSlot = state.materialsState[state.activeMaterialName] || extractCurrentMaterialSlotData(state);
      return {
        slotEnabled: nextSlotEnabled,
        activeMapsCount: count,
        materialsState: {
          ...state.materialsState,
          [state.activeMaterialName]: {
            ...currentSlot,
            slotEnabled: nextSlotEnabled
          }
        }
      };
    });
  },

  toggleSlotEnabled: (slot) => {
    set((state) => {
      const current = state.slotEnabled[slot] ?? true;
      const nextSlotEnabled = { ...state.slotEnabled, [slot]: !current };
      const nextState = { ...state, slotEnabled: nextSlotEnabled };
      const count = countActiveMaps(nextState);
      if (!state.activeMaterialName) {
        return { slotEnabled: nextSlotEnabled, activeMapsCount: count };
      }
      const currentSlot = state.materialsState[state.activeMaterialName] || extractCurrentMaterialSlotData(state);
      return {
        slotEnabled: nextSlotEnabled,
        activeMapsCount: count,
        materialsState: {
          ...state.materialsState,
          [state.activeMaterialName]: {
            ...currentSlot,
            slotEnabled: nextSlotEnabled
          }
        }
      };
    });
  },

  setUseOrmPack: (useOrmPack) =>
    set((state) => {
      const packingMode: MaterialPackingMode = useOrmPack ? 'orm' : 'separate';
      const partial = { useOrmPack, materialPackingMode: packingMode };
      if (!state.activeMaterialName) return partial;
      const currentSlot = state.materialsState[state.activeMaterialName] || extractCurrentMaterialSlotData(state);
      return {
        ...partial,
        materialsState: {
          ...state.materialsState,
          [state.activeMaterialName]: {
            ...currentSlot,
            useOrmPack,
            materialPackingMode: packingMode
          }
        }
      };
    }),

  setMaterialPackingMode: (materialPackingMode) =>
    set((state) => {
      const useOrm = materialPackingMode === 'orm';
      const partial = { materialPackingMode, useOrmPack: useOrm };
      if (!state.activeMaterialName) return partial;
      const currentSlot = state.materialsState[state.activeMaterialName] || extractCurrentMaterialSlotData(state);
      return {
        ...partial,
        materialsState: {
          ...state.materialsState,
          [state.activeMaterialName]: {
            ...currentSlot,
            materialPackingMode,
            useOrmPack: useOrm
          }
        }
      };
    }),

  setLoadFromCache: (loadFromCache) =>
    set((state) => {
      if (!state.activeMaterialName) return { loadFromCache };
      const currentSlot = state.materialsState[state.activeMaterialName] || extractCurrentMaterialSlotData(state);
      return {
        loadFromCache,
        materialsState: {
          ...state.materialsState,
          [state.activeMaterialName]: {
            ...currentSlot,
            loadFromCache
          }
        }
      };
    }),

  toggleLoadFromCache: () =>
    set((state) => {
      const next = !state.loadFromCache;
      if (!state.activeMaterialName) return { loadFromCache: next };
      const currentSlot = state.materialsState[state.activeMaterialName] || extractCurrentMaterialSlotData(state);
      return {
        loadFromCache: next,
        materialsState: {
          ...state.materialsState,
          [state.activeMaterialName]: {
            ...currentSlot,
            loadFromCache: next
          }
        }
      };
    }),

  setDebugChannel: (debugChannel) => set({ debugChannel }),

  applyVariantMaterialState: (maps, slotEnabled, settings) => {
    const mapsObj: Record<string, PbrSlotMap> = {};
    for (const slot of ALL_SLOT_NAMES) {
      const targetMap = maps?.[slot];
      const mapKey = `${slot}Map`;
      if (targetMap && (targetMap.filePath || targetMap.url)) {
        mapsObj[mapKey] = {
          url: targetMap.url || '',
          filePath: targetMap.filePath || null,
          fileName: targetMap.fileName || `${slot}.webp`,
          fileSize: targetMap.fileSize || 0
        };
      } else {
        mapsObj[mapKey] = { ...emptySlot };
      }
    }

    const nextSlotEnabled = slotEnabled
      ? { ...createDefaultSlotEnabled(), ...slotEnabled }
      : createDefaultSlotEnabled();

    const s = (settings as any) || {};
    const packingMode: MaterialPackingMode =
      s.materialPackingMode || (s.useOrmPack === false ? 'separate' : 'orm');

    const nextState = {
      ...mapsObj,
      slotEnabled: nextSlotEnabled,
      useOrmPack: packingMode === 'orm',
      materialPackingMode: packingMode,
      normalScale: s.normalScale ?? defaultPbrParameters.normalScale,
      normalInvertY: s.normalInvertY ?? defaultPbrParameters.normalInvertY,
      roughnessFactor: s.roughnessFactor ?? defaultPbrParameters.roughnessFactor,
      metalnessFactor: s.metalnessFactor ?? defaultPbrParameters.metalnessFactor,
      aoIntensity: s.aoIntensity ?? defaultPbrParameters.aoIntensity,
      emissiveIntensity: s.emissiveIntensity ?? defaultPbrParameters.emissiveIntensity,
      emissiveColor: s.emissiveColor ?? defaultPbrParameters.emissiveColor,
      emissiveFullGlow: s.emissiveFullGlow ?? defaultPbrParameters.emissiveFullGlow,
      clearcoatFactor: s.clearcoatFactor ?? defaultPbrParameters.clearcoatFactor,
      clearcoatRoughness: s.clearcoatRoughness ?? defaultPbrParameters.clearcoatRoughness,
      sheenColor: s.sheenColor ?? defaultPbrParameters.sheenColor,
      sheenRoughness: s.sheenRoughness ?? defaultPbrParameters.sheenRoughness,
      transmissionFactor: s.transmissionFactor ?? defaultPbrParameters.transmissionFactor,
      ior: s.ior ?? defaultPbrParameters.ior,
      displacementScale: s.displacementScale ?? defaultPbrParameters.displacementScale
    };

    set((state) => {
      const activeState = {
        ...nextState,
        activeMapsCount: countActiveMaps(nextState)
      };
      if (!state.activeMaterialName) {
        return activeState;
      }
      return {
        ...activeState,
        materialsState: {
          ...state.materialsState,
          [state.activeMaterialName]: extractCurrentMaterialSlotData(activeState as any)
        }
      };
    });
  },

  resetPbrMaterials: () => {
    set({
      ...defaultPbrParameters,
      ...initialPbrMaps,
      slotEnabled: createDefaultSlotEnabled(),
      useOrmPack: true,
      materialPackingMode: 'orm',
      loadFromCache: false,
      debugChannel: 'lit',
      activeMapsCount: 0,
      activeMaterialName: null,
      materialsState: {}
    });
  }
}));
