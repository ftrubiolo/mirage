import { useWorkbenchStore, SlotName, PbrSlotMap } from '../store/workbenchStore';
import { useAppStore } from '../store/appStore';
import { LibraryEntry, LibraryEntrySettings, FurnitureCategory } from '../types/library';
import { captureViewportSnapshot } from './viewportBridge';
import { getFileName, getFileExt, isPathInside } from './pathUtils';

let isProgrammaticUpdate = false;
let lastSavedHash = '';
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

export const setProgrammaticUpdate = (val: boolean) => {
  isProgrammaticUpdate = val;
};

export const cancelAutoSave = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  useAppStore.getState().setIsAutoSaving(false);
};

export const computeWorkbenchHash = (state: any): string => {
  if (!state) return '';
  return JSON.stringify({
    name: state.productName,
    model: state.modelFilePath,
    modelFileSize: state.modelFileSize,
    baseColor: state.baseColorMap?.filePath,
    normal: state.normalMap?.filePath,
    orm: state.ormMap?.filePath,
    ao: state.aoMap?.filePath,
    rough: state.roughnessMap?.filePath,
    metal: state.metalnessMap?.filePath,
    emissive: state.emissiveMap?.filePath,
    clearcoat: state.clearcoatMap?.filePath,
    sheen: state.sheenMap?.filePath,
    transmission: state.transmissionMap?.filePath,
    alpha: state.alphaMap?.filePath,
    disp: state.displacementMap?.filePath,
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
    displacementScale: state.displacementScale,
    unitScale: state.unitScale,
    unitType: state.unitType,
    useOrmPack: state.useOrmPack,
    loadFromCache: state.loadFromCache,
    slotEnabled: state.slotEnabled,
    variants: Array.isArray(state.variants)
      ? state.variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          isDefault: v.isDefault,
          posterUrl: v.posterUrl,
          maps: v.maps,
          settings: v.settings,
          slotEnabled: v.slotEnabled
        }))
      : [],
    activeVariantId: state.activeVariantId,
    mapVariants: state.mapVariants
      ? Object.entries(state.mapVariants).map(([s, list]: [string, any]) => ({
          slot: s,
          variants: (list || []).map((v: any) => ({ id: v.id, name: v.name, file: v.filePath }))
        }))
      : [],
    activeVariantIds: state.activeVariantIds,
    colorways: Array.isArray(state.colorways)
      ? state.colorways.map((c: any) => ({ id: c.id, name: c.name, file: c.baseColorFilePath }))
      : [],
    activeColorwayId: state.activeColorwayId
  });
};

export const syncSavedHash = (hash?: string) => {
  lastSavedHash = hash !== undefined ? hash : computeWorkbenchHash(useWorkbenchStore.getState());
};

export const handleWorkbenchChange = (state: any) => {
  // Guard 1: Ignore any programmatic store updates (loading, resetting, hydration)
  if (isProgrammaticUpdate) return;

  // Guard 2: Only auto-save if an entry is actively loaded in the workbench
  const activeSlug = useAppStore.getState().activeEntrySlug;
  if (!activeSlug) return;

  // Guard 3: Compare against previous saved baseline hash
  const currentHash = computeWorkbenchHash(state);
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
};

export const resetWorkbench = async () => {
  await flushAutoSave();
  cancelAutoSave();
  useAppStore.getState().setActiveEntry(null);
  useAppStore.getState().setActiveEntrySlug(null);
  setProgrammaticUpdate(true);
  useWorkbenchStore.getState().resetAll();
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
    const store = useWorkbenchStore.getState();

    // If this entry is already open and loaded in the workbench, check if target variant needs switching
    if (activeSlug === entry.slug && store.modelUrl) {
      if (targetVariantId && targetVariantId !== store.activeVariantId) {
        store.selectVariant(targetVariantId);
      }
      store.setIsModelLoading(false);
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
    const cleanStoreUrl = store.modelUrl ? store.modelUrl.split('?')[0] : null;
    if (!cleanModelUrl || cleanModelUrl === cleanStoreUrl) {
      store.setIsModelLoading(false);
    }

    // Restore maps
    const slotNames: SlotName[] = [
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
    store.loadWorkbenchState({
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
    syncSavedHash(computeWorkbenchHash(useWorkbenchStore.getState()));
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
  const store = useWorkbenchStore.getState();
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
      if (store.activeVariantId) {
        store.setVariantPoster(store.activeVariantId, posterUrl, posterFileName);
      }
    } catch (err) {
      console.warn('Could not capture viewport snapshot for library entry:', err);
    }
  }

  // 2. Copy model to library if needed
  let finalModelPath = store.modelFilePath;
  let finalModelName = store.modelFilePath ? getFileName(store.modelFilePath) : null;

  if (store.modelFilePath && !isPathInside(store.modelFilePath, slug)) {
    try {
      const ext = getFileExt(store.modelFilePath).replace('.', '') || 'glb';
      const copied = await window.electronAPI.copyFileToLibrary({
        entrySlug: slug,
        sourceFilePath: store.modelFilePath,
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
  const defaultVar = store.variants.find((v) => v.isDefault) || store.variants[0];
  const mapsRecord: Record<string, { fileName: string; filePath: string; fileSize?: number }> = {};

  const slotNames: SlotName[] = [
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

  for (const slot of slotNames) {
    const defaultSlotMap = defaultVar?.maps?.[slot] || (store.activeVariantId === defaultVar?.id ? (store as any)[`${slot}Map`] : null);
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
    normalScale: store.normalScale,
    normalInvertY: store.normalInvertY,
    roughnessFactor: store.roughnessFactor,
    metalnessFactor: store.metalnessFactor,
    aoIntensity: store.aoIntensity,
    emissiveIntensity: store.emissiveIntensity,
    emissiveColor: store.emissiveColor,
    emissiveFullGlow: store.emissiveFullGlow,
    clearcoatFactor: store.clearcoatFactor,
    clearcoatRoughness: store.clearcoatRoughness,
    sheenColor: store.sheenColor,
    sheenRoughness: store.sheenRoughness,
    transmissionFactor: store.transmissionFactor,
    ior: store.ior,
    displacementScale: store.displacementScale,
    unitScale: store.unitScale,
    unitType: store.unitType,
    useOrmPack: store.useOrmPack,
    loadFromCache: store.loadFromCache
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
    modelFileSize: store.modelFileSize,
    dimensions: store.modelStats?.dimensions || currentActiveEntry?.dimensions || null,
    stats: store.modelStats
      ? {
          triangleCount: store.modelStats.triangleCount,
          vertexCount: store.modelStats.vertexCount,
          meshCount: store.modelStats.meshCount
        }
      : currentActiveEntry?.stats || null,
    variants: store.variants,
    activeVariantId: store.activeVariantId || undefined,
    maps: mapsRecord,
    colorways: store.colorways,
    mapVariants: store.mapVariants,
    activeVariantIds: store.activeVariantIds,
    slotEnabled: store.slotEnabled,
    settings
  };

  await window.electronAPI.saveLibraryEntry(entry);
  useAppStore.getState().setActiveEntry(entry);
  useAppStore.getState().setActiveEntrySlug(slug);
  syncSavedHash(computeWorkbenchHash(store));

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
    const store = useWorkbenchStore.getState();
    const activeEntry = useAppStore.getState().activeEntry;
    const title = store.productName || activeEntry?.title || activeSlug;

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

      const store = useWorkbenchStore.getState();
      const activeEntry = useAppStore.getState().activeEntry;
      const title = store.productName || activeEntry?.title || activeSlug;

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
