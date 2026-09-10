import { create } from 'zustand';
import { Product3DConfig } from '../types/config';
import { EntryVariant, EntryVariantMapSlot } from '../types/library';

// Re-export all domain sub-store definitions, types, and hooks
export * from './modelStore';
export * from './pbrMaterialStore';
export * from './variantStore';
export * from './exportConfigGenerator';

import {
  ModelState,
  initialModelState,
  useModelStore,
  ModelStats
} from './modelStore';

import {
  SlotName,
  ALL_SLOT_NAMES,
  PbrSlotMap,
  emptySlot,
  createDefaultSlotEnabled,
  defaultPbrParameters,
  initialPbrMaps,
  PbrMaterialState,
  usePbrMaterialStore,
  countActiveMaps,
  DebugChannel
} from './pbrMaterialStore';

import {
  MapVariantItem,
  ColorwayItem,
  createEmptyMapVariants,
  createEmptyActiveVariantIds,
  VariantState,
  useVariantStore,
  deriveColorways
} from './variantStore';

import { generateExportConfigFromStores } from './exportConfigGenerator';

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
    emissiveFullGlow?: boolean;
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

export interface WorkbenchState extends ModelState, PbrMaterialState, VariantState {
  isOrmPackerOpen: boolean;
  openOrmPacker: () => void;
  closeOrmPacker: () => void;
  loadWorkbenchState: (data: LoadWorkbenchData) => void;
  resetAll: () => void;
  generateExportConfig: () => Product3DConfig;
}

const initialVariants: EntryVariant[] = [
  {
    id: 'var-default',
    name: 'Default',
    isDefault: true,
    maps: {},
    slotEnabled: createDefaultSlotEnabled(),
    settings: {}
  }
];

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  // --- Model Slice State & Actions ---
  ...initialModelState,
  setProductMeta: (id, name) => useModelStore.getState().setProductMeta(id, name),
  setModel: (path, url, size) => useModelStore.getState().setModel(path, url, size),
  setModelStats: (stats) => useModelStore.getState().setModelStats(stats),
  setIsModelLoading: (val) => useModelStore.getState().setIsModelLoading(val),
  setUnitScale: (scale, unitType) => useModelStore.getState().setUnitScale(scale, unitType),
  resetModel: () => useModelStore.getState().resetModel(),

  // --- PBR Material Slice State & Actions ---
  ...defaultPbrParameters,
  ...initialPbrMaps,
  slotEnabled: createDefaultSlotEnabled(),
  useOrmPack: true,
  loadFromCache: false,
  debugChannel: 'lit',
  activeMapsCount: 0,

  setPbrProperty: (key, value) => {
    usePbrMaterialStore.getState().setPbrProperty(key, value);
    useVariantStore.getState().syncActiveVariantParameters({ [key]: value });
  },

  setNormalScale: (val) => get().setPbrProperty('normalScale', val),
  setNormalInvertY: (val) => get().setPbrProperty('normalInvertY', val),
  setRoughnessFactor: (val) => get().setPbrProperty('roughnessFactor', val),
  setMetalnessFactor: (val) => get().setPbrProperty('metalnessFactor', val),
  setAoIntensity: (val) => get().setPbrProperty('aoIntensity', val),
  setEmissiveIntensity: (val) => get().setPbrProperty('emissiveIntensity', val),
  setEmissiveColor: (val) => get().setPbrProperty('emissiveColor', val),
  setEmissiveFullGlow: (val) => get().setPbrProperty('emissiveFullGlow', val),
  setClearcoatFactor: (val) => get().setPbrProperty('clearcoatFactor', val),
  setClearcoatRoughness: (val) => get().setPbrProperty('clearcoatRoughness', val),
  setSheenColor: (val) => get().setPbrProperty('sheenColor', val),
  setSheenRoughness: (val) => get().setPbrProperty('sheenRoughness', val),
  setTransmissionFactor: (val) => get().setPbrProperty('transmissionFactor', val),
  setIor: (val) => get().setPbrProperty('ior', val),
  setDisplacementScale: (val) => get().setPbrProperty('displacementScale', val),

  setMapSlot: (slot, data) => {
    usePbrMaterialStore.getState().setMapSlot(slot, data);
    useVariantStore.getState().syncActiveVariantSlot(slot, data);
  },
  clearMapSlot: (slot) => {
    usePbrMaterialStore.getState().clearMapSlot(slot);
    useVariantStore.getState().syncActiveVariantSlot(slot, null);
  },
  setSlotEnabled: (slot, enabled) => usePbrMaterialStore.getState().setSlotEnabled(slot, enabled),
  toggleSlotEnabled: (slot) => usePbrMaterialStore.getState().toggleSlotEnabled(slot),
  setUseOrmPack: (val) => usePbrMaterialStore.getState().setUseOrmPack(val),
  setLoadFromCache: (val) => usePbrMaterialStore.getState().setLoadFromCache(val),
  toggleLoadFromCache: () => usePbrMaterialStore.getState().toggleLoadFromCache(),
  setDebugChannel: (ch) => usePbrMaterialStore.getState().setDebugChannel(ch),
  applyVariantMaterialState: (m, s, p) => usePbrMaterialStore.getState().applyVariantMaterialState(m, s, p),
  resetPbrMaterials: () => usePbrMaterialStore.getState().resetPbrMaterials(),

  // --- Variant Slice State & Actions ---
  variants: initialVariants,
  activeVariantId: 'var-default',
  mapVariants: createEmptyMapVariants(),
  activeVariantIds: createEmptyActiveVariantIds(),
  colorways: [],
  activeColorwayId: null,

  selectVariant: (id) => useVariantStore.getState().selectVariant(id),
  createVariant: (name, clone) => useVariantStore.getState().createVariant(name, clone),
  renameVariant: (id, name) => useVariantStore.getState().renameVariant(id, name),
  deleteVariant: (id) => useVariantStore.getState().deleteVariant(id),
  setVariantDefault: (id) => useVariantStore.getState().setVariantDefault(id),
  setVariantPoster: (id, url, file) => useVariantStore.getState().setVariantPoster(id, url, file),
  addMapVariant: (slot, item) => useVariantStore.getState().addMapVariant(slot, item),
  selectMapVariant: (slot, id) => useVariantStore.getState().selectMapVariant(slot, id),
  removeMapVariant: (slot, id) => useVariantStore.getState().removeMapVariant(slot, id),
  renameMapVariant: (slot, id, name) => useVariantStore.getState().renameMapVariant(slot, id, name),
  updateMapVariant: (slot, id, data) => useVariantStore.getState().updateMapVariant(slot, id, data),
  addColorway: (item) => useVariantStore.getState().addColorway(item),
  selectColorway: (id) => useVariantStore.getState().selectColorway(id),
  removeColorway: (id) => useVariantStore.getState().removeColorway(id),
  renameColorway: (id, name) => useVariantStore.getState().renameColorway(id, name),
  updateColorway: (id, data) => useVariantStore.getState().updateColorway(id, data),
  syncActiveVariantSlot: (slot, map) => useVariantStore.getState().syncActiveVariantSlot(slot, map),
  syncActiveVariantParameters: (params) => useVariantStore.getState().syncActiveVariantParameters(params),
  setVariants: (vars, actId) => useVariantStore.getState().setVariants(vars, actId),
  resetVariants: () => useVariantStore.getState().resetVariants(),

  // --- Modals ---
  isOrmPackerOpen: false,
  openOrmPacker: () => set({ isOrmPackerOpen: true }),
  closeOrmPacker: () => set({ isOrmPackerOpen: false }),

  // --- Export ---
  generateExportConfig: () => {
    return generateExportConfigFromStores(
      useModelStore.getState(),
      usePbrMaterialStore.getState(),
      useVariantStore.getState()
    );
  },

  // --- Hydration & Reset Orchestration ---
  loadWorkbenchState: (data: LoadWorkbenchData) => {
    const s = data.settings || {};
    const unitScale = s.unitScale ?? 1.0;
    const unitType = s.unitType ?? 'm';

    // 1. Model Store Hydration
    const modelStats: ModelStats | null = data.stats
      ? {
          triangleCount: data.stats.triangleCount,
          vertexCount: data.stats.vertexCount,
          meshCount: data.stats.meshCount,
          materials: [],
          dimensions: data.dimensions || { width: 0.8, height: 0.85, depth: 0.8 }
        }
      : null;

    useModelStore.setState({
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
      isModelLoading: Boolean(data.modelUrl) && data.modelUrl !== useModelStore.getState().modelUrl
    });

    // 2. Variant Store Hydration
    const initialSlotEnabled = data.slotEnabled
      ? { ...createDefaultSlotEnabled(), ...data.slotEnabled }
      : createDefaultSlotEnabled();

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

    const targetVarId =
      data.activeVariantId && loadedVariants.some((v) => v.id === data.activeVariantId)
        ? data.activeVariantId
        : loadedVariants.find((v) => v.isDefault)?.id || loadedVariants[0].id;

    const targetVar = loadedVariants.find((v) => v.id === targetVarId) || loadedVariants[0];
    const targetVarSettings = (targetVar.settings as any) || s;
    const targetVarSlotEnabled = targetVar.slotEnabled || initialSlotEnabled;

    const initialMapVariants = createEmptyMapVariants();
    const initialActiveIds = createEmptyActiveVariantIds();
    const mapsObj: Record<string, PbrSlotMap> = {};

    for (const slot of ALL_SLOT_NAMES) {
      const mapKey = `${slot}Map`;
      const collected: MapVariantItem[] = [];

      const addUnique = (item: { id?: string; name?: string; url?: string; filePath?: string; fileName?: string; fileSize?: number }) => {
        if (!item.filePath && !item.url) return;
        const exists = collected.some((c) =>
          (item.id && c.id === item.id) ||
          (item.filePath && c.filePath === item.filePath) ||
          (item.fileName && c.fileName === item.fileName)
        );
        if (!exists) {
          collected.push({
            id: item.id || `${slot}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: item.name || (item.fileName ? item.fileName.replace(/\.[^/.]+$/, '') : `${slot} ${collected.length + 1}`),
            url: item.url || (item.filePath && (window as any).electronAPI?.toAssetUrl ? (window as any).electronAPI.toAssetUrl(item.filePath) : '') || '',
            filePath: item.filePath || '', fileName: item.fileName || `${slot}.webp`, fileSize: item.fileSize || 0
          });
        }
      };

      if (data.mapVariants?.[slot]) for (const mv of data.mapVariants[slot]!) addUnique(mv);
      for (const v of loadedVariants) if (v.maps?.[slot]) addUnique(v.maps[slot]);
      if (slot === 'baseColor' && data.colorways) {
        for (const c of data.colorways) {
          addUnique({ id: c.id, name: c.name, url: c.baseColorUrl, filePath: c.baseColorFilePath, fileName: c.fileName, fileSize: c.fileSize });
        }
      }
      if (data.maps[slot]?.filePath || data.maps[slot]?.url) {
        const m = data.maps[slot]!;
        addUnique({ url: m.url || undefined, filePath: m.filePath || undefined, fileName: m.fileName || undefined, fileSize: m.fileSize });
      }

      initialMapVariants[slot] = collected;

      let activeId: string | null = null;
      const targetMap = targetVar.maps?.[slot];
      if (targetMap && (targetMap.filePath || targetMap.url)) {
        const matched = collected.find((c) =>
          (targetMap.id && c.id === targetMap.id) ||
          (targetMap.filePath && c.filePath === targetMap.filePath) ||
          (targetMap.fileName && c.fileName === targetMap.fileName) ||
          (targetMap.url && c.url === targetMap.url)
        );
        if (matched) {
          activeId = matched.id;
          mapsObj[mapKey] = { url: matched.url, filePath: matched.filePath || null, fileName: matched.fileName || null, fileSize: matched.fileSize || 0 };
        } else {
          mapsObj[mapKey] = { ...emptySlot };
        }
      } else if (data.activeVariantIds?.[slot]) {
        const matched = collected.find((c) => c.id === data.activeVariantIds![slot]);
        if (matched) {
          activeId = matched.id;
          mapsObj[mapKey] = { url: matched.url, filePath: matched.filePath || null, fileName: matched.fileName || null, fileSize: matched.fileSize || 0 };
        } else {
          mapsObj[mapKey] = { ...emptySlot };
        }
      } else if (collected.length > 0 && targetVar.isDefault) {
        activeId = collected[0].id;
        mapsObj[mapKey] = { url: collected[0].url, filePath: collected[0].filePath || null, fileName: collected[0].fileName || null, fileSize: collected[0].fileSize || 0 };
      } else {
        mapsObj[mapKey] = { ...emptySlot };
      }

      initialActiveIds[slot] = activeId;
    }

    useVariantStore.setState({
      variants: loadedVariants,
      activeVariantId: targetVarId,
      mapVariants: initialMapVariants,
      activeVariantIds: initialActiveIds,
      colorways: deriveColorways(initialMapVariants.baseColor),
      activeColorwayId: initialActiveIds.baseColor
    });

    // 3. PBR Store Hydration
    const nextSlotEnabled = { ...createDefaultSlotEnabled(), ...targetVarSlotEnabled };
    const pbrPartial = {
      ...mapsObj,
      slotEnabled: nextSlotEnabled,
      useOrmPack: s.useOrmPack ?? true,
      loadFromCache: s.loadFromCache ?? false,
      debugChannel: 'lit' as DebugChannel,
      normalScale: targetVarSettings.normalScale ?? defaultPbrParameters.normalScale,
      normalInvertY: targetVarSettings.normalInvertY ?? defaultPbrParameters.normalInvertY,
      roughnessFactor: targetVarSettings.roughnessFactor ?? defaultPbrParameters.roughnessFactor,
      metalnessFactor: targetVarSettings.metalnessFactor ?? defaultPbrParameters.metalnessFactor,
      aoIntensity: targetVarSettings.aoIntensity ?? defaultPbrParameters.aoIntensity,
      emissiveIntensity: targetVarSettings.emissiveIntensity ?? defaultPbrParameters.emissiveIntensity,
      emissiveColor: targetVarSettings.emissiveColor ?? defaultPbrParameters.emissiveColor,
      emissiveFullGlow: targetVarSettings.emissiveFullGlow ?? defaultPbrParameters.emissiveFullGlow,
      clearcoatFactor: targetVarSettings.clearcoatFactor ?? defaultPbrParameters.clearcoatFactor,
      clearcoatRoughness: targetVarSettings.clearcoatRoughness ?? defaultPbrParameters.clearcoatRoughness,
      sheenColor: targetVarSettings.sheenColor ?? defaultPbrParameters.sheenColor,
      sheenRoughness: targetVarSettings.sheenRoughness ?? defaultPbrParameters.sheenRoughness,
      transmissionFactor: targetVarSettings.transmissionFactor ?? defaultPbrParameters.transmissionFactor,
      ior: targetVarSettings.ior ?? defaultPbrParameters.ior,
      displacementScale: targetVarSettings.displacementScale ?? defaultPbrParameters.displacementScale
    };

    usePbrMaterialStore.setState({
      ...pbrPartial,
      activeMapsCount: countActiveMaps(pbrPartial)
    });
  },

  resetAll: () => {
    useModelStore.getState().resetModel();
    usePbrMaterialStore.getState().resetPbrMaterials();
    useVariantStore.getState().resetVariants();
    set({ isOrmPackerOpen: false });
  }
}));

function extractDataProperties<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'function') {
      result[k] = v;
    }
  }
  return result;
}

// Two-way synchronization: Subscribe domain stores to keep useWorkbenchStore updated
useModelStore.subscribe((state) => {
  useWorkbenchStore.setState(extractDataProperties(state));
});

usePbrMaterialStore.subscribe((state) => {
  useWorkbenchStore.setState(extractDataProperties(state));
});

useVariantStore.subscribe((state) => {
  useWorkbenchStore.setState(extractDataProperties(state));
});

// Intercept useWorkbenchStore.setState to propagate imperative updates to domain stores
const originalSetState = useWorkbenchStore.setState;
useWorkbenchStore.setState = (partial: any, replace?: any) => {
  originalSetState(partial, replace);
  const next = typeof partial === 'function' ? partial(useWorkbenchStore.getState()) : partial;
  if (!next || typeof next !== 'object') return;

  const modelKeys: (keyof ModelState)[] = [
    'productId', 'productSlug', 'productName', 'modelFilePath',
    'modelUrl', 'modelFileSize', 'isModelLoading', 'modelStats',
    'rawDimensions', 'unitScale', 'unitType'
  ];
  const modelPartial: any = {};
  for (const k of modelKeys) {
    if (k in next && !Object.is(useModelStore.getState()[k], next[k])) {
      modelPartial[k] = next[k];
    }
  }
  if (Object.keys(modelPartial).length > 0) useModelStore.setState(modelPartial);

  const pbrKeys: (keyof PbrMaterialState)[] = [
    'normalScale', 'normalInvertY', 'roughnessFactor', 'metalnessFactor', 'aoIntensity',
    'emissiveIntensity', 'emissiveColor', 'emissiveFullGlow', 'clearcoatFactor', 'clearcoatRoughness',
    'sheenColor', 'sheenRoughness', 'transmissionFactor', 'ior', 'displacementScale',
    'baseColorMap', 'normalMap', 'ormMap', 'aoMap', 'roughnessMap', 'metalnessMap',
    'emissiveMap', 'clearcoatMap', 'sheenMap', 'transmissionMap', 'alphaMap', 'displacementMap',
    'slotEnabled', 'useOrmPack', 'loadFromCache', 'debugChannel', 'activeMapsCount'
  ];
  const pbrPartial: any = {};
  for (const k of pbrKeys) {
    if (k in next && !Object.is(usePbrMaterialStore.getState()[k], next[k])) {
      pbrPartial[k] = next[k];
    }
  }
  if (Object.keys(pbrPartial).length > 0) usePbrMaterialStore.setState(pbrPartial);

  const variantKeys: (keyof VariantState)[] = [
    'variants', 'activeVariantId', 'mapVariants', 'activeVariantIds', 'colorways', 'activeColorwayId'
  ];
  const variantPartial: any = {};
  for (const k of variantKeys) {
    if (k in next && !Object.is(useVariantStore.getState()[k], next[k])) {
      variantPartial[k] = next[k];
    }
  }
  if (Object.keys(variantPartial).length > 0) useVariantStore.setState(variantPartial);
};
