import { ALL_SLOT_NAMES, SlotName, PbrSlotMap, usePbrMaterialStore } from '../store/pbrMaterialStore';
import { useModelStore } from '../store/modelStore';
import {
  selectActiveColorwayId,
  selectColorways,
  useVariantStore
} from '../store/variantStore';
import { loadWorkbenchState, resetWorkbenchStores } from '../store/workbenchActions';
import { useAppStore } from '../store/appStore';
import { LibraryEntry, LibraryEntrySettings, FurnitureCategory } from '../types/library';
import { captureViewportSnapshot } from './viewportBridge';
import { getFileName, getFileExt, isPathInside } from './pathUtils';

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
    baseColor: pbr.baseColorMap?.filePath,
    normal: pbr.normalMap?.filePath,
    orm: pbr.ormMap?.filePath,
    ao: pbr.aoMap?.filePath,
    rough: pbr.roughnessMap?.filePath,
    metal: pbr.metalnessMap?.filePath,
    emissive: pbr.emissiveMap?.filePath,
    clearcoat: pbr.clearcoatMap?.filePath,
    sheen: pbr.sheenMap?.filePath,
    transmission: pbr.transmissionMap?.filePath,
    alpha: pbr.alphaMap?.filePath,
    disp: pbr.displacementMap?.filePath,
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
    unitScale: model.unitScale,
    unitType: model.unitType,
    modelRotation: model.modelRotation,
    autoGround: model.autoGround,
    useOrmPack: pbr.useOrmPack,
    loadFromCache: pbr.loadFromCache,
    slotEnabled: pbr.slotEnabled,
    variants: Array.isArray(variant.variants)
      ? variant.variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          isDefault: v.isDefault,
          posterUrl: v.posterUrl,
          maps: v.maps,
          settings: v.settings,
          slotEnabled: v.slotEnabled
        }))
      : [],
    activeVariantId: variant.activeVariantId,
    mapVariants: variant.mapVariants
      ? Object.entries(variant.mapVariants).map(([s, list]: [string, any]) => ({
          slot: s,
          variants: (list || []).map((v: any) => ({ id: v.id, name: v.name, file: v.filePath }))
        }))
      : [],
    activeVariantIds: variant.activeVariantIds,
    colorways: selectColorways(variant).map((c) => ({
      id: c.id,
      name: c.name,
      file: c.baseColorFilePath
    })),
    activeColorwayId: selectActiveColorwayId(variant)
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

    // If this entry is already open and loaded in the workbench, check if target variant needs switching
    if (activeSlug === entry.slug && model.modelUrl) {
      if (targetVariantId && targetVariantId !== variant.activeVariantId) {
        variant.selectVariant(targetVariantId);
      }
      model.setIsModelLoading(false);
      useAppStore.getState().setView('workbench');
      return;
    }

    // Resolve model URL synchronously
    let modelUrl: string | null = null;
    const modelFileSize = entry.modelFileSize || 0;
    if (entry.modelFilePath) {
      modelUrl = window.electronAPI.toAssetUrl(entry.modelFilePath);
    }

    // If model is already loaded and identical, ensure loading flag is off
    const cleanModelUrl = modelUrl ? modelUrl.split('?')[0] : null;
    const cleanStoreUrl = model.modelUrl ? model.modelUrl.split('?')[0] : null;
    if (!cleanModelUrl || cleanModelUrl === cleanStoreUrl) {
      model.setIsModelLoading(false);
    }

    // Restore maps
    const slotNames = ALL_SLOT_NAMES;

    const mapsRecord: Partial<Record<SlotName, PbrSlotMap>> = {};
    for (const slot of slotNames) {
      const mapData = entry.maps?.[slot];
      if (mapData && mapData.filePath) {
        const url = window.electronAPI.toAssetUrl(mapData.filePath);
        mapsRecord[slot] = {
          url,
          filePath: mapData.filePath,
          fileName: mapData.fileName,
          fileSize: mapData.fileSize || 0
        };
      }
    }

    // Resolve map variants if present
    const resolvedMapVariants: Partial<Record<SlotName, any[]>> = {};
    if (entry.mapVariants) {
      for (const [s, vList] of Object.entries(entry.mapVariants)) {
        if (Array.isArray(vList)) {
          resolvedMapVariants[s as SlotName] = vList.map((v) => ({
            ...v,
            url: v.filePath ? window.electronAPI.toAssetUrl(v.filePath) : v.url
          }));
        }
      }
    }

    // Resolve variants maps paths to URLs
    const resolvedVariants = (entry.variants || []).map((v) => {
      const resolvedMaps: Record<string, any> = {};
      for (const [slot, m] of Object.entries(v.maps || {})) {
        resolvedMaps[slot] = {
          ...m,
          url: m.filePath ? window.electronAPI.toAssetUrl(m.filePath) : m.url || ''
        };
      }
      return {
        ...v,
        posterUrl: (v as any).posterFilePath ? window.electronAPI.toAssetUrl((v as any).posterFilePath) : v.posterUrl,
        maps: resolvedMaps
      };
    });

    // Apply entire state atomically
    loadWorkbenchState({
      productId: entry.slug,
      productSlug: entry.slug,
      productName: entry.title,
      modelFilePath: entry.modelFilePath || null,
      modelUrl,
      modelFileSize,
      dimensions: entry.dimensions || null,
      stats: entry.stats || null,
      maps: mapsRecord,
      mapVariants: resolvedMapVariants,
      activeVariantIds: entry.activeVariantIds,
      slotEnabled: entry.slotEnabled,
      variants: resolvedVariants,
      activeVariantId: targetVariantId || entry.activeVariantId || null,
      settings: entry.settings,
      colorways: entry.colorways || []
    });

    // Mark active in appStore
    useAppStore.getState().setActiveEntry(entry);
    useAppStore.getState().setActiveEntrySlug(entry.slug);

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

  // 3. Build canonical root maps dictionary based on Default Variant (or active variant fallback)
  const defaultVar = variant.variants.find((v) => v.isDefault) || variant.variants[0];
  const mapsRecord: Record<string, { fileName: string; filePath: string; fileSize?: number }> = {};

  const slotNames = ALL_SLOT_NAMES;

  for (const slot of slotNames) {
    const defaultSlotMap = defaultVar?.maps?.[slot] || (variant.activeVariantId === defaultVar?.id ? (pbr as any)[`${slot}Map`] : null);
    if (defaultSlotMap && defaultSlotMap.filePath) {
      mapsRecord[slot] = {
        fileName: defaultSlotMap.fileName || `${slot}.webp`,
        filePath: defaultSlotMap.filePath,
        fileSize: defaultSlotMap.fileSize
      };
    }
  }

  // 4. Gather settings
  const settings: LibraryEntrySettings = {
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
    unitScale: model.unitScale,
    unitType: model.unitType,
    modelRotation: model.modelRotation,
    autoGround: model.autoGround,
    useOrmPack: pbr.useOrmPack,
    materialPackingMode: pbr.materialPackingMode,
    loadFromCache: pbr.loadFromCache
  };

  const now = new Date().toISOString();
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
          meshCount: model.modelStats.meshCount
        }
      : currentActiveEntry?.stats || null,
    variants: variant.variants,
    activeVariantId: variant.activeVariantId || undefined,
    maps: mapsRecord,
    colorways: selectColorways(variant),
    mapVariants: variant.mapVariants,
    activeVariantIds: variant.activeVariantIds,
    slotEnabled: pbr.slotEnabled,
    settings
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
