import JSZip from 'jszip';
import { EntryVariant } from '../types/library';
import { useModelStore } from '../store/modelStore';
import { useVariantStore } from '../store/variantStore';
import { usePbrMaterialStore } from '../store/pbrMaterialStore';
import { exportCleanGeometryGLB, exportModelToUSDZ } from './viewportBridge';

export interface Model3dJsonVariant {
  code: string;
  label: string;
  baseColor?: string;
  normalMap?: string;
  ormMap?: string;
  roughnessFactor?: number;
  metalnessFactor?: number;
  normalScale?: number;
  aoIntensity?: number;
}

export interface Model3dJson {
  name: string;
  files: {
    glb: string;
    usdz?: string;
  };
  variants: Model3dJsonVariant[];
}

export interface SeraPackageExportOptions {
  productName?: string;
  productId?: string;
  variants?: EntryVariant[];
  includeUsdz?: boolean;
  onProgress?: (message: string) => void;
}

/**
 * Converts a variant name or string into a clean URL-friendly kebab-case code.
 * E.g. "Lino Arena" -> "lino-arena"
 */
export function slugifyCode(text: string): string {
  if (!text) return 'variante';
  const clean = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || 'variante';
}

/**
 * Derives a clean filename for texture maps following the template convention:
 * *_base.<ext>, *_norm.<ext>, *_orm.<ext>
 */
export function formatMapFileName(
  type: 'base' | 'norm' | 'orm',
  variantCode: string,
  originalFileName?: string | null
): string {
  let ext = 'webp';
  if (originalFileName) {
    const parts = originalFileName.split('.');
    if (parts.length > 1) {
      ext = parts.pop()!.toLowerCase();
    }
  }

  if (type === 'base') {
    return `${variantCode}_base.${ext}`;
  }

  // If original file already has a descriptive stem (e.g. lino_norm or lino_normal or cuero_orm)
  if (originalFileName) {
    const stem = originalFileName
      .replace(/\.[^/.]+$/, '')
      .replace(/(_normal|_norm|_normale)$/i, '')
      .replace(/(_orm|_arm|_mro|_roughness|_metalness|_ao)$/i, '')
      .replace(/(_base|_color|_albedo|_diffuse)$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (stem && stem !== 'normal' && stem !== 'orm' && stem !== 'texture') {
      return `${stem}_${type}.${ext}`;
    }
  }

  return `${variantCode}_${type}.${ext}`;
}

/**
 * Safely fetches raw binary bytes of a file from disk or asset URL without lossy decoding.
 */
export async function getRawBinaryBytes(
  filePath: string | null | undefined,
  url: string | null | undefined
): Promise<Uint8Array | null> {
  if (filePath && window.electronAPI?.readBinaryFile) {
    try {
      return await window.electronAPI.readBinaryFile(filePath);
    } catch (err) {
      console.warn(`[seraPackageExporter] fs.readBinaryFile failed for ${filePath}, falling back to fetch:`, err);
    }
  }

  const fetchUrl = url || (filePath && window.electronAPI?.toAssetUrl ? window.electronAPI.toAssetUrl(filePath) : null);
  if (fetchUrl) {
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    } catch (err) {
      console.error(`[seraPackageExporter] Failed to fetch texture from ${fetchUrl}:`, err);
    }
  }

  return null;
}

/**
 * Builds the model-3d.json structure adhering to the plantilla-modelo-3d-seramuebles specification.
 */
export function buildModel3dJson(
  productName: string,
  variantEntries: Model3dJsonVariant[],
  hasUsdz: boolean
): Model3dJson {
  const json: Model3dJson = {
    name: productName || 'Modelo 3D',
    files: {
      glb: 'geometry.glb'
    },
    variants: variantEntries
  };

  if (hasUsdz) {
    json.files.usdz = 'model.usdz';
  }

  return json;
}

/**
 * Orchestrates the full creation of a Sera Muebles compliant ZIP package.
 */
export async function createSeraPackageZip(options: SeraPackageExportOptions = {}): Promise<Blob> {
  const { onProgress } = options;
  const model = useModelStore.getState();
  const vs = useVariantStore.getState();
  const pbr = usePbrMaterialStore.getState();

  const productName = options.productName || model.productName || 'Modelo 3D';
  const rawVariants = options.variants || (vs.variants && vs.variants.length > 0 ? vs.variants : []);
  const includeUsdz = options.includeUsdz ?? true;

  const zip = new JSZip();
  const mapsFolder = zip.folder('maps')!;

  // 1. Export clean 1:1 geometry.glb without embedded textures
  onProgress?.('Generando geometría 3D limpia (geometry.glb)...');
  const glbBuffer = await exportCleanGeometryGLB();
  zip.file('geometry.glb', glbBuffer);

  // 2. Export Apple iOS AR model.usdz (optional/default)
  let usdzIncluded = false;
  if (includeUsdz) {
    onProgress?.('Generando modelo AR Quick Look (model.usdz)...');
    try {
      const usdzBuffer = await exportModelToUSDZ({ maxTextureSize: 2048, quickLookCompatible: true });
      zip.file('model.usdz', usdzBuffer);
      usdzIncluded = true;
    } catch (err) {
      console.warn('[seraPackageExporter] Error al generar USDZ, omitiendo archivo:', err);
      usdzIncluded = false;
    }
  }

  // 3. Process variants and texture maps
  onProgress?.('Procesando variantes y texturas PBR...');

  // Map to deduplicate identical textures across variants (key: filePath or url -> relative zip path)
  const savedTextureMap = new Map<string, string>();
  const variantJsonList: Model3dJsonVariant[] = [];

  // If no variants exist, use current active PBR state as default
  const variantsToProcess = rawVariants.length > 0 ? rawVariants : [
    {
      id: 'var-default',
      name: productName || 'Default',
      isDefault: true,
      maps: {},
      settings: {}
    } as EntryVariant
  ];

  for (let i = 0; i < variantsToProcess.length; i++) {
    const v = variantsToProcess[i];
    const code = slugifyCode(v.name || v.id || `variante-${i + 1}`);
    const label = v.name || `Variante ${i + 1}`;

    const isCurrentActive = v.id === vs.activeVariantId;
    const vMaps = v.maps || {};

    // BaseColor
    const baseSlot = vMaps.baseColor || (isCurrentActive && pbr.baseColorMap.url ? pbr.baseColorMap : null);
    // Normal
    const normSlot = vMaps.normal || (isCurrentActive && pbr.normalMap.url ? pbr.normalMap : null);
    // ORM
    const ormSlot = vMaps.orm || (isCurrentActive && pbr.ormMap.url ? pbr.ormMap : null);

    const variantEntry: Model3dJsonVariant = {
      code,
      label
    };

    // Process BaseColor
    if (baseSlot && (baseSlot.filePath || baseSlot.url)) {
      const key = baseSlot.filePath || baseSlot.url || '';
      if (savedTextureMap.has(key)) {
        variantEntry.baseColor = savedTextureMap.get(key);
      } else {
        const bytes = await getRawBinaryBytes(baseSlot.filePath, baseSlot.url);
        if (bytes) {
          const fileName = formatMapFileName('base', code, baseSlot.fileName);
          mapsFolder.file(fileName, bytes);
          const relativePath = `maps/${fileName}`;
          savedTextureMap.set(key, relativePath);
          variantEntry.baseColor = relativePath;
        }
      }
    }

    // Process Normal Map (preserving raw fidelity without lossy degradation)
    if (normSlot && (normSlot.filePath || normSlot.url)) {
      const key = normSlot.filePath || normSlot.url || '';
      if (savedTextureMap.has(key)) {
        variantEntry.normalMap = savedTextureMap.get(key);
      } else {
        const bytes = await getRawBinaryBytes(normSlot.filePath, normSlot.url);
        if (bytes) {
          const fileName = formatMapFileName('norm', code, normSlot.fileName);
          mapsFolder.file(fileName, bytes);
          const relativePath = `maps/${fileName}`;
          savedTextureMap.set(key, relativePath);
          variantEntry.normalMap = relativePath;
        }
      }
    }

    // Process ORM Map
    if (ormSlot && (ormSlot.filePath || ormSlot.url)) {
      const key = ormSlot.filePath || ormSlot.url || '';
      if (savedTextureMap.has(key)) {
        variantEntry.ormMap = savedTextureMap.get(key);
      } else {
        const bytes = await getRawBinaryBytes(ormSlot.filePath, ormSlot.url);
        if (bytes) {
          const fileName = formatMapFileName('orm', code, ormSlot.fileName);
          mapsFolder.file(fileName, bytes);
          const relativePath = `maps/${fileName}`;
          savedTextureMap.set(key, relativePath);
          variantEntry.ormMap = relativePath;
        }
      }
    }

    // Process Material Factors (roughness, metalness, normalScale, aoIntensity)
    const settings = v.settings || (isCurrentActive ? (pbr as any) : {});
    if (settings.roughnessFactor !== undefined && settings.roughnessFactor !== 1.0) {
      variantEntry.roughnessFactor = Number(settings.roughnessFactor);
    }
    if (settings.metalnessFactor !== undefined && settings.metalnessFactor !== 1.0) {
      variantEntry.metalnessFactor = Number(settings.metalnessFactor);
    }
    if (settings.normalScale !== undefined && settings.normalScale !== 1.0) {
      variantEntry.normalScale = Number(settings.normalScale);
    }
    if (settings.aoIntensity !== undefined && settings.aoIntensity !== 1.0) {
      variantEntry.aoIntensity = Number(settings.aoIntensity);
    }

    variantJsonList.push(variantEntry);
  }

  // 4. Generate model-3d.json
  const model3dJson = buildModel3dJson(productName, variantJsonList, usdzIncluded);
  zip.file('model-3d.json', JSON.stringify(model3dJson, null, 2));

  // 5. Compress into ZIP Blob
  onProgress?.('Comprimiendo archivo ZIP final...');
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}
