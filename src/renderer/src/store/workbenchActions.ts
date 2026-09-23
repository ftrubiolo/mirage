import { EntryVariant, EntryVariantMapSlot, EntryVariantMaterial, TexturePool } from '../types/library';
import { migrateEntrySchema } from '../utils/entryMigration';
import { ModelStats, useModelStore } from './modelStore';
import {
  ALL_SLOT_NAMES,
  DebugChannel,
  MaterialPackingMode,
  PbrMaterialParameters,
  PbrSlotMap,
  SingleMaterialSlotData,
  SlotName,
  countActiveMaps,
  createDefaultMaterialSlotData,
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
  stats?: { triangleCount: number; vertexCount: number; meshCount: number; materials?: string[] } | null;
  texturePool?: TexturePool;
  maps?: Partial<Record<SlotName, PbrSlotMap>>;
  mapVariants?: Partial<Record<SlotName, MapVariantItem[]>>;
  activeVariantIds?: Partial<Record<SlotName, string | null>>;
  slotEnabled?: Partial<Record<SlotName, boolean>>;
  variants?: EntryVariant[];
  activeVariantId?: string | null;
  settings?: {
    baseColor?: string;
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
    materialPackingMode?: 'orm' | 'metalRoughness' | 'separate';
    loadFromCache?: boolean;
    modelRotation?: { x: number; y: number; z: number };
    autoGround?: boolean;
  };
  colorways?: ColorwayItem[];
  materials?: Record<string, EntryVariantMaterial>;
  materialMapVariants?: Record<string, Partial<Record<SlotName, any[]>>>;
  materialActiveVariantIds?: Partial<Record<string, Partial<Record<string, string | null>>>>;
  activeMaterialName?: string | null;
}

/**
 * Hydrates all three domain stores from a library entry payload.
 *
 * The model URL is cache-busted only when the underlying file actually changes,
 * so re-hydrating the same entry does not force a needless re-fetch and
 * re-upload of the GLB.
 */
export function loadWorkbenchState(data: LoadWorkbenchData): void {
  // Boundary normalization: if incoming data is unnormalized or legacy, migrate once right here
  if (!data.texturePool && (!data.variants || data.variants.length === 0 || !data.variants[0].materials)) {
    const migrated = migrateEntrySchema(data as any);
    data = {
      ...data,
      texturePool: migrated.texturePool,
      variants: migrated.variants,
      activeVariantId: data.activeVariantId || migrated.activeVariantId,
      stats: migrated.stats
    };
  }

  const s = data.settings || {};
  const unitScale = s.unitScale ?? 1.0;
  const unitType = s.unitType ?? 'm';
  const modelRotation = s.modelRotation || { x: 0, y: 0, z: 0 };
  const autoGround = s.autoGround ?? true;

  // 1. Model store hydration
  const detectedMaterials = data.stats?.materials || (data.texturePool ? Object.keys(data.texturePool) : []) || [];
  const modelStats: ModelStats | null = data.stats
    ? {
        triangleCount: data.stats.triangleCount,
        vertexCount: data.stats.vertexCount,
        meshCount: data.stats.meshCount,
        materials: detectedMaterials,
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
    modelRotation,
    autoGround,
    isModelLoading: isModelChanging
  });

  // 2. Variant store & PBR hydration
  const initialSlotEnabled = data.slotEnabled
    ? { ...createDefaultSlotEnabled(), ...data.slotEnabled }
    : createDefaultSlotEnabled();

  const loadedVariants: EntryVariant[] = (data.variants && data.variants.length > 0)
    ? data.variants.map((v) => ({
        ...v,
        maps: { ...(v.maps || {}) },
        materials: v.materials ? { ...v.materials } : undefined,
        slotEnabled: v.slotEnabled
          ? { ...createDefaultSlotEnabled(), ...v.slotEnabled }
          : createDefaultSlotEnabled(),
        settings: { ...(v.settings || {}) }
      }))
    : [
        {
          id: 'var-default',
          name: 'Default',
          isDefault: true,
          materials: {
            default: {
              assignedMapIds: createEmptyActiveVariantIds(),
              slotEnabled: initialSlotEnabled,
              settings: s as EntryVariant['settings']
            }
          },
          maps: {},
          slotEnabled: initialSlotEnabled,
          settings: s as EntryVariant['settings'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

  const targetVarId =
    data.activeVariantId && loadedVariants.some((v) => v.id === data.activeVariantId)
      ? data.activeVariantId
      : loadedVariants.find((v) => v.isDefault)?.id || loadedVariants[0].id;

  const targetVar = loadedVariants.find((v) => v.id === targetVarId) || loadedVariants[0];
  const targetVarSettings = (targetVar.settings as typeof s) || s;

  const poolSource: TexturePool = data.texturePool || {};

  const effectiveMatNames = detectedMaterials.length > 0
    ? detectedMaterials
    : Object.keys(poolSource).length > 0
      ? Object.keys(poolSource)
      : targetVar.materials
        ? Object.keys(targetVar.materials)
        : ['default'];

  const hasMultipleMaterials = effectiveMatNames.length > 1;
  const initialActiveMaterialName = hasMultipleMaterials
    ? (data.activeMaterialName && effectiveMatNames.includes(data.activeMaterialName)
        ? data.activeMaterialName
        : effectiveMatNames[0])
    : null;

  const initialMaterialMapVariants: Record<string, Record<SlotName, MapVariantItem[]>> = {};
  const initialMaterialActiveVariantIds: Record<string, Record<SlotName, string | null>> = {};
  const initialMaterialsState: Record<string, SingleMaterialSlotData> = {};

  for (const matName of effectiveMatNames) {
    const rawPool = poolSource[matName] || (data.materialMapVariants?.[matName] as any) || {};
    const matPools = createEmptyMapVariants();
    const matActiveIds = createEmptyActiveVariantIds();
    const matMaps: Record<string, PbrSlotMap> = {};

    const varMat = targetVar.materials?.[matName];
    const assignedIds = varMat?.assignedMapIds || (data.materialActiveVariantIds?.[matName] as any) || {};

    for (const slot of ALL_SLOT_NAMES) {
      const slotItems: MapVariantItem[] = (rawPool[slot] || []).map((item: any) => ({
        id: item.id || `${slot}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: item.name || (item.fileName ? item.fileName.replace(/\.[^/.]+$/, '') : `${slot}`),
        url: item.url || (item.filePath && (window as any).electronAPI?.toAssetUrl ? (window as any).electronAPI.toAssetUrl(item.filePath) : '') || '',
        filePath: item.filePath || '',
        fileName: item.fileName || `${slot}.webp`,
        fileSize: item.fileSize || 0
      }));

      // In-memory fallback if variant has map but pool didn't have it
      const vSlotMap = varMat?.maps?.[slot];
      if (vSlotMap && (vSlotMap.filePath || vSlotMap.url) && !slotItems.some((x) => x.id === vSlotMap.id || (vSlotMap.filePath && x.filePath === vSlotMap.filePath))) {
        slotItems.push({
          id: vSlotMap.id || `${slot}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: vSlotMap.fileName ? vSlotMap.fileName.replace(/\.[^/.]+$/, '') : `${slot}`,
          url: vSlotMap.url || (vSlotMap.filePath && (window as any).electronAPI?.toAssetUrl ? (window as any).electronAPI.toAssetUrl(vSlotMap.filePath) : '') || '',
          filePath: vSlotMap.filePath || '',
          fileName: vSlotMap.fileName || `${slot}.webp`,
          fileSize: vSlotMap.fileSize || 0
        });
      }

      matPools[slot] = slotItems;

      let activeId = assignedIds[slot] || (vSlotMap?.id) || null;
      if (activeId) {
        const matched = slotItems.find((i) => i.id === activeId || (vSlotMap?.filePath && i.filePath === vSlotMap.filePath));
        if (matched) {
          activeId = matched.id;
          matMaps[`${slot}Map`] = {
            url: matched.url,
            filePath: matched.filePath || null,
            fileName: matched.fileName || null,
            fileSize: matched.fileSize || 0
          };
        } else {
          matMaps[`${slot}Map`] = { ...emptySlot };
        }
      } else {
        matMaps[`${slot}Map`] = { ...emptySlot };
      }

      matActiveIds[slot] = activeId;
    }

    initialMaterialMapVariants[matName] = matPools;
    initialMaterialActiveVariantIds[matName] = matActiveIds;

    const matSlotEnabled = varMat?.slotEnabled
      ? { ...createDefaultSlotEnabled(), ...varMat.slotEnabled }
      : createDefaultSlotEnabled();

    const matSettings =
      (varMat?.settings as any) || (matName === initialActiveMaterialName ? targetVarSettings : {});
    const matPackingMode: MaterialPackingMode =
      matSettings.materialPackingMode || (matSettings.useOrmPack === false ? 'separate' : 'orm');

    const hasAssignedMaps = Object.values(matActiveIds).some(Boolean);
    const loadFromCache =
      matSettings.loadFromCache !== undefined
        ? matSettings.loadFromCache
        : hasMultipleMaterials && !hasAssignedMaps;

    initialMaterialsState[matName] = {
      ...defaultPbrParameters,
      ...(matMaps as any),
      slotEnabled: matSlotEnabled,
      useOrmPack: matPackingMode === 'orm',
      materialPackingMode: matPackingMode,
      loadFromCache,
      baseColor: matSettings.baseColor ?? defaultPbrParameters.baseColor,
      normalScale: matSettings.normalScale ?? defaultPbrParameters.normalScale,
      normalInvertY: matSettings.normalInvertY ?? defaultPbrParameters.normalInvertY,
      roughnessFactor: matSettings.roughnessFactor ?? defaultPbrParameters.roughnessFactor,
      metalnessFactor: matSettings.metalnessFactor ?? defaultPbrParameters.metalnessFactor,
      aoIntensity: matSettings.aoIntensity ?? defaultPbrParameters.aoIntensity,
      emissiveIntensity: matSettings.emissiveIntensity ?? defaultPbrParameters.emissiveIntensity,
      emissiveColor: matSettings.emissiveColor ?? defaultPbrParameters.emissiveColor,
      emissiveFullGlow: matSettings.emissiveFullGlow ?? defaultPbrParameters.emissiveFullGlow,
      clearcoatFactor: matSettings.clearcoatFactor ?? defaultPbrParameters.clearcoatFactor,
      clearcoatRoughness: matSettings.clearcoatRoughness ?? defaultPbrParameters.clearcoatRoughness,
      sheenColor: matSettings.sheenColor ?? defaultPbrParameters.sheenColor,
      sheenRoughness: matSettings.sheenRoughness ?? defaultPbrParameters.sheenRoughness,
      transmissionFactor: matSettings.transmissionFactor ?? defaultPbrParameters.transmissionFactor,
      ior: matSettings.ior ?? defaultPbrParameters.ior,
      displacementScale: matSettings.displacementScale ?? defaultPbrParameters.displacementScale
    };
  }

  const activeMatName = initialActiveMaterialName || effectiveMatNames[0];
  const activeMatPool = initialMaterialMapVariants[activeMatName] || createEmptyMapVariants();
  const activeMatActiveIds = initialMaterialActiveVariantIds[activeMatName] || createEmptyActiveVariantIds();
  const activeSlotData = initialMaterialsState[activeMatName];

  useVariantStore.setState({
    variants: loadedVariants,
    activeVariantId: targetVarId,
    texturePool: initialMaterialMapVariants,
    mapVariants: activeMatPool,
    activeVariantIds: activeMatActiveIds,
    materialMapVariants: initialMaterialMapVariants,
    materialActiveVariantIds: initialMaterialActiveVariantIds,
    activeMaterialName: initialActiveMaterialName
  });

  const nextSlotEnabled = { ...createDefaultSlotEnabled(), ...activeSlotData.slotEnabled };
  const rootData = {
    ...activeSlotData,
    slotEnabled: nextSlotEnabled,
    debugChannel: 'lit' as DebugChannel,
    activeMaterialName: initialActiveMaterialName,
    materialsState: hasMultipleMaterials ? initialMaterialsState : {},
    activeMapsCount: countActiveMaps(activeSlotData)
  };

  usePbrMaterialStore.setState(rootData);
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
