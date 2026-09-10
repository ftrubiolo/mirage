import { create } from 'zustand';
import { EntryVariantMapSlot } from '../types/library';

export type DebugChannel = 'lit' | 'albedo' | 'normal' | 'roughness' | 'metalness' | 'ao' | 'emissive' | 'wireframe';

export type SlotName =
  | 'baseColor'
  | 'normal'
  | 'orm'
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

export interface PbrMaterialState extends PbrMaterialParameters {
  baseColorMap: PbrSlotMap;
  normalMap: PbrSlotMap;
  ormMap: PbrSlotMap;
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
  loadFromCache: boolean;
  debugChannel: DebugChannel;
  activeMapsCount: number;

  setPbrProperty: <K extends keyof PbrMaterialParameters>(key: K, value: PbrMaterialParameters[K]) => void;

  setNormalScale: (val: number) => void;
  setNormalInvertY: (val: boolean) => void;
  setRoughnessFactor: (val: number) => void;
  setMetalnessFactor: (val: number) => void;
  setAoIntensity: (val: number) => void;
  setEmissiveIntensity: (val: number) => void;
  setEmissiveColor: (val: string) => void;
  setEmissiveFullGlow: (val: boolean) => void;
  setClearcoatFactor: (val: number) => void;
  setClearcoatRoughness: (val: number) => void;
  setSheenColor: (val: string) => void;
  setSheenRoughness: (val: number) => void;
  setTransmissionFactor: (val: number) => void;
  setIor: (val: number) => void;
  setDisplacementScale: (val: number) => void;

  setMapSlot: (slot: SlotName, data: PbrSlotMap) => void;
  clearMapSlot: (slot: SlotName) => void;
  setSlotEnabled: (slot: SlotName, enabled: boolean) => void;
  toggleSlotEnabled: (slot: SlotName) => void;
  setUseOrmPack: (val: boolean) => void;
  setLoadFromCache: (val: boolean) => void;
  toggleLoadFromCache: () => void;
  setDebugChannel: (channel: DebugChannel) => void;
  applyVariantMaterialState: (
    maps: Record<string, EntryVariantMapSlot>,
    slotEnabled?: Partial<Record<string, boolean>>,
    settings?: Partial<PbrMaterialParameters>
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

export const usePbrMaterialStore = create<PbrMaterialState>((set, get) => ({
  ...defaultPbrParameters,
  ...initialPbrMaps,
  slotEnabled: createDefaultSlotEnabled(),
  useOrmPack: true,
  loadFromCache: false,
  debugChannel: 'lit',
  activeMapsCount: 0,

  setPbrProperty: (key, value) => {
    set({ [key]: value } as any);
  },

  setNormalScale: (normalScale) => set({ normalScale }),
  setNormalInvertY: (normalInvertY) => set({ normalInvertY }),
  setRoughnessFactor: (roughnessFactor) => set({ roughnessFactor }),
  setMetalnessFactor: (metalnessFactor) => set({ metalnessFactor }),
  setAoIntensity: (aoIntensity) => set({ aoIntensity }),
  setEmissiveIntensity: (emissiveIntensity) => set({ emissiveIntensity }),
  setEmissiveColor: (emissiveColor) => set({ emissiveColor }),
  setEmissiveFullGlow: (emissiveFullGlow) => set({ emissiveFullGlow }),
  setClearcoatFactor: (clearcoatFactor) => set({ clearcoatFactor }),
  setClearcoatRoughness: (clearcoatRoughness) => set({ clearcoatRoughness }),
  setSheenColor: (sheenColor) => set({ sheenColor }),
  setSheenRoughness: (sheenRoughness) => set({ sheenRoughness }),
  setTransmissionFactor: (transmissionFactor) => set({ transmissionFactor }),
  setIor: (ior) => set({ ior }),
  setDisplacementScale: (displacementScale) => set({ displacementScale }),

  setMapSlot: (slot, data) => {
    const mapKey = `${slot}Map` as const;
    const partial = { [mapKey]: data };
    const all = { ...get(), ...partial };
    set({ ...partial, activeMapsCount: countActiveMaps(all) });
  },

  clearMapSlot: (slot) => {
    const mapKey = `${slot}Map` as const;
    const partial = { [mapKey]: { ...emptySlot } };
    const all = { ...get(), ...partial };
    set({ ...partial, activeMapsCount: countActiveMaps(all) });
  },

  setSlotEnabled: (slot, enabled) => {
    set((state) => {
      const nextSlotEnabled = { ...state.slotEnabled, [slot]: enabled };
      const nextState = { ...state, slotEnabled: nextSlotEnabled };
      return {
        slotEnabled: nextSlotEnabled,
        activeMapsCount: countActiveMaps(nextState)
      };
    });
  },

  toggleSlotEnabled: (slot) => {
    set((state) => {
      const current = state.slotEnabled[slot] ?? true;
      const nextSlotEnabled = { ...state.slotEnabled, [slot]: !current };
      const nextState = { ...state, slotEnabled: nextSlotEnabled };
      return {
        slotEnabled: nextSlotEnabled,
        activeMapsCount: countActiveMaps(nextState)
      };
    });
  },

  setUseOrmPack: (useOrmPack) => set({ useOrmPack }),
  setLoadFromCache: (loadFromCache) => set({ loadFromCache }),
  toggleLoadFromCache: () => set((state) => ({ loadFromCache: !state.loadFromCache })),

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

    const s = settings || {};
    const nextState = {
      ...mapsObj,
      slotEnabled: nextSlotEnabled,
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

    set({
      ...nextState,
      activeMapsCount: countActiveMaps(nextState)
    });
  },

  resetPbrMaterials: () => {
    set({
      ...defaultPbrParameters,
      ...initialPbrMaps,
      slotEnabled: createDefaultSlotEnabled(),
      useOrmPack: true,
      loadFromCache: false,
      debugChannel: 'lit',
      activeMapsCount: 0
    });
  }
}));
