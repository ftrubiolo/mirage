import * as THREE from 'three';
import JSZip from 'jszip';
import { EntryVariant } from '../types/library';
import { useModelStore } from '../store/modelStore';
import { useVariantStore } from '../store/variantStore';
import { usePbrMaterialStore } from '../store/pbrMaterialStore';
import { exportCleanGeometryGLB, exportModelToUSDZ, viewportBridge } from './viewportBridge';
import { bakeVariantArtifacts } from './arBakePipeline';

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
  slots?: Model3dMaterialSlot[];
  ar?: {
    glb?: string;
    usdz?: string;
  };
}

export interface Model3dMaterialSlot {
  targetMaterial: string;
  baseColor?: string;
  normalMap?: string;
  ormMap?: string;
  roughnessFactor?: number;
  metalnessFactor?: number;
  normalScale?: number;
  aoIntensity?: number;
  transmissionFactor?: number;
  ior?: number;
  clearcoatFactor?: number;
}

export interface Model3dJson {
  name: string;
  files: {
    glb: string;
    usdz?: string;
    ar?: {
      glbDir?: string;
      usdzDir?: string;
    };
  };
  materials?: string[];
  variants: Model3dJsonVariant[];
}

export interface SeraPackageExportOptions {
  productName?: string;
  productId?: string;
  variants?: EntryVariant[];
  includeArVariants?: boolean;
  arTextureSize?: 1024 | 2048;
  includeArGlb?: boolean;
  includeArUsdz?: boolean;
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
      .replace(/(_orm|_arm|_mro|_roughness|_metalness|_ao|_mr|_metalroughness|_metallicroughness)$/i, '')
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
 * In-memory fallback: extracts texture bytes directly from active Three.js mesh materials
 * if the underlying disk file was deleted, renamed, or moved.
 */
export async function extractTextureBytesFromScene(
  type: 'base' | 'norm' | 'orm'
): Promise<{ bytes: Uint8Array; ext: string } | null> {
  const targetObject = viewportBridge.modelGroup || viewportBridge.scene;
  if (!targetObject) return null;

  let foundTexture: THREE.Texture | null = null;
  targetObject.traverse((child) => {
    if (foundTexture) return;
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (m && m instanceof THREE.MeshStandardMaterial) {
          if (type === 'norm' && m.normalMap) foundTexture = m.normalMap;
          else if (type === 'base' && m.map) foundTexture = m.map;
          else if (type === 'orm' && (m.roughnessMap || m.metalnessMap || m.aoMap)) {
            foundTexture = m.roughnessMap || m.metalnessMap || m.aoMap;
          }
        }
      }
    }
  });

  if (!foundTexture || !(foundTexture as any).image) return null;

  try {
    const img = (foundTexture as any).image;
    const width = img.width || img.naturalWidth || 2048;
    const height = img.height || img.naturalHeight || 2048;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;

    const arrayBuffer = await blob.arrayBuffer();
    return { bytes: new Uint8Array(arrayBuffer), ext: 'png' };
  } catch (err) {
    console.warn(`[seraPackageExporter] Could not extract ${type} texture from active scene:`, err);
    return null;
  }
}

/**
 * Resolves binary texture bytes with multi-stage fallback:
 * 1. Primary file / URL
 * 2. Variant pool candidates (siblings in mapVariants[slot])
 * 3. In-memory Three.js texture extraction
 */
export async function resolveSlotBinaryBytes(
  type: 'base' | 'norm' | 'orm',
  primarySlot: { filePath?: string | null; url?: string | null; fileName?: string | null } | null | undefined,
  candidatePool: Array<{ filePath?: string; url?: string; fileName?: string }> = []
): Promise<{ bytes: Uint8Array; fileName?: string } | null> {
  // 1. Primary slot file or URL
  if (primarySlot?.filePath || primarySlot?.url) {
    const bytes = await getRawBinaryBytes(primarySlot.filePath, primarySlot.url);
    if (bytes && bytes.length > 0) {
      return { bytes, fileName: primarySlot.fileName || undefined };
    }
  }

  // 2. Try candidate pool (e.g. from vs.mapVariants[slot])
  for (const candidate of candidatePool) {
    if (!candidate.filePath && !candidate.url) continue;
    if (candidate.filePath === primarySlot?.filePath && candidate.url === primarySlot?.url) continue;

    const bytes = await getRawBinaryBytes(candidate.filePath, candidate.url);
    if (bytes && bytes.length > 0) {
      console.log(`[seraPackageExporter] Resolved ${type} from variant pool fallback: ${candidate.fileName}`);
      return { bytes, fileName: candidate.fileName };
    }
  }

  // 3. Try in-memory Three.js texture extraction from active scene
  const extracted = await extractTextureBytesFromScene(type);
  if (extracted && extracted.bytes.length > 0) {
    console.log(`[seraPackageExporter] Resolved ${type} by extracting from active Three.js viewport texture`);
    return { bytes: extracted.bytes, fileName: `extracted_${type}.${extracted.ext}` };
  }

  return null;
}

/**
 * Builds the model-3d.json structure adhering to the plantilla-modelo-3d-seramuebles specification.
 */
export function buildModel3dJson(
  productName: string,
  variantEntries: Model3dJsonVariant[],
  hasUsdz: boolean = false,
  materials?: string[]
): Model3dJson {
  const json: Model3dJson = {
    name: productName || 'Modelo 3D',
    files: {
      glb: 'geometry.glb'
    },
    variants: variantEntries
  };

  if (materials && materials.length > 1) {
    json.materials = materials;
  }

  if (hasUsdz) {
    json.files.usdz = 'model.usdz';
  }

  const hasAr = variantEntries.some((v) => v.ar && (v.ar.glb || v.ar.usdz));
  if (hasAr) {
    json.files.ar = {
      glbDir: 'ar/glb',
      usdzDir: 'ar/usdz'
    };
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
  const includeArVariants = options.includeArVariants ?? false;
  const arTextureSize = options.arTextureSize ?? 1024;
  const includeArGlb = options.includeArGlb ?? true;
  const includeArUsdz = options.includeArUsdz ?? true;

  const zip = new JSZip();
  const mapsFolder = zip.folder('maps')!;

  const arFolder = includeArVariants && (includeArGlb || includeArUsdz) ? zip.folder('ar') : null;
  const arGlbFolder = arFolder && includeArGlb ? arFolder.folder('glb') : null;
  const arUsdzFolder = arFolder && includeArUsdz ? arFolder.folder('usdz') : null;

  // 1. Export clean 1:1 geometry.glb without embedded textures
  onProgress?.('Generando geometría 3D limpia (geometry.glb)...');
  const glbBuffer = await exportCleanGeometryGLB();
  zip.file('geometry.glb', glbBuffer);

  // 2. Process variants and texture maps
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

    const defaultVariant = rawVariants.find((x) => x.isDefault) || rawVariants[0];

    // BaseColor
    const baseSlot =
      vMaps.baseColor ||
      (isCurrentActive && pbr.baseColorMap?.url ? pbr.baseColorMap : null) ||
      defaultVariant?.maps?.baseColor ||
      (pbr.baseColorMap?.url ? pbr.baseColorMap : null);

    // Normal
    const normSlot =
      vMaps.normal ||
      (isCurrentActive && pbr.normalMap?.url ? pbr.normalMap : null) ||
      defaultVariant?.maps?.normal ||
      (pbr.normalMap?.url ? pbr.normalMap : null);

    // ORM (or glTF Metal-Roughness fallback)
    const ormSlot =
      vMaps.orm ||
      (isCurrentActive && pbr.ormMap?.url ? pbr.ormMap : null) ||
      vMaps.metalRoughness ||
      (isCurrentActive && pbr.metalRoughnessMap?.url ? pbr.metalRoughnessMap : null) ||
      defaultVariant?.maps?.orm ||
      defaultVariant?.maps?.metalRoughness ||
      (pbr.ormMap?.url ? pbr.ormMap : null) ||
      (pbr.metalRoughnessMap?.url ? pbr.metalRoughnessMap : null);

    const variantEntry: Model3dJsonVariant = {
      code,
      label
    };

    // Process BaseColor
    const basePool = vs.mapVariants?.baseColor || [];
    const baseResult = await resolveSlotBinaryBytes('base', baseSlot, basePool);
    if (baseResult) {
      const key = baseSlot?.filePath || baseSlot?.url || `base_${baseResult.fileName || code}`;
      if (savedTextureMap.has(key)) {
        variantEntry.baseColor = savedTextureMap.get(key);
      } else {
        const fileName = formatMapFileName('base', code, baseResult.fileName || baseSlot?.fileName);
        mapsFolder.file(fileName, baseResult.bytes);
        const relativePath = `maps/${fileName}`;
        savedTextureMap.set(key, relativePath);
        variantEntry.baseColor = relativePath;
      }
    }

    // Process Normal Map (preserving raw fidelity without lossy degradation)
    const normPool = vs.mapVariants?.normal || [];
    const normResult = await resolveSlotBinaryBytes('norm', normSlot, normPool);
    if (normResult) {
      const key = normSlot?.filePath || normSlot?.url || `norm_${normResult.fileName || code}`;
      if (savedTextureMap.has(key)) {
        variantEntry.normalMap = savedTextureMap.get(key);
      } else {
        const fileName = formatMapFileName('norm', code, normResult.fileName || normSlot?.fileName);
        mapsFolder.file(fileName, normResult.bytes);
        const relativePath = `maps/${fileName}`;
        savedTextureMap.set(key, relativePath);
        variantEntry.normalMap = relativePath;
      }
    } else if (normSlot) {
      console.warn(`[seraPackageExporter] No se pudo resolver archivo de mapa normal para variante "${label}" (${code}).`);
    }

    // Process ORM Map
    const ormPool = [...(vs.mapVariants?.orm || []), ...(vs.mapVariants?.metalRoughness || [])];
    const ormResult = await resolveSlotBinaryBytes('orm', ormSlot, ormPool);
    if (ormResult) {
      const key = ormSlot?.filePath || ormSlot?.url || `orm_${ormResult.fileName || code}`;
      if (savedTextureMap.has(key)) {
        variantEntry.ormMap = savedTextureMap.get(key);
      } else {
        const fileName = formatMapFileName('orm', code, ormResult.fileName || ormSlot?.fileName);
        mapsFolder.file(fileName, ormResult.bytes);
        const relativePath = `maps/${fileName}`;
        savedTextureMap.set(key, relativePath);
        variantEntry.ormMap = relativePath;
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

    // Process Multi-Material Slots if configured
    const matSlotNames = Object.keys(pbr.materialsState || {});
    if (matSlotNames.length > 1) {
      const slots: Model3dMaterialSlot[] = [];
      for (const matName of matSlotNames) {
        const matData = pbr.materialsState[matName];
        if (!matData) continue;
        const slotEntry: Model3dMaterialSlot = {
          targetMaterial: matName
        };

        // BaseColor
        if (matData.baseColorMap?.url || matData.baseColorMap?.filePath) {
          const baseResult = await resolveSlotBinaryBytes('base', matData.baseColorMap, []);
          if (baseResult) {
            const key = matData.baseColorMap.filePath || matData.baseColorMap.url || `base_${code}_${matName}`;
            if (savedTextureMap.has(key)) {
              slotEntry.baseColor = savedTextureMap.get(key);
            } else {
              const fileName = formatMapFileName('base', `${code}_${slugifyCode(matName)}`, baseResult.fileName || matData.baseColorMap.fileName);
              mapsFolder.file(fileName, baseResult.bytes);
              const relativePath = `maps/${fileName}`;
              savedTextureMap.set(key, relativePath);
              slotEntry.baseColor = relativePath;
            }
          }
        }

        // Normal
        if (matData.normalMap?.url || matData.normalMap?.filePath) {
          const normResult = await resolveSlotBinaryBytes('norm', matData.normalMap, []);
          if (normResult) {
            const key = matData.normalMap.filePath || matData.normalMap.url || `norm_${code}_${matName}`;
            if (savedTextureMap.has(key)) {
              slotEntry.normalMap = savedTextureMap.get(key);
            } else {
              const fileName = formatMapFileName('norm', `${code}_${slugifyCode(matName)}`, normResult.fileName || matData.normalMap.fileName);
              mapsFolder.file(fileName, normResult.bytes);
              const relativePath = `maps/${fileName}`;
              savedTextureMap.set(key, relativePath);
              slotEntry.normalMap = relativePath;
            }
          }
        }

        // ORM
        const ormSource = matData.ormMap?.url || matData.ormMap?.filePath ? matData.ormMap : matData.metalRoughnessMap;
        if (ormSource?.url || ormSource?.filePath) {
          const ormResult = await resolveSlotBinaryBytes('orm', ormSource, []);
          if (ormResult) {
            const key = ormSource.filePath || ormSource.url || `orm_${code}_${matName}`;
            if (savedTextureMap.has(key)) {
              slotEntry.ormMap = savedTextureMap.get(key);
            } else {
              const fileName = formatMapFileName('orm', `${code}_${slugifyCode(matName)}`, ormResult.fileName || ormSource.fileName);
              mapsFolder.file(fileName, ormResult.bytes);
              const relativePath = `maps/${fileName}`;
              savedTextureMap.set(key, relativePath);
              slotEntry.ormMap = relativePath;
            }
          }
        }

        if (matData.roughnessFactor !== undefined && matData.roughnessFactor !== 1.0) slotEntry.roughnessFactor = Number(matData.roughnessFactor);
        if (matData.metalnessFactor !== undefined && matData.metalnessFactor !== 1.0) slotEntry.metalnessFactor = Number(matData.metalnessFactor);
        if (matData.normalScale !== undefined && matData.normalScale !== 1.0) slotEntry.normalScale = Number(matData.normalScale);
        if (matData.aoIntensity !== undefined && matData.aoIntensity !== 1.0) slotEntry.aoIntensity = Number(matData.aoIntensity);
        if (matData.transmissionFactor !== undefined && matData.transmissionFactor > 0) slotEntry.transmissionFactor = Number(matData.transmissionFactor);
        if (matData.ior !== undefined && matData.ior !== 1.5) slotEntry.ior = Number(matData.ior);
        if (matData.clearcoatFactor !== undefined && matData.clearcoatFactor > 0) slotEntry.clearcoatFactor = Number(matData.clearcoatFactor);

        slots.push(slotEntry);
      }
      variantEntry.slots = slots;
    }

    // Process AR Baked Assets per Variant (GLB & USDZ)
    if (includeArVariants && (includeArGlb || includeArUsdz)) {
      onProgress?.(`Horneando activos AR (${code}) ${i + 1}/${variantsToProcess.length}...`);
      const targetObject = viewportBridge.modelGroup || viewportBridge.scene;
      if (targetObject) {
        try {
          const baked = await bakeVariantArtifacts(targetObject, v, {
            maxTextureSize: arTextureSize,
            includeGlb: includeArGlb,
            includeUsdz: includeArUsdz
          });

          const arItem: { glb?: string; usdz?: string } = {};
          if (arGlbFolder && baked.glb) {
            const fileName = `${code}.glb`;
            arGlbFolder.file(fileName, baked.glb);
            arItem.glb = `ar/glb/${fileName}`;
          }
          if (arUsdzFolder && baked.usdz) {
            const fileName = `${code}.usdz`;
            arUsdzFolder.file(fileName, baked.usdz);
            arItem.usdz = `ar/usdz/${fileName}`;
          }
          if (arItem.glb || arItem.usdz) {
            variantEntry.ar = arItem;
          }
        } catch (err) {
          console.warn(`[seraPackageExporter] No se pudieron hornear modelos AR para variante ${code}:`, err);
        }
      }
    }

    variantJsonList.push(variantEntry);
  }

  // 3. Generate model-3d.json
  const detectedMaterials = model.modelStats?.materials && model.modelStats.materials.length > 1
    ? model.modelStats.materials
    : undefined;
  const model3dJson = buildModel3dJson(productName, variantJsonList, false, detectedMaterials);
  zip.file('model-3d.json', JSON.stringify(model3dJson, null, 2));

  // 4. Compress into ZIP Blob
  onProgress?.('Comprimiendo archivo ZIP final...');
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}
