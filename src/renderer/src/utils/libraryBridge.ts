import {
  ALL_SLOT_NAMES,
  SlotName,
  PbrSlotMap,
  usePbrMaterialStore,
  createDefaultSlotEnabled,
  extractCurrentMaterialSlotData
} from '../store/pbrMaterialStore';
import { useModelStore } from '../store/modelStore';
import { useVariantStore } from '../store/variantStore';
import { loadWorkbenchState, resetWorkbenchStores } from '../store/workbenchActions';
import { useAppStore } from '../store/appStore';
import {
  LibraryEntry,
  FurnitureCategory,
  EntryVariant,
  EntryVariantMaterial,
  TexturePool,
  TextureAssetItem
} from '../types/library';
import { captureViewportSnapshot } from './viewportBridge';
import { getFileName, getFileExt, isPathInside } from './pathUtils';
import { migrateEntrySchema } from './entryMigration';

let isProgrammaticUpdate = false;
let lastSavedHash = '';
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let changeCheckTimer: ReturnType<typeof setTimeout> | null = null;

export const setProgrammaticUpdate = (val: boolean) => {
  isProgrammaticUpdate = val;
};

export const cancelAutoSave = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  if (changeCheckTimer) {
    clearTimeout(changeCheckTimer);
    changeCheckTimer = null;
  }
  useAppStore.getState().setIsAutoSaving(false);
};

export const computeWorkbenchHash = (): string => {
  const model = useModelStore.getState();
  const pbr = usePbrMaterialStore.getState();
  const variant = useVariantStore.getState();
  return JSON.stringify({
    name: model.productName,
    model: model.modelFilePath,
    modelFileSize: model.modelFileSize,
    unitScale: model.unitScale,
    unitType: model.unitType,
    modelRotation: model.modelRotation,
    autoGround: model.autoGround,
    activeMaterialName: pbr.activeMaterialName,
    pbr: {
      baseColor: pbr.baseColor,
      baseColorMap: pbr.baseColorMap?.filePath,
      normalMap: pbr.normalMap?.filePath,
      ormMap: pbr.ormMap?.filePath,
      aoMap: pbr.aoMap?.filePath,
      roughnessMap: pbr.roughnessMap?.filePath,
      metalnessMap: pbr.metalnessMap?.filePath,
      emissiveMap: pbr.emissiveMap?.filePath,
      clearcoatMap: pbr.clearcoatMap?.filePath,
      sheenMap: pbr.sheenMap?.filePath,
      transmissionMap: pbr.transmissionMap?.filePath,
      alphaMap: pbr.alphaMap?.filePath,
      dispMap: pbr.displacementMap?.filePath,
      normalScale: pbr.normalScale,
      normalInvertY: pbr.normalInvertY,
      roughnessFactor: pbr.roughnessFactor,
      metalnessFactor: pbr.metalnessFactor,
      aoIntensity: pbr.aoIntensity,
      emissiveIntensity: pbr.emissiveIntensity,
      emissiveColor: pbr.emissiveColor,
      emissiveFullGlow: pbr.emissiveFullGlow,
      clearcoatFactor: pbr.clearcoatFactor,
      clearcoatRoughness: pbr.clearcoatRoughness,
      sheenColor: pbr.sheenColor,
      sheenRoughness: pbr.sheenRoughness,
      transmissionFactor: pbr.transmissionFactor,
      ior: pbr.ior,
      displacementScale: pbr.displacementScale,
      useOrmPack: pbr.useOrmPack,
      materialPackingMode: pbr.materialPackingMode,
      loadFromCache: pbr.loadFromCache,
      slotEnabled: pbr.slotEnabled
    },
    materialsState: pbr.materialsState
      ? Object.entries(pbr.materialsState).map(([name, m]) => ({
          name,
          baseColor: m.baseColor,
          baseColorMap: m.baseColorMap?.filePath,
          normalMap: m.normalMap?.filePath,
          ormMap: m.ormMap?.filePath,
          aoMap: m.aoMap?.filePath,
          roughnessMap: m.roughnessMap?.filePath,
          metalnessMap: m.metalnessMap?.filePath,
          emissiveMap: m.emissiveMap?.filePath,
          clearcoatMap: m.clearcoatMap?.filePath,
          sheenMap: m.sheenMap?.filePath,
          transmissionMap: m.transmissionMap?.filePath,
          alphaMap: m.alphaMap?.filePath,
          dispMap: m.displacementMap?.filePath,
          normalScale: m.normalScale,
          normalInvertY: m.normalInvertY,
          roughnessFactor: m.roughnessFactor,
          metalnessFactor: m.metalnessFactor,
          aoIntensity: m.aoIntensity,
          emissiveIntensity: m.emissiveIntensity,
          emissiveColor: m.emissiveColor,
          emissiveFullGlow: m.emissiveFullGlow,
          clearcoatFactor: m.clearcoatFactor,
          clearcoatRoughness: m.clearcoatRoughness,
          sheenColor: m.sheenColor,
          sheenRoughness: m.sheenRoughness,
          transmissionFactor: m.transmissionFactor,
          ior: m.ior,
          displacementScale: m.displacementScale,
          useOrmPack: m.useOrmPack,
          materialPackingMode: m.materialPackingMode,
          loadFromCache: m.loadFromCache,
          slotEnabled: m.slotEnabled
        }))
      : [],
    texturePool: variant.texturePool,
    variants: Array.isArray(variant.variants)
      ? variant.variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          isDefault: v.isDefault,
          posterUrl: v.posterUrl,
          materials: v.materials
        }))
      : [],
    activeVariantId: variant.activeVariantId,
    activeVariantIds: variant.activeVariantIds,
    materialActiveVariantIds: variant.materialActiveVariantIds
  });
};

export const syncSavedHash = (hash?: string) => {
  lastSavedHash = hash !== undefined ? hash : computeWorkbenchHash();
};

export const handleWorkbenchChange = (): void => {
  // Guard 1: Ignore any programmatic store updates (loading, resetting, hydration)
  if (isProgrammaticUpdate) return;

  // Guard 2: Only auto-save if an entry is actively loaded in the workbench
  if (!useAppStore.getState().activeEntrySlug) return;

  // Hashing walks the whole variant/map tree, and store notifications arrive at
  // input-event rate while a slider is dragged. Coalesce the burst: the actual
  // write is debounced by 500ms anyway, so nothing is lost by checking late.
  if (changeCheckTimer) clearTimeout(changeCheckTimer);
  changeCheckTimer = setTimeout(() => {
    changeCheckTimer = null;
    if (isProgrammaticUpdate) return;
    if (!useAppStore.getState().activeEntrySlug) return;

    const currentHash = computeWorkbenchHash();
    if (!lastSavedHash) {
      lastSavedHash = currentHash;
      return;
    }

    if (lastSavedHash === currentHash) {
      return;
    }

    // A genuine user modification occurred -> update hash and trigger auto-save
    lastSavedHash = currentHash;
    autoSaveActiveEntry(false);
  }, 150);
};

export const resetWorkbench = async () => {
  await flushAutoSave();
  cancelAutoSave();
  useAppStore.getState().setActiveEntry(null);
  useAppStore.getState().setActiveEntrySlug(null);
  setProgrammaticUpdate(true);
  resetWorkbenchStores();
  syncSavedHash('');
  setProgrammaticUpdate(false);
};

export const loadEntryIntoWorkbench = async (entry: LibraryEntry, targetVariantId?: string) => {
  const t0 = performance.now();
  (window as any).__loadEntryStart = t0;

  // Flush any pending changes of the previously loaded entry before switching
  await flushAutoSave();
  cancelAutoSave();
  setProgrammaticUpdate(true);

  try {
    const activeSlug = useAppStore.getState().activeEntrySlug;
    const model = useModelStore.getState();
    const variant = useVariantStore.getState();

    // Ingestion boundary: normalize legacy or modern entries through migrateEntrySchema
    const normalizedEntry = migrateEntrySchema(entry);

    // If this entry is already open and loaded in the workbench, check if target variant needs switching
    if (activeSlug === normalizedEntry.slug && model.modelUrl) {
      if (targetVariantId && targetVariantId !== variant.activeVariantId) {
        variant.selectVariant(targetVariantId);
      }
      model.setIsModelLoading(false);
      useAppStore.getState().setView('workbench');
      return;
    }

    // Resolve model URL synchronously
    let modelUrl: string | null = null;
    const modelFileSize = normalizedEntry.modelFileSize || 0;
    if (normalizedEntry.modelFilePath) {
      modelUrl = window.electronAPI.toAssetUrl(normalizedEntry.modelFilePath);
    }

    // If model is already loaded and identical, ensure loading flag is off
    const cleanModelUrl = modelUrl ? modelUrl.split('?')[0] : null;
    const cleanStoreUrl = model.modelUrl ? model.modelUrl.split('?')[0] : null;
    if (!cleanModelUrl || cleanModelUrl === cleanStoreUrl) {
      model.setIsModelLoading(false);
    }

    // Resolve texturePool URLs
    const resolvedTexturePool: TexturePool = {};
    if (normalizedEntry.texturePool) {
      for (const [matName, slots] of Object.entries(normalizedEntry.texturePool)) {
        resolvedTexturePool[matName] = {};
        for (const [slot, items] of Object.entries(slots)) {
          resolvedTexturePool[matName][slot as SlotName] = (items || []).map((item) => ({
            ...item,
            url: item.filePath ? window.electronAPI.toAssetUrl(item.filePath) : item.url
          }));
        }
      }
    }

    // Resolve variant poster URLs
    const resolvedVariants: EntryVariant[] = (normalizedEntry.variants || []).map((v) => {
      let posterUrl = v.posterUrl;
      if ((v as any).posterFilePath) {
        posterUrl = window.electronAPI.toAssetUrl((v as any).posterFilePath);
      } else if (
        posterUrl &&
        !posterUrl.startsWith('http') &&
        !posterUrl.startsWith('blob:') &&
        !posterUrl.startsWith('asset:') &&
        !posterUrl.startsWith('data:')
      ) {
        posterUrl = window.electronAPI.toAssetUrl(posterUrl);
      }
      return {
        ...v,
        posterUrl
      };
    });

    // Apply entire state atomically to workbench stores
    loadWorkbenchState({
      productId: normalizedEntry.slug,
      productSlug: normalizedEntry.slug,
      productName: normalizedEntry.title,
      modelFilePath: normalizedEntry.modelFilePath || null,
      modelUrl,
      modelFileSize,
      dimensions: normalizedEntry.dimensions || null,
      stats: normalizedEntry.stats || null,
      texturePool: resolvedTexturePool,
      variants: resolvedVariants,
      activeVariantId: targetVariantId || normalizedEntry.activeVariantId || null,
      activeMaterialName:
        normalizedEntry.stats?.materials?.[0] || Object.keys(resolvedTexturePool)[0] || null
    });

    // Mark active in appStore
    useAppStore.getState().setActiveEntry(normalizedEntry);
    useAppStore.getState().setActiveEntrySlug(normalizedEntry.slug);

    // Sync baseline hash so no auto-save is triggered from loading
    syncSavedHash(computeWorkbenchHash());
  } finally {
    setProgrammaticUpdate(false);
  }

  useAppStore.getState().setView('workbench');
};

export const saveWorkbenchToLibrary = async (params: {
  title: string;
  slug: string;
  category?: FurnitureCategory;
  description?: string;
  status?: LibraryEntry['status'];
  skipPoster?: boolean;
}): Promise<LibraryEntry> => {
  const model = useModelStore.getState();
  const pbr = usePbrMaterialStore.getState();
  const variant = useVariantStore.getState();
  const currentActiveEntry = useAppStore.getState().activeEntry;
  const { slug, title } = params;
  const category = params.category || currentActiveEntry?.category || 'otro';
  const description = params.description !== undefined ? params.description : (currentActiveEntry?.description || '');
  const status = params.status || currentActiveEntry?.status || 'workshop';
  const skipPoster = params.skipPoster ?? false;

  // 1. Snapshot poster (preserve existing poster if skipPoster is true)
  let posterFileName: string | null = currentActiveEntry?.posterFileName || null;
  let posterUrl: string | null = currentActiveEntry?.posterUrl || null;
  if (!skipPoster) {
    try {
      const { blob } = await captureViewportSnapshot({ width: 800, height: 800, transparent: true, format: 'webp' });
      const buffer = await blob.arrayBuffer();
      const savedPoster = await window.electronAPI.writeBinaryToLibrary({
        entrySlug: slug,
        targetType: 'poster',
        ext: 'webp',
        buffer
      });
      posterFileName = savedPoster.fileName;
      posterUrl = window.electronAPI.toAssetUrl(savedPoster.filePath);

      // Also update active variant poster
      if (variant.activeVariantId) {
        variant.setVariantPoster(variant.activeVariantId, posterUrl, posterFileName);
      }
    } catch (err) {
      console.warn('Could not capture viewport snapshot for library entry:', err);
    }
  }

  // 2. Copy model to library if needed
  let finalModelPath = model.modelFilePath;
  let finalModelName = model.modelFilePath ? getFileName(model.modelFilePath) : null;

  if (model.modelFilePath && !isPathInside(model.modelFilePath, slug)) {
    try {
      const ext = getFileExt(model.modelFilePath).replace('.', '') || 'glb';
      const copied = await window.electronAPI.copyFileToLibrary({
        entrySlug: slug,
        sourceFilePath: model.modelFilePath,
        targetType: 'model',
        ext
      });
      finalModelPath = copied.filePath;
      finalModelName = copied.fileName;
    } catch (err) {
      console.warn('Could not copy model to library directory:', err);
    }
  }

  // 3. Determine detected materials
  const detectedMaterials: string[] =
    model.modelStats?.materials && model.modelStats.materials.length > 0
      ? model.modelStats.materials
      : pbr.materialsState && Object.keys(pbr.materialsState).length > 0
        ? Object.keys(pbr.materialsState)
        : variant.texturePool && Object.keys(variant.texturePool).length > 0
          ? Object.keys(variant.texturePool)
          : ['default'];

  // 4. Build central texturePool
  const texturePool: TexturePool = {};
  for (const mat of detectedMaterials) {
    texturePool[mat] = {};
    for (const slot of ALL_SLOT_NAMES) {
      const existingItems =
        variant.texturePool?.[mat]?.[slot] ||
        variant.materialMapVariants?.[mat]?.[slot] ||
        (mat === detectedMaterials[0] ? variant.mapVariants?.[slot] : []) ||
        [];

      texturePool[mat][slot] = existingItems.map((item) => ({
        id: item.id,
        name: item.name,
        fileName: item.fileName || `${slot}.webp`,
        filePath: item.filePath || '',
        fileSize: item.fileSize || 0
      }));
    }
  }

  // Helper to ensure any active or variant map exists in texturePool
  const ensureMapInPool = (
    mat: string,
    slot: SlotName,
    map: { filePath?: string | null; fileName?: string | null; fileSize?: number; url?: string } | null | undefined,
    explicitId?: string | null
  ): string | null => {
    if (!map || (!map.filePath && !map.url)) return null;
    const targetMat = texturePool[mat] ? mat : detectedMaterials[0];
    const pool = texturePool[targetMat][slot] || [];
    const found = pool.find(
      (i) =>
        (explicitId && i.id === explicitId) ||
        (map.filePath && i.filePath === map.filePath) ||
        (map.fileName && i.fileName === map.fileName)
    );
    if (found) {
      return found.id;
    }
    const id = explicitId || `${slot}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const item: TextureAssetItem = {
      id,
      name: map.fileName ? map.fileName.replace(/\.[^/.]+$/, '') : `${slot} ${pool.length + 1}`,
      filePath: map.filePath || '',
      fileName: map.fileName || `${slot}.webp`,
      fileSize: map.fileSize || 0
    };
    pool.push(item);
    texturePool[targetMat][slot] = pool;
    return id;
  };

  // 5. Build clean per-material settings & assignedMapIds for the active variant
  const activeVarMaterials: Record<string, EntryVariantMaterial> = {};
  for (const matName of detectedMaterials) {
    const isMatActive =
      pbr.activeMaterialName === matName || (pbr.activeMaterialName === null && detectedMaterials.length === 1);
    const matSlotData = isMatActive
      ? (pbr.materialsState[matName] || extractCurrentMaterialSlotData(pbr))
      : (pbr.materialsState[matName] || null);

    const activeIdsForMat = isMatActive
      ? (variant.materialActiveVariantIds[matName] || variant.activeVariantIds || {})
      : (variant.materialActiveVariantIds[matName] || {});

    const assignedMapIds: Partial<Record<string, string | null>> = {};
    for (const slot of ALL_SLOT_NAMES) {
      const activeId = activeIdsForMat[slot] || null;
      const slotMap = matSlotData ? (matSlotData as any)[`${slot}Map`] : null;
      if (activeId || (slotMap && (slotMap.filePath || slotMap.url))) {
        assignedMapIds[slot] = ensureMapInPool(matName, slot, slotMap, activeId);
      } else {
        assignedMapIds[slot] = null;
      }
    }

    const hasAssignedMaps = Object.values(assignedMapIds).some(Boolean);
    const slotEnabled =
      matSlotData?.slotEnabled || (matName === 'default' ? pbr.slotEnabled : createDefaultSlotEnabled());
    const loadFromCache =
      matSlotData?.loadFromCache !== undefined
        ? (hasAssignedMaps ? matSlotData.loadFromCache : (matSlotData.loadFromCache || detectedMaterials.length > 1))
        : (detectedMaterials.length > 1 && !hasAssignedMaps);

    activeVarMaterials[matName] = {
      assignedMapIds,
      slotEnabled,
      settings: {
        baseColor: matSlotData?.baseColor || '#ffffff',
        normalScale: matSlotData?.normalScale ?? 1.0,
        normalInvertY: matSlotData?.normalInvertY ?? false,
        roughnessFactor: matSlotData?.roughnessFactor ?? 1.0,
        metalnessFactor: matSlotData?.metalnessFactor ?? 1.0,
        aoIntensity: matSlotData?.aoIntensity ?? 1.0,
        emissiveIntensity: matSlotData?.emissiveIntensity ?? 1.0,
        emissiveColor: matSlotData?.emissiveColor || '#000000',
        emissiveFullGlow: matSlotData?.emissiveFullGlow ?? false,
        clearcoatFactor: matSlotData?.clearcoatFactor ?? 0.0,
        clearcoatRoughness: matSlotData?.clearcoatRoughness ?? 0.0,
        sheenColor: matSlotData?.sheenColor || '#000000',
        sheenRoughness: matSlotData?.sheenRoughness ?? 0.0,
        transmissionFactor: matSlotData?.transmissionFactor ?? 0.0,
        ior: matSlotData?.ior ?? 1.5,
        displacementScale: matSlotData?.displacementScale ?? 0.05,
        unitScale: model.unitScale,
        unitType: model.unitType,
        modelRotation: model.modelRotation,
        autoGround: model.autoGround,
        useOrmPack: matSlotData?.useOrmPack ?? true,
        materialPackingMode: matSlotData?.materialPackingMode || 'orm',
        loadFromCache
      }
    };
  }

  // 6. Build clean variants (omitting duplicate maps, settings, slotEnabled at variant root)
  const now = new Date().toISOString();
  const rawVariants: EntryVariant[] =
    variant.variants && variant.variants.length > 0
      ? variant.variants
      : [
          {
            id: 'var-default',
            name: 'Default',
            isDefault: true,
            createdAt: now,
            updatedAt: now
          }
        ];

  const cleanVariants: EntryVariant[] = rawVariants.map((v, idx) => {
    if (v.id === (variant.activeVariantId || rawVariants[0]?.id)) {
      return {
        id: v.id,
        name: v.name,
        isDefault: v.isDefault ?? idx === 0,
        posterUrl: v.posterUrl || null,
        posterFileName: v.posterFileName || null,
        productOptionRef: v.productOptionRef,
        createdAt: v.createdAt || now,
        updatedAt: now,
        materials: activeVarMaterials
      };
    }

    // Other non-active variants: ensure materials object is clean
    const otherVarMaterials: Record<string, EntryVariantMaterial> = {};
    for (const matName of detectedMaterials) {
      const vMat = v.materials?.[matName];
      const assignedMapIds: Partial<Record<string, string | null>> = {};

      for (const slot of ALL_SLOT_NAMES) {
        let assignedId = vMat?.assignedMapIds?.[slot] || null;
        const vMap = vMat?.maps?.[slot] || (matName === detectedMaterials[0] ? v.maps?.[slot] : null);
        if (!assignedId && vMap) {
          assignedId = ensureMapInPool(matName, slot, vMap);
        }
        assignedMapIds[slot] = assignedId || null;
      }

      const hasAssignedMaps = Object.values(assignedMapIds).some(Boolean);
      const rawSettings = vMat?.settings || (matName === detectedMaterials[0] ? v.settings : {}) || {};
      const loadFromCache =
        rawSettings.loadFromCache !== undefined
          ? (hasAssignedMaps ? rawSettings.loadFromCache : (rawSettings.loadFromCache || detectedMaterials.length > 1))
          : (detectedMaterials.length > 1 && !hasAssignedMaps);

      otherVarMaterials[matName] = {
        assignedMapIds,
        slotEnabled: vMat?.slotEnabled || (matName === detectedMaterials[0] ? v.slotEnabled : undefined) || createDefaultSlotEnabled(),
        settings: {
          ...rawSettings,
          loadFromCache
        }
      };
    }

    return {
      id: v.id,
      name: v.name,
      isDefault: v.isDefault ?? idx === 0,
      posterUrl: v.posterUrl || null,
      posterFileName: v.posterFileName || null,
      productOptionRef: v.productOptionRef,
      createdAt: v.createdAt || now,
      updatedAt: v.updatedAt || now,
      materials: otherVarMaterials
    };
  });

  const entry: LibraryEntry = {
    id: currentActiveEntry?.id || `entry-${Date.now()}`,
    title,
    slug,
    category,
    description,
    status,
    createdAt: currentActiveEntry?.createdAt || now,
    updatedAt: now,
    posterUrl,
    posterFileName,
    modelFileName: finalModelName,
    modelFilePath: finalModelPath,
    modelFileSize: model.modelFileSize,
    dimensions: model.modelStats?.dimensions || currentActiveEntry?.dimensions || null,
    stats: model.modelStats
      ? {
          triangleCount: model.modelStats.triangleCount,
          vertexCount: model.modelStats.vertexCount,
          meshCount: model.modelStats.meshCount,
          materials: detectedMaterials
        }
      : currentActiveEntry?.stats
        ? {
            ...currentActiveEntry.stats,
            materials: detectedMaterials
          }
        : { triangleCount: 0, vertexCount: 0, meshCount: 0, materials: detectedMaterials },
    texturePool,
    variants: cleanVariants,
    activeVariantId: variant.activeVariantId || cleanVariants[0]?.id
  };

  await window.electronAPI.saveLibraryEntry(entry);
  useAppStore.getState().setActiveEntry(entry);
  useAppStore.getState().setActiveEntrySlug(slug);
  syncSavedHash(computeWorkbenchHash());

  return entry;
};

export const flushAutoSave = async () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }

  const activeSlug = useAppStore.getState().activeEntrySlug;
  if (!activeSlug || isProgrammaticUpdate) return;

  try {
    useAppStore.getState().setIsAutoSaving(true);
    const model = useModelStore.getState();
    const activeEntry = useAppStore.getState().activeEntry;
    const title = model.productName || activeEntry?.title || activeSlug;

    const savedEntry = await saveWorkbenchToLibrary({
      title,
      slug: activeSlug,
      category: activeEntry?.category || 'otro',
      description: activeEntry?.description,
      status: activeEntry?.status || 'workshop',
      skipPoster: true
    });

    useAppStore.getState().setActiveEntry(savedEntry);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    useAppStore.getState().setLastAutoSavedAt(timeStr);
  } catch (err) {
    console.warn('Flush auto-save error:', err);
  } finally {
    useAppStore.getState().setIsAutoSaving(false);
  }
};

export const autoSaveActiveEntry = (immediate = false) => {
  const activeSlug = useAppStore.getState().activeEntrySlug;
  if (!activeSlug || isProgrammaticUpdate) return;

  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }

  if (immediate) {
    flushAutoSave();
    return;
  }

  useAppStore.getState().setIsAutoSaving(true);

  autoSaveTimer = setTimeout(async () => {
    try {
      // Re-verify that the active slug hasn't changed or been cleared during the debounce window
      const currentActiveSlug = useAppStore.getState().activeEntrySlug;
      if (!currentActiveSlug || currentActiveSlug !== activeSlug || isProgrammaticUpdate) {
        return;
      }

      const model = useModelStore.getState();
      const activeEntry = useAppStore.getState().activeEntry;
      const title = model.productName || activeEntry?.title || activeSlug;

      const savedEntry = await saveWorkbenchToLibrary({
        title,
        slug: activeSlug,
        category: activeEntry?.category || 'otro',
        description: activeEntry?.description,
        status: activeEntry?.status || 'workshop',
        skipPoster: true
      });

      useAppStore.getState().setActiveEntry(savedEntry);

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      useAppStore.getState().setLastAutoSavedAt(timeStr);
    } catch (err) {
      console.warn('Auto-save error:', err);
    } finally {
      autoSaveTimer = null;
      useAppStore.getState().setIsAutoSaving(false);
    }
  }, 500);
};
