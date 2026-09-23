import { create } from 'zustand';
import {
  EntryVariant,
  EntryVariantMapSlot,
  EntryVariantMaterial,
  TexturePool,
  TextureAssetItem
} from '../types/library';
import {
  SlotName,
  ALL_SLOT_NAMES,
  PbrSlotMap,
  PbrMaterialParameters,
  createDefaultSlotEnabled,
  usePbrMaterialStore,
  extractCurrentMaterialSlotData,
  registerMaterialMapSyncHandler
} from './pbrMaterialStore';

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

export const createEmptyMapVariants = (): Record<SlotName, MapVariantItem[]> => ({
  baseColor: [], normal: [], orm: [], metalRoughness: [], ao: [], roughness: [], metalness: [],
  emissive: [], clearcoat: [], sheen: [], transmission: [], alpha: [], displacement: []
});

export const createEmptyActiveVariantIds = (): Record<SlotName, string | null> => ({
  baseColor: null, normal: null, orm: null, metalRoughness: null, ao: null, roughness: null, metalness: null,
  emissive: null, clearcoat: null, sheen: null, transmission: null, alpha: null, displacement: null
});

export const createEmptyTexturePool = (materials: string[] = ['default']): TexturePool => {
  const pool: TexturePool = {};
  for (const m of materials) {
    pool[m] = createEmptyMapVariants();
  }
  return pool;
};

export const deriveColorways = (baseColorItems?: MapVariantItem[]): ColorwayItem[] => {
  return (baseColorItems || []).map((v) => ({
    id: v.id,
    name: v.name,
    baseColorUrl: v.url,
    baseColorFilePath: v.filePath,
    fileName: v.fileName,
    fileSize: v.fileSize
  }));
};

export const deriveAvailableTexturesForSlot = (
  variants: EntryVariant[],
  slot: SlotName,
  extraPool: MapVariantItem[] = []
): MapVariantItem[] => {
  const seen = new Set<string>();
  const results: MapVariantItem[] = [];

  const add = (item?: { id?: string; name?: string; url?: string; filePath?: string; fileName?: string; fileSize?: number }) => {
    if (!item || (!item.filePath && !item.url)) return;
    const key = item.filePath || item.url || item.id || '';
    if (seen.has(key)) return;
    seen.add(key);

    results.push({
      id: item.id || `${slot}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: item.name || (item.fileName ? item.fileName.replace(/\.[^/.]+$/, '') : `${slot} texture`),
      url: item.url || (item.filePath && (window as any).electronAPI?.toAssetUrl ? (window as any).electronAPI.toAssetUrl(item.filePath) : '') || '',
      filePath: item.filePath || '', fileName: item.fileName || `${slot}.webp`, fileSize: item.fileSize || 0
    });
  };

  for (const v of variants) {
    if (v.maps?.[slot]) add(v.maps[slot]);
  }
  for (const extra of extraPool) {
    add(extra);
  }

  return results;
};

export interface VariantState {
  variants: EntryVariant[];
  activeVariantId: string | null;
  texturePool: TexturePool;
  mapVariants: Record<SlotName, MapVariantItem[]>;
  activeVariantIds: Record<SlotName, string | null>;

  materialMapVariants: Record<string, Record<SlotName, MapVariantItem[]>>;
  materialActiveVariantIds: Record<string, Record<SlotName, string | null>>;
  activeMaterialName: string | null;

  syncMaterialSlots: (materialNames: string[]) => void;
  syncMaterialMapVariants: (targetMaterialName: string | null) => void;
  clearActiveMaterialMapVariants: () => void;

  selectVariant: (variantId: string) => void;
  createVariant: (name: string, cloneCurrent?: boolean) => void;
  renameVariant: (variantId: string, newName: string) => void;
  deleteVariant: (variantId: string) => void;
  setVariantDefault: (variantId: string) => void;
  setVariantPoster: (variantId: string, posterUrl: string, posterFileName?: string) => void;

  addMapVariant: (slot: SlotName, item: MapVariantItem, targetMaterialName?: string) => void;
  selectMapVariant: (slot: SlotName, id: string) => void;
  removeMapVariant: (slot: SlotName, id: string) => void;
  renameMapVariant: (slot: SlotName, id: string, name: string) => void;
  updateMapVariant: (slot: SlotName, id: string, data: Partial<MapVariantItem>) => void;

  addColorway: (item: ColorwayItem) => void;
  selectColorway: (id: string) => void;
  removeColorway: (id: string) => void;
  renameColorway: (id: string, name: string) => void;
  updateColorway: (id: string, data: Partial<ColorwayItem>) => void;

  syncActiveVariantSlot: (slot: SlotName, map: PbrSlotMap | null) => void;
  syncActiveVariantParameters: (params: Partial<PbrMaterialParameters>) => void;
  resetVariants: () => void;
}

/**
 * Colorways are a *projection* of the baseColor texture variants, not state.
 *
 * They used to be stored and recomputed by hand at seven mutation sites, which
 * meant any new site that forgot to recompute would silently desync the swatch
 * list. Deriving on read makes that class of bug impossible.
 */
export const selectColorways = (state: VariantState): ColorwayItem[] =>
  deriveColorways(state.mapVariants.baseColor);

/** The active colorway is simply the active baseColor texture variant. */
export const selectActiveColorwayId = (state: VariantState): string | null =>
  state.activeVariantIds.baseColor ?? null;

const defaultVariant: EntryVariant = {
  id: 'var-default',
  name: 'Default',
  isDefault: true,
  materials: {
    default: {
      assignedMapIds: createEmptyActiveVariantIds(),
      slotEnabled: createDefaultSlotEnabled(),
      settings: {}
    }
  },
  maps: {},
  slotEnabled: createDefaultSlotEnabled(),
  settings: {}
};

export const useVariantStore = create<VariantState>((set, get) => ({
  variants: [defaultVariant],
  activeVariantId: 'var-default',
  texturePool: { default: createEmptyMapVariants() },
  mapVariants: createEmptyMapVariants(),
  activeVariantIds: createEmptyActiveVariantIds(),
  materialMapVariants: {},
  materialActiveVariantIds: {},
  activeMaterialName: null,

  syncMaterialSlots: (materialNames: string[]) => {
    set((state) => {
      if (!materialNames || materialNames.length <= 1) {
        return {
          activeMaterialName: null,
          materialMapVariants: {},
          materialActiveVariantIds: {}
        };
      }
      const nextMaterialMapVariants: Record<string, Record<SlotName, MapVariantItem[]>> = {};
      const nextMaterialActiveVariantIds: Record<string, Record<SlotName, string | null>> = {};
      const nextTexturePool: TexturePool = { ...state.texturePool };

      for (const name of materialNames) {
        let pool = state.materialMapVariants[name] || (nextTexturePool[name] as Record<SlotName, MapVariantItem[]>) || createEmptyMapVariants();
        let activeIds = state.materialActiveVariantIds[name] || createEmptyActiveVariantIds();

        // If this is the primary material and materialMapVariants has no items, but state.mapVariants has items (from legacy load):
        if (name === materialNames[0] && Object.values(pool).every((arr) => arr.length === 0)) {
          const statePoolCount = Object.values(state.mapVariants).reduce((acc, arr) => acc + arr.length, 0);
          if (statePoolCount > 0) {
            pool = state.mapVariants;
            activeIds = state.activeVariantIds;
          }
        }

        nextMaterialMapVariants[name] = pool;
        nextMaterialActiveVariantIds[name] = activeIds;
        nextTexturePool[name] = pool;
      }

      const activeName = state.activeMaterialName && materialNames.includes(state.activeMaterialName)
        ? state.activeMaterialName
        : materialNames[0];

      return {
        materialMapVariants: nextMaterialMapVariants,
        materialActiveVariantIds: nextMaterialActiveVariantIds,
        texturePool: nextTexturePool,
        activeMaterialName: activeName,
        mapVariants: nextMaterialMapVariants[activeName] || createEmptyMapVariants(),
        activeVariantIds: nextMaterialActiveVariantIds[activeName] || createEmptyActiveVariantIds()
      };
    });
  },

  syncMaterialMapVariants: (targetMaterialName: string | null) => {
    set((state) => {
      if (state.activeMaterialName === targetMaterialName) return state;

      const nextMaterialMapVariants = { ...state.materialMapVariants };
      const nextMaterialActiveVariantIds = { ...state.materialActiveVariantIds };
      const nextTexturePool = { ...state.texturePool };

      if (state.activeMaterialName) {
        nextMaterialMapVariants[state.activeMaterialName] = state.mapVariants;
        nextMaterialActiveVariantIds[state.activeMaterialName] = state.activeVariantIds;
        nextTexturePool[state.activeMaterialName] = state.mapVariants;
      }

      if (!targetMaterialName) {
        return {
          activeMaterialName: null,
          materialMapVariants: nextMaterialMapVariants,
          materialActiveVariantIds: nextMaterialActiveVariantIds,
          texturePool: nextTexturePool
        };
      }

      const targetPool = nextMaterialMapVariants[targetMaterialName] || (nextTexturePool[targetMaterialName] as Record<SlotName, MapVariantItem[]>) || createEmptyMapVariants();
      const targetActiveIds = nextMaterialActiveVariantIds[targetMaterialName] || createEmptyActiveVariantIds();

      nextMaterialMapVariants[targetMaterialName] = targetPool;
      nextMaterialActiveVariantIds[targetMaterialName] = targetActiveIds;
      nextTexturePool[targetMaterialName] = targetPool;

      return {
        activeMaterialName: targetMaterialName,
        materialMapVariants: nextMaterialMapVariants,
        materialActiveVariantIds: nextMaterialActiveVariantIds,
        texturePool: nextTexturePool,
        mapVariants: targetPool,
        activeVariantIds: targetActiveIds
      };
    });
  },

  clearActiveMaterialMapVariants: () => {
    set((state) => {
      const emptyMapVariants = createEmptyMapVariants();
      const emptyActiveIds = createEmptyActiveVariantIds();
      if (!state.activeMaterialName) {
        return {
          mapVariants: emptyMapVariants,
          activeVariantIds: emptyActiveIds
        };
      }
      return {
        mapVariants: emptyMapVariants,
        activeVariantIds: emptyActiveIds,
        materialMapVariants: {
          ...state.materialMapVariants,
          [state.activeMaterialName]: emptyMapVariants
        },
        materialActiveVariantIds: {
          ...state.materialActiveVariantIds,
          [state.activeMaterialName]: emptyActiveIds
        },
        texturePool: {
          ...state.texturePool,
          [state.activeMaterialName]: emptyMapVariants
        }
      };
    });
  },

  selectVariant: (variantId: string) => {
    const state = get();
    if (state.activeVariantId === variantId) return;

    const currentActiveId = state.activeVariantId;
    const pbr = usePbrMaterialStore.getState();

    const currentMaps: Record<string, EntryVariantMapSlot> = {};
    for (const slot of ALL_SLOT_NAMES) {
      const activeVarId = state.activeVariantIds[slot];
      const m = state.mapVariants[slot]?.find((v) => v.id === activeVarId) || (pbr as any)[`${slot}Map`];
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

    // Build per-material snapshot for current variant
    const currentMaterials: Record<string, EntryVariantMaterial> = {};
    if (pbr.materialsState && Object.keys(pbr.materialsState).length > 0) {
      for (const [matName, matData] of Object.entries(pbr.materialsState)) {
        const matMaps: Record<string, EntryVariantMapSlot> = {};
        const assignedIds: Partial<Record<string, string | null>> = {
          ...(state.materialActiveVariantIds[matName] || {})
        };

        for (const s of ALL_SLOT_NAMES) {
          const map = (matData as any)[`${s}Map`];
          if (map?.filePath || map?.url) {
            matMaps[s] = {
              id: assignedIds[s] || undefined,
              fileName: map.fileName || `${s}.webp`,
              filePath: map.filePath || '',
              fileSize: map.fileSize || 0,
              url: map.url || ''
            };
          }
        }
        currentMaterials[matName] = {
          assignedMapIds: assignedIds,
          maps: matMaps,
          slotEnabled: { ...matData.slotEnabled },
          settings: {
            baseColor: matData.baseColor,
            normalScale: matData.normalScale,
            normalInvertY: matData.normalInvertY,
            roughnessFactor: matData.roughnessFactor,
            metalnessFactor: matData.metalnessFactor,
            aoIntensity: matData.aoIntensity,
            emissiveIntensity: matData.emissiveIntensity,
            emissiveColor: matData.emissiveColor,
            emissiveFullGlow: matData.emissiveFullGlow,
            clearcoatFactor: matData.clearcoatFactor,
            clearcoatRoughness: matData.clearcoatRoughness,
            sheenColor: matData.sheenColor,
            sheenRoughness: matData.sheenRoughness,
            transmissionFactor: matData.transmissionFactor,
            ior: matData.ior,
            displacementScale: matData.displacementScale,
            useOrmPack: matData.useOrmPack,
            materialPackingMode: matData.materialPackingMode,
            loadFromCache: matData.loadFromCache
          }
        };
      }
    }

    const updatedVariants = state.variants.map((v) =>
      v.id === currentActiveId
        ? {
            ...v,
            maps: currentMaps,
            slotEnabled: { ...pbr.slotEnabled },
            settings: {
              ...(v.settings || {}),
              baseColor: pbr.baseColor,
              normalScale: pbr.normalScale, normalInvertY: pbr.normalInvertY,
              roughnessFactor: pbr.roughnessFactor, metalnessFactor: pbr.metalnessFactor,
              aoIntensity: pbr.aoIntensity, emissiveIntensity: pbr.emissiveIntensity,
              emissiveColor: pbr.emissiveColor, emissiveFullGlow: pbr.emissiveFullGlow, clearcoatFactor: pbr.clearcoatFactor,
              clearcoatRoughness: pbr.clearcoatRoughness, sheenColor: pbr.sheenColor,
              sheenRoughness: pbr.sheenRoughness, transmissionFactor: pbr.transmissionFactor,
              ior: pbr.ior, displacementScale: pbr.displacementScale, loadFromCache: pbr.loadFromCache
            },
            materials: Object.keys(currentMaterials).length > 0 ? currentMaterials : v.materials,
            updatedAt: new Date().toISOString()
          }
        : v
    );

    const target = updatedVariants.find((v) => v.id === variantId);
    if (!target) return;

    // Update materialMapVariants and materialActiveVariantIds across all materials from target
    const nextMaterialActiveVariantIds: Record<string, Record<SlotName, string | null>> = { ...state.materialActiveVariantIds };
    const nextMaterialMapVariants: Record<string, Record<SlotName, MapVariantItem[]>> = { ...state.materialMapVariants };
    const nextTexturePool: TexturePool = { ...state.texturePool };

    const resolvedTargetMaterials: Record<string, EntryVariantMaterial> = {};

    if (target.materials) {
      for (const [matName, matPayload] of Object.entries(target.materials)) {
        const matPools: Record<SlotName, MapVariantItem[]> = nextMaterialMapVariants[matName]
          ? { ...nextMaterialMapVariants[matName] }
          : (nextTexturePool[matName] as Record<SlotName, MapVariantItem[]>) || createEmptyMapVariants();
        const matActiveIds: Record<SlotName, string | null> = nextMaterialActiveVariantIds[matName]
          ? { ...nextMaterialActiveVariantIds[matName] }
          : createEmptyActiveVariantIds();

        const resolvedMatMaps: Record<string, EntryVariantMapSlot> = {};

        for (const slot of ALL_SLOT_NAMES) {
          const pool = matPools[slot] || [];
          const assignedId = matPayload.assignedMapIds?.[slot];
          const legacyMap = matPayload.maps?.[slot];

          let matched = assignedId ? pool.find((i) => i.id === assignedId) : null;
          if (!matched && legacyMap && (legacyMap.filePath || legacyMap.url)) {
            matched = pool.find((i) =>
              (legacyMap.id && i.id === legacyMap.id) ||
              (legacyMap.filePath && i.filePath === legacyMap.filePath) ||
              (legacyMap.fileName && i.fileName === legacyMap.fileName) ||
              (legacyMap.url && i.url === legacyMap.url)
            );
            if (!matched) {
              matched = {
                id: legacyMap.id || `${slot}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: legacyMap.fileName ? legacyMap.fileName.replace(/\.[^/.]+$/, '') : `${slot} 1`,
                url: legacyMap.url || '', filePath: legacyMap.filePath || '',
                fileName: legacyMap.fileName || `${slot}.webp`, fileSize: legacyMap.fileSize || 0
              };
              matPools[slot] = [...pool, matched];
            }
          }

          if (matched) {
            matActiveIds[slot] = matched.id;
            resolvedMatMaps[slot] = {
              id: matched.id,
              fileName: matched.fileName,
              filePath: matched.filePath,
              fileSize: matched.fileSize,
              url: matched.url
            };
          } else {
            matActiveIds[slot] = null;
          }
        }

        nextMaterialMapVariants[matName] = matPools;
        nextMaterialActiveVariantIds[matName] = matActiveIds;
        nextTexturePool[matName] = matPools;

        resolvedTargetMaterials[matName] = {
          ...matPayload,
          assignedMapIds: matActiveIds,
          maps: resolvedMatMaps
        };
      }
    }

    const curActiveMat = state.activeMaterialName;
    const activePools = curActiveMat && nextMaterialMapVariants[curActiveMat]
      ? nextMaterialMapVariants[curActiveMat]
      : { ...state.mapVariants };
    const activeTargetMaps = curActiveMat && resolvedTargetMaterials[curActiveMat]
      ? resolvedTargetMaterials[curActiveMat].maps
      : target.maps;

    const nextActiveIds: Record<SlotName, string | null> = curActiveMat && nextMaterialActiveVariantIds[curActiveMat]
      ? { ...nextMaterialActiveVariantIds[curActiveMat] }
      : { ...state.activeVariantIds };
    const nextMapVariants: Record<SlotName, MapVariantItem[]> = { ...activePools };

    for (const slot of ALL_SLOT_NAMES) {
      const targetMap = activeTargetMaps?.[slot];
      const pool = nextMapVariants[slot] || [];
      if (targetMap && (targetMap.filePath || targetMap.url)) {
        let matched = pool.find((i) =>
          (targetMap.id && i.id === targetMap.id) ||
          (targetMap.filePath && i.filePath === targetMap.filePath) ||
          (targetMap.fileName && i.fileName === targetMap.fileName) ||
          (targetMap.url && i.url === targetMap.url)
        );
        if (!matched) {
          matched = {
            id: targetMap.id || `${slot}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: targetMap.fileName ? targetMap.fileName.replace(/\.[^/.]+$/, '') : `${slot} 1`,
            url: targetMap.url || '', filePath: targetMap.filePath || '',
            fileName: targetMap.fileName || `${slot}.webp`, fileSize: targetMap.fileSize || 0
          };
          nextMapVariants[slot] = [...pool, matched];
        }
        nextActiveIds[slot] = matched.id;
      } else {
        nextActiveIds[slot] = null;
      }
    }

    if (curActiveMat) {
      nextMaterialMapVariants[curActiveMat] = nextMapVariants;
      nextMaterialActiveVariantIds[curActiveMat] = nextActiveIds;
      nextTexturePool[curActiveMat] = nextMapVariants;
    }

    set({
      variants: updatedVariants,
      activeVariantId: variantId,
      texturePool: nextTexturePool,
      mapVariants: nextMapVariants,
      activeVariantIds: nextActiveIds,
      materialMapVariants: nextMaterialMapVariants,
      materialActiveVariantIds: nextMaterialActiveVariantIds
    });

    usePbrMaterialStore.getState().applyVariantMaterialState(
      activeTargetMaps || target.maps || {},
      target.slotEnabled,
      (target.settings as any) || {},
      Object.keys(resolvedTargetMaterials).length > 0 ? resolvedTargetMaterials : target.materials
    );
  },

  createVariant: (name: string, cloneCurrent = true) => {
    const state = get();
    const newId = `var-${Date.now()}`;
    const pbr = usePbrMaterialStore.getState();

    let mapsForVariant: Record<string, EntryVariantMapSlot> = {};
    let slotEnabledForVariant = createDefaultSlotEnabled();
    let settingsForVariant: any = {};
    const materialsForVariant: Record<string, EntryVariantMaterial> = {};

    if (cloneCurrent) {
      for (const slot of ALL_SLOT_NAMES) {
        const currentMap = (pbr as any)[`${slot}Map` as const];
        if (currentMap?.filePath || currentMap?.url) {
          mapsForVariant[slot] = {
            fileName: currentMap.fileName || `${slot}.webp`,
            filePath: currentMap.filePath || '',
            fileSize: currentMap.fileSize || 0,
            url: currentMap.url || ''
          };
        }
      }
      slotEnabledForVariant = { ...pbr.slotEnabled };
      settingsForVariant = {
        baseColor: pbr.baseColor,
        normalScale: pbr.normalScale, normalInvertY: pbr.normalInvertY,
        roughnessFactor: pbr.roughnessFactor, metalnessFactor: pbr.metalnessFactor,
        aoIntensity: pbr.aoIntensity, emissiveIntensity: pbr.emissiveIntensity,
        emissiveColor: pbr.emissiveColor, emissiveFullGlow: pbr.emissiveFullGlow, clearcoatFactor: pbr.clearcoatFactor,
        clearcoatRoughness: pbr.clearcoatRoughness, sheenColor: pbr.sheenColor,
        sheenRoughness: pbr.sheenRoughness, transmissionFactor: pbr.transmissionFactor,
        ior: pbr.ior, displacementScale: pbr.displacementScale
      };

      if (pbr.materialsState && Object.keys(pbr.materialsState).length > 0) {
        for (const [matName, matData] of Object.entries(pbr.materialsState)) {
          const matMaps: Record<string, EntryVariantMapSlot> = {};
          for (const slot of ALL_SLOT_NAMES) {
            const map = (matData as any)[`${slot}Map` as const];
            if (map?.filePath || map?.url) {
              matMaps[slot] = {
                fileName: map.fileName || `${slot}.webp`,
                filePath: map.filePath || '',
                fileSize: map.fileSize || 0,
                url: map.url || ''
              };
            }
          }
          materialsForVariant[matName] = {
            maps: matMaps,
            slotEnabled: { ...matData.slotEnabled },
            settings: {
              baseColor: matData.baseColor,
              normalScale: matData.normalScale,
              normalInvertY: matData.normalInvertY,
              roughnessFactor: matData.roughnessFactor,
              metalnessFactor: matData.metalnessFactor,
              aoIntensity: matData.aoIntensity,
              emissiveIntensity: matData.emissiveIntensity,
              emissiveColor: matData.emissiveColor,
              emissiveFullGlow: matData.emissiveFullGlow,
              clearcoatFactor: matData.clearcoatFactor,
              clearcoatRoughness: matData.clearcoatRoughness,
              sheenColor: matData.sheenColor,
              sheenRoughness: matData.sheenRoughness,
              transmissionFactor: matData.transmissionFactor,
              ior: matData.ior,
              displacementScale: matData.displacementScale
            }
          };
        }
      }
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
      materials: Object.keys(materialsForVariant).length > 0 ? materialsForVariant : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    set({ variants: [...state.variants, newVariant] });
    get().selectVariant(newId);
  },

  renameVariant: (variantId: string, newName: string) => {
    set((state) => ({
      variants: state.variants.map((v) =>
        v.id === variantId ? { ...v, name: newName.trim() || v.name, updatedAt: new Date().toISOString() } : v
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
          ? { ...v, posterUrl, posterFileName: posterFileName || v.posterFileName, updatedAt: new Date().toISOString() }
          : v
      )
    }));
  },

  addMapVariant: (slot: SlotName, item: MapVariantItem, targetMaterialName?: string) => {
    let affectedMat = '';
    set((state) => {
      const curMat = targetMaterialName || state.activeMaterialName || (state.variants[0]?.materials ? Object.keys(state.variants[0].materials)[0] : 'default');
      affectedMat = curMat;
      const isCurrentActive = state.activeMaterialName === curMat || !state.activeMaterialName;

      const targetPool = isCurrentActive
        ? (state.mapVariants[slot] || [])
        : (state.materialMapVariants[curMat]?.[slot] || (state.texturePool[curMat] as any)?.[slot] || []);
      const updatedPool = [...targetPool.filter((x) => x.id !== item.id), item];

      const nextMapVariants = isCurrentActive
        ? { ...state.mapVariants, [slot]: updatedPool }
        : state.mapVariants;
      const nextActiveIds = isCurrentActive
        ? { ...state.activeVariantIds, [slot]: item.id }
        : state.activeVariantIds;

      const targetMapSlot: EntryVariantMapSlot = {
        id: item.id,
        fileName: item.fileName,
        filePath: item.filePath,
        fileSize: item.fileSize || 0,
        url: item.url
      };

      const updatedVariants = state.variants.map((v) => {
        if (v.id === state.activeVariantId) {
          const nextMaterials = { ...(v.materials || {}) };
          const curMatObj = nextMaterials[curMat] || { assignedMapIds: {}, maps: {}, slotEnabled: {}, settings: {} };
          nextMaterials[curMat] = {
            ...curMatObj,
            assignedMapIds: {
              ...(curMatObj.assignedMapIds || {}),
              [slot]: item.id
            },
            maps: {
              ...(curMatObj.maps || {}),
              [slot]: targetMapSlot
            }
          };

          return {
            ...v,
            maps: isCurrentActive
              ? { ...v.maps, [slot]: targetMapSlot }
              : v.maps,
            materials: nextMaterials,
            updatedAt: new Date().toISOString()
          };
        }
        return v;
      });

      const nextMatSlots = isCurrentActive
        ? nextMapVariants
        : { ...(state.materialMapVariants[curMat] || {}), [slot]: updatedPool };

      const nextMatActiveIds = isCurrentActive
        ? nextActiveIds
        : { ...(state.materialActiveVariantIds[curMat] || {}), [slot]: item.id };

      const nextMaterialMapVariants = {
        ...state.materialMapVariants,
        [curMat]: nextMatSlots
      };
      const nextMaterialActiveVariantIds = {
        ...state.materialActiveVariantIds,
        [curMat]: nextMatActiveIds
      };
      const nextTexturePool = {
        ...state.texturePool,
        [curMat]: nextMatSlots
      };

      return {
        variants: updatedVariants,
        texturePool: nextTexturePool,
        mapVariants: nextMapVariants,
        activeVariantIds: nextActiveIds,
        materialMapVariants: nextMaterialMapVariants,
        materialActiveVariantIds: nextMaterialActiveVariantIds
      };
    });

    const pbr = usePbrMaterialStore.getState();
    const mapObj = {
      url: item.url,
      filePath: item.filePath,
      fileName: item.fileName,
      fileSize: item.fileSize || 0
    };

    if (!affectedMat || affectedMat === (pbr.activeMaterialName || 'default')) {
      pbr.setMapSlot(slot, mapObj);
    } else {
      usePbrMaterialStore.setState((pbrState) => {
        const currentSlot = pbrState.materialsState[affectedMat] || extractCurrentMaterialSlotData(pbrState);
        return {
          materialsState: {
            ...pbrState.materialsState,
            [affectedMat]: {
              ...currentSlot,
              [`${slot}Map`]: mapObj
            }
          }
        };
      });
    }
  },

  selectMapVariant: (slot: SlotName, id: string) => {
    const state = get();
    const curMat = state.activeMaterialName || (state.variants[0]?.materials ? Object.keys(state.variants[0].materials)[0] : 'default');
    const target = (state.materialMapVariants[curMat]?.[slot] || state.mapVariants[slot])?.find((v) => v.id === id);
    if (!target) return;

    const targetMapSlot: EntryVariantMapSlot = {
      id: target.id,
      fileName: target.fileName,
      filePath: target.filePath,
      fileSize: target.fileSize || 0,
      url: target.url
    };

    const updatedVariants = state.variants.map((v) => {
      if (v.id === state.activeVariantId) {
        const nextMaterials = { ...(v.materials || {}) };
        const curMatObj = nextMaterials[curMat] || { assignedMapIds: {}, maps: {}, slotEnabled: {}, settings: {} };
        nextMaterials[curMat] = {
          ...curMatObj,
          assignedMapIds: {
            ...(curMatObj.assignedMapIds || {}),
            [slot]: id
          },
          maps: {
            ...(curMatObj.maps || {}),
            [slot]: targetMapSlot
          }
        };

        return {
          ...v,
          maps: {
            ...v.maps,
            [slot]: targetMapSlot
          },
          materials: nextMaterials,
          updatedAt: new Date().toISOString()
        };
      }
      return v;
    });

    const nextActiveIds = { ...state.activeVariantIds, [slot]: id };
    const nextMaterialActiveVariantIds = {
      ...state.materialActiveVariantIds,
      [curMat]: nextActiveIds
    };

    set({
      variants: updatedVariants,
      activeVariantIds: nextActiveIds,
      materialActiveVariantIds: nextMaterialActiveVariantIds
    });

    usePbrMaterialStore.getState().setMapSlot(slot, {
      url: target.url, filePath: target.filePath, fileName: target.fileName, fileSize: target.fileSize || 0
    });
  },

  /**
   * Unified Variant Model deletion:
   * Completely purges the texture from ALL variants, preventing zombie resurrection.
   */
  removeMapVariant: (slot: SlotName, id: string) => {
    const state = get();
    const curMat = state.activeMaterialName || (state.variants[0]?.materials ? Object.keys(state.variants[0].materials)[0] : 'default');
    const targetItem = state.mapVariants[slot]?.find((v) => v.id === id);
    const targetPath = targetItem?.filePath;
    const targetUrl = targetItem?.url;

    const updatedVariants = state.variants.map((v) => {
      let changed = false;
      const nextMaps = { ...(v.maps || {}) };
      const vMap = nextMaps[slot];
      if (vMap && (vMap.id === id || (targetPath && vMap.filePath === targetPath) || (targetUrl && vMap.url === targetUrl))) {
        delete nextMaps[slot];
        changed = true;
      }

      let nextMaterials = v.materials ? { ...v.materials } : undefined;
      if (nextMaterials?.[curMat]) {
        const curMatObj = { ...nextMaterials[curMat] };
        const assignedId = curMatObj.assignedMapIds?.[slot];
        const curMatMap = curMatObj.maps?.[slot];
        if (
          assignedId === id ||
          (curMatMap && (curMatMap.id === id || (targetPath && curMatMap.filePath === targetPath) || (targetUrl && curMatMap.url === targetUrl)))
        ) {
          const nextAssigned = { ...(curMatObj.assignedMapIds || {}) };
          nextAssigned[slot] = null;
          const nextMatMaps = { ...(curMatObj.maps || {}) };
          delete nextMatMaps[slot];
          curMatObj.assignedMapIds = nextAssigned;
          curMatObj.maps = nextMatMaps;
          nextMaterials[curMat] = curMatObj;
          changed = true;
        }
      }

      if (changed) {
        return {
          ...v,
          maps: nextMaps,
          materials: nextMaterials,
          updatedAt: new Date().toISOString()
        };
      }
      return v;
    });

    const filteredPool = (state.mapVariants[slot] || []).filter(
      (v) => v.id !== id && (!targetPath || v.filePath !== targetPath)
    );
    const wasActive = state.activeVariantIds[slot] === id;
    const nextActive = wasActive ? filteredPool[0]?.id || null : state.activeVariantIds[slot];

    const nextMapVariants = { ...state.mapVariants, [slot]: filteredPool };
    const nextActiveIds = { ...state.activeVariantIds, [slot]: nextActive };

    const nextMaterialMapVariants = {
      ...state.materialMapVariants,
      [curMat]: nextMapVariants
    };
    const nextMaterialActiveVariantIds = {
      ...state.materialActiveVariantIds,
      [curMat]: nextActiveIds
    };
    const nextTexturePool = {
      ...state.texturePool,
      [curMat]: nextMapVariants
    };

    set({
      variants: updatedVariants,
      texturePool: nextTexturePool,
      mapVariants: nextMapVariants,
      activeVariantIds: nextActiveIds,
      materialMapVariants: nextMaterialMapVariants,
      materialActiveVariantIds: nextMaterialActiveVariantIds
    });

    const activeVar = updatedVariants.find((v) => v.id === state.activeVariantId);
    const nextMap = activeVar?.materials?.[curMat]?.maps?.[slot] || activeVar?.maps?.[slot];
    if (nextMap) {
      usePbrMaterialStore.getState().setMapSlot(slot, {
        url: nextMap.url || '', filePath: nextMap.filePath || null,
        fileName: nextMap.fileName || null, fileSize: nextMap.fileSize || 0
      });
    } else {
      usePbrMaterialStore.getState().clearMapSlot(slot);
    }
  },

  renameMapVariant: (slot: SlotName, id: string, name: string) => {
    set((state) => {
      const curMat = state.activeMaterialName || (state.variants[0]?.materials ? Object.keys(state.variants[0].materials)[0] : 'default');
      const updatedPool = state.mapVariants[slot].map((v) => (v.id === id ? { ...v, name } : v));
      const nextMapVariants = { ...state.mapVariants, [slot]: updatedPool };

      const updatedVariants = state.variants.map((v) => {
        const vMap = v.maps?.[slot];
        const curMatMap = v.materials?.[curMat]?.maps?.[slot];
        let changed = false;
        let nextMaps = v.maps;
        let nextMaterials = v.materials;

        if (vMap?.id === id) {
          nextMaps = { ...v.maps, [slot]: { ...vMap, fileName: name } };
          changed = true;
        }

        if (curMatMap?.id === id && nextMaterials?.[curMat]) {
          nextMaterials = {
            ...nextMaterials,
            [curMat]: {
              ...nextMaterials[curMat],
              maps: {
                ...nextMaterials[curMat].maps,
                [slot]: { ...curMatMap, fileName: name }
              }
            }
          };
          changed = true;
        }

        return changed ? { ...v, maps: nextMaps, materials: nextMaterials, updatedAt: new Date().toISOString() } : v;
      });

      const nextMaterialMapVariants = {
        ...state.materialMapVariants,
        [curMat]: nextMapVariants
      };
      const nextTexturePool = {
        ...state.texturePool,
        [curMat]: nextMapVariants
      };

      return {
        variants: updatedVariants,
        texturePool: nextTexturePool,
        mapVariants: nextMapVariants,
        materialMapVariants: nextMaterialMapVariants
      };
    });
  },

  updateMapVariant: (slot: SlotName, id: string, data: Partial<MapVariantItem>) => {
    set((state) => {
      const curMat = state.activeMaterialName || (state.variants[0]?.materials ? Object.keys(state.variants[0].materials)[0] : 'default');
      const updatedPool = state.mapVariants[slot].map((v) => (v.id === id ? { ...v, ...data } : v));
      const target = updatedPool.find((v) => v.id === id);
      const nextMapVariants = { ...state.mapVariants, [slot]: updatedPool };

      const updatedVariants = state.variants.map((v) => {
        const vMap = v.maps?.[slot];
        const curMatMap = v.materials?.[curMat]?.maps?.[slot];
        let changed = false;
        let nextMaps = v.maps;
        let nextMaterials = v.materials;

        if (vMap && (vMap.id === id || (target && vMap.filePath === target.filePath))) {
          nextMaps = {
            ...v.maps,
            [slot]: {
              id: target?.id || vMap.id, fileName: target?.fileName || vMap.fileName,
              filePath: target?.filePath || vMap.filePath, fileSize: target?.fileSize ?? vMap.fileSize,
              url: target?.url || vMap.url
            }
          };
          changed = true;
        }

        if (curMatMap && (curMatMap.id === id || (target && curMatMap.filePath === target.filePath)) && nextMaterials?.[curMat]) {
          nextMaterials = {
            ...nextMaterials,
            [curMat]: {
              ...nextMaterials[curMat],
              maps: {
                ...nextMaterials[curMat].maps,
                [slot]: {
                  id: target?.id || curMatMap.id, fileName: target?.fileName || curMatMap.fileName,
                  filePath: target?.filePath || curMatMap.filePath, fileSize: target?.fileSize ?? curMatMap.fileSize,
                  url: target?.url || curMatMap.url
                }
              }
            }
          };
          changed = true;
        }

        return changed ? { ...v, maps: nextMaps, materials: nextMaterials, updatedAt: new Date().toISOString() } : v;
      });

      const nextMaterialMapVariants = {
        ...state.materialMapVariants,
        [curMat]: nextMapVariants
      };
      const nextTexturePool = {
        ...state.texturePool,
        [curMat]: nextMapVariants
      };

      return {
        variants: updatedVariants,
        texturePool: nextTexturePool,
        mapVariants: nextMapVariants,
        materialMapVariants: nextMaterialMapVariants,
        colorways: deriveColorways(nextMapVariants.baseColor)
      };
    });
  },

  addColorway: (item) => get().addMapVariant('baseColor', {
    id: item.id, name: item.name, url: item.baseColorUrl, filePath: item.baseColorFilePath,
    fileName: item.fileName, fileSize: item.fileSize || 0
  }),
  selectColorway: (id) => get().selectMapVariant('baseColor', id),
  removeColorway: (id) => get().removeMapVariant('baseColor', id),
  renameColorway: (id, name) => get().renameMapVariant('baseColor', id, name),
  updateColorway: (id, data) => get().updateMapVariant('baseColor', id, {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.baseColorUrl !== undefined ? { url: data.baseColorUrl } : {}),
    ...(data.baseColorFilePath !== undefined ? { filePath: data.baseColorFilePath } : {}),
    ...(data.fileName !== undefined ? { fileName: data.fileName } : {}),
    ...(data.fileSize !== undefined ? { fileSize: data.fileSize } : {})
  }),

  syncActiveVariantSlot: (slot: SlotName, map: PbrSlotMap | null) => {
    set((state) => ({
      variants: state.variants.map((v) => {
        if (v.id === state.activeVariantId) {
          const curMat = state.activeMaterialName || (v.materials ? Object.keys(v.materials)[0] : 'default');
          const nextMaps = { ...v.maps };
          const matSlotMap: EntryVariantMapSlot | null = map && (map.filePath || map.url)
            ? {
                fileName: map.fileName || `${slot}.webp`,
                filePath: map.filePath || '',
                fileSize: map.fileSize || 0,
                url: map.url || ''
              }
            : null;

          if (matSlotMap) {
            nextMaps[slot] = matSlotMap;
          } else {
            delete nextMaps[slot];
          }

          let nextMaterials = v.materials ? { ...v.materials } : undefined;
          if (!nextMaterials) nextMaterials = {};
          const curMatObj = nextMaterials[curMat] || { assignedMapIds: {}, maps: {}, slotEnabled: {}, settings: {} };
          const curMatMaps = { ...(curMatObj.maps || {}) };
          const curAssignedIds = { ...(curMatObj.assignedMapIds || {}) };

          if (matSlotMap) {
            curMatMaps[slot] = matSlotMap;
            curAssignedIds[slot] = (map as any)?.id || curAssignedIds[slot] || null;
          } else {
            delete curMatMaps[slot];
            curAssignedIds[slot] = null;
          }

          nextMaterials[curMat] = {
            ...curMatObj,
            maps: curMatMaps,
            assignedMapIds: curAssignedIds
          };

          return { ...v, maps: nextMaps, materials: nextMaterials, updatedAt: new Date().toISOString() };
        }
        return v;
      })
    }));
  },

  syncActiveVariantParameters: (params: Partial<PbrMaterialParameters>) => {
    set((state) => ({
      variants: state.variants.map((v) => {
        if (v.id === state.activeVariantId) {
          const curMat = state.activeMaterialName || (v.materials ? Object.keys(v.materials)[0] : 'default');
          let nextMaterials = v.materials ? { ...v.materials } : undefined;
          if (!nextMaterials) nextMaterials = {};
          const curMatObj = nextMaterials[curMat] || { assignedMapIds: {}, maps: {}, slotEnabled: {}, settings: {} };
          nextMaterials[curMat] = {
            ...curMatObj,
            settings: {
              ...(curMatObj.settings || {}),
              ...params
            }
          };
          return {
            ...v,
            settings: { ...(v.settings || {}), ...params },
            materials: nextMaterials,
            updatedAt: new Date().toISOString()
          };
        }
        return v;
      })
    }));
    usePbrMaterialStore.setState(params as any);
  },

  resetVariants: () => {
    set({
      variants: [defaultVariant],
      activeVariantId: 'var-default',
      texturePool: { default: createEmptyMapVariants() },
      mapVariants: createEmptyMapVariants(),
      activeVariantIds: createEmptyActiveVariantIds(),
      materialMapVariants: {},
      materialActiveVariantIds: {},
      activeMaterialName: null
    });
  }
}));

registerMaterialMapSyncHandler(
  (name) => useVariantStore.getState().syncMaterialMapVariants(name),
  () => useVariantStore.getState().clearActiveMaterialMapVariants()
);
