import { create } from 'zustand';
import type { GlbManifest } from '../utils/glbValidator';
import { usePbrMaterialStore } from './pbrMaterialStore';
import { useVariantStore } from './variantStore';

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

export type UnitType = 'm' | 'cm' | 'mm' | 'in' | 'custom';

export interface ModelPosition {
  x: number;
  y: number;
  z: number;
}

export interface ModelRotation {
  x: number; // degrees
  y: number; // degrees
  z: number; // degrees
}

export function normalizeDegrees(deg: number): number {
  const mod = ((deg % 360) + 360) % 360;
  return Number(mod.toFixed(2));
}

export interface ModelState {
  productId: string;
  productSlug: string;
  productName: string;
  modelFilePath: string | null;
  modelUrl: string | null;
  modelFileSize: number;
  isModelLoading: boolean;
  modelStats: ModelStats | null;
  glbManifest: GlbManifest | null;
  rawDimensions: { width: number; height: number; depth: number } | null;
  unitScale: number;
  unitType: UnitType;
  modelPosition: ModelPosition;
  modelRotation: ModelRotation;
  autoGround: boolean;

  setProductMeta: (productId: string, productName: string) => void;
  setModel: (modelFilePath: string | null, modelUrl: string | null, modelFileSize?: number) => void;
  setModelStats: (modelStats: ModelStats, materialsInfo?: Record<string, any>) => void;
  setGlbManifest: (manifest: GlbManifest | null) => void;
  setIsModelLoading: (isModelLoading: boolean) => void;
  setUnitScale: (scale: number, unitType?: UnitType) => void;
  setPosition: (position: Partial<ModelPosition>) => void;
  resetPosition: () => void;
  setRotation: (rotation: Partial<ModelRotation>) => void;
  rotateAxisBy: (axis: 'x' | 'y' | 'z', deltaDegrees: number) => void;
  resetRotation: () => void;
  setAutoGround: (autoGround: boolean) => void;
  updateOrientedDimensions: (dimensions: { width: number; height: number; depth: number }) => void;
  resetModel: () => void;
}

export const initialModelState = {
  productId: 'producto-1',
  productSlug: 'producto-1',
  productName: 'Nuevo Modelo',
  modelFilePath: null as string | null,
  modelUrl: null as string | null,
  modelFileSize: 0,
  isModelLoading: false,
  modelStats: null as ModelStats | null,
  glbManifest: null as GlbManifest | null,
  rawDimensions: null as { width: number; height: number; depth: number } | null,
  unitScale: 1.0,
  unitType: 'm' as UnitType,
  modelPosition: { x: 0, y: 0, z: 0 } as ModelPosition,
  modelRotation: { x: 0, y: 0, z: 0 } as ModelRotation,
  autoGround: true
};

export const useModelStore = create<ModelState>((set, get) => ({
  ...initialModelState,

  setProductMeta: (productId: string, productName: string) => {
    set({ productId, productSlug: productId, productName });
  },

  setModel: (modelFilePath: string | null, modelUrl: string | null, modelFileSize = 0) => {
    let finalUrl: string | null = null;
    if (modelUrl) {
      if (modelUrl.startsWith('blob:') || modelUrl.startsWith('data:')) {
        finalUrl = modelUrl;
      } else {
        const cleanUrl = modelUrl.split('?')[0];
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        finalUrl = `${cleanUrl}?t=${uniqueSuffix}`;
      }
    }

    set({
      modelFilePath,
      modelUrl: finalUrl,
      modelFileSize,
      glbManifest: modelFilePath ? get().glbManifest : null,
      isModelLoading: Boolean(finalUrl),
      unitScale: 1.0,
      unitType: 'm',
      modelPosition: { x: 0, y: 0, z: 0 },
      modelRotation: { x: 0, y: 0, z: 0 },
      autoGround: true
    });
  },

  setGlbManifest: (glbManifest: GlbManifest | null) => set({ glbManifest }),

  setModelStats: (modelStats: ModelStats, materialsInfo?: Record<string, any>) => {
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

    if (modelStats.materials && Array.isArray(modelStats.materials)) {
      usePbrMaterialStore.getState().syncMaterialSlots(modelStats.materials, materialsInfo);
      useVariantStore.getState().syncMaterialSlots(modelStats.materials);
    }
  },

  setIsModelLoading: (isModelLoading: boolean) => set({ isModelLoading }),

  setUnitScale: (scale: number, unitType: UnitType = 'custom') => {
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

  setPosition: (position: Partial<ModelPosition>) => {
    const current = get().modelPosition;
    set({
      modelPosition: {
        x: position.x !== undefined ? Number(position.x.toFixed(4)) : current.x,
        y: position.y !== undefined ? Number(position.y.toFixed(4)) : current.y,
        z: position.z !== undefined ? Number(position.z.toFixed(4)) : current.z
      }
    });
  },

  resetPosition: () => {
    set({ modelPosition: { x: 0, y: 0, z: 0 } });
  },

  setRotation: (rotation: Partial<ModelRotation>) => {
    const current = get().modelRotation;
    const next = {
      x: rotation.x !== undefined ? normalizeDegrees(rotation.x) : current.x,
      y: rotation.y !== undefined ? normalizeDegrees(rotation.y) : current.y,
      z: rotation.z !== undefined ? normalizeDegrees(rotation.z) : current.z
    };
    set({ modelRotation: next });
  },

  rotateAxisBy: (axis: 'x' | 'y' | 'z', deltaDegrees: number) => {
    const current = get().modelRotation;
    const next = {
      ...current,
      [axis]: normalizeDegrees(current[axis] + deltaDegrees)
    };
    set({ modelRotation: next });
  },

  resetRotation: () => {
    set({ modelRotation: { x: 0, y: 0, z: 0 } });
  },

  setAutoGround: (autoGround: boolean) => {
    set({ autoGround });
  },

  updateOrientedDimensions: (dimensions: { width: number; height: number; depth: number }) => {
    const { unitScale, modelStats } = get();
    const effectiveScale = unitScale || 1.0;
    const rawDimensions = {
      width: Number((dimensions.width / effectiveScale).toFixed(3)),
      height: Number((dimensions.height / effectiveScale).toFixed(3)),
      depth: Number((dimensions.depth / effectiveScale).toFixed(3))
    };
    set({
      rawDimensions,
      modelStats: modelStats
        ? {
            ...modelStats,
            dimensions
          }
        : null
    });
  },

  resetModel: () => {
    usePbrMaterialStore.getState().resetPbrMaterials();
    set({
      ...initialModelState,
      productId: 'producto-' + Date.now(),
      productSlug: 'nuevo-modelo',
      productName: 'Nuevo Modelo',
      modelPosition: { x: 0, y: 0, z: 0 },
      modelRotation: { x: 0, y: 0, z: 0 },
      autoGround: true
    });
  }
}));
