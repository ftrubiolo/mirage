import { EntryVariant, EntryVariantMapSlot } from '../types/library';
import { ModelStats, useModelStore } from './modelStore';
import {
  ALL_SLOT_NAMES,
  DebugChannel,
  PbrMaterialParameters,
  PbrSlotMap,
  SlotName,
  countActiveMaps,
  createDefaultSlotEnabled,
  defaultPbrParameters,
  emptySlot,
  usePbrMaterialStore
} from './pbrMaterialStore';
import {
  ColorwayItem,
  MapVariantItem,
  createEmptyActiveVariantIds,
  createEmptyMapVariants,
  deriveColorways,
  useVariantStore
} from './variantStore';
import { generateExportConfigFromStores } from './exportConfigGenerator';
import { Product3DConfig } from '../types/config';

/**
 * Cross-store orchestration that is deliberately *not* a store.
 *
 * Loading a library entry and resetting the workbench each touch all three
 * domain stores. Keeping that choreography in a plain module means the stores
 * stay independent of one another and no consumer has to subscribe to a
 * combined mirror of all workbench state.
 */

export interface LoadWorkbenchData {
  productId: string;
  productSlug: string;
  productName: string;
  modelFilePath: string | null;
  modelUrl: string | null;
  modelFileSize?: number;
  dimensions?: { width: number; height: number; depth: number } | null;
  stats?: { triangleCount: number; vertexCount: number; meshCount: number } | null;
  maps?: Partial<Record<SlotName, PbrSlotMap>>;
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

/**
 * Hydrates all three domain stores from a library entry payload.
 *
 * The model URL is cache-busted only when the underlying file actually changes,
 * so re-hydrating the same entry does not force a needless re-fetch and
 * re-upload of the GLB.
 */
export function loadWorkbenchState(data: LoadWorkbenchData): void {
  const s = data.settings || {};
  const unitScale = s.unitScale ?? 1.0;
  const unitType = s.unitType ?? 'm';

  // 1. Model store hydration
  const modelStats: ModelStats | null = data.stats
    ? {
        triangleCount: data.stats.triangleCount,
        vertexCount: data.stats.vertexCount,
        meshCount: data.stats.meshCount,
        materials: [],
        dimensions: data.dimensions || { width: 0.8, height: 0.85, depth: 0.8 }
      }
    : null;

  const currentFullUrl = useModelStore.getState().modelUrl;
  const currentCleanUrl = currentFullUrl ? currentFullUrl.split('?')[0] : null;
  const newCleanUrl = data.modelUrl ? data.modelUrl.split('?')[0] : null;
  const isModelChanging = Boolean(data.modelUrl) && newCleanUrl !== currentCleanUrl;

  let resolvedModelUrl: string | null = null;
  if (data.modelUrl) {
    if (!isModelChanging && currentFullUrl) {
      resolvedModelUrl = currentFullUrl;
    } else if (data.modelUrl.startsWith('blob:') || data.modelUrl.startsWith('data:')) {
      resolvedModelUrl = data.modelUrl;
    } else {
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      resolvedModelUrl = `${newCleanUrl}?t=${uniqueSuffix}`;
    }
  }

  useModelStore.setState({
    productId: data.productId,
    productSlug: data.productSlug,
    productName: data.productName,
    modelFilePath: data.modelFilePath,
    modelUrl: resolvedModelUrl,
    modelFileSize: data.modelFileSize || 0,
    modelStats,
    rawDimensions: data.dimensions || null,
    unitScale,
    unitType,
    isModelLoading: isModelChanging
  });

  // 2. Variant store hydration
  const initialSlotEnabled = data.slotEnabled
    ? { ...createDefaultSlotEnabled(), ...data.slotEnabled }
    : createDefaultSlotEnabled();

  let loadedVariants: EntryVariant[] = [];
  if (data.variants && data.variants.length > 0) {
    loadedVariants = data.variants.map((v) => ({
      ...v,
      maps: { ...(v.maps || {}) },
      slotEnabled: v.slotEnabled
        ? { ...createDefaultSlotEnabled(), ...v.slotEnabled }
        : createDefaultSlotEnabled(),
      settings: { ...(v.settings || {}) }
    }));
  } else {
    const fallbackMaps: Record<string, EntryVariantMapSlot> = {};
    for (const slot of ALL_SLOT_NAMES) {
      const m = data.maps?.[slot];
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
        settings: s as EntryVariant['settings'],
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
  const targetVarSettings = (targetVar.settings as typeof s) || s;
  const targetVarSlotEnabled = targetVar.slotEnabled || initialSlotEnabled;

  const initialMapVariants = createEmptyMapVariants();
  const initialActiveIds = createEmptyActiveVariantIds();
  const mapsObj: Record<string, PbrSlotMap> = {};

  for (const slot of ALL_SLOT_NAMES) {
    const mapKey = `${slot}Map`;
    const collected: MapVariantItem[] = [];

    const addUnique = (item: {
      id?: string;
      name?: string;
      url?: string;
      filePath?: string;
      fileName?: string;
      fileSize?: number;
    }) => {
      if (!item.filePath && !item.url) return;
      const exists = collected.some(
        (c) =>
          (item.id && c.id === item.id) ||
          (item.filePath && c.filePath === item.filePath) ||
          (item.fileName && c.fileName === item.fileName)
      );
      if (!exists) {
        collected.push({
          id:
            item.id ||
            `${slot}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name:
            item.name ||
            (item.fileName
              ? item.fileName.replace(/\.[^/.]+$/, '')
              : `${slot} ${collected.length + 1}`),
          url:
            item.url ||
            (item.filePath && window.electronAPI?.toAssetUrl
              ? window.electronAPI.toAssetUrl(item.filePath)
              : '') ||
            '',
          filePath: item.filePath || '',
          fileName: item.fileName || `${slot}.webp`,
          fileSize: item.fileSize || 0
        });
      }
    };

    if (data.mapVariants?.[slot]) for (const mv of data.mapVariants[slot]!) addUnique(mv);
    for (const v of loadedVariants) if (v.maps?.[slot]) addUnique(v.maps[slot]);
    if (slot === 'baseColor' && data.colorways) {
      for (const c of data.colorways) {
        addUnique({
          id: c.id,
          name: c.name,
          url: c.baseColorUrl,
          filePath: c.baseColorFilePath,
          fileName: c.fileName,
          fileSize: c.fileSize
        });
      }
    }
    if (data.maps?.[slot]?.filePath || data.maps?.[slot]?.url) {
      const m = data.maps[slot]!;
      addUnique({
        url: m.url || undefined,
        filePath: m.filePath || undefined,
        fileName: m.fileName || undefined,
        fileSize: m.fileSize
      });
    }

    initialMapVariants[slot] = collected;

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

  useVariantStore.setState({
    variants: loadedVariants,
    activeVariantId: targetVarId,
    mapVariants: initialMapVariants,
    activeVariantIds: initialActiveIds
  });

  // 3. PBR material store hydration
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
    clearcoatRoughness:
      targetVarSettings.clearcoatRoughness ?? defaultPbrParameters.clearcoatRoughness,
    sheenColor: targetVarSettings.sheenColor ?? defaultPbrParameters.sheenColor,
    sheenRoughness: targetVarSettings.sheenRoughness ?? defaultPbrParameters.sheenRoughness,
    transmissionFactor:
      targetVarSettings.transmissionFactor ?? defaultPbrParameters.transmissionFactor,
    ior: targetVarSettings.ior ?? defaultPbrParameters.ior,
    displacementScale:
      targetVarSettings.displacementScale ?? defaultPbrParameters.displacementScale
  };

  usePbrMaterialStore.setState({
    ...pbrPartial,
    activeMapsCount: countActiveMaps(pbrPartial)
  });
}

/** Resets every domain store. The ORM dialog flag is UI state and is left alone. */
export function resetWorkbenchStores(): void {
  useModelStore.getState().resetModel();
  usePbrMaterialStore.getState().resetPbrMaterials();
  useVariantStore.getState().resetVariants();
}

/**
 * The single entry point for editing a material parameter from the UI or the
 * agent.
 *
 * Two stores have to move together: the live material, and the active variant
 * that has to remember the value so it survives a variant switch and a save to
 * disk. Doing that coordination here — instead of inside either store — is what
 * keeps the stores independent of one another.
 */
export function setMaterialProperty<K extends keyof PbrMaterialParameters>(
  key: K,
  value: PbrMaterialParameters[K]
): void {
  usePbrMaterialStore.getState().setPbrProperty(key, value);
  useVariantStore.getState().syncActiveVariantParameters({ [key]: value });
}

/** Applies or clears a texture map slot and records it on the active variant. */
export function setMapSlotForActiveVariant(slot: SlotName, data: PbrSlotMap | null): void {
  if (data) {
    usePbrMaterialStore.getState().setMapSlot(slot, data);
  } else {
    usePbrMaterialStore.getState().clearMapSlot(slot);
  }
  useVariantStore.getState().syncActiveVariantSlot(slot, data);
}

/** Builds the web export descriptor from the three domain stores. */
export function generateExportConfig(): Product3DConfig {
  return generateExportConfigFromStores(
    useModelStore.getState(),
    usePbrMaterialStore.getState(),
    useVariantStore.getState()
  );
}
