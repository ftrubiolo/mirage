import { create } from 'zustand';
import { EntryVariantMapSlot, EntryVariantMaterial } from '../types/library';
import { getOriginalMaterialData } from '../utils/pbrController';

let materialMapSyncHandler: ((name: string | null) => void) | null = null;
let materialMapClearHandler: (() => void) | null = null;

export const registerMaterialMapSyncHandler = (
  handler: (name: string | null) => void,
  clearHandler?: () => void
): void => {
  materialMapSyncHandler = handler;
  if (clearHandler) materialMapClearHandler = clearHandler;
};

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
  baseColor: string;
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
  baseColor: '#ffffff',
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
  syncMaterialSlots: (
    materialNames: string[],
    initialDefaults?: Record<string, Partial<SingleMaterialSlotData>>
  ) => void;
  restoreActiveMaterialOriginal: (origDefaults?: Partial<SingleMaterialSlotData>) => void;

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
    settings?: Partial<PbrMaterialParameters & { useOrmPack?: boolean; materialPackingMode?: MaterialPackingMode }>,
    variantMaterials?: Record<string, EntryVariantMaterial>
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

export const createDefaultMaterialSlotData = (defaults?: Partial<SingleMaterialSlotData>): SingleMaterialSlotData => {
  const cleanDefaults: Partial<SingleMaterialSlotData> = {};
  if (defaults) {
    for (const [k, v] of Object.entries(defaults)) {
      if (v !== undefined) {
        (cleanDefaults as any)[k] = v;
      }
    }
  }
  return {
    ...defaultPbrParameters,
    ...initialPbrMaps,
    slotEnabled: createDefaultSlotEnabled(),
    useOrmPack: true,
    materialPackingMode: 'orm',
    loadFromCache: false,
    ...cleanDefaults
  };
};

export const extractCurrentMaterialSlotData = (state: PbrMaterialState): SingleMaterialSlotData => ({
  baseColor: state.baseColor,
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

export const extractOrigSlotProps = (orig?: any): Partial<SingleMaterialSlotData> => {
  if (!orig) return {};
  return {
    ...(orig.color ? { baseColor: `#${orig.color.getHexString()}` } : orig.baseColor ? { baseColor: orig.baseColor } : {}),
    ...(orig.roughness !== undefined ? { roughnessFactor: orig.roughness } : orig.roughnessFactor !== undefined ? { roughnessFactor: orig.roughnessFactor } : {}),
    ...(orig.metalness !== undefined ? { metalnessFactor: orig.metalness } : orig.metalnessFactor !== undefined ? { metalnessFactor: orig.metalnessFactor } : {}),
    ...(orig.transmission !== undefined ? { transmissionFactor: orig.transmission } : orig.transmissionFactor !== undefined ? { transmissionFactor: orig.transmissionFactor } : {}),
    ...(orig.ior !== undefined ? { ior: orig.ior } : {}),
    ...(orig.clearcoat !== undefined ? { clearcoatFactor: orig.clearcoat } : orig.clearcoatFactor !== undefined ? { clearcoatFactor: orig.clearcoatFactor } : {}),
    ...(orig.clearcoatRoughness !== undefined ? { clearcoatRoughness: orig.clearcoatRoughness } : {}),
    ...(orig.sheenColor ? { sheenColor: typeof orig.sheenColor === 'string' ? orig.sheenColor : `#${orig.sheenColor.getHexString()}` } : {}),
    ...(orig.sheenRoughness !== undefined ? { sheenRoughness: orig.sheenRoughness } : {})
  };
};

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
    materialMapSyncHandler?.(name);

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

  syncMaterialSlots: (materialNames, initialDefaults) => {
    set((state) => {
      if (!materialNames || materialNames.length === 0) {
        return {
          activeMaterialName: null,
          materialsState: {}
        };
      }

      if (materialNames.length === 1) {
        const singleName = materialNames[0];
        const singleDefaults = initialDefaults?.[singleName];
        if (state.materialsState[singleName]) {
          const existing = state.materialsState[singleName];
          return {
            activeMaterialName: null,
            materialsState: {},
            ...existing
          };
        }
        if (singleDefaults) {
          const slotData = createDefaultMaterialSlotData(singleDefaults);
          const preservedMaps: any = {};
          for (const slot of ALL_SLOT_NAMES) {
            const m = (state as any)[`${slot}Map`];
            if (m?.filePath || m?.url) {
              preservedMaps[`${slot}Map`] = m;
            }
          }
          const merged = { ...slotData, ...preservedMaps };
          return {
            activeMaterialName: null,
            materialsState: {},
            ...merged,
            activeMapsCount: countActiveMaps(merged)
          };
        }
        return {
          activeMaterialName: null,
          materialsState: {}
        };
      }

      const nextMaterialsState: Record<string, SingleMaterialSlotData> = {};
      for (const name of materialNames) {
        const existing = state.materialsState[name];
        const defs = initialDefaults?.[name];

        if (existing) {
          const hasExistingMaps = countActiveMaps(existing) > 0;
          if (hasExistingMaps) {
            nextMaterialsState[name] = existing;
          } else if (defs) {
            nextMaterialsState[name] = {
              ...existing,
              ...createDefaultMaterialSlotData(defs),
              slotEnabled: existing.slotEnabled || createDefaultSlotEnabled()
            };
          } else {
            nextMaterialsState[name] = existing;
          }
        } else if (defs) {
          nextMaterialsState[name] = createDefaultMaterialSlotData(defs);
        } else {
          nextMaterialsState[name] = createDefaultMaterialSlotData();
        }
      }

      // Backward compatibility: If the primary material (materialNames[0]) has NO maps in nextMaterialsState,
      // but state has active maps (e.g. from flat entry.maps), migrate them to materialNames[0]!
      const primaryName = materialNames[0];
      if (
        nextMaterialsState[primaryName] &&
        countActiveMaps(nextMaterialsState[primaryName]) === 0 &&
        countActiveMaps(state) > 0
      ) {
        const preservedMaps: any = {};
        for (const slot of ALL_SLOT_NAMES) {
          const m = (state as any)[`${slot}Map`];
          if (m?.filePath || m?.url) {
            preservedMaps[`${slot}Map`] = m;
          }
        }
        nextMaterialsState[primaryName] = {
          ...nextMaterialsState[primaryName],
          ...preservedMaps,
          slotEnabled: state.slotEnabled || nextMaterialsState[primaryName].slotEnabled
        };
      }

      const nextActive = state.activeMaterialName && materialNames.includes(state.activeMaterialName)
        ? state.activeMaterialName
        : materialNames[0];

      const targetSlotData = nextMaterialsState[nextActive] || createDefaultMaterialSlotData(initialDefaults?.[nextActive]);
      const count = countActiveMaps(targetSlotData);

      return {
        activeMaterialName: nextActive,
        materialsState: nextMaterialsState,
        ...targetSlotData,
        activeMapsCount: count
      };
    });
  },

  restoreActiveMaterialOriginal: (origDefaults) => {
    const state = get();
    const defaults = origDefaults || {};
    const resetSlot = createDefaultMaterialSlotData(defaults);
    const count = countActiveMaps(resetSlot);

    materialMapClearHandler?.();

    if (!state.activeMaterialName) {
      set({
        ...resetSlot,
        activeMapsCount: count
      });
      return;
    }

    set({
      ...resetSlot,
      activeMapsCount: count,
      materialsState: {
        ...state.materialsState,
        [state.activeMaterialName]: resetSlot
      }
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
      if (!loadFromCache) {
        if (!state.activeMaterialName) return { loadFromCache: false };
        const currentSlot = state.materialsState[state.activeMaterialName] || extractCurrentMaterialSlotData(state);
        return {
          loadFromCache: false,
          materialsState: {
            ...state.materialsState,
            [state.activeMaterialName]: {
              ...currentSlot,
              loadFromCache: false
            }
          }
        };
      }

      if (!state.activeMaterialName) {
        const orig = getOriginalMaterialData();
        return {
          loadFromCache: true,
          ...extractOrigSlotProps(orig)
        };
      }

      const nextMaterialsState = { ...state.materialsState };
      for (const [name, slotData] of Object.entries(nextMaterialsState)) {
        const orig = getOriginalMaterialData(name);
        nextMaterialsState[name] = {
          ...slotData,
          loadFromCache: true,
          ...extractOrigSlotProps(orig)
        };
      }

      const activeOrig = getOriginalMaterialData(state.activeMaterialName);
      return {
        loadFromCache: true,
        ...extractOrigSlotProps(activeOrig),
        materialsState: nextMaterialsState
      };
    }),

  toggleLoadFromCache: () => {
    const next = !get().loadFromCache;
    get().setLoadFromCache(next);
  },

  setDebugChannel: (debugChannel) => set({ debugChannel }),

  applyVariantMaterialState: (maps, slotEnabled, settings, variantMaterials) => {
    const parseMapsObj = (inputMaps?: Record<string, EntryVariantMapSlot>): Record<string, PbrSlotMap> => {
      const mapsObj: Record<string, PbrSlotMap> = {};
      for (const slot of ALL_SLOT_NAMES) {
        const targetMap = inputMaps?.[slot];
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
      return mapsObj;
    };

    const nextMaterialsState = { ...get().materialsState };

    if (variantMaterials && Object.keys(variantMaterials).length > 0) {
      for (const [matName, matPayload] of Object.entries(variantMaterials)) {
        const matMapsObj = parseMapsObj(matPayload.maps);
        const matSlotEnabled = matPayload.slotEnabled
          ? { ...createDefaultSlotEnabled(), ...matPayload.slotEnabled }
          : createDefaultSlotEnabled();
        const s = (matPayload.settings as any) || {};
        const pMode: MaterialPackingMode =
          s.materialPackingMode || (s.useOrmPack === false ? 'separate' : 'orm');

        const existingSlot = nextMaterialsState[matName] || createDefaultMaterialSlotData();
        nextMaterialsState[matName] = {
          ...existingSlot,
          ...matMapsObj,
          slotEnabled: matSlotEnabled,
          useOrmPack: pMode === 'orm',
          materialPackingMode: pMode,
          loadFromCache: s.loadFromCache ?? existingSlot.loadFromCache ?? false,
          baseColor: s.baseColor ?? existingSlot.baseColor ?? defaultPbrParameters.baseColor,
          normalScale: s.normalScale ?? existingSlot.normalScale ?? defaultPbrParameters.normalScale,
          normalInvertY: s.normalInvertY ?? existingSlot.normalInvertY ?? defaultPbrParameters.normalInvertY,
          roughnessFactor: s.roughnessFactor ?? existingSlot.roughnessFactor ?? defaultPbrParameters.roughnessFactor,
          metalnessFactor: s.metalnessFactor ?? existingSlot.metalnessFactor ?? defaultPbrParameters.metalnessFactor,
          aoIntensity: s.aoIntensity ?? existingSlot.aoIntensity ?? defaultPbrParameters.aoIntensity,
          emissiveIntensity: s.emissiveIntensity ?? existingSlot.emissiveIntensity ?? defaultPbrParameters.emissiveIntensity,
          emissiveColor: s.emissiveColor ?? existingSlot.emissiveColor ?? defaultPbrParameters.emissiveColor,
          emissiveFullGlow: s.emissiveFullGlow ?? existingSlot.emissiveFullGlow ?? defaultPbrParameters.emissiveFullGlow,
          clearcoatFactor: s.clearcoatFactor ?? existingSlot.clearcoatFactor ?? defaultPbrParameters.clearcoatFactor,
          clearcoatRoughness: s.clearcoatRoughness ?? existingSlot.clearcoatRoughness ?? defaultPbrParameters.clearcoatRoughness,
          sheenColor: s.sheenColor ?? existingSlot.sheenColor ?? defaultPbrParameters.sheenColor,
          sheenRoughness: s.sheenRoughness ?? existingSlot.sheenRoughness ?? defaultPbrParameters.sheenRoughness,
          transmissionFactor: s.transmissionFactor ?? existingSlot.transmissionFactor ?? defaultPbrParameters.transmissionFactor,
          ior: s.ior ?? existingSlot.ior ?? defaultPbrParameters.ior,
          displacementScale: s.displacementScale ?? existingSlot.displacementScale ?? defaultPbrParameters.displacementScale
        };
      }
    }

    const activeMatName = get().activeMaterialName;
    const activeFromVariant = activeMatName && variantMaterials?.[activeMatName];
    const targetMaps = activeFromVariant ? activeFromVariant.maps : maps;
    const targetSlotEnabled = activeFromVariant ? activeFromVariant.slotEnabled : slotEnabled;
    const targetSettings = activeFromVariant ? activeFromVariant.settings : settings;

    const mapsObj = parseMapsObj(targetMaps);
    const nextSlotEnabled = targetSlotEnabled
      ? { ...createDefaultSlotEnabled(), ...targetSlotEnabled }
      : createDefaultSlotEnabled();

    const s = (targetSettings as any) || {};
    const packingMode: MaterialPackingMode =
      s.materialPackingMode || (s.useOrmPack === false ? 'separate' : 'orm');

    const nextState = {
      ...mapsObj,
      slotEnabled: nextSlotEnabled,
      useOrmPack: packingMode === 'orm',
      materialPackingMode: packingMode,
      loadFromCache: s.loadFromCache ?? (activeMatName ? nextMaterialsState[activeMatName]?.loadFromCache : false) ?? false,
      baseColor: s.baseColor ?? defaultPbrParameters.baseColor,
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
          ...nextMaterialsState,
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
