import { create } from 'zustand';
import { EntryVariant, EntryVariantMapSlot } from '../types/library';
import {
  SlotName,
  ALL_SLOT_NAMES,
  PbrSlotMap,
  PbrMaterialParameters,
  createDefaultSlotEnabled,
  usePbrMaterialStore
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
  mapVariants: Record<SlotName, MapVariantItem[]>;
  activeVariantIds: Record<SlotName, string | null>;

  selectVariant: (variantId: string) => void;
  createVariant: (name: string, cloneCurrent?: boolean) => void;
  renameVariant: (variantId: string, newName: string) => void;
  deleteVariant: (variantId: string) => void;
  setVariantDefault: (variantId: string) => void;
  setVariantPoster: (variantId: string, posterUrl: string, posterFileName?: string) => void;

  addMapVariant: (slot: SlotName, item: MapVariantItem) => void;
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
  maps: {},
  slotEnabled: createDefaultSlotEnabled(),
  settings: {}
};

export const useVariantStore = create<VariantState>((set, get) => ({
  variants: [defaultVariant],
  activeVariantId: 'var-default',
  mapVariants: createEmptyMapVariants(),
  activeVariantIds: createEmptyActiveVariantIds(),

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

    const updatedVariants = state.variants.map((v) =>
      v.id === currentActiveId
        ? {
            ...v,
            maps: currentMaps,
            slotEnabled: { ...pbr.slotEnabled },
            settings: {
              ...(v.settings || {}),
              normalScale: pbr.normalScale, normalInvertY: pbr.normalInvertY,
              roughnessFactor: pbr.roughnessFactor, metalnessFactor: pbr.metalnessFactor,
              aoIntensity: pbr.aoIntensity, emissiveIntensity: pbr.emissiveIntensity,
              emissiveColor: pbr.emissiveColor, emissiveFullGlow: pbr.emissiveFullGlow, clearcoatFactor: pbr.clearcoatFactor,
              clearcoatRoughness: pbr.clearcoatRoughness, sheenColor: pbr.sheenColor,
              sheenRoughness: pbr.sheenRoughness, transmissionFactor: pbr.transmissionFactor,
              ior: pbr.ior, displacementScale: pbr.displacementScale
            },
            updatedAt: new Date().toISOString()
          }
        : v
    );

    const target = updatedVariants.find((v) => v.id === variantId);
    if (!target) return;

    const nextActiveIds: Record<SlotName, string | null> = { ...state.activeVariantIds };
    const nextMapVariants = { ...state.mapVariants };

    for (const slot of ALL_SLOT_NAMES) {
      const targetMap = target.maps?.[slot];
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

    set({
      variants: updatedVariants,
      activeVariantId: variantId,
      mapVariants: nextMapVariants,
      activeVariantIds: nextActiveIds,
    });

    usePbrMaterialStore.getState().applyVariantMaterialState(
      target.maps || {},
      target.slotEnabled,
      (target.settings as any) || {}
    );
  },

  createVariant: (name: string, cloneCurrent = true) => {
    const state = get();
    const newId = `var-${Date.now()}`;
    const pbr = usePbrMaterialStore.getState();

    let mapsForVariant: Record<string, EntryVariantMapSlot> = {};
    let slotEnabledForVariant = createDefaultSlotEnabled();
    let settingsForVariant: any = {};

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
        normalScale: pbr.normalScale, normalInvertY: pbr.normalInvertY,
        roughnessFactor: pbr.roughnessFactor, metalnessFactor: pbr.metalnessFactor,
        aoIntensity: pbr.aoIntensity, emissiveIntensity: pbr.emissiveIntensity,
        emissiveColor: pbr.emissiveColor, emissiveFullGlow: pbr.emissiveFullGlow, clearcoatFactor: pbr.clearcoatFactor,
        clearcoatRoughness: pbr.clearcoatRoughness, sheenColor: pbr.sheenColor,
        sheenRoughness: pbr.sheenRoughness, transmissionFactor: pbr.transmissionFactor,
        ior: pbr.ior, displacementScale: pbr.displacementScale
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

  addMapVariant: (slot: SlotName, item: MapVariantItem) => {
    set((state) => {
      const pool = state.mapVariants[slot] || [];
      const updatedPool = [...pool.filter((x) => x.id !== item.id), item];
      const nextMapVariants = { ...state.mapVariants, [slot]: updatedPool };
      const nextActiveIds = { ...state.activeVariantIds, [slot]: item.id };

      const updatedVariants = state.variants.map((v) =>
        v.id === state.activeVariantId
          ? {
              ...v,
              maps: {
                ...v.maps,
                [slot]: {
                  id: item.id, fileName: item.fileName, filePath: item.filePath,
                  fileSize: item.fileSize || 0, url: item.url
                }
              },
              updatedAt: new Date().toISOString()
            }
          : v
      );

      return {
        variants: updatedVariants,
        mapVariants: nextMapVariants,
        activeVariantIds: nextActiveIds,
      };
    });

    usePbrMaterialStore.getState().setMapSlot(slot, {
      url: item.url, filePath: item.filePath, fileName: item.fileName, fileSize: item.fileSize || 0
    });
  },

  selectMapVariant: (slot: SlotName, id: string) => {
    const state = get();
    const target = state.mapVariants[slot]?.find((v) => v.id === id);
    if (!target) return;

    const updatedVariants = state.variants.map((v) =>
      v.id === state.activeVariantId
        ? {
            ...v,
            maps: {
              ...v.maps,
              [slot]: {
                id: target.id, fileName: target.fileName, filePath: target.filePath,
                fileSize: target.fileSize || 0, url: target.url
              }
            },
            updatedAt: new Date().toISOString()
          }
        : v
    );

    set({
      variants: updatedVariants,
      activeVariantIds: { ...state.activeVariantIds, [slot]: id }
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
    const targetItem = state.mapVariants[slot]?.find((v) => v.id === id);
    const targetPath = targetItem?.filePath;
    const targetUrl = targetItem?.url;

    const updatedVariants = state.variants.map((v) => {
      const vMap = v.maps?.[slot];
      if (!vMap) return v;
      const isMatch =
        vMap.id === id ||
        (targetPath && vMap.filePath === targetPath) ||
        (targetUrl && vMap.url === targetUrl);

      if (isMatch) {
        const nextMaps = { ...v.maps };
        delete nextMaps[slot];
        return { ...v, maps: nextMaps, updatedAt: new Date().toISOString() };
      }
      return v;
    });

    const filteredPool = state.mapVariants[slot].filter(
      (v) => v.id !== id && (!targetPath || v.filePath !== targetPath)
    );
    const wasActive = state.activeVariantIds[slot] === id;
    const nextActive = wasActive ? filteredPool[0]?.id || null : state.activeVariantIds[slot];

    const nextMapVariants = { ...state.mapVariants, [slot]: filteredPool };
    const nextActiveIds = { ...state.activeVariantIds, [slot]: nextActive };

    set({
      variants: updatedVariants,
      mapVariants: nextMapVariants,
      activeVariantIds: nextActiveIds,
    });

    const activeVar = updatedVariants.find((v) => v.id === state.activeVariantId);
    const nextMap = activeVar?.maps?.[slot];
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
      const updatedPool = state.mapVariants[slot].map((v) => (v.id === id ? { ...v, name } : v));
      const nextMapVariants = { ...state.mapVariants, [slot]: updatedPool };

      const updatedVariants = state.variants.map((v) => {
        const vMap = v.maps?.[slot];
        if (vMap?.id === id) {
          return {
            ...v,
            maps: { ...v.maps, [slot]: { ...vMap, fileName: name } },
            updatedAt: new Date().toISOString()
          };
        }
        return v;
      });

      return {
        variants: updatedVariants,
        mapVariants: nextMapVariants,
      };
    });
  },

  updateMapVariant: (slot: SlotName, id: string, data: Partial<MapVariantItem>) => {
    set((state) => {
      const updatedPool = state.mapVariants[slot].map((v) => (v.id === id ? { ...v, ...data } : v));
      const target = updatedPool.find((v) => v.id === id);
      const nextMapVariants = { ...state.mapVariants, [slot]: updatedPool };

      const updatedVariants = state.variants.map((v) => {
        const vMap = v.maps?.[slot];
        if (vMap && (vMap.id === id || (target && vMap.filePath === target.filePath))) {
          return {
            ...v,
            maps: {
              ...v.maps,
              [slot]: {
                id: target?.id || vMap.id, fileName: target?.fileName || vMap.fileName,
                filePath: target?.filePath || vMap.filePath, fileSize: target?.fileSize ?? vMap.fileSize,
                url: target?.url || vMap.url
              }
            },
            updatedAt: new Date().toISOString()
          };
        }
        return v;
      });

      return {
        variants: updatedVariants,
        mapVariants: nextMapVariants,
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
          const nextMaps = { ...v.maps };
          if (map && (map.filePath || map.url)) {
            nextMaps[slot] = {
              fileName: map.fileName || `${slot}.webp`,
              filePath: map.filePath || '',
              fileSize: map.fileSize || 0,
              url: map.url || ''
            };
          } else {
            delete nextMaps[slot];
          }
          return { ...v, maps: nextMaps, updatedAt: new Date().toISOString() };
        }
        return v;
      })
    }));
  },

  syncActiveVariantParameters: (params: Partial<PbrMaterialParameters>) => {
    set((state) => ({
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId
          ? { ...v, settings: { ...(v.settings || {}), ...params }, updatedAt: new Date().toISOString() }
          : v
      )
    }));
    usePbrMaterialStore.setState(params as any);
  },

  resetVariants: () => {
    set({
      variants: [defaultVariant],
      activeVariantId: 'var-default',
      mapVariants: createEmptyMapVariants(),
      activeVariantIds: createEmptyActiveVariantIds(),
    });
  }
}));
