import { create } from 'zustand';

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

export interface ModelState {
  productId: string;
  productSlug: string;
  productName: string;
  modelFilePath: string | null;
  modelUrl: string | null;
  modelFileSize: number;
  isModelLoading: boolean;
  modelStats: ModelStats | null;
  rawDimensions: { width: number; height: number; depth: number } | null;
  unitScale: number;
  unitType: UnitType;

  setProductMeta: (productId: string, productName: string) => void;
  setModel: (modelFilePath: string | null, modelUrl: string | null, modelFileSize?: number) => void;
  setModelStats: (modelStats: ModelStats) => void;
  setIsModelLoading: (isModelLoading: boolean) => void;
  setUnitScale: (scale: number, unitType?: UnitType) => void;
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
  rawDimensions: null as { width: number; height: number; depth: number } | null,
  unitScale: 1.0,
  unitType: 'm' as UnitType
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
      isModelLoading: Boolean(finalUrl),
      unitScale: 1.0,
      unitType: 'm'
    });
  },

  setModelStats: (modelStats: ModelStats) => {
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

  resetModel: () => {
    set({
      ...initialModelState,
      productId: 'producto-' + Date.now(),
      productSlug: 'nuevo-modelo',
      productName: 'Nuevo Modelo'
    });
  }
}));
