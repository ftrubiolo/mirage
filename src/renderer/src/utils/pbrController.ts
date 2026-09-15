import * as THREE from 'three';
import { invalidateThumbnail } from '../components/UI/ThumbnailImage';

const texturePromiseCache = new Map<string, Promise<THREE.Texture>>();
const loadedTextureCache = new Map<string, THREE.Texture>();
const textureLoader = new THREE.TextureLoader();

export async function loadTextureAsync(url: string, isSRGB = false): Promise<THREE.Texture> {
  if (!url) {
    throw new Error('Empty texture URL');
  }

  const cacheKey = `${url}::${isSRGB ? 'srgb' : 'linear'}`;

  if (loadedTextureCache.has(cacheKey)) {
    console.log(`[PERF: TEXTURE] Cache HIT for: ${url.split(/[\\/]/).pop()}`);
    return loadedTextureCache.get(cacheKey)!;
  }

  if (texturePromiseCache.has(cacheKey)) {
    return texturePromiseCache.get(cacheKey)!;
  }

  const tStart = performance.now();
  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    textureLoader.load(
      url,
      (texture) => {
        texture.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.flipY = false; // glTF standard UV orientation
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        loadedTextureCache.set(cacheKey, texture);
        console.log(`[PERF: TEXTURE] Loaded & decoded in ${(performance.now() - tStart).toFixed(1)}ms: ${url.split(/[\\/]/).pop()}`);
        resolve(texture);
      },
      undefined,
      (error) => {
        texturePromiseCache.delete(cacheKey);
        console.error(`[PERF: TEXTURE] Failed to load from ${url} after ${(performance.now() - tStart).toFixed(1)}ms:`, error);
        reject(error);
      }
    );
  });

  texturePromiseCache.set(cacheKey, promise);
  return promise;
}

export function invalidateTexture(url: string | null | undefined, filePath?: string | null): void {
  if (!url && !filePath) return;
  if (url) invalidateThumbnail(url);
  if (filePath) invalidateThumbnail(filePath);
  if (!url) return;
  const cleanUrl = url.split('?')[0];

  for (const [key, tex] of Array.from(loadedTextureCache.entries())) {
    if (key.startsWith(url) || key.startsWith(cleanUrl) || key.includes(cleanUrl)) {
      tex.dispose();
      loadedTextureCache.delete(key);
      console.log(`[PERF: TEXTURE] Invalidation & disposed: ${key}`);
    }
  }

  for (const key of Array.from(texturePromiseCache.keys())) {
    if (key.startsWith(url) || key.startsWith(cleanUrl) || key.includes(cleanUrl)) {
      texturePromiseCache.delete(key);
    }
  }
}

export function clearTextureCache(): void {
  loadedTextureCache.forEach((tex) => tex.dispose());
  loadedTextureCache.clear();
  texturePromiseCache.clear();
}

export interface PbrUniformValues {
  roughness?: number;
  roughnessFactor?: number;
  metalness?: number;
  metalnessFactor?: number;
  normalScale?: number | THREE.Vector2;
  normalInvertY?: boolean;
  aoMapIntensity?: number;
  aoIntensity?: number;
  clearcoat?: number;
  clearcoatFactor?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenColor?: string | THREE.Color;
  sheenRoughness?: number;
  transmission?: number;
  transmissionFactor?: number;
  ior?: number;
  emissiveIntensity?: number;
  color?: string | THREE.Color;
  emissive?: string | THREE.Color;
  emissiveColor?: string | THREE.Color;
  emissiveFullGlow?: boolean;
  displacementScale?: number;
  forcedNullSlots?: string[];
  slotEnabled?: Partial<Record<string, boolean>>;
  targetMaterialName?: string | null;
}

export interface PbrTextureValues {
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  metalnessMap?: THREE.Texture | null;
  aoMap?: THREE.Texture | null;
  emissiveMap?: THREE.Texture | null;
  clearcoatMap?: THREE.Texture | null;
  sheenColorMap?: THREE.Texture | null;
  transmissionMap?: THREE.Texture | null;
  alphaMap?: THREE.Texture | null;
  displacementMap?: THREE.Texture | null;
  debugChannel?: 'lit' | 'albedo' | 'normal' | 'roughness' | 'metalness' | 'ao' | 'emissive' | 'wireframe';
  wireframe?: boolean;
  targetMaterialName?: string | null;
}

export interface PbrTextureOptions {
  model: THREE.Object3D;
  baseColorUrl?: string | null;
  normalUrl?: string | null;
  ormUrl?: string | null;
  metalRoughnessUrl?: string | null;
  aoUrl?: string | null;
  roughnessUrl?: string | null;
  metalnessUrl?: string | null;
  emissiveUrl?: string | null;
  clearcoatUrl?: string | null;
  sheenUrl?: string | null;
  transmissionUrl?: string | null;
  alphaUrl?: string | null;
  displacementUrl?: string | null;

  useOrmPack?: boolean;
  materialPackingMode?: 'orm' | 'metalRoughness' | 'separate';
  loadFromCache?: boolean;
  forcedNullSlots?: string[];
  debugChannel?: 'lit' | 'albedo' | 'normal' | 'roughness' | 'metalness' | 'ao' | 'emissive' | 'wireframe';
  wireframe?: boolean;

  normalScale?: number | THREE.Vector2;
  normalInvertY?: boolean;
  roughnessFactor?: number;
  metalnessFactor?: number;
  aoIntensity?: number;
  emissiveIntensity?: number;
  emissiveColor?: string | THREE.Color;
  emissiveFullGlow?: boolean;
  clearcoatFactor?: number;
  clearcoatRoughness?: number;
  sheenColor?: string | THREE.Color;
  sheenRoughness?: number;
  transmissionFactor?: number;
  ior?: number;
  displacementScale?: number;
  targetMaterialName?: string | null;
}

export interface PbrStateOptions extends PbrTextureOptions, PbrUniformValues {
  model: THREE.Object3D;
}

interface OrigMaterialData {
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
  metalnessMap: THREE.Texture | null;
  aoMap: THREE.Texture | null;
  emissiveMap: THREE.Texture | null;
  emissive: THREE.Color;
  emissiveIntensity: number;
  clearcoatMap: THREE.Texture | null;
  sheenColorMap: THREE.Texture | null;
  transmissionMap: THREE.Texture | null;
  alphaMap: THREE.Texture | null;
  displacementMap: THREE.Texture | null;
  color: THREE.Color;
}

const originalMaterialCache = new WeakMap<THREE.Material, OrigMaterialData>();

/**
 * Captures pristine initial material properties before any runtime PBR modifications occur.
 * Prevents effect lifecycle race conditions from poisoning original GLTF material state.
 */
export function captureOriginalMaterials(model: THREE.Object3D): void {
  if (!model) return;
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const rawMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of rawMats) {
        if (m instanceof THREE.MeshStandardMaterial && !originalMaterialCache.has(m)) {
          originalMaterialCache.set(m, {
            map: m.map,
            normalMap: m.normalMap,
            roughnessMap: m.roughnessMap,
            metalnessMap: m.metalnessMap,
            aoMap: m.aoMap,
            emissiveMap: m.emissiveMap,
            emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0, 0, 0),
            emissiveIntensity: m.emissiveIntensity ?? 1.0,
            clearcoatMap: (m as any).clearcoatMap || null,
            sheenColorMap: (m as any).sheenColorMap || null,
            transmissionMap: (m as any).transmissionMap || null,
            alphaMap: m.alphaMap || null,
            displacementMap: (m as any).displacementMap || null,
            color: m.color ? m.color.clone() : new THREE.Color(1, 1, 1)
          });
        }
      }
    }
  });
}

function upgradeToPhysicalMaterial(mat: THREE.MeshStandardMaterial): THREE.MeshPhysicalMaterial {
  const physMat = new THREE.MeshPhysicalMaterial();
  physMat.name = mat.name;
  physMat.color.copy(mat.color);
  physMat.roughness = mat.roughness;
  physMat.metalness = mat.metalness;
  physMat.map = mat.map;
  physMat.normalMap = mat.normalMap;
  physMat.normalScale.copy(mat.normalScale);
  physMat.roughnessMap = mat.roughnessMap;
  physMat.metalnessMap = mat.metalnessMap;
  physMat.aoMap = mat.aoMap;
  physMat.aoMapIntensity = mat.aoMapIntensity;
  physMat.emissive.copy(mat.emissive);
  physMat.emissiveIntensity = mat.emissiveIntensity;
  physMat.emissiveMap = mat.emissiveMap;
  physMat.alphaMap = mat.alphaMap;
  physMat.transparent = mat.transparent;
  physMat.opacity = mat.opacity;
  physMat.side = mat.side;
  physMat.wireframe = mat.wireframe;
  physMat.envMap = mat.envMap;
  physMat.envMapIntensity = mat.envMapIntensity;
  physMat.displacementMap = mat.displacementMap;
  physMat.displacementScale = mat.displacementScale;
  return physMat;
}

/**
 * Assigns a texture to a material slot and returns true if structural change occurred.
 */
function assignMaterialMap(
  mat: THREE.MeshStandardMaterial,
  slotKey: string,
  newTexture: THREE.Texture | null | undefined,
  desiredColorSpace?: THREE.ColorSpace | string
): boolean {
  if (newTexture === undefined) return false;
  let changed = false;
  const current = (mat as any)[slotKey] as THREE.Texture | null;

  if (current !== newTexture) {
    (mat as any)[slotKey] = newTexture;
    changed = true;
  }

  if (newTexture && desiredColorSpace && newTexture.colorSpace !== desiredColorSpace) {
    newTexture.colorSpace = desiredColorSpace as THREE.ColorSpace;
    changed = true;
  }

  return changed;
}

/**
 * Updates dynamic PBR uniform values synchronously without shader recompilation.
 * Conforms to Requirement R1 & Feature F1: strictly does NOT set mat.needsUpdate = true.
 * Respects slotEnabled/forcedNullSlots and material texture availability for emissive & physical properties.
 */
export function applyPbrUniforms(model: THREE.Object3D, uniforms: Partial<PbrUniformValues>): void {
  if (!model) return;

  const isSlotDisabled = (slot: string) =>
    Boolean(
      (uniforms.forcedNullSlots && uniforms.forcedNullSlots.includes(slot)) ||
      (uniforms.slotEnabled && uniforms.slotEnabled[slot] === false)
    );

  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const rawMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      for (const m of rawMats) {
        if (m instanceof THREE.MeshStandardMaterial) {
          if (uniforms.targetMaterialName && uniforms.targetMaterialName !== '*' && m.name !== uniforms.targetMaterialName) {
            continue;
          }
          // Tracks whether this material needs its shader program rebuilt.
          // Uniform-only changes (roughness, metalness, intensities) must NOT
          // set it; only changes to the *presence* of a shader feature do.
          let structuralChange = false;

          // Roughness
          const roughness = uniforms.roughness !== undefined ? uniforms.roughness : uniforms.roughnessFactor;
          if (roughness !== undefined) {
            m.roughness = roughness;
          }

          // Metalness
          const metalness = uniforms.metalness !== undefined ? uniforms.metalness : uniforms.metalnessFactor;
          if (metalness !== undefined) {
            m.metalness = metalness;
          }

          // Normal Scale & Invert Y
          if (isSlotDisabled('normal')) {
            m.normalScale.set(0, 0);
          } else if (uniforms.normalScale !== undefined) {
            if (typeof uniforms.normalScale === 'number') {
              const invertY = uniforms.normalInvertY ?? (m.normalScale.y < 0);
              m.normalScale.set(uniforms.normalScale, invertY ? -uniforms.normalScale : uniforms.normalScale);
            } else if (uniforms.normalScale instanceof THREE.Vector2) {
              m.normalScale.copy(uniforms.normalScale);
            }
          } else if (uniforms.normalInvertY !== undefined) {
            const currentX = Math.abs(m.normalScale.x);
            m.normalScale.set(currentX, uniforms.normalInvertY ? -currentX : currentX);
          }

          // Ambient Occlusion
          if (isSlotDisabled('ao')) {
            m.aoMapIntensity = 0;
          } else {
            const ao = uniforms.aoMapIntensity !== undefined ? uniforms.aoMapIntensity : uniforms.aoIntensity;
            if (ao !== undefined) {
              m.aoMapIntensity = ao;
            }
          }

          // Base Color Tint
          if (uniforms.color !== undefined) {
            if (typeof uniforms.color === 'string') {
              m.color.set(uniforms.color);
            } else {
              m.color.copy(uniforms.color);
            }
          }

          // Emissive: only active if slot is NOT disabled AND (material has map OR native emission OR emissiveFullGlow)
          if (isSlotDisabled('emissive')) {
            m.emissive.set(0x000000);
            m.emissiveIntensity = 0;
          } else {
            const orig = originalMaterialCache.get(m);
            const hasEmissiveMap = Boolean(m.emissiveMap);
            const hasOrigEmissive = Boolean(
              orig && (
                orig.emissiveMap ||
                (orig.emissive && (orig.emissive.r > 0 || orig.emissive.g > 0 || orig.emissive.b > 0))
              )
            );
            const isFullGlow = Boolean(uniforms.emissiveFullGlow);

            if (hasEmissiveMap || isFullGlow) {
              const col = uniforms.emissive !== undefined ? uniforms.emissive : uniforms.emissiveColor;
              if (col !== undefined) {
                if (typeof col === 'string') m.emissive.set(col);
                else m.emissive.copy(col);
              }
              if (uniforms.emissiveIntensity !== undefined) {
                m.emissiveIntensity = uniforms.emissiveIntensity;
              }
            } else if (hasOrigEmissive) {
              if (orig?.emissive) m.emissive.copy(orig.emissive);
              if (uniforms.emissiveIntensity !== undefined) {
                m.emissiveIntensity = uniforms.emissiveIntensity;
              } else if (orig?.emissiveIntensity !== undefined) {
                m.emissiveIntensity = orig.emissiveIntensity;
              }
            } else if (!orig) {
              // Direct standalone invocation in test environment without cache
              const col = uniforms.emissive !== undefined ? uniforms.emissive : uniforms.emissiveColor;
              if (col !== undefined) {
                if (typeof col === 'string') m.emissive.set(col);
                else m.emissive.copy(col);
              }
              if (uniforms.emissiveIntensity !== undefined) {
                m.emissiveIntensity = uniforms.emissiveIntensity;
              }
            } else {
              // Material in viewer has no emissive map, no native emissive, and no full glow: keep zeroed
              m.emissive.set(0x000000);
              m.emissiveIntensity = 0;
            }
          }

          // Physical properties (MeshPhysicalMaterial)
          if (m instanceof THREE.MeshPhysicalMaterial) {
            // Clearcoat / Transmission / Sheen are "presence" features in
            // three.js: the shader chunks for them are only compiled in when the
            // factor is above zero at program-build time, and
            // `WebGLRenderer.needsProgramChange` does NOT watch these factors.
            // Assigning a value without flagging the crossing leaves the slider
            // with no visible effect. Only the 0 <-> >0 transition needs the
            // recompile, so dragging within the range stays cheap.
            //
            // Clearcoat
            let nextClearcoat = m.clearcoat;
            if (isSlotDisabled('clearcoat')) {
              nextClearcoat = 0;
            } else {
              const clearcoat = uniforms.clearcoat !== undefined ? uniforms.clearcoat : uniforms.clearcoatFactor;
              if (clearcoat !== undefined) {
                nextClearcoat = clearcoat;
              }
              if (uniforms.clearcoatRoughness !== undefined) {
                m.clearcoatRoughness = uniforms.clearcoatRoughness;
              }
            }
            if (nextClearcoat > 0 !== m.clearcoat > 0) structuralChange = true;
            m.clearcoat = nextClearcoat;

            // Transmission & IOR
            let nextTransmission = m.transmission;
            if (isSlotDisabled('transmission')) {
              nextTransmission = 0;
            } else {
              const transmission = uniforms.transmission !== undefined ? uniforms.transmission : uniforms.transmissionFactor;
              if (transmission !== undefined) {
                nextTransmission = transmission;
              }
              if (uniforms.ior !== undefined) {
                m.ior = uniforms.ior;
              }
            }
            if (nextTransmission > 0 !== m.transmission > 0) structuralChange = true;
            m.transmission = nextTransmission;

            // Sheen
            let nextSheen = m.sheen;
            if (isSlotDisabled('sheen')) {
              nextSheen = 0;
            } else {
              if (uniforms.sheen !== undefined) {
                nextSheen = uniforms.sheen;
              }
              if (uniforms.sheenColor !== undefined) {
                if (typeof uniforms.sheenColor === 'string') {
                  m.sheenColor.set(uniforms.sheenColor);
                } else {
                  m.sheenColor.copy(uniforms.sheenColor);
                }
              }
              if (uniforms.sheenRoughness !== undefined) {
                m.sheenRoughness = uniforms.sheenRoughness;
              }
            }
            if (nextSheen > 0 !== m.sheen > 0) structuralChange = true;
            m.sheen = nextSheen;
          }

          // Displacement
          if (isSlotDisabled('displacement') || !m.displacementMap) {
            m.displacementScale = 0;
          } else if (uniforms.displacementScale !== undefined) {
            m.displacementScale = uniforms.displacementScale;
          }

          // Only the feature-presence crossings set above reach this. A plain
          // slider drag between two non-zero values never recompiles.
          if (structuralChange) {
            m.needsUpdate = true;
          }
        }
      }
    }
  });
}

/**
 * Loads active textures in parallel based on options.
 */
async function loadSlotTextures(options: PbrTextureOptions): Promise<Record<string, THREE.Texture | null>> {
  const { forcedNullSlots = [], useOrmPack = true, materialPackingMode } = options;
  const isNull = (s: string) => forcedNullSlots.includes(s);
  const mode = materialPackingMode || (useOrmPack ? 'orm' : 'separate');

  const slotEntries: Array<{ key: string; url?: string | null; isSRGB: boolean }> = [
    { key: 'baseColor', url: isNull('baseColor') ? null : options.baseColorUrl, isSRGB: true },
    { key: 'normal', url: isNull('normal') ? null : options.normalUrl, isSRGB: false },
    { key: 'orm', url: mode === 'orm' && !isNull('orm') ? options.ormUrl : null, isSRGB: false },
    { key: 'metalRoughness', url: mode === 'metalRoughness' && !isNull('metalRoughness') ? options.metalRoughnessUrl : null, isSRGB: false },
    { key: 'ao', url: (mode === 'separate' || mode === 'metalRoughness') && !isNull('ao') ? options.aoUrl : null, isSRGB: false },
    { key: 'roughness', url: mode === 'separate' && !isNull('roughness') ? options.roughnessUrl : null, isSRGB: false },
    { key: 'metalness', url: mode === 'separate' && !isNull('metalness') ? options.metalnessUrl : null, isSRGB: false },
    { key: 'emissive', url: isNull('emissive') ? null : options.emissiveUrl, isSRGB: true },
    { key: 'clearcoat', url: isNull('clearcoat') ? null : options.clearcoatUrl, isSRGB: false },
    { key: 'sheen', url: isNull('sheen') ? null : options.sheenUrl, isSRGB: true },
    { key: 'transmission', url: isNull('transmission') ? null : options.transmissionUrl, isSRGB: false },
    { key: 'alpha', url: isNull('alpha') ? null : options.alphaUrl, isSRGB: false },
    { key: 'displacement', url: isNull('displacement') ? null : options.displacementUrl, isSRGB: false }
  ];

  const active = slotEntries.filter((e) => Boolean(e.url));
  if (active.length > 0) {
    console.log(`[PERF: PBR] Loading ${active.length} active texture map(s) in parallel...`);
  }

  const results = await Promise.all(
    slotEntries.map(async ({ key, url, isSRGB }) => {
      if (!url) return [key, null] as const;
      const tex = await loadTextureAsync(url, isSRGB).catch(() => null);
      return [key, tex] as const;
    })
  );

  return Object.fromEntries(results);
}

/**
 * Updates texture map bindings and structural configuration.
 * Conforms to Requirement R1 & Feature F2: sets mat.needsUpdate = true ONLY when
 * texture references, slot presence, color space, or debug channels change.
 */
export function applyPbrTextures(
  model: THREE.Object3D,
  textures: PbrTextureValues,
  currentDebugChannel?: string
): void;
export function applyPbrTextures(
  options: PbrTextureOptions
): Promise<void>;
export function applyPbrTextures(
  firstArg: THREE.Object3D | PbrTextureOptions,
  secondArg?: PbrTextureValues,
  thirdArg?: string
): Promise<void> | void {
  // Synchronous pre-loaded texture binding
  if (firstArg && (firstArg as any).isObject3D && secondArg) {
    const model = firstArg as THREE.Object3D;
    const textures = secondArg;
    const currentDebugChannel = thirdArg || 'lit';

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        for (const m of materials) {
          if (m instanceof THREE.MeshStandardMaterial) {
            if (textures.targetMaterialName && textures.targetMaterialName !== '*' && m.name !== textures.targetMaterialName) {
              continue;
            }
            let structuralChange = false;

            if (textures.debugChannel !== undefined && textures.debugChannel !== currentDebugChannel) {
              structuralChange = true;
              m.userData.__debugChannel = textures.debugChannel;
            }

            if (assignMaterialMap(m, 'map', textures.map, textures.map?.colorSpace)) structuralChange = true;
            if (assignMaterialMap(m, 'normalMap', textures.normalMap)) structuralChange = true;
            if (assignMaterialMap(m, 'roughnessMap', textures.roughnessMap)) structuralChange = true;
            if (assignMaterialMap(m, 'metalnessMap', textures.metalnessMap)) structuralChange = true;
            if (assignMaterialMap(m, 'aoMap', textures.aoMap)) structuralChange = true;
            if (assignMaterialMap(m, 'emissiveMap', textures.emissiveMap, THREE.SRGBColorSpace)) structuralChange = true;
            if (assignMaterialMap(m, 'clearcoatMap', textures.clearcoatMap)) structuralChange = true;
            if (assignMaterialMap(m, 'sheenColorMap', textures.sheenColorMap, THREE.SRGBColorSpace)) structuralChange = true;
            if (assignMaterialMap(m, 'transmissionMap', textures.transmissionMap)) structuralChange = true;
            if (assignMaterialMap(m, 'alphaMap', textures.alphaMap)) structuralChange = true;
            if (assignMaterialMap(m, 'displacementMap', textures.displacementMap)) structuralChange = true;

            if (textures.wireframe !== undefined && m.wireframe !== textures.wireframe) {
              structuralChange = true;
              m.wireframe = textures.wireframe;
            }

            if (structuralChange) {
              m.needsUpdate = true;
            }
          }
        }
      }
    });

    return;
  }

  // Asynchronous URL-based texture loading
  const options = firstArg as PbrTextureOptions;
  return (async () => {
    if (!options?.model) return;

    const tPbrStart = performance.now();
    const loaded = await loadSlotTextures(options);
    const {
      model,
      loadFromCache = false,
      forcedNullSlots = [],
      useOrmPack = true,
      materialPackingMode,
      normalScale,
      normalInvertY = false,
      roughnessFactor,
      metalnessFactor,
      aoIntensity,
      emissiveIntensity,
      emissiveColor,
      emissiveFullGlow = false,
      clearcoatFactor,
      clearcoatRoughness,
      sheenColor,
      sheenRoughness,
      transmissionFactor,
      ior,
      displacementScale,
      debugChannel = 'lit',
      wireframe
    } = options;

    const isNull = (slot: string) => forcedNullSlots.includes(slot);
    const mode = materialPackingMode || (useOrmPack ? 'orm' : 'separate');
    const tTraverseStart = performance.now();
    let meshCount = 0;

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        if (mesh.geometry && mesh.geometry.attributes.uv && !mesh.geometry.attributes.uv2) {
          mesh.geometry.setAttribute('uv2', mesh.geometry.attributes.uv);
        }

        const rawMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        rawMats.forEach((m, matIdx) => {
          let mat = m as THREE.MeshStandardMaterial;
          if (!(mat instanceof THREE.MeshStandardMaterial)) return;
          if (options.targetMaterialName && options.targetMaterialName !== '*' && mat.name !== options.targetMaterialName) {
            return;
          }

          let orig = originalMaterialCache.get(mat);
          if (!orig) {
            orig = {
              map: mat.map,
              normalMap: mat.normalMap,
              roughnessMap: mat.roughnessMap,
              metalnessMap: mat.metalnessMap,
              aoMap: mat.aoMap,
              emissiveMap: mat.emissiveMap,
              emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0, 0, 0),
              emissiveIntensity: mat.emissiveIntensity ?? 1.0,
              clearcoatMap: (mat as any).clearcoatMap || null,
              sheenColorMap: (mat as any).sheenColorMap || null,
              transmissionMap: (mat as any).transmissionMap || null,
              alphaMap: mat.alphaMap || null,
              displacementMap: (mat as any).displacementMap || null,
              color: mat.color ? mat.color.clone() : new THREE.Color(1, 1, 1)
            };
            originalMaterialCache.set(mat, orig);
          }

          let structuralChange = false;

          // Physical upgrade check
          const needsPhysical = Boolean(
            (!isNull('clearcoat') && (loaded.clearcoat || (clearcoatFactor !== undefined && clearcoatFactor > 0))) ||
            (!isNull('sheen') && (loaded.sheen || (sheenRoughness !== undefined && sheenRoughness > 0 && sheenColor !== '#000000' && sheenColor !== '#ffffff'))) ||
            (!isNull('transmission') && (loaded.transmission || (transmissionFactor !== undefined && transmissionFactor > 0)))
          );

          if (needsPhysical && !(mat instanceof THREE.MeshPhysicalMaterial)) {
            const previousMat = mat;
            const physMat = upgradeToPhysicalMaterial(previousMat);
            originalMaterialCache.set(physMat, orig);
            mat = physMat;
            if (Array.isArray(mesh.material)) {
              mesh.material[matIdx] = physMat;
            } else {
              mesh.material = physMat;
            }
            // The replaced MeshStandardMaterial is no longer referenced by the
            // mesh. Its textures are shared with the new material, so only the
            // material itself is disposed here.
            previousMat.dispose();
            structuralChange = true;
          }

          // Wireframe & debug channel tracking
          const targetWireframe = wireframe || debugChannel === 'wireframe';
          if (mat.wireframe !== targetWireframe) {
            mat.wireframe = targetWireframe;
            structuralChange = true;
          }

          const prevDebugChannel = (mat.userData as any).__debugChannel || 'lit';
          if (prevDebugChannel !== debugChannel) {
            (mat.userData as any).__debugChannel = debugChannel;
            structuralChange = true;
          }

          if (debugChannel === 'lit') {
            // Base Color
            const targetBaseMap = isNull('baseColor') ? null : (loaded.baseColor || (loadFromCache ? orig.map : null));
            if (assignMaterialMap(mat, 'map', targetBaseMap, THREE.SRGBColorSpace)) structuralChange = true;
            if (!targetBaseMap) {
              mat.color.set(0xd0ceca);
            } else {
              mat.color.copy(orig.color || new THREE.Color(1, 1, 1));
            }

            // Normal Map
            const targetNormalMap = isNull('normal') ? null : (loaded.normal || (loadFromCache ? orig.normalMap : null));
            if (assignMaterialMap(mat, 'normalMap', targetNormalMap)) structuralChange = true;
            if (targetNormalMap && normalScale !== undefined) {
              if (typeof normalScale === 'number') {
                mat.normalScale.set(normalScale, normalInvertY ? -normalScale : normalScale);
              } else if (normalScale instanceof THREE.Vector2) {
                mat.normalScale.copy(normalScale);
              }
            }

            // AO, Roughness, Metalness (ORM, glTF Metal-Roughness, or discrete)
            let targetAo: THREE.Texture | null = null;
            let targetRoughness: THREE.Texture | null = null;
            let targetMetalness: THREE.Texture | null = null;

            if (mode === 'orm') {
              const ormTex = !isNull('orm') ? (loaded.orm || (loadFromCache ? orig.aoMap || orig.roughnessMap : null)) : null;
              targetAo = ormTex;
              targetRoughness = ormTex;
              targetMetalness = ormTex;
            } else if (mode === 'metalRoughness') {
              const mrTex = !isNull('metalRoughness') ? (loaded.metalRoughness || (loadFromCache ? orig.roughnessMap : null)) : null;
              targetRoughness = mrTex;
              targetMetalness = mrTex;
              targetAo = !isNull('ao') ? (loaded.ao || (loadFromCache ? orig.aoMap : null)) : null;
            } else {
              targetAo = !isNull('ao') ? (loaded.ao || (loadFromCache ? orig.aoMap : null)) : null;
              targetRoughness = !isNull('roughness') ? (loaded.roughness || (loadFromCache ? orig.roughnessMap : null)) : null;
              targetMetalness = !isNull('metalness') ? (loaded.metalness || (loadFromCache ? orig.metalnessMap : null)) : null;
            }

            if (assignMaterialMap(mat, 'aoMap', targetAo)) structuralChange = true;
            if (mat.aoMap && aoIntensity !== undefined) mat.aoMapIntensity = aoIntensity;

            if (assignMaterialMap(mat, 'roughnessMap', targetRoughness)) structuralChange = true;
            if (roughnessFactor !== undefined) mat.roughness = roughnessFactor;

            if (assignMaterialMap(mat, 'metalnessMap', targetMetalness)) structuralChange = true;
            if (metalnessFactor !== undefined) mat.metalness = metalnessFactor;

            // Emissive Map & Color
            const targetEmissiveMap = isNull('emissive')
              ? null
              : (loaded.emissive || (loadFromCache ? orig.emissiveMap : null));
            if (assignMaterialMap(mat, 'emissiveMap', targetEmissiveMap, THREE.SRGBColorSpace)) {
              structuralChange = true;
            }

            if (isNull('emissive')) {
              mat.emissive.set(0x000000);
              mat.emissiveIntensity = 0;
            } else if (targetEmissiveMap || emissiveFullGlow) {
              if (emissiveColor !== undefined) {
                if (typeof emissiveColor === 'string') mat.emissive.set(emissiveColor);
                else mat.emissive.copy(emissiveColor);
              }
              if (emissiveIntensity !== undefined) mat.emissiveIntensity = emissiveIntensity;
            } else {
              // No emissive map assigned, not forced null, not full glow: preserve original if present, else zero out
              if (orig.emissive && (orig.emissive.r > 0 || orig.emissive.g > 0 || orig.emissive.b > 0)) {
                mat.emissive.copy(orig.emissive);
                mat.emissiveIntensity = orig.emissiveIntensity ?? 1.0;
              } else {
                mat.emissive.set(0x000000);
                mat.emissiveIntensity = 0;
              }
            }

            // Physical properties
            if (mat instanceof THREE.MeshPhysicalMaterial) {
              const targetClearcoat = isNull('clearcoat') ? null : (loaded.clearcoat || (loadFromCache ? orig.clearcoatMap : null));
              if (assignMaterialMap(mat, 'clearcoatMap', targetClearcoat)) structuralChange = true;
              if (targetClearcoat && mat.clearcoat === 0) mat.clearcoat = 1.0;
              else if (clearcoatFactor !== undefined) mat.clearcoat = clearcoatFactor;
              if (clearcoatRoughness !== undefined) mat.clearcoatRoughness = clearcoatRoughness;

              const targetSheen = isNull('sheen') ? null : (loaded.sheen || (loadFromCache ? orig.sheenColorMap : null));
              if (assignMaterialMap(mat, 'sheenColorMap', targetSheen, THREE.SRGBColorSpace)) structuralChange = true;
              if (targetSheen && mat.sheen === 0) mat.sheen = 1.0;
              if (sheenColor !== undefined) {
                if (typeof sheenColor === 'string') mat.sheenColor.set(sheenColor);
                else mat.sheenColor.copy(sheenColor);
              }
              if (sheenRoughness !== undefined) mat.sheenRoughness = sheenRoughness;

              const targetTransmission = isNull('transmission') ? null : (loaded.transmission || (loadFromCache ? orig.transmissionMap : null));
              if (assignMaterialMap(mat, 'transmissionMap', targetTransmission)) structuralChange = true;
              if (targetTransmission && mat.transmission === 0) mat.transmission = 1.0;
              else if (transmissionFactor !== undefined) mat.transmission = transmissionFactor;
              if (ior !== undefined) mat.ior = ior;
            }

            // Alpha / Opacity
            const targetAlpha = isNull('alpha') ? null : (loaded.alpha || (loadFromCache ? orig.alphaMap : null));
            if (assignMaterialMap(mat, 'alphaMap', targetAlpha)) structuralChange = true;
            const isTransparent = Boolean(targetAlpha);
            if (mat.transparent !== isTransparent) {
              mat.transparent = isTransparent;
              mat.alphaTest = isTransparent ? 0.05 : 0;
              mat.opacity = 1.0;
              structuralChange = true;
            }

            // Displacement
            const targetDisplacement = isNull('displacement') ? null : (loaded.displacement || (loadFromCache ? orig.displacementMap : null));
            if (assignMaterialMap(mat, 'displacementMap', targetDisplacement)) structuralChange = true;
            mat.displacementScale = targetDisplacement ? (displacementScale ?? 0.02) : 0.0;

          } else {
            // Non-lit debug channels (albedo, normal, roughness, metalness, ao, emissive)
            let isolatedMap: THREE.Texture | null = null;
            let isolatedNormal: THREE.Texture | null = null;
            let chRoughness = 1.0;
            let chMetalness = 0.0;

            switch (debugChannel) {
              case 'albedo':
                isolatedMap = isNull('baseColor') ? null : (loaded.baseColor || (loadFromCache ? orig.map : null));
                break;
              case 'normal':
                isolatedNormal = isNull('normal') ? null : (loaded.normal || (loadFromCache ? orig.normalMap : null));
                chRoughness = 0.5;
                break;
              case 'roughness':
                isolatedMap = mode === 'orm'
                  ? (isNull('orm') ? null : loaded.orm)
                  : mode === 'metalRoughness'
                    ? (isNull('metalRoughness') ? null : loaded.metalRoughness)
                    : (isNull('roughness') ? null : (loaded.roughness || (loadFromCache ? orig.roughnessMap : null)));
                chRoughness = roughnessFactor ?? 1.0;
                break;
              case 'metalness':
                isolatedMap = mode === 'orm'
                  ? (isNull('orm') ? null : loaded.orm)
                  : mode === 'metalRoughness'
                    ? (isNull('metalRoughness') ? null : loaded.metalRoughness)
                    : (isNull('metalness') ? null : (loaded.metalness || (loadFromCache ? orig.metalnessMap : null)));
                chRoughness = 0.5;
                chMetalness = metalnessFactor ?? 1.0;
                break;
              case 'ao':
                isolatedMap = mode === 'orm'
                  ? (isNull('orm') ? null : loaded.orm)
                  : (isNull('ao') ? null : (loaded.ao || (loadFromCache ? orig.aoMap : null)));
                break;
              case 'emissive':
                isolatedMap = isNull('emissive') ? null : (loaded.emissive || (loadFromCache ? orig.emissiveMap : null));
                break;
            }

            if (assignMaterialMap(mat, 'map', isolatedMap)) structuralChange = true;
            if (assignMaterialMap(mat, 'normalMap', isolatedNormal)) structuralChange = true;
            if (isolatedNormal && normalScale !== undefined) {
              if (typeof normalScale === 'number') {
                mat.normalScale.set(normalScale, normalInvertY ? -normalScale : normalScale);
              } else if (normalScale instanceof THREE.Vector2) {
                mat.normalScale.copy(normalScale);
              }
            }

            mat.roughness = chRoughness;
            mat.metalness = chMetalness;

            if (debugChannel === 'emissive' && !isNull('emissive') && (isolatedMap || emissiveFullGlow)) {
              if (emissiveColor !== undefined) {
                if (typeof emissiveColor === 'string') mat.emissive.set(emissiveColor);
                else mat.emissive.copy(emissiveColor);
              } else {
                mat.emissive.set(0xffffff);
              }
              mat.emissiveIntensity = emissiveIntensity ?? 1.0;
            } else {
              mat.emissive.set(0x000000);
              mat.emissiveIntensity = 0;
            }
          }

          meshCount++;

          if (structuralChange) {
            mat.needsUpdate = true;
          }
        });
      }
    });

    const tTraverseTotal = performance.now() - tTraverseStart;
    const tPbrTotal = performance.now() - tPbrStart;
    console.log(`[PERF: PBR] Material bindings applied to ${meshCount} mesh(es) in ${tTraverseTotal.toFixed(1)}ms (PBR total: ${tPbrTotal.toFixed(1)}ms)`);
  })();
}

/**
 * Applies textures and uniforms together, in the order the viewport uses them.
 * This is the entry point the integration tests drive.
 */
export async function applyPbrState(options: PbrStateOptions): Promise<void> {
  await applyPbrTextures(options);
  applyPbrUniforms(options.model, options);
}
