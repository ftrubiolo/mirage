export interface GlobalMaterialPreset {
  id: string;
  name: string;
  category: 'fabric' | 'leather' | 'wood' | 'metal' | 'plastic' | 'glass' | 'ceramic' | 'other';
  swatches: {
    id: string;
    name: string;
    hexColor: string;
  }[];
}

export type ModelCategory =
  | 'props'
  | 'architecture'
  | 'characters'
  | 'vehicles'
  | 'environments'
  | 'products'
  | 'other';

export const MODEL_CATEGORY_LABELS: Record<ModelCategory, string> = {
  props: 'Props',
  architecture: 'Architecture',
  characters: 'Characters',
  vehicles: 'Vehicles',
  environments: 'Environments',
  products: 'Products',
  other: 'Other'
};

export type EntryStatus =
  | 'active'
  | 'wip'
  | 'pending'
  | 'approved'
  | 'published'
  | 'neutral';

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  active: 'Active',
  wip: 'In Progress',
  pending: 'In Review',
  approved: 'Approved',
  published: 'Published',
  neutral: 'Archived'
};

export interface LibraryEntrySettings {
  baseColor?: string;
  normalScale: number;
  normalInvertY: boolean;
  roughnessFactor: number;
  metalnessFactor: number;
  aoIntensity: number;
  emissiveIntensity: number;
  emissiveColor: string;
  emissiveFullGlow?: boolean;
  clearcoatFactor: number;
  clearcoatRoughness: number;
  sheenColor: string;
  sheenRoughness: number;
  transmissionFactor: number;
  ior: number;
  displacementScale: number;
  unitScale: number;
  unitType: 'm' | 'cm' | 'mm' | 'in' | 'custom';
  useOrmPack: boolean;
  materialPackingMode?: 'orm' | 'metalRoughness' | 'separate';
  loadFromCache: boolean;
  modelRotation?: { x: number; y: number; z: number };
  autoGround?: boolean;
}

export interface EntryVariantMapSlot {
  id?: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  url?: string;
}

export interface TextureAssetItem {
  id: string;
  name: string;
  filePath: string;
  fileName: string;
  fileSize?: number;
  url?: string;
}

export type TexturePool = Record<string, Partial<Record<string, TextureAssetItem[]>>>;

export interface EntryVariantMaterial {
  assignedMapIds?: Partial<Record<string, string | null>>;
  maps?: Record<string, EntryVariantMapSlot>;
  slotEnabled?: Partial<Record<string, boolean>>;
  settings?: Partial<LibraryEntrySettings>;
}

export interface EntryVariant {
  id: string;
  name: string;
  isDefault?: boolean;
  posterUrl?: string | null;
  posterFileName?: string | null;
  materials?: Record<string, EntryVariantMaterial>;
  maps?: Record<string, EntryVariantMapSlot>;
  slotEnabled?: Partial<Record<string, boolean>>;
  settings?: Partial<LibraryEntrySettings>;
  productOptionRef?: {
    optionGroupId?: string;
    optionId?: string;
    sku?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface LibraryEntry {
  id: string;
  title: string;
  slug: string;
  category: ModelCategory;
  description?: string;
  status: EntryStatus;
  createdAt: string;
  updatedAt: string;
  posterUrl?: string | null;
  posterFileName?: string | null;
  modelFileName?: string | null;
  modelFilePath?: string | null;
  modelFileSize?: number;
  dimensions?: { width: number; height: number; depth: number } | null;
  stats?: { triangleCount: number; vertexCount: number; meshCount: number; materials?: string[] } | null;
  texturePool?: TexturePool;
  variants?: EntryVariant[];
  activeVariantId?: string;
  // Legacy optional properties accepted during ingestion migration:
  maps?: Record<string, { fileName: string; filePath: string; fileSize?: number }>;
  materials?: Record<string, EntryVariantMaterial>;
  colorways?: {
    id: string;
    name: string;
    baseColorUrl: string;
    baseColorFilePath: string;
    fileName: string;
    fileSize?: number;
  }[];
  mapVariants?: Partial<Record<string, { id: string; name: string; url: string; filePath: string; fileName: string; fileSize?: number }[]>>;
  activeVariantIds?: Partial<Record<string, string | null>>;
  materialMapVariants?: Partial<Record<string, Partial<Record<string, { id: string; name: string; url: string; filePath: string; fileName: string; fileSize?: number }[]>>>>;
  materialActiveVariantIds?: Partial<Record<string, Partial<Record<string, string | null>>>>;
  slotEnabled?: Partial<Record<string, boolean>>;
  settings?: LibraryEntrySettings;
}

export const GLOBAL_MATERIAL_PRESETS: GlobalMaterialPreset[] = [
  {
    id: 'fabric',
    name: 'Woven Fabric',
    category: 'fabric',
    swatches: [
      { id: 'fabric-ecru', name: 'Raw Ecru', hexColor: '#ded8c7' },
      { id: 'fabric-sand', name: 'Warm Sand', hexColor: '#bfae95' },
      { id: 'fabric-terracotta', name: 'Terracotta', hexColor: '#aa533e' },
      { id: 'fabric-olive', name: 'Olive', hexColor: '#5c634c' },
      { id: 'fabric-graphite', name: 'Graphite', hexColor: '#36383b' }
    ]
  },
  {
    id: 'leather',
    name: 'Aniline Leather',
    category: 'leather',
    swatches: [
      { id: 'leather-cognac', name: 'Cognac', hexColor: '#8a4b27' },
      { id: 'leather-caramel', name: 'Caramel', hexColor: '#b56d3b' },
      { id: 'leather-espresso', name: 'Espresso', hexColor: '#3d2518' },
      { id: 'leather-black', name: 'Obsidian Black', hexColor: '#1a1918' }
    ]
  },
  {
    id: 'wood',
    name: 'Natural Wood',
    category: 'wood',
    swatches: [
      { id: 'wood-walnut', name: 'Natural Walnut', hexColor: '#a17a4e' },
      { id: 'wood-oak', name: 'White Oak', hexColor: '#c7a97b' },
      { id: 'wood-ebony', name: 'Dark Oak', hexColor: '#4f3521' }
    ]
  },
  {
    id: 'metal',
    name: 'Brushed Metal',
    category: 'metal',
    swatches: [
      { id: 'metal-matte-black', name: 'Matte Black', hexColor: '#1f1f1f' },
      { id: 'metal-warm-white', name: 'Warm Aluminum', hexColor: '#e8e7e4' },
      { id: 'metal-bronze', name: 'Aged Bronze', hexColor: '#6a5639' }
    ]
  },
  {
    id: 'plastic',
    name: 'Matte Polymer',
    category: 'plastic',
    swatches: [
      { id: 'plastic-slate', name: 'Slate Grey', hexColor: '#4a4e54' },
      { id: 'plastic-ivory', name: 'Ivory ABS', hexColor: '#eae6df' },
      { id: 'plastic-signal', name: 'Signal Red', hexColor: '#b83c32' }
    ]
  },
  {
    id: 'glass',
    name: 'Clear Glass',
    category: 'glass',
    swatches: [
      { id: 'glass-clear', name: 'Optical Clear', hexColor: '#eef4f5' },
      { id: 'glass-smoke', name: 'Smoked Tint', hexColor: '#5c6368' }
    ]
  },
  {
    id: 'ceramic',
    name: 'Glazed Ceramic',
    category: 'ceramic',
    swatches: [
      { id: 'ceramic-porcelain', name: 'Porcelain White', hexColor: '#f3f1ec' },
      { id: 'ceramic-stoneware', name: 'Stoneware Clay', hexColor: '#8d7b6b' }
    ]
  }
];
