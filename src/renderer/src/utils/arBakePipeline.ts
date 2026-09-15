import * as THREE from 'three';
import JSZip from 'jszip';
import { EntryVariant, EntryVariantMapSlot } from '../types/library';
import { bakeModelTransforms, viewportBridge } from './viewportBridge';
import { loadTextureAsync } from './pbrController';
import { slugifyCode } from './seraPackageExporter';

export interface ArBakeOptions {
  maxTextureSize?: 1024 | 2048;
  includeGlb?: boolean;
  includeUsdz?: boolean;
  groundModel?: boolean;
}

export interface ArBakeResult {
  variantCode: string;
  variantLabel: string;
  glb?: ArrayBuffer;
  usdz?: ArrayBuffer;
}

export interface ArBakeProgress {
  currentVariantIndex: number;
  totalVariants: number;
  variantName: string;
  stage: 'preparing' | 'glb' | 'usdz' | 'complete';
  message: string;
}

export interface ArPackageExportOptions {
  productName?: string;
  productId?: string;
  variants?: EntryVariant[];
  maxTextureSize?: 1024 | 2048;
  includeGlb?: boolean;
  includeUsdz?: boolean;
  onProgress?: (progress: ArBakeProgress) => void;
}

/**
 * Safely resolves and loads a texture as a THREE.Texture.
 * Falls back gracefully if loading fails or in mock environments.
 */
async function resolveSlotTexture(
  slot?: EntryVariantMapSlot | null,
  isSRGB = false
): Promise<THREE.Texture | null> {
  if (!slot) return null;
  const url =
    slot.url ||
    (slot.filePath && window.electronAPI?.toAssetUrl
      ? window.electronAPI.toAssetUrl(slot.filePath)
      : slot.filePath);

  if (!url) return null;

  try {
    return await loadTextureAsync(url, isSRGB);
  } catch (err) {
    console.warn(`[arBakePipeline] No se pudo cargar textura para ${slot.fileName || url}:`, err);
    return null;
  }
}

/**
 * Ensures the bottom of the model rests exactly on the floor plane (Y = 0)
 * which is critical for realistic floor tracking in Apple Quick Look and Android Scene Viewer.
 */
export function groundModelAtFloor(object: THREE.Object3D): void {
  const bbox = new THREE.Box3().setFromObject(object);
  if (bbox.isEmpty()) return;

  const minY = bbox.min.y;
  if (Math.abs(minY) > 0.0005) {
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.translate(0, -minY, 0);
          mesh.geometry.computeBoundingBox();
          mesh.geometry.computeBoundingSphere();
        }
      }
    });
    object.position.y = 0;
    object.updateMatrixWorld(true);
  }
}

/**
 * Bakes a single variant's geometry, downscaled textures, and PBR factors
 * into standalone, self-contained GLB and/or USDZ binary buffers.
 */
export async function bakeVariantArtifacts(
  baseModel: THREE.Object3D,
  variant: EntryVariant,
  options: ArBakeOptions = {}
): Promise<ArBakeResult> {
  const {
    maxTextureSize = 1024,
    includeGlb = true,
    includeUsdz = true,
    groundModel = true
  } = options;

  const variantCode = slugifyCode(variant.name || variant.id || 'variante');
  const variantLabel = variant.name || 'Variante';

  // 1. Clone model transforms & geometries without mutating the active viewport scene
  const bakedObject = bakeModelTransforms(baseModel);

  // 2. Ground the model to Y = 0 for AR placement
  if (groundModel) {
    groundModelAtFloor(bakedObject);
  }

  // 3. Resolve textures for this variant
  const maps = variant.maps || {};
  const [
    baseColorTex,
    normalTex,
    ormTex,
    roughnessTex,
    metalnessTex,
    aoTex
  ] = await Promise.all([
    resolveSlotTexture(maps.baseColor, true),
    resolveSlotTexture(maps.normal, false),
    resolveSlotTexture(maps.orm || maps.metalRoughness, false),
    resolveSlotTexture(maps.roughness, false),
    resolveSlotTexture(maps.metalness, false),
    resolveSlotTexture(maps.ao, false)
  ]);

  const settings = variant.settings || {};
  const roughnessFactor = typeof settings.roughnessFactor === 'number' ? settings.roughnessFactor : 1.0;
  const metalnessFactor = typeof settings.metalnessFactor === 'number' ? settings.metalnessFactor : 1.0;
  const normalScale = typeof settings.normalScale === 'number' ? settings.normalScale : 1.0;
  const normalInvertY = Boolean(settings.normalInvertY);
  const aoIntensity = typeof settings.aoIntensity === 'number' ? settings.aoIntensity : 1.0;

  // 4. Create and attach variant-specific cloned materials
  bakedObject.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const existingMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

      const mat = new THREE.MeshStandardMaterial({
        color: (existingMat as any)?.color || new THREE.Color(0xffffff),
        roughness: roughnessFactor,
        metalness: metalnessFactor
      });

      if (baseColorTex) {
        mat.map = baseColorTex;
      }
      if (normalTex) {
        mat.normalMap = normalTex;
        mat.normalScale = new THREE.Vector2(normalScale, normalInvertY ? -normalScale : normalScale);
      }
      if (ormTex) {
        mat.roughnessMap = ormTex;
        mat.metalnessMap = ormTex;
        mat.aoMap = ormTex;
        mat.aoMapIntensity = aoIntensity;
      } else {
        if (roughnessTex) mat.roughnessMap = roughnessTex;
        if (metalnessTex) mat.metalnessMap = metalnessTex;
        if (aoTex) {
          mat.aoMap = aoTex;
          mat.aoMapIntensity = aoIntensity;
        }
      }

      mat.needsUpdate = true;
      mesh.material = mat;
    }
  });

  const result: ArBakeResult = {
    variantCode,
    variantLabel
  };

  // 5. Generate baked, texture-embedded GLB for Android Scene Viewer & WebXR
  if (includeGlb) {
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const gltfExporter = new GLTFExporter();

    result.glb = await new Promise<ArrayBuffer>((resolve, reject) => {
      gltfExporter.parse(
        bakedObject,
        (res) => {
          if (res instanceof ArrayBuffer) {
            resolve(res);
          } else {
            const str = JSON.stringify(res);
            resolve(new TextEncoder().encode(str).buffer);
          }
        },
        (error) => reject(error),
        {
          binary: true,
          embedImages: true,
          maxTextureSize,
          includeCustomExtensions: true
        }
      );
    });
  }

  // 6. Generate baked, standalone USDZ for Apple AR Quick Look
  if (includeUsdz) {
    const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js');
    const usdzExporter = new USDZExporter();

    const uint8Result = await usdzExporter.parseAsync(bakedObject, {
      quickLookCompatible: true,
      maxTextureSize
    });

    result.usdz = uint8Result.buffer.slice(
      uint8Result.byteOffset,
      uint8Result.byteOffset + uint8Result.byteLength
    );
  }

  return result;
}

/**
 * Creates a standalone AR Asset Bundle (.ZIP) containing optimized .GLB and .USDZ
 * files for every variant, plus an AR manifest.
 */
export async function createArPackageZip(options: ArPackageExportOptions = {}): Promise<Blob> {
  const targetObject = viewportBridge.modelGroup || viewportBridge.scene;
  if (!targetObject) {
    throw new Error('No hay ningún modelo 3D cargado para exportar.');
  }

  const {
    productName = 'Modelo 3D',
    variants = [],
    maxTextureSize = 1024,
    includeGlb = true,
    includeUsdz = true,
    onProgress
  } = options;

  const zip = new JSZip();
  const glbFolder = includeGlb ? zip.folder('glb')! : null;
  const usdzFolder = includeUsdz ? zip.folder('usdz')! : null;

  const variantsToProcess =
    variants.length > 0
      ? variants
      : [
          {
            id: 'var-default',
            name: productName || 'Default',
            isDefault: true,
            maps: {},
            settings: {}
          } as EntryVariant
        ];

  const total = variantsToProcess.length;
  const manifestVariants: Array<{
    code: string;
    label: string;
    glb?: string;
    usdz?: string;
  }> = [];

  for (let i = 0; i < total; i++) {
    const v = variantsToProcess[i];
    const name = v.name || `Variante ${i + 1}`;

    onProgress?.({
      currentVariantIndex: i + 1,
      totalVariants: total,
      variantName: name,
      stage: 'preparing',
      message: `Horneando variante ${i + 1} de ${total}: "${name}"...`
    });

    const baked = await bakeVariantArtifacts(targetObject, v, {
      maxTextureSize,
      includeGlb,
      includeUsdz
    });

    const entry: { code: string; label: string; glb?: string; usdz?: string } = {
      code: baked.variantCode,
      label: baked.variantLabel
    };

    if (glbFolder && baked.glb) {
      const glbFileName = `${baked.variantCode}.glb`;
      glbFolder.file(glbFileName, baked.glb);
      entry.glb = `glb/${glbFileName}`;
    }

    if (usdzFolder && baked.usdz) {
      const usdzFileName = `${baked.variantCode}.usdz`;
      usdzFolder.file(usdzFileName, baked.usdz);
      entry.usdz = `usdz/${usdzFileName}`;
    }

    manifestVariants.push(entry);
  }

  // Generate metadata manifest for the AR bundle
  const manifest = {
    productName,
    exportedAt: new Date().toISOString(),
    specification: 'Mirage AR Multi-Variant Bundle v1.0',
    maxTextureSize,
    variants: manifestVariants
  };
  zip.file('ar-manifest.json', JSON.stringify(manifest, null, 2));

  onProgress?.({
    currentVariantIndex: total,
    totalVariants: total,
    variantName: '',
    stage: 'complete',
    message: 'Comprimiendo archivo ZIP de Realidad Aumentada...'
  });

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}
