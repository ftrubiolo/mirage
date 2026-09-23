export interface GlobalMaterialPreset {
  id: string;
  name: string;
  category: 'textil' | 'cuero' | 'madera' | 'metal' | 'piedra' | 'otro';
  swatches: {
    id: string;
    name: string;
    hexColor: string;
  }[];
}

export type FurnitureCategory =
  | 'asientos'
  | 'mesas'
  | 'almacenamiento'
  | 'camas'
  | 'iluminacion'
  | 'accesorios'
  | 'otro';

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
  category: FurnitureCategory;
  description?: string;
  status: 'active' | 'workshop' | 'pending' | 'madeToOrder' | 'dispatched' | 'neutral';
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
    id: 'lino',
    name: 'Lino Natural',
    category: 'textil',
    swatches: [
      { id: 'lino-crudo', name: 'Lino Crudo', hexColor: '#ded8c7' },
      { id: 'lino-arena', name: 'Lino Arena', hexColor: '#bfae95' },
      { id: 'lino-terracota', name: 'Lino Terracota', hexColor: '#aa533e' },
      { id: 'lino-verde-oliva', name: 'Lino Verde Oliva', hexColor: '#5c634c' },
      { id: 'lino-grafito', name: 'Lino Grafito', hexColor: '#36383b' }
    ]
  },
  {
    id: 'cuero',
    name: 'Cuero Anilina',
    category: 'cuero',
    swatches: [
      { id: 'cuero-cognac', name: 'Cuero Cognac', hexColor: '#8a4b27' },
      { id: 'cuero-caramelo', name: 'Cuero Caramelo', hexColor: '#b56d3b' },
      { id: 'cuero-chocolate', name: 'Cuero Chocolate', hexColor: '#3d2518' },
      { id: 'cuero-negro', name: 'Cuero Negro', hexColor: '#1a1918' }
    ]
  },
  {
    id: 'madera',
    name: 'Maderas Nativas',
    category: 'madera',
    swatches: [
      { id: 'madera-petiribi', name: 'Petiribí Natural', hexColor: '#a17a4e' },
      { id: 'madera-paraiso', name: 'Paraíso Macizo', hexColor: '#c7a97b' },
      { id: 'madera-roble-oscuro', name: 'Roble Oscuro', hexColor: '#4f3521' }
    ]
  },
  {
    id: 'metal',
    name: 'Hierro / Metal Estructural',
    category: 'metal',
    swatches: [
      { id: 'metal-negro-mate', name: 'Negro Microtexturado', hexColor: '#1f1f1f' },
      { id: 'metal-blanco-mate', name: 'Blanco Cálido', hexColor: '#e8e7e4' },
      { id: 'metal-bronce', name: 'Bronce Envejecido', hexColor: '#6a5639' }
    ]
  }
];
