import * as THREE from 'three';
import type { ModelStats } from '../store/modelStore';

export function analyzeGlbHierarchy(scene: THREE.Object3D): ModelStats {
  let triangleCount = 0;
  let vertexCount = 0;
  let meshCount = 0;
  const materialsSet = new Set<string>();

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshCount++;
      const mesh = child as THREE.Mesh;
      const geom = mesh.geometry;

      if (geom) {
        if (geom.index) {
          triangleCount += geom.index.count / 3;
        } else if (geom.attributes.position) {
          triangleCount += geom.attributes.position.count / 3;
        }

        if (geom.attributes.position) {
          vertexCount += geom.attributes.position.count;
        }
      }

      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          materialsSet.add(m.name || `Material_${materialsSet.size + 1}`);
        });
      }
    }
  });

  // Calculate real-world bounding box at unit scale (1.0)
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);

  return {
    triangleCount: Math.round(triangleCount),
    vertexCount: Math.round(vertexCount),
    meshCount,
    materials: Array.from(materialsSet),
    dimensions: {
      width: Number(size.x.toFixed(3)),
      height: Number(size.y.toFixed(3)),
      depth: Number(size.z.toFixed(3))
    }
  };
}

export interface ScaleAuditResult {
  status: 'optimal' | 'warning' | 'error';
  message: string;
  detectedUnitHint: 'meters' | 'centimeters' | 'millimeters' | 'unknown';
}

export function auditModelScale(dimensions: { width: number; height: number; depth: number }): ScaleAuditResult {
  const maxDim = Math.max(dimensions.width, dimensions.height, dimensions.depth);

  if (maxDim > 50) {
    // Highly likely millimeters (e.g. 850mm)
    return {
      status: 'error',
      message: `Model measures ${maxDim.toFixed(1)}m. It was likely exported in millimeters (mm) instead of meters.`,
      detectedUnitHint: 'millimeters'
    };
  } else if (maxDim > 5) {
    // Likely centimeters (e.g. 85cm)
    return {
      status: 'warning',
      message: `Model measures ${maxDim.toFixed(1)}m. It may have been exported in centimeters (cm) instead of meters.`,
      detectedUnitHint: 'centimeters'
    };
  } else if (maxDim < 0.05) {
    // Very tiny (less than 5cm)
    return {
      status: 'warning',
      message: `Model is extremely small (${(maxDim * 100).toFixed(1)}cm). Check the export scale.`,
      detectedUnitHint: 'unknown'
    };
  }

  return {
    status: 'optimal',
    message: `Valid scale in meters (1 unit = 1 meter). Max dimension: ${maxDim.toFixed(2)}m.`,
    detectedUnitHint: 'meters'
  };
}

export interface GlbEmbeddedTexture {
  index: number;
  name: string;
  mimeType: string;
  byteLength?: number;
  assignedSlots: string[];
}

export interface GlbMaterialInfo {
  name: string;
  alphaMode: string;
  alphaCutoff?: number;
  doubleSided: boolean;
  roughnessFactor?: number;
  metallicFactor?: number;
  transmissionFactor?: number;
  ior?: number;
  extensions: string[];
  textures: { slot: string; imageName?: string }[];
}

export interface GlbManifest {
  generator?: string;
  version?: string;
  extensionsUsed: string[];
  extensionsRequired: string[];
  materials: GlbMaterialInfo[];
  textures: GlbEmbeddedTexture[];
  totalTexturesByteLength: number;
  animationsCount: number;
  animationNames: string[];
  camerasCount: number;
  lightsCount: number;
}

/**
 * Parses the glTF JSON chunk from a binary GLB buffer without external dependencies.
 */
export function parseGlbBinaryJson(buffer: ArrayBuffer | Uint8Array): any | null {
  try {
    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (data.length < 20) return null;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const magic = view.getUint32(0, true);
    if (magic !== 0x46546c67) return null; // 'glTF' in little-endian
    const jsonChunkLength = view.getUint32(12, true);
    const jsonChunkType = view.getUint32(16, true);
    if (jsonChunkType !== 0x4e4f534a) return null; // 'JSON' in little-endian
    const jsonBytes = data.subarray(20, 20 + jsonChunkLength);
    const text = new TextDecoder('utf-8').decode(jsonBytes).replace(/\0+$/, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.warn('[glbValidator] Could not parse binary GLB JSON chunk:', err);
    return null;
  }
}

/**
 * Extracts comprehensive non-geometry manifest data from glTF JSON or binary GLB buffer.
 */
export function extractGlbManifest(source: any): GlbManifest | null {
  if (!source) return null;
  let gltf: any = source;
  if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
    gltf = parseGlbBinaryJson(source);
  } else if (ArrayBuffer.isView(source)) {
    gltf = parseGlbBinaryJson(new Uint8Array(source.buffer, source.byteOffset, source.byteLength));
  } else if (source.parser?.json) {
    gltf = source.parser.json;
  }

  if (!gltf || typeof gltf !== 'object') return null;

  const images = Array.isArray(gltf.images) ? gltf.images : [];
  const bufferViews = Array.isArray(gltf.bufferViews) ? gltf.bufferViews : [];
  const textures = Array.isArray(gltf.textures) ? gltf.textures : [];
  const materials = Array.isArray(gltf.materials) ? gltf.materials : [];

  const textureImages: GlbEmbeddedTexture[] = images.map((img: any, idx: number) => {
    const bv = img.bufferView !== undefined && bufferViews[img.bufferView] ? bufferViews[img.bufferView] : null;
    const byteLength = bv ? bv.byteLength : undefined;
    let mimeType = img.mimeType || 'image/png';
    if (!img.mimeType && typeof img.uri === 'string') {
      if (img.uri.endsWith('.webp')) mimeType = 'image/webp';
      else if (img.uri.endsWith('.jpg') || img.uri.endsWith('.jpeg')) mimeType = 'image/jpeg';
    }

    return {
      index: idx,
      name: img.name || `image_${idx}`,
      mimeType,
      byteLength,
      assignedSlots: []
    };
  });

  const parsedMaterials: GlbMaterialInfo[] = materials.map((m: any, idx: number) => {
    const pbr = m.pbrMetallicRoughness || {};
    const ext = m.extensions || {};
    const extensionsList = Object.keys(ext);
    const slots: { slot: string; imageName?: string }[] = [];

    function linkTex(texInfo: any, slotName: string) {
      if (!texInfo || texInfo.index === undefined) return;
      const t = textures[texInfo.index];
      const imgIdx = t ? t.source : undefined;
      const img = imgIdx !== undefined && textureImages[imgIdx] ? textureImages[imgIdx] : null;
      slots.push({ slot: slotName, imageName: img?.name });
      if (img && !img.assignedSlots.includes(slotName)) {
        img.assignedSlots.push(slotName);
      }
    }

    linkTex(pbr.baseColorTexture, 'BaseColor');
    linkTex(m.normalTexture, 'Normal');
    linkTex(pbr.metallicRoughnessTexture, 'Metal-Roughness');
    linkTex(m.occlusionTexture, 'Occlusion (AO)');
    linkTex(m.emissiveTexture, 'Emissive');

    if (ext.KHR_materials_transmission) {
      linkTex(ext.KHR_materials_transmission.transmissionTexture, 'Transmission');
    }
    if (ext.KHR_materials_clearcoat) {
      linkTex(ext.KHR_materials_clearcoat.clearcoatTexture, 'Clearcoat');
    }
    if (ext.KHR_materials_sheen) {
      linkTex(ext.KHR_materials_sheen.sheenColorTexture, 'Sheen');
    }

    return {
      name: m.name || `Material_${idx + 1}`,
      alphaMode: m.alphaMode || 'OPAQUE',
      alphaCutoff: typeof m.alphaCutoff === 'number' ? m.alphaCutoff : undefined,
      doubleSided: Boolean(m.doubleSided),
      roughnessFactor: typeof pbr.roughnessFactor === 'number' ? pbr.roughnessFactor : undefined,
      metallicFactor: typeof pbr.metallicFactor === 'number' ? pbr.metallicFactor : undefined,
      transmissionFactor:
        typeof ext.KHR_materials_transmission?.transmissionFactor === 'number'
          ? ext.KHR_materials_transmission.transmissionFactor
          : undefined,
      ior: typeof ext.KHR_materials_ior?.ior === 'number' ? ext.KHR_materials_ior.ior : undefined,
      extensions: extensionsList,
      textures: slots
    };
  });

  const totalTexturesByteLength = textureImages.reduce((sum, img) => sum + (img.byteLength || 0), 0);

  return {
    generator: gltf.asset?.generator,
    version: gltf.asset?.version,
    extensionsUsed: Array.isArray(gltf.extensionsUsed) ? gltf.extensionsUsed : [],
    extensionsRequired: Array.isArray(gltf.extensionsRequired) ? gltf.extensionsRequired : [],
    materials: parsedMaterials,
    textures: textureImages,
    totalTexturesByteLength,
    animationsCount: Array.isArray(gltf.animations) ? gltf.animations.length : 0,
    animationNames: Array.isArray(gltf.animations)
      ? gltf.animations.map((a: any, i: number) => a.name || `Animation ${i + 1}`)
      : [],
    camerasCount: Array.isArray(gltf.cameras) ? gltf.cameras.length : 0,
    lightsCount: Array.isArray(gltf.extensions?.KHR_lights_punctual?.lights)
      ? gltf.extensions.KHR_lights_punctual.lights.length
      : 0
  };
}

export interface ExtractedImage {
  index: number;
  name: string;
  mimeType: string;
  extension: string;
  bytes: Uint8Array;
}

/**
 * Extracts the raw binary bytes of an embedded texture from a binary GLB buffer without quality loss.
 */
export function extractEmbeddedImageBytes(
  glbBuffer: ArrayBuffer | Uint8Array,
  imageIndex: number
): ExtractedImage | null {
  try {
    const data = glbBuffer instanceof Uint8Array ? glbBuffer : new Uint8Array(glbBuffer);
    if (data.length < 20) return null;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const magic = view.getUint32(0, true);
    if (magic !== 0x46546c67) return null;

    const jsonChunkLength = view.getUint32(12, true);
    const jsonChunkType = view.getUint32(16, true);
    if (jsonChunkType !== 0x4e4f534a) return null;

    const jsonBytes = data.subarray(20, 20 + jsonChunkLength);
    const text = new TextDecoder('utf-8').decode(jsonBytes).replace(/\0+$/, '').trim();
    const gltf = JSON.parse(text);

    const image = gltf.images?.[imageIndex];
    if (!image) return null;

    const binHeaderOffset = 20 + jsonChunkLength;
    if (data.length < binHeaderOffset + 8) return null;
    const binChunkOffset = binHeaderOffset + 8;

    if (image.bufferView !== undefined) {
      const bv = gltf.bufferViews[image.bufferView];
      if (!bv) return null;
      const start = binChunkOffset + (bv.byteOffset || 0);
      const end = start + bv.byteLength;
      const bytes = data.slice(start, end);
      const mimeType = image.mimeType || 'image/png';
      const extension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
      return {
        index: imageIndex,
        name: image.name || `image_${imageIndex}`,
        mimeType,
        extension,
        bytes
      };
    }
    return null;
  } catch (err) {
    console.warn('[glbValidator] Error extracting image bytes:', err);
    return null;
  }
}

/**
 * Extracts all embedded textures from a binary GLB buffer in memory.
 */
export function extractAllEmbeddedImages(glbBuffer: ArrayBuffer | Uint8Array): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  try {
    const gltf = parseGlbBinaryJson(glbBuffer);
    if (!gltf) return [];
    const totalImages = Array.isArray(gltf.images) ? gltf.images.length : 0;

    for (let i = 0; i < totalImages; i++) {
      const extracted = extractEmbeddedImageBytes(glbBuffer, i);
      if (extracted) {
        images.push(extracted);
      }
    }
  } catch (err) {
    console.warn('[glbValidator] Error extracting all images:', err);
  }
  return images;
}


