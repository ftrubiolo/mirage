export interface MaterialProfile {
  id: string;
  name: string;
  normalMapUrl: string;
  ormMapUrl: string;
  roughnessFactor?: number;
  metalnessFactor?: number;
  normalScale?: number;
  aoIntensity?: number;
}

export interface OptionItem {
  id: string;
  name: string;
  hexColor?: string;
  materialProfileId?: string;
}

export interface OptionGroup {
  id: string;
  name: string;
  options: OptionItem[];
}

export interface VariantTextureCombination {
  combinationKey: string;
  baseColorMapUrl: string;
  materialProfileId: string;
  name?: string;
}

export interface ProductDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface Product3DConfig {
  version: string;
  productId: string;
  productName: string;
  modelUrl: string;
  dimensions: ProductDimensions;
  materialProfiles: Record<string, MaterialProfile>;
  optionGroups: OptionGroup[];
  combinations: Record<string, VariantTextureCombination>;
  defaultCombinationKey: string;
  cameraSettings?: {
    fov?: number;
    initialDistance?: number;
    target?: [number, number, number];
  };
  metadata?: {
    createdAt: string;
    updatedAt: string;
    exportedBy: string;
    polycount?: number;
    triangleCount?: number;
  };
}
