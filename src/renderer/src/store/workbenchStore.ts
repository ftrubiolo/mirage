import { create } from 'zustand';
import { Product3DConfig, MaterialProfile, VariantTextureCombination, OptionGroup } from '../types/config';
import { EntryVariant, EntryVariantMapSlot, LibraryEntrySettings } from '../types/library';

export interface ModelStats {
  triangleCount: number;
  vertexCount: number;
  meshCount: number;
  materials: string[];
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

export interface PbrSlotMap {
  url: string | null;
  filePath: string | null;
  fileName: string | null;
  fileSize: number;
}

export interface MapVariantItem {
  id: string;
  name: string;
  url: string;
  filePath: string;
  fileName: string;
  fileSize?: number;
}

export interface ColorwayItem {
  id: string;
  name: string;
  baseColorUrl: string;
  baseColorFilePath: string;
  fileName: string;
  fileSize?: number;
}

const emptySlot: PbrSlotMap = {
  url: null,
  filePath: null,
  fileName: null,
  fileSize: 0
};

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

export const createEmptyMapVariants = (): Record<SlotName, MapVariantItem[]> => ({
  baseColor: [],
  normal: [],
  orm: [],
  ao: [],
  roughness: [],
  metalness: [],
  emissive: [],
  clearcoat: [],
  sheen: [],
  transmission: [],
  alpha: [],
  displacement: []
});

export const createEmptyActiveVariantIds = (): Record<SlotName, string | null> => ({
  baseColor: null,
  normal: null,
  orm: null,
  ao: null,
  roughness: null,
  metalness: null,
  emissive: null,
  clearcoat: null,
  sheen: null,
  transmission: null,
  alpha: null,
  displacement: null
});

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

export interface LoadWorkbenchData {
  productId: string;
  productSlug: string;
  productName: string;
  modelFilePath: string | null;
  modelUrl: string | null;
  modelFileSize?: number;
  dimensions?: { width: number; height: number; depth: number } | null;
  stats?: { triangleCount: number; vertexCount: number; meshCount: number } | null;
  maps: Partial<Record<SlotName, PbrSlotMap>>;
  mapVariants?: Partial<Record<SlotName, MapVariantItem[]>>;
  activeVariantIds?: Partial<Record<SlotName, string | null>>;
  slotEnabled?: Partial<Record<SlotName, boolean>>;
  variants?: EntryVariant[];
  activeVariantId?: string | null;
  settings?: {
    normalScale?: number;
    normalInvertY?: boolean;
    roughnessFactor?: number;
    metalnessFactor?: number;
    aoIntensity?: number;
    emissiveIntensity?: number;
    emissiveColor?: string;
    clearcoatFactor?: number;
    clearcoatRoughness?: number;
    sheenColor?: string;
    sheenRoughness?: number;
    transmissionFactor?: number;
    ior?: number;
    displacementScale?: number;
    unitScale?: number;
    unitType?: 'm' | 'cm' | 'mm' | 'in' | 'custom';
    useOrmPack?: boolean;
    loadFromCache?: boolean;
  };
  colorways?: ColorwayItem[];
}

interface WorkbenchState {
  // Project / Product Meta
  productId: string;
  productSlug: string;
  productName: string;
  setProductMeta: (id: string, name: string) => void;
  loadWorkbenchState: (data: LoadWorkbenchData) => void;
  resetAll: () => void;
  activeMapsCount: number;

  // Piece Profiles / Variants
  variants: EntryVariant[];
  activeVariantId: string | null;
  selectVariant: (variantId: string) => void;
  createVariant: (name: string, cloneCurrent?: boolean) => void;
  renameVariant: (variantId: string, newName: string) => void;
  deleteVariant: (variantId: string) => void;
  setVariantDefault: (variantId: string) => void;
  setVariantPoster: (variantId: string, posterUrl: string, posterFileName?: string) => void;

  // Active Model
  modelFilePath: string | null;
  modelUrl: string | null;
  modelFileSize: number;
  isModelLoading: boolean;
  modelStats: ModelStats | null;
  rawDimensions: { width: number; height: number; depth: number } | null;
  unitScale: number;
  unitType: 'm' | 'cm' | 'mm' | 'in' | 'custom';
  setModel: (path: string, url: string, size?: number) => void;
  setModelStats: (stats: ModelStats) => void;
  setIsModelLoading: (val: boolean) => void;
  setUnitScale: (scale: number, unitType?: 'm' | 'cm' | 'mm' | 'in' | 'custom') => void;

  // Interactive PBR Map Slots
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

  // Multiple Variants per Map Slot
  mapVariants: Record<SlotName, MapVariantItem[]>;
  activeVariantIds: Record<SlotName, string | null>;

  addMapVariant: (slot: SlotName, item: MapVariantItem) => void;
  selectMapVariant: (slot: SlotName, id: string) => void;
  removeMapVariant: (slot: SlotName, id: string) => void;
  renameMapVariant: (slot: SlotName, id: string, name: string) => void;
  updateMapVariant: (slot: SlotName, id: string, data: Partial<MapVariantItem>) => void;

  // Slot on/off (forced null) state
  slotEnabled: Record<SlotName, boolean>;
  setSlotEnabled: (slot: SlotName, enabled: boolean) => void;
  toggleSlotEnabled: (slot: SlotName) => void;

  useOrmPack: boolean; // true = ORM combined, false = individual AO/Rough/Metal
  setUseOrmPack: (val: boolean) => void;

  loadFromCache: boolean; // false = old behavior (only slots applied), true = fallback to embedded maps from binary
  setLoadFromCache: (val: boolean) => void;
  toggleLoadFromCache: () => void;

  setMapSlot: (slot: SlotName, data: PbrSlotMap) => void;
  clearMapSlot: (slot: SlotName) => void;

  // Live PBR Material Sliders
  normalScale: number;
  normalInvertY: boolean;
  roughnessFactor: number;
  metalnessFactor: number;
  aoIntensity: number;
  emissiveIntensity: number;
  emissiveColor: string;
  clearcoatFactor: number;
  clearcoatRoughness: number;
  sheenColor: string;
  sheenRoughness: number;
  transmissionFactor: number;
  ior: number;
  displacementScale: number;

  setNormalScale: (val: number) => void;
  setNormalInvertY: (val: boolean) => void;
  setRoughnessFactor: (val: number) => void;
  setMetalnessFactor: (val: number) => void;
  setAoIntensity: (val: number) => void;
  setEmissiveIntensity: (val: number) => void;
  setEmissiveColor: (val: string) => void;
  setClearcoatFactor: (val: number) => void;
  setClearcoatRoughness: (val: number) => void;
  setSheenColor: (val: string) => void;
  setSheenRoughness: (val: number) => void;
  setTransmissionFactor: (val: number) => void;
  setIor: (val: number) => void;
  setDisplacementScale: (val: number) => void;

  // Channel Inspector / Debug Channel
  debugChannel: DebugChannel;
  setDebugChannel: (channel: DebugChannel) => void;

  // Backward-compatible BaseColor Colorways
  colorways: ColorwayItem[];
  activeColorwayId: string | null;
  addColorway: (item: ColorwayItem) => void;
  selectColorway: (id: string) => void;
  removeColorway: (id: string) => void;
  renameColorway: (id: string, name: string) => void;
  updateColorway: (id: string, data: Partial<ColorwayItem>) => void;

  // Modals
  isOrmPackerOpen: boolean;
  openOrmPacker: () => void;
  closeOrmPacker: () => void;

  // Export
  generateExportConfig: () => Product3DConfig;
}

const countActiveMaps = (state: any): number => {
  return ALL_SLOT_NAMES.filter((s) => {
    const isEnabled = state.slotEnabled ? (state.slotEnabled[s] ?? true) : true;
    return isEnabled && Boolean(state[`${s}Map`]?.url || state[`${s}Map`]?.filePath);
  }).length;
};

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  productId: 'producto-1',
  productSlug: 'producto-1',
  productName: 'Nuevo Modelo',
  activeMapsCount: 0,
  setProductMeta: (productId, productName) => set({ productId, productSlug: productId, productName }),

  // Variants State
  variants: [
    {
      id: 'var-default',
      name: 'Default',
      isDefault: true,
      maps: {},
      slotEnabled: createDefaultSlotEnabled(),
      settings: {}
    }
  ],
  activeVariantId: 'var-default',

  selectVariant: (variantId: string) => {
    const state = get();
    if (state.activeVariantId === variantId) return;

    // 1. Snapshot active maps and settings of current variant before leaving
    const currentActiveId = state.activeVariantId;
    const currentMaps: Record<string, EntryVariantMapSlot> = {};
    for (const slot of ALL_SLOT_NAMES) {
      const activeVarId = state.activeVariantIds[slot];
      const activeMapItem = state.mapVariants[slot]?.find((v) => v.id === activeVarId);
      const m = activeMapItem || state[`${slot}Map` as SlotName];
      if (m?.filePath || m?.url) {
        currentMaps[slot] = {
          id: activeVarId || undefined,
          fileName: m.fileName || `${slot}.webp`,
          filePath: m.filePath || '',
          fileSize: m.fileSize || 0,
          url: m.url || ''
        };
      }
    }

    const updatedVariants = state.variants.map((v) =>
      v.id === currentActiveId
        ? {
            ...v,
            maps: currentMaps,
            slotEnabled: { ...state.slotEnabled },
            settings: {
              normalScale: state.normalScale,
              normalInvertY: state.normalInvertY,
              roughnessFactor: state.roughnessFactor,
              metalnessFactor: state.metalnessFactor,
              aoIntensity: state.aoIntensity,
              emissiveIntensity: state.emissiveIntensity,
              emissiveColor: state.emissiveColor,
              clearcoatFactor: state.clearcoatFactor,
              clearcoatRoughness: state.clearcoatRoughness,
              sheenColor: state.sheenColor,
              sheenRoughness: state.sheenRoughness,
              transmissionFactor: state.transmissionFactor,
              ior: state.ior,
              displacementScale: state.displacementScale,
              unitScale: state.unitScale,
              unitType: state.unitType,
              useOrmPack: state.useOrmPack,
              loadFromCache: state.loadFromCache
            },
            updatedAt: new Date().toISOString()
          }
        : v
    );

    const target = updatedVariants.find((v) => v.id === variantId);
    if (!target) return;

    // 2. Preserve shared mapVariants pool, ensuring any map in target exists in the pool
    const preservedMapVariants: Record<SlotName, MapVariantItem[]> = { ...state.mapVariants };
    const nextActiveIds: Record<SlotName, string | null> = { ...state.activeVariantIds };
    const mapsObj: Record<string, PbrSlotMap> = {};
    const slotEnabled = target.slotEnabled
      ? { ...createDefaultSlotEnabled(), ...target.slotEnabled }
      : createDefaultSlotEnabled();

    for (const slot of ALL_SLOT_NAMES) {
      const mapKey = `${slot}Map` as const;
      const pool = preservedMapVariants[slot] || [];
      const targetMap = target.maps?.[slot];

      if (targetMap && (targetMap.filePath || targetMap.url)) {
        // Find match in shared pool by id, filePath, fileName, or url
        let matched = pool.find(
          (item) =>
            (targetMap.id && item.id === targetMap.id) ||
            (targetMap.filePath && item.filePath === targetMap.filePath) ||
            (targetMap.fileName && item.fileName === targetMap.fileName) ||
            (targetMap.url && item.url === targetMap.url)
        );

        if (!matched) {
          matched = {
            id: targetMap.id || `${slot}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: targetMap.fileName ? targetMap.fileName.replace(/\.[^/.]+$/, '') : `${slot} 1`,
            url: targetMap.url || (targetMap.filePath && window.electronAPI ? window.electronAPI.toAssetUrl(targetMap.filePath) : '') || '',
            filePath: targetMap.filePath || '',
            fileName: targetMap.fileName || `${slot}.webp`,
            fileSize: targetMap.fileSize || 0
          };
          preservedMapVariants[slot] = [...pool, matched];
        }

        nextActiveIds[slot] = matched.id;
        mapsObj[mapKey] = {
          url: matched.url,
          filePath: matched.filePath || null,
          fileName: matched.fileName || null,
          fileSize: matched.fileSize || 0
        };
      } else {
        nextActiveIds[slot] = null;
        mapsObj[mapKey] = { ...emptySlot };
      }
    }

    const s = target.settings || {};
    const nextState = {
      variants: updatedVariants,
      ...mapsObj,
      mapVariants: preservedMapVariants,
      activeVariantIds: nextActiveIds,
      slotEnabled,
      activeVariantId: variantId,
      colorways: (preservedMapVariants.baseColor || []).map((v) => ({
        id: v.id,
        name: v.name,
        baseColorUrl: v.url,
        baseColorFilePath: v.filePath,
        fileName: v.fileName,
        fileSize: v.fileSize
      })),
      activeColorwayId: nextActiveIds.baseColor,
      normalScale: s.normalScale ?? state.normalScale,
      normalInvertY: s.normalInvertY ?? state.normalInvertY,
      roughnessFactor: s.roughnessFactor ?? state.roughnessFactor,
      metalnessFactor: s.metalnessFactor ?? state.metalnessFactor,
      aoIntensity: s.aoIntensity ?? state.aoIntensity,
      emissiveIntensity: s.emissiveIntensity ?? state.emissiveIntensity,
      emissiveColor: s.emissiveColor ?? state.emissiveColor,
      clearcoatFactor: s.clearcoatFactor ?? state.clearcoatFactor,
      clearcoatRoughness: s.clearcoatRoughness ?? state.clearcoatRoughness,
      sheenColor: s.sheenColor ?? state.sheenColor,
      sheenRoughness: s.sheenRoughness ?? state.sheenRoughness,
      transmissionFactor: s.transmissionFactor ?? state.transmissionFactor,
      ior: s.ior ?? state.ior,
      displacementScale: s.displacementScale ?? state.displacementScale
    };

    set({
      ...nextState,
      activeMapsCount: countActiveMaps(nextState)
    });
  },

  createVariant: (name: string, cloneCurrent = true) => {
    const state = get();
    const newId = `var-${Date.now()}`;
    let mapsForVariant: Record<string, EntryVariantMapSlot> = {};
    let slotEnabledForVariant = createDefaultSlotEnabled();
    let settingsForVariant: Partial<LibraryEntrySettings> = {};

    if (cloneCurrent) {
      for (const slot of ALL_SLOT_NAMES) {
        const currentMap = state[`${slot}Map` as const];
        if (currentMap?.filePath || currentMap?.url) {
          mapsForVariant[slot] = {
            fileName: currentMap.fileName || `${slot}.webp`,
            filePath: currentMap.filePath || '',
            fileSize: currentMap.fileSize || 0,
            url: currentMap.url || ''
          };
        }
      }
      slotEnabledForVariant = { ...state.slotEnabled };
      settingsForVariant = {
        normalScale: state.normalScale,
        normalInvertY: state.normalInvertY,
        roughnessFactor: state.roughnessFactor,
        metalnessFactor: state.metalnessFactor,
        aoIntensity: state.aoIntensity,
        emissiveIntensity: state.emissiveIntensity,
        emissiveColor: state.emissiveColor,
        clearcoatFactor: state.clearcoatFactor,
        clearcoatRoughness: state.clearcoatRoughness,
        sheenColor: state.sheenColor,
        sheenRoughness: state.sheenRoughness,
        transmissionFactor: state.transmissionFactor,
        ior: state.ior,
        displacementScale: state.displacementScale,
        unitScale: state.unitScale,
        unitType: state.unitType,
        useOrmPack: state.useOrmPack,
        loadFromCache: state.loadFromCache
      };
    }

    const currentActiveVar = state.variants.find((v) => v.id === state.activeVariantId);
    const newVariant: EntryVariant = {
      id: newId,
      name: name.trim() || `Variante ${state.variants.length + 1}`,
      isDefault: state.variants.length === 0,
      posterUrl: cloneCurrent ? currentActiveVar?.posterUrl || null : null,
      posterFileName: cloneCurrent ? currentActiveVar?.posterFileName || null : null,
      maps: mapsForVariant,
      slotEnabled: slotEnabledForVariant,
      settings: settingsForVariant,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const nextVariants = [...state.variants, newVariant];
    set({ variants: nextVariants });
    get().selectVariant(newId);
  },

  renameVariant: (variantId: string, newName: string) => {
    set((state) => ({
      variants: state.variants.map((v) =>
        v.id === variantId
          ? { ...v, name: newName.trim() || v.name, updatedAt: new Date().toISOString() }
          : v
      )
    }));
  },

  deleteVariant: (variantId: string) => {
    const state = get();
    if (state.variants.length <= 1) return;

    const toDelete = state.variants.find((v) => v.id === variantId);
    let remaining = state.variants.filter((v) => v.id !== variantId);

    if (toDelete?.isDefault && remaining.length > 0) {
      remaining = remaining.map((v, idx) => (idx === 0 ? { ...v, isDefault: true } : v));
    }

    const nextActiveId =
      state.activeVariantId === variantId
        ? remaining.find((v) => v.isDefault)?.id || remaining[0].id
        : state.activeVariantId;

    set({ variants: remaining });
    if (nextActiveId) {
      get().selectVariant(nextActiveId);
    }
  },

  setVariantDefault: (variantId: string) => {
    set((state) => ({
      variants: state.variants.map((v) => ({
        ...v,
        isDefault: v.id === variantId,
        updatedAt: new Date().toISOString()
      }))
    }));
  },

  setVariantPoster: (variantId: string, posterUrl: string, posterFileName?: string) => {
    set((state) => ({
      variants: state.variants.map((v) =>
        v.id === variantId
          ? {
              ...v,
              posterUrl,
              posterFileName: posterFileName || v.posterFileName,
              updatedAt: new Date().toISOString()
            }
          : v
      )
    }));
  },

  loadWorkbenchState: (data: LoadWorkbenchData) => {
    const s = data.settings || {};
    const unitScale = s.unitScale ?? 1.0;
    const unitType = s.unitType ?? 'm';

    const initialSlotEnabled = data.slotEnabled
      ? { ...createDefaultSlotEnabled(), ...data.slotEnabled }
      : createDefaultSlotEnabled();

    // Prepare Variants
    let loadedVariants: EntryVariant[] = [];
    if (data.variants && data.variants.length > 0) {
      loadedVariants = data.variants.map((v) => ({
        ...v,
        maps: { ...(v.maps || {}) },
        slotEnabled: v.slotEnabled ? { ...createDefaultSlotEnabled(), ...v.slotEnabled } : createDefaultSlotEnabled(),
        settings: { ...(v.settings || {}) }
      }));
    } else {
      const fallbackMaps: Record<string, EntryVariantMapSlot> = {};
      for (const slot of ALL_SLOT_NAMES) {
        const m = data.maps[slot];
        if (m?.filePath || m?.url) {
          fallbackMaps[slot] = {
            fileName: m.fileName || `${slot}.webp`,
            filePath: m.filePath || '',
            fileSize: m.fileSize || 0,
            url: m.url || ''
          };
        }
      }
      loadedVariants = [
        {
          id: 'var-default',
          name: 'Default',
          isDefault: true,
          maps: fallbackMaps,
          slotEnabled: initialSlotEnabled,
          settings: s as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }

    let targetVarId: string =
      data.activeVariantId && loadedVariants.some((v) => v.id === data.activeVariantId)
        ? data.activeVariantId
        : loadedVariants.find((v) => v.isDefault)?.id || loadedVariants[0].id;

    const targetVar = loadedVariants.find((v) => v.id === targetVarId) || loadedVariants[0];
    const targetVarSettings = targetVar.settings || s;
    const targetVarSlotEnabled = targetVar.slotEnabled || initialSlotEnabled;

    const initialVariants = createEmptyMapVariants();
    const initialActiveIds = createEmptyActiveVariantIds();
    const mapsObj: Record<string, PbrSlotMap> = {};

    for (const slot of ALL_SLOT_NAMES) {
      const mapKey = `${slot}Map` as const;
      const collected: MapVariantItem[] = [];

      const addUniqueMap = (item: { id?: string; name?: string; url?: string; filePath?: string; fileName?: string; fileSize?: number }) => {
        if (!item.filePath && !item.url) return;
        const exists = collected.some(
          (c) =>
            (item.id && c.id === item.id) ||
            (item.filePath && c.filePath === item.filePath) ||
            (item.fileName && c.fileName === item.fileName)
        );
        if (!exists) {
          collected.push({
            id: item.id || `${slot}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: item.name || (item.fileName ? item.fileName.replace(/\.[^/.]+$/, '') : `${slot} ${collected.length + 1}`),
            url: item.url || (item.filePath && window.electronAPI ? window.electronAPI.toAssetUrl(item.filePath) : '') || '',
            filePath: item.filePath || '',
            fileName: item.fileName || `${slot}.webp`,
            fileSize: item.fileSize || 0
          });
        }
      };

      // 1. Gather from data.mapVariants if present
      if (data.mapVariants?.[slot] && Array.isArray(data.mapVariants[slot])) {
        for (const mv of data.mapVariants[slot]!) {
          addUniqueMap(mv);
        }
      }

      // 2. Gather from all variants
      for (const v of loadedVariants) {
        const vm = v.maps?.[slot];
        if (vm) addUniqueMap(vm);
      }

      // 3. Gather from colorways if baseColor
      if (slot === 'baseColor' && data.colorways && Array.isArray(data.colorways)) {
        for (const c of data.colorways) {
          addUniqueMap({
            id: c.id,
            name: c.name,
            url: c.baseColorUrl,
            filePath: c.baseColorFilePath,
            fileName: c.fileName,
            fileSize: c.fileSize
          });
        }
      }

      // 4. Gather from data.maps fallback
      if (data.maps[slot]?.filePath || data.maps[slot]?.url) {
        addUniqueMap(data.maps[slot]!);
      }

      initialVariants[slot] = collected;

      // Determine active map for targetVar
      let activeId: string | null = null;
      const targetMap = targetVar.maps?.[slot];

      if (targetMap && (targetMap.filePath || targetMap.url)) {
        const matched = collected.find(
          (c) =>
            (targetMap.id && c.id === targetMap.id) ||
            (targetMap.filePath && c.filePath === targetMap.filePath) ||
            (targetMap.fileName && c.fileName === targetMap.fileName) ||
            (targetMap.url && c.url === targetMap.url)
        );
        if (matched) {
          activeId = matched.id;
          mapsObj[mapKey] = {
            url: matched.url,
            filePath: matched.filePath || null,
            fileName: matched.fileName || null,
            fileSize: matched.fileSize || 0
          };
        } else {
          mapsObj[mapKey] = { ...emptySlot };
        }
      } else if (data.activeVariantIds?.[slot]) {
        const matched = collected.find((c) => c.id === data.activeVariantIds![slot]);
        if (matched) {
          activeId = matched.id;
          mapsObj[mapKey] = {
            url: matched.url,
            filePath: matched.filePath || null,
            fileName: matched.fileName || null,
            fileSize: matched.fileSize || 0
          };
        } else {
          mapsObj[mapKey] = { ...emptySlot };
        }
      } else if (collected.length > 0 && targetVar.isDefault) {
        activeId = collected[0].id;
        mapsObj[mapKey] = {
          url: collected[0].url,
          filePath: collected[0].filePath || null,
          fileName: collected[0].fileName || null,
          fileSize: collected[0].fileSize || 0
        };
      } else {
        mapsObj[mapKey] = { ...emptySlot };
      }

      initialActiveIds[slot] = activeId;
    }

    const activeMapsCount = countActiveMaps({ ...mapsObj, slotEnabled: targetVarSlotEnabled });
    const modelStats: ModelStats | null = data.stats
      ? {
          triangleCount: data.stats.triangleCount,
          vertexCount: data.stats.vertexCount,
          meshCount: data.stats.meshCount,
          materials: [],
          dimensions: data.dimensions || { width: 0.8, height: 0.85, depth: 0.8 }
        }
      : null;

    set({
      productId: data.productId,
      productSlug: data.productSlug,
      productName: data.productName,
      modelFilePath: data.modelFilePath,
      modelUrl: data.modelUrl,
      modelFileSize: data.modelFileSize || 0,
      modelStats,
      rawDimensions: data.dimensions || null,
      unitScale,
      unitType,
      variants: loadedVariants,
      activeVariantId: targetVarId,
      ...mapsObj,
      mapVariants: initialVariants,
      activeVariantIds: initialActiveIds,
      slotEnabled: targetVarSlotEnabled,
      colorways: initialVariants.baseColor.map((v) => ({
        id: v.id,
        name: v.name,
        baseColorUrl: v.url,
        baseColorFilePath: v.filePath,
        fileName: v.fileName,
        fileSize: v.fileSize
      })),
      activeColorwayId: initialActiveIds.baseColor,
      activeMapsCount,
      normalScale: targetVarSettings.normalScale ?? 1.0,
      normalInvertY: targetVarSettings.normalInvertY ?? false,
      roughnessFactor: targetVarSettings.roughnessFactor ?? 1.0,
      metalnessFactor: targetVarSettings.metalnessFactor ?? 1.0,
      aoIntensity: targetVarSettings.aoIntensity ?? 1.0,
      emissiveIntensity: targetVarSettings.emissiveIntensity ?? 1.0,
      emissiveColor: targetVarSettings.emissiveColor ?? '#ffffff',
      clearcoatFactor: targetVarSettings.clearcoatFactor ?? 0.0,
      clearcoatRoughness: targetVarSettings.clearcoatRoughness ?? 0.0,
      sheenColor: targetVarSettings.sheenColor ?? '#000000',
      sheenRoughness: targetVarSettings.sheenRoughness ?? 0.0,
      transmissionFactor: targetVarSettings.transmissionFactor ?? 0.0,
      ior: targetVarSettings.ior ?? 1.5,
      displacementScale: targetVarSettings.displacementScale ?? 0.0,
      useOrmPack: s.useOrmPack ?? true,
      loadFromCache: s.loadFromCache ?? false,
      isModelLoading: Boolean(data.modelUrl) && data.modelUrl !== get().modelUrl,
      debugChannel: 'lit'
    });
  },

  resetAll: () => {
    const emptyVariants = createEmptyMapVariants();
    const emptyActiveIds = createEmptyActiveVariantIds();
    set({
      productId: 'producto-' + Date.now(),
      productSlug: 'nuevo-modelo',
      productName: 'Nuevo Modelo',
      modelFilePath: null,
      modelUrl: null,
      modelFileSize: 0,
      isModelLoading: false,
      modelStats: null,
      rawDimensions: null,
      unitScale: 1.0,
      unitType: 'm',
      variants: [
        {
          id: 'var-default',
          name: 'Default',
          isDefault: true,
          maps: {},
          slotEnabled: createDefaultSlotEnabled(),
          settings: {}
        }
      ],
      activeVariantId: 'var-default',
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
      displacementMap: { ...emptySlot },
      mapVariants: emptyVariants,
      activeVariantIds: emptyActiveIds,
      slotEnabled: createDefaultSlotEnabled(),
      activeMapsCount: 0,
      colorways: [],
      activeColorwayId: null,
      normalScale: 1.0,
      normalInvertY: false,
      roughnessFactor: 1.0,
      metalnessFactor: 1.0,
      aoIntensity: 1.0,
      emissiveIntensity: 1.0,
      emissiveColor: '#ffffff',
      clearcoatFactor: 0.0,
      clearcoatRoughness: 0.1,
      sheenColor: '#ffffff',
      sheenRoughness: 0.5,
      transmissionFactor: 0.0,
      ior: 1.5,
      displacementScale: 0.02
    });
  },

  modelFilePath: null,
  modelUrl: null,
  modelFileSize: 0,
  isModelLoading: false,
  modelStats: null,
  rawDimensions: null,
  unitScale: 1.0,
  unitType: 'm',

  setIsModelLoading: (isModelLoading: boolean) => set({ isModelLoading }),

  setModel: (modelFilePath, modelUrl, modelFileSize = 0) => {
    const isChanging = modelUrl !== get().modelUrl;
    set({
      modelFilePath,
      modelUrl,
      modelFileSize,
      isModelLoading: isChanging,
      unitScale: 1.0,
      unitType: 'm'
    });
  },

  setModelStats: (modelStats) => {
    const unitScale = get().unitScale;
    const rawDimensions = modelStats.dimensions;
    set({
      rawDimensions,
      modelStats: {
        ...modelStats,
        dimensions: {
          width: Number((rawDimensions.width * unitScale).toFixed(3)),
          height: Number((rawDimensions.height * unitScale).toFixed(3)),
          depth: Number((rawDimensions.depth * unitScale).toFixed(3))
        }
      }
    });
  },

  setUnitScale: (scale, unitType = 'custom') => {
    const { rawDimensions, modelStats } = get();
    if (!rawDimensions || !modelStats) {
      set({ unitScale: scale, unitType });
      return;
    }
    set({
      unitScale: scale,
      unitType,
      modelStats: {
        ...modelStats,
        dimensions: {
          width: Number((rawDimensions.width * scale).toFixed(3)),
          height: Number((rawDimensions.height * scale).toFixed(3)),
          depth: Number((rawDimensions.depth * scale).toFixed(3))
        }
      }
    });
  },

  // Map Slots
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
  displacementMap: { ...emptySlot },

  mapVariants: createEmptyMapVariants(),
  activeVariantIds: createEmptyActiveVariantIds(),
  slotEnabled: createDefaultSlotEnabled(),

  setSlotEnabled: (slot, enabled) => {
    set((state) => {
      const nextSlotEnabled = { ...state.slotEnabled, [slot]: enabled };
      const updatedVariants = state.variants.map((v) =>
        v.id === state.activeVariantId
          ? {
              ...v,
              slotEnabled: { ...(v.slotEnabled || {}), [slot]: enabled },
              updatedAt: new Date().toISOString()
            }
          : v
      );
      const nextState = { ...state, slotEnabled: nextSlotEnabled, variants: updatedVariants };
      return {
        slotEnabled: nextSlotEnabled,
        variants: updatedVariants,
        activeMapsCount: countActiveMaps(nextState)
      };
    });
  },

  toggleSlotEnabled: (slot) => {
    set((state) => {
      const current = state.slotEnabled[slot] ?? true;
      const nextSlotEnabled = { ...state.slotEnabled, [slot]: !current };
      const updatedVariants = state.variants.map((v) =>
        v.id === state.activeVariantId
          ? {
              ...v,
              slotEnabled: { ...(v.slotEnabled || {}), [slot]: !current },
              updatedAt: new Date().toISOString()
            }
          : v
      );
      const nextState = { ...state, slotEnabled: nextSlotEnabled, variants: updatedVariants };
      return {
        slotEnabled: nextSlotEnabled,
        variants: updatedVariants,
        activeMapsCount: countActiveMaps(nextState)
      };
    });
  },

  addMapVariant: (slot, item) => {
    set((state) => {
      const updatedVariants = [...state.mapVariants[slot], item];
      const newMapVariants = { ...state.mapVariants, [slot]: updatedVariants };
      const newActiveIds = { ...state.activeVariantIds, [slot]: item.id };
      const mapKey = `${slot}Map` as const;
      const newSlotMap = {
        url: item.url,
        filePath: item.filePath,
        fileName: item.fileName,
        fileSize: item.fileSize || 0
      };

      const updatedEntryVariants = state.variants.map((v) =>
        v.id === state.activeVariantId
          ? {
              ...v,
              maps: {
                ...v.maps,
                [slot]: {
                  fileName: item.fileName,
                  filePath: item.filePath,
                  fileSize: item.fileSize || 0,
                  url: item.url
                }
              },
              updatedAt: new Date().toISOString()
            }
          : v
      );

      const newState = {
        ...state,
        variants: updatedEntryVariants,
        mapVariants: newMapVariants,
        activeVariantIds: newActiveIds,
        [mapKey]: newSlotMap,
        ...(slot === 'baseColor'
          ? {
              colorways: updatedVariants.map((v) => ({
                id: v.id,
                name: v.name,
                baseColorUrl: v.url,
                baseColorFilePath: v.filePath,
                fileName: v.fileName,
                fileSize: v.fileSize
              })),
              activeColorwayId: item.id
            }
          : {})
      };

      return {
        ...newState,
        activeMapsCount: countActiveMaps(newState)
      };
    });
  },

  selectMapVariant: (slot, id) => {
    const target = get().mapVariants[slot]?.find((v) => v.id === id);
    if (target) {
      const mapKey = `${slot}Map` as const;
      const newSlotMap = {
        url: target.url,
        filePath: target.filePath,
        fileName: target.fileName,
        fileSize: target.fileSize || 0
      };

      const updatedEntryVariants = get().variants.map((v) =>
        v.id === get().activeVariantId
          ? {
              ...v,
              maps: {
                ...v.maps,
                [slot]: {
                  fileName: target.fileName,
                  filePath: target.filePath,
                  fileSize: target.fileSize || 0,
                  url: target.url
                }
              },
              updatedAt: new Date().toISOString()
            }
          : v
      );

      set((state) => ({
        variants: updatedEntryVariants,
        activeVariantIds: { ...state.activeVariantIds, [slot]: id },
        [mapKey]: newSlotMap,
        ...(slot === 'baseColor' ? { activeColorwayId: id } : {})
      }));
    }
  },

  removeMapVariant: (slot, id) => {
    set((state) => {
      const filtered = state.mapVariants[slot].filter((v) => v.id !== id);
      const wasActive = state.activeVariantIds[slot] === id;
      const nextActive = wasActive ? filtered[0]?.id || null : state.activeVariantIds[slot];
      const nextTarget = filtered.find((v) => v.id === nextActive);
      const mapKey = `${slot}Map` as const;
      const nextSlotMap = nextTarget
        ? {
            url: nextTarget.url,
            filePath: nextTarget.filePath,
            fileName: nextTarget.fileName,
            fileSize: nextTarget.fileSize || 0
          }
        : { ...emptySlot };

      const newMapVariants = { ...state.mapVariants, [slot]: filtered };
      const newActiveIds = { ...state.activeVariantIds, [slot]: nextActive };

      const updatedEntryVariants = state.variants.map((v) => {
        if (v.id === state.activeVariantId) {
          const nextMaps = { ...v.maps };
          if (nextTarget) {
            nextMaps[slot] = {
              fileName: nextTarget.fileName,
              filePath: nextTarget.filePath,
              fileSize: nextTarget.fileSize || 0,
              url: nextTarget.url
            };
          } else {
            delete nextMaps[slot];
          }
          return { ...v, maps: nextMaps, updatedAt: new Date().toISOString() };
        }
        return v;
      });

      const newState = {
        ...state,
        variants: updatedEntryVariants,
        mapVariants: newMapVariants,
        activeVariantIds: newActiveIds,
        [mapKey]: nextSlotMap,
        ...(slot === 'baseColor'
          ? {
              colorways: filtered.map((v) => ({
                id: v.id,
                name: v.name,
                baseColorUrl: v.url,
                baseColorFilePath: v.filePath,
                fileName: v.fileName,
                fileSize: v.fileSize
              })),
              activeColorwayId: nextActive
            }
          : {})
      };

      return {
        ...newState,
        activeMapsCount: countActiveMaps(newState)
      };
    });
  },

  renameMapVariant: (slot, id, name) => {
    set((state) => {
      const updated = state.mapVariants[slot].map((v) => (v.id === id ? { ...v, name } : v));
      const isActive = state.activeVariantIds[slot] === id;
      const mapKey = `${slot}Map` as const;
      return {
        mapVariants: { ...state.mapVariants, [slot]: updated },
        ...(isActive && state[mapKey].url
          ? {
              [mapKey]: {
                ...state[mapKey],
                fileName: name
              }
            }
          : {}),
        ...(slot === 'baseColor'
          ? {
              colorways: updated.map((v) => ({
                id: v.id,
                name: v.name,
                baseColorUrl: v.url,
                baseColorFilePath: v.filePath,
                fileName: v.fileName,
                fileSize: v.fileSize
              }))
            }
          : {})
      };
    });
  },

  updateMapVariant: (slot, id, data) => {
    set((state) => {
      const oldTarget = state.mapVariants[slot].find((x) => x.id === id);
      const updated = state.mapVariants[slot].map((v) => (v.id === id ? { ...v, ...data } : v));
      const target = updated.find((v) => v.id === id);
      const isActive = state.activeVariantIds[slot] === id;
      const mapKey = `${slot}Map` as const;

      const updatedEntryVariants = state.variants.map((v) => {
        const vMap = v.maps?.[slot];
        if (vMap && target) {
          if (
            vMap.id === id ||
            (oldTarget?.filePath && vMap.filePath === oldTarget.filePath) ||
            (v.id === state.activeVariantId && isActive)
          ) {
            return {
              ...v,
              maps: {
                ...v.maps,
                [slot]: {
                  id: target.id,
                  fileName: target.fileName,
                  filePath: target.filePath,
                  fileSize: target.fileSize || 0,
                  url: target.url
                }
              },
              updatedAt: new Date().toISOString()
            };
          }
        }
        return v;
      });

      return {
        variants: updatedEntryVariants,
        mapVariants: { ...state.mapVariants, [slot]: updated },
        ...(isActive && target
          ? {
              [mapKey]: {
                url: target.url,
                filePath: target.filePath,
                fileName: target.fileName,
                fileSize: target.fileSize || 0
              }
            }
          : {}),
        ...(slot === 'baseColor'
          ? {
              colorways: updated.map((v) => ({
                id: v.id,
                name: v.name,
                baseColorUrl: v.url,
                baseColorFilePath: v.filePath,
                fileName: v.fileName,
                fileSize: v.fileSize
              }))
            }
          : {})
      };
    });
  },

  useOrmPack: true,
  setUseOrmPack: (useOrmPack) => set({ useOrmPack }),

  loadFromCache: false,
  setLoadFromCache: (loadFromCache) => set({ loadFromCache }),
  toggleLoadFromCache: () => set((state) => ({ loadFromCache: !state.loadFromCache })),

  setMapSlot: (slot, data) => {
    const mapKey = `${slot}Map` as const;
    const partial = { [mapKey]: data };

    const activeId = get().activeVariantId;
    const updatedEntryVariants = get().variants.map((v) => {
      if (v.id === activeId) {
        const nextMaps = { ...v.maps };
        if (data.filePath || data.url) {
          nextMaps[slot] = {
            fileName: data.fileName || `${slot}.webp`,
            filePath: data.filePath || '',
            fileSize: data.fileSize || 0,
            url: data.url || ''
          };
        } else {
          delete nextMaps[slot];
        }
        return { ...v, maps: nextMaps, updatedAt: new Date().toISOString() };
      }
      return v;
    });

    const all = { ...get(), ...partial, variants: updatedEntryVariants };
    set({ ...partial, variants: updatedEntryVariants, activeMapsCount: countActiveMaps(all) });

    if (data.url) {
      const { mapVariants, activeVariantIds } = get();
      const currentVariants = mapVariants[slot] || [];
      const currentActiveId = activeVariantIds[slot];

      if (currentVariants.length === 0) {
        const initialVar: MapVariantItem = {
          id: `${slot}-${Date.now()}`,
          name: data.fileName ? data.fileName.replace(/\.[^/.]+$/, '') : `${slot} 1`,
          url: data.url,
          filePath: data.filePath || '',
          fileName: data.fileName || `${slot}.webp`,
          fileSize: data.fileSize || 0
        };
        const updatedVariants = [initialVar];
        set((state) => ({
          mapVariants: { ...state.mapVariants, [slot]: updatedVariants },
          activeVariantIds: { ...state.activeVariantIds, [slot]: initialVar.id },
          ...(slot === 'baseColor'
            ? {
                colorways: updatedVariants.map((v) => ({
                  id: v.id,
                  name: v.name,
                  baseColorUrl: v.url,
                  baseColorFilePath: v.filePath,
                  fileName: v.fileName,
                  fileSize: v.fileSize
                })),
                activeColorwayId: initialVar.id
              }
            : {})
        }));
      } else if (currentActiveId) {
        const updatedVariants = currentVariants.map((v) =>
          v.id === currentActiveId
            ? {
                ...v,
                url: data.url!,
                filePath: data.filePath || '',
                fileName: data.fileName || v.fileName,
                fileSize: data.fileSize || v.fileSize
              }
            : v
        );
        set((state) => ({
          mapVariants: { ...state.mapVariants, [slot]: updatedVariants },
          ...(slot === 'baseColor'
            ? {
                colorways: updatedVariants.map((v) => ({
                  id: v.id,
                  name: v.name,
                  baseColorUrl: v.url,
                  baseColorFilePath: v.filePath,
                  fileName: v.fileName,
                  fileSize: v.fileSize
                }))
              }
            : {})
        }));
      }
    }
  },

  clearMapSlot: (slot) => {
    const mapKey = `${slot}Map` as const;
    const partial = { [mapKey]: { ...emptySlot } };

    const activeId = get().activeVariantId;
    const updatedEntryVariants = get().variants.map((v) => {
      if (v.id === activeId) {
        const nextMaps = { ...v.maps };
        delete nextMaps[slot];
        return { ...v, maps: nextMaps, updatedAt: new Date().toISOString() };
      }
      return v;
    });

    const all = { ...get(), ...partial, variants: updatedEntryVariants };
    set((state) => ({
      ...partial,
      variants: updatedEntryVariants,
      mapVariants: { ...state.mapVariants, [slot]: [] },
      activeVariantIds: { ...state.activeVariantIds, [slot]: null },
      ...(slot === 'baseColor'
        ? {
            colorways: [],
            activeColorwayId: null
          }
        : {}),
      activeMapsCount: countActiveMaps(all)
    }));
  },

  // Sliders & Material Parameters
  normalScale: 1.0,
  normalInvertY: false,
  roughnessFactor: 1.0,
  metalnessFactor: 1.0,
  aoIntensity: 1.0,
  emissiveIntensity: 1.0,
  emissiveColor: '#ffffff',
  clearcoatFactor: 0.0,
  clearcoatRoughness: 0.1,
  sheenColor: '#ffffff',
  sheenRoughness: 0.5,
  transmissionFactor: 0.0,
  ior: 1.5,
  displacementScale: 0.02,

  setNormalScale: (normalScale) =>
    set((state) => ({
      normalScale,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), normalScale }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setNormalInvertY: (normalInvertY) =>
    set((state) => ({
      normalInvertY,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), normalInvertY }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setRoughnessFactor: (roughnessFactor) =>
    set((state) => ({
      roughnessFactor,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), roughnessFactor }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setMetalnessFactor: (metalnessFactor) =>
    set((state) => ({
      metalnessFactor,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), metalnessFactor }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setAoIntensity: (aoIntensity) =>
    set((state) => ({
      aoIntensity,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), aoIntensity }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setEmissiveIntensity: (emissiveIntensity) =>
    set((state) => ({
      emissiveIntensity,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), emissiveIntensity }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setEmissiveColor: (emissiveColor) =>
    set((state) => ({
      emissiveColor,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), emissiveColor }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setClearcoatFactor: (clearcoatFactor) =>
    set((state) => ({
      clearcoatFactor,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), clearcoatFactor }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setClearcoatRoughness: (clearcoatRoughness) =>
    set((state) => ({
      clearcoatRoughness,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), clearcoatRoughness }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setSheenColor: (sheenColor) =>
    set((state) => ({
      sheenColor,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), sheenColor }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setSheenRoughness: (sheenRoughness) =>
    set((state) => ({
      sheenRoughness,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), sheenRoughness }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setTransmissionFactor: (transmissionFactor) =>
    set((state) => ({
      transmissionFactor,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), transmissionFactor }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setIor: (ior) =>
    set((state) => ({
      ior,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), ior }, updatedAt: new Date().toISOString() }
          : v
      )
    })),
  setDisplacementScale: (displacementScale) =>
    set((state) => ({
      displacementScale,
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), displacementScale }, updatedAt: new Date().toISOString() }
          : v
      )
    })),

  // Debug Channel
  debugChannel: 'lit',
  setDebugChannel: (debugChannel) => set({ debugChannel }),

  // Backward compatible BaseColor Colorways
  colorways: [],
  activeColorwayId: null,

  addColorway: (item) => {
    get().addMapVariant('baseColor', {
      id: item.id,
      name: item.name,
      url: item.baseColorUrl,
      filePath: item.baseColorFilePath,
      fileName: item.fileName,
      fileSize: item.fileSize || 0
    });
  },

  selectColorway: (id) => {
    get().selectMapVariant('baseColor', id);
  },

  removeColorway: (id) => {
    get().removeMapVariant('baseColor', id);
  },

  renameColorway: (id, name) => {
    get().renameMapVariant('baseColor', id, name);
  },

  updateColorway: (id, data) => {
    get().updateMapVariant('baseColor', id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.baseColorUrl !== undefined ? { url: data.baseColorUrl } : {}),
      ...(data.baseColorFilePath !== undefined ? { filePath: data.baseColorFilePath } : {}),
      ...(data.fileName !== undefined ? { fileName: data.fileName } : {}),
      ...(data.fileSize !== undefined ? { fileSize: data.fileSize } : {})
    });
  },

  // Modals
  isOrmPackerOpen: false,
  openOrmPacker: () => set({ isOrmPackerOpen: true }),
  closeOrmPacker: () => set({ isOrmPackerOpen: false }),

  generateExportConfig: () => {
    const state = get();
    const dims = state.modelStats?.dimensions || { width: 0.8, height: 0.85, depth: 0.8 };

    const isNormalEnabled = state.slotEnabled?.normal ?? true;
    const isOrmEnabled = state.slotEnabled?.orm ?? true;
    const isBaseColorEnabled = state.slotEnabled?.baseColor ?? true;

    const materialProfile: MaterialProfile = {
      id: 'default-profile',
      name: `${state.productName} Acabado`,
      normalMapUrl: isNormalEnabled ? (state.normalMap.url || '') : '',
      ormMapUrl: isOrmEnabled ? (state.ormMap.url || '') : '',
      normalScale: state.normalScale,
      roughnessFactor: state.roughnessFactor,
      metalnessFactor: state.metalnessFactor,
      aoIntensity: state.aoIntensity
    };

    const combinations: Record<string, VariantTextureCombination> = {};
    const baseVariants = isBaseColorEnabled
      ? (state.mapVariants.baseColor.length > 0
          ? state.mapVariants.baseColor
          : state.baseColorMap.url
          ? [{ id: 'baseColor-1', name: state.baseColorMap.fileName || 'BaseColor', url: state.baseColorMap.url, filePath: state.baseColorMap.filePath || '', fileName: state.baseColorMap.fileName || 'baseColor.webp' }]
          : [])
      : [];

    const options = baseVariants.map((c) => {
      const optId = c.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      combinations[`variante:${optId}`] = {
        combinationKey: `variante:${optId}`,
        baseColorMapUrl: c.url,
        materialProfileId: 'default-profile',
        name: c.name
      };
      return {
        id: optId,
        name: c.name
      };
    });

    const optionGroups: OptionGroup[] = [
      {
        id: 'variante',
        name: 'Variante de Color',
        options
      }
    ];

    const defaultKey = Object.keys(combinations)[0] || '';

    return {
      version: '1.0',
      productId: state.productId,
      productName: state.productName,
      modelUrl: state.modelFilePath ? state.modelFilePath.split(/[\\/]/).pop() || 'model.glb' : 'model.glb',
      dimensions: dims,
      materialProfiles: {
        'default-profile': materialProfile
      },
      optionGroups,
      combinations,
      defaultCombinationKey: defaultKey,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        exportedBy: 'Mirage 3D Workbench',
        triangleCount: state.modelStats?.triangleCount,
        polycount: state.modelStats?.triangleCount
      }
    };
  }
}));
