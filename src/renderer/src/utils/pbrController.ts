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

export function invalidateTexture(url: string | null | undefined): void {
  if (!url) return;
  const cleanUrl = url.split('?')[0];

  invalidateThumbnail(url);

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
  displacementScale?: number;
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
}

export interface PbrTextureOptions {
  model: THREE.Object3D;
  baseColorUrl?: string | null;
  normalUrl?: string | null;
  ormUrl?: string | null;
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
  loadFromCache?: boolean;
  forcedNullSlots?: string[];
  debugChannel?: 'lit' | 'albedo' | 'normal' | 'roughness' | 'metalness' | 'ao' | 'emissive' | 'wireframe';
  wireframe?: boolean;

  // Optional uniform defaults for debug channel rendering
  normalScale?: number | THREE.Vector2;
  normalInvertY?: boolean;
  roughnessFactor?: number;
  metalnessFactor?: number;
  aoIntensity?: number;
  emissiveIntensity?: number;
  emissiveColor?: string | THREE.Color;
  clearcoatFactor?: number;
  clearcoatRoughness?: number;
  sheenColor?: string | THREE.Color;
  sheenRoughness?: number;
  transmissionFactor?: number;
  ior?: number;
  displacementScale?: number;
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
 * Updates dynamic PBR uniform values synchronously without shader recompilation.
 * Conforms to Requirement R1 & Feature F1: strictly does NOT set mat.needsUpdate = true.
 * In Three.js, scalar, vector, and color uniforms update automatically on the next frame.
 */
export function applyPbrUniforms(model: THREE.Object3D, uniforms: Partial<PbrUniformValues>): void {
  if (!model) return;

  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const rawMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      for (const m of rawMats) {
        if (m instanceof THREE.MeshStandardMaterial) {
          const roughness = uniforms.roughness !== undefined ? uniforms.roughness : uniforms.roughnessFactor;
          if (roughness !== undefined) {
            m.roughness = roughness;
          }

          const metalness = uniforms.metalness !== undefined ? uniforms.metalness : uniforms.metalnessFactor;
          if (metalness !== undefined) {
            m.metalness = metalness;
          }

          if (uniforms.normalScale !== undefined) {
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

          const ao = uniforms.aoMapIntensity !== undefined ? uniforms.aoMapIntensity : uniforms.aoIntensity;
          if (ao !== undefined) {
            m.aoMapIntensity = ao;
          }

          if (uniforms.emissiveIntensity !== undefined) {
            m.emissiveIntensity = uniforms.emissiveIntensity;
          }

          if (uniforms.color !== undefined) {
            if (typeof uniforms.color === 'string') {
              m.color.set(uniforms.color);
            } else {
              m.color.copy(uniforms.color);
            }
          }

          const emissive = uniforms.emissive !== undefined ? uniforms.emissive : uniforms.emissiveColor;
          if (emissive !== undefined) {
            if (typeof emissive === 'string') {
              m.emissive.set(emissive);
            } else {
              m.emissive.copy(emissive);
            }
          }

          if (m instanceof THREE.MeshPhysicalMaterial) {
            const clearcoat = uniforms.clearcoat !== undefined ? uniforms.clearcoat : uniforms.clearcoatFactor;
            if (clearcoat !== undefined) {
              m.clearcoat = clearcoat;
            }

            if (uniforms.clearcoatRoughness !== undefined) {
              m.clearcoatRoughness = uniforms.clearcoatRoughness;
            }

            const transmission = uniforms.transmission !== undefined ? uniforms.transmission : uniforms.transmissionFactor;
            if (transmission !== undefined) {
              m.transmission = transmission;
            }

            if (uniforms.ior !== undefined) {
              m.ior = uniforms.ior;
            }

            if (uniforms.sheen !== undefined) {
              m.sheen = uniforms.sheen;
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

          if (uniforms.displacementScale !== undefined) {
            m.displacementScale = uniforms.displacementScale;
          }

          // In Three.js, uniform changes take effect immediately in shader uniforms
          // without shader recompilation. Therefore, mat.needsUpdate is NEVER set to true.
        }
      }
    }
  });
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
  // Check if first argument is a THREE.Object3D (synchronous pre-loaded texture binding)
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
            let structuralChange = false;

            // Check debug channel change
            if (textures.debugChannel !== undefined && textures.debugChannel !== currentDebugChannel) {
              structuralChange = true;
              m.userData.__debugChannel = textures.debugChannel;
            }

            // Check map slot
            if (textures.map !== undefined && m.map !== textures.map) {
              structuralChange = true;
              m.map = textures.map;
            } else if (textures.map && m.map && m.map.colorSpace !== textures.map.colorSpace) {
              structuralChange = true;
              m.map.colorSpace = textures.map.colorSpace;
            }

            // Check normalMap slot
            if (textures.normalMap !== undefined && m.normalMap !== textures.normalMap) {
              structuralChange = true;
              m.normalMap = textures.normalMap;
            }

            // Check roughnessMap slot
            if (textures.roughnessMap !== undefined && m.roughnessMap !== textures.roughnessMap) {
              structuralChange = true;
              m.roughnessMap = textures.roughnessMap;
            }

            // Check metalnessMap slot
            if (textures.metalnessMap !== undefined && m.metalnessMap !== textures.metalnessMap) {
              structuralChange = true;
              m.metalnessMap = textures.metalnessMap;
            }

            // Check aoMap slot
            if (textures.aoMap !== undefined && m.aoMap !== textures.aoMap) {
              structuralChange = true;
              m.aoMap = textures.aoMap;
            }

            // Check emissiveMap slot
            if (textures.emissiveMap !== undefined && m.emissiveMap !== textures.emissiveMap) {
              structuralChange = true;
              m.emissiveMap = textures.emissiveMap;
            }

            // Physical maps
            if (textures.clearcoatMap !== undefined && (m as any).clearcoatMap !== textures.clearcoatMap) {
              structuralChange = true;
              (m as any).clearcoatMap = textures.clearcoatMap;
            }

            if (textures.sheenColorMap !== undefined && (m as any).sheenColorMap !== textures.sheenColorMap) {
              structuralChange = true;
              (m as any).sheenColorMap = textures.sheenColorMap;
            }

            if (textures.transmissionMap !== undefined && (m as any).transmissionMap !== textures.transmissionMap) {
              structuralChange = true;
              (m as any).transmissionMap = textures.transmissionMap;
            }

            if (textures.alphaMap !== undefined && m.alphaMap !== textures.alphaMap) {
              structuralChange = true;
              m.alphaMap = textures.alphaMap;
            }

            if (textures.displacementMap !== undefined && m.displacementMap !== textures.displacementMap) {
              structuralChange = true;
              m.displacementMap = textures.displacementMap;
            }

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
    const {
      model,
      loadFromCache = false,
      forcedNullSlots = [],
      baseColorUrl,
      normalUrl,
      ormUrl,
      aoUrl,
      roughnessUrl,
      metalnessUrl,
      emissiveUrl,
      clearcoatUrl,
      sheenUrl,
      transmissionUrl,
      alphaUrl,
      displacementUrl,
      useOrmPack = true,
      normalScale,
      normalInvertY = false,
      roughnessFactor,
      metalnessFactor,
      aoIntensity,
      emissiveIntensity,
      emissiveColor,
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

    if (!model) return;

    const isSlotForcedNull = (slot: string) => forcedNullSlots.includes(slot);

    const tPbrStart = performance.now();
    const activeUrls = [
      !isSlotForcedNull('baseColor') ? baseColorUrl : null,
      !isSlotForcedNull('normal') ? normalUrl : null,
      useOrmPack && !isSlotForcedNull('orm') ? ormUrl : null,
      !useOrmPack && !isSlotForcedNull('ao') ? aoUrl : null,
      !useOrmPack && !isSlotForcedNull('roughness') ? roughnessUrl : null,
      !useOrmPack && !isSlotForcedNull('metalness') ? metalnessUrl : null,
      !isSlotForcedNull('emissive') ? emissiveUrl : null,
      !isSlotForcedNull('clearcoat') ? clearcoatUrl : null,
      !isSlotForcedNull('sheen') ? sheenUrl : null,
      !isSlotForcedNull('transmission') ? transmissionUrl : null,
      !isSlotForcedNull('alpha') ? alphaUrl : null,
      !isSlotForcedNull('displacement') ? displacementUrl : null
    ].filter(Boolean);

    if (activeUrls.length > 0) {
      console.log(`[PERF: PBR] Loading ${activeUrls.length} active texture map(s) in parallel...`);
    }

    let baseColorTex: THREE.Texture | null = null;
    let normalTex: THREE.Texture | null = null;
    let ormTex: THREE.Texture | null = null;
    let aoTex: THREE.Texture | null = null;
    let roughnessTex: THREE.Texture | null = null;
    let metalnessTex: THREE.Texture | null = null;
    let emissiveTex: THREE.Texture | null = null;
    let clearcoatTex: THREE.Texture | null = null;
    let sheenTex: THREE.Texture | null = null;
    let transmissionTex: THREE.Texture | null = null;
    let alphaTex: THREE.Texture | null = null;
    let displacementTex: THREE.Texture | null = null;

    try {
      const [
        bTex,
        nTex,
        oTex,
        aTex,
        rTex,
        mTex,
        eTex,
        cTex,
        sTex,
        tTex,
        alTex,
        dTex
      ] = await Promise.all([
        !isSlotForcedNull('baseColor') && baseColorUrl ? loadTextureAsync(baseColorUrl, true).catch(() => null) : Promise.resolve(null),
        !isSlotForcedNull('normal') && normalUrl ? loadTextureAsync(normalUrl, false).catch(() => null) : Promise.resolve(null),
        useOrmPack && !isSlotForcedNull('orm') && ormUrl ? loadTextureAsync(ormUrl, false).catch(() => null) : Promise.resolve(null),
        !useOrmPack && !isSlotForcedNull('ao') && aoUrl ? loadTextureAsync(aoUrl, false).catch(() => null) : Promise.resolve(null),
        !useOrmPack && !isSlotForcedNull('roughness') && roughnessUrl ? loadTextureAsync(roughnessUrl, false).catch(() => null) : Promise.resolve(null),
        !useOrmPack && !isSlotForcedNull('metalness') && metalnessUrl ? loadTextureAsync(metalnessUrl, false).catch(() => null) : Promise.resolve(null),
        !isSlotForcedNull('emissive') && emissiveUrl ? loadTextureAsync(emissiveUrl, true).catch(() => null) : Promise.resolve(null),
        !isSlotForcedNull('clearcoat') && clearcoatUrl ? loadTextureAsync(clearcoatUrl, false).catch(() => null) : Promise.resolve(null),
        !isSlotForcedNull('sheen') && sheenUrl ? loadTextureAsync(sheenUrl, true).catch(() => null) : Promise.resolve(null),
        !isSlotForcedNull('transmission') && transmissionUrl ? loadTextureAsync(transmissionUrl, false).catch(() => null) : Promise.resolve(null),
        !isSlotForcedNull('alpha') && alphaUrl ? loadTextureAsync(alphaUrl, false).catch(() => null) : Promise.resolve(null),
        !isSlotForcedNull('displacement') && displacementUrl ? loadTextureAsync(displacementUrl, false).catch(() => null) : Promise.resolve(null)
      ]);

      baseColorTex = bTex;
      normalTex = nTex;
      ormTex = oTex;
      aoTex = aTex;
      roughnessTex = rTex;
      metalnessTex = mTex;
      emissiveTex = eTex;
      clearcoatTex = cTex;
      sheenTex = sTex;
      transmissionTex = tTex;
      alphaTex = alTex;
      displacementTex = dTex;
      if (activeUrls.length > 0) {
        console.log(`[PERF: PBR] All ${activeUrls.length} texture(s) ready in ${(performance.now() - tPbrStart).toFixed(1)}ms`);
      }
    } catch (err) {
      console.warn('[PBRController] Warning while loading textures:', err);
    }

    const tTraverseStart = performance.now();
    let meshCount = 0;

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Ensure UV2 exists for ambient occlusion
        if (mesh.geometry && mesh.geometry.attributes.uv && !mesh.geometry.attributes.uv2) {
          mesh.geometry.setAttribute('uv2', mesh.geometry.attributes.uv);
        }

        const rawMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        rawMats.forEach((m, matIdx) => {
          let mat = m as THREE.MeshStandardMaterial;
          if (!(mat instanceof THREE.MeshStandardMaterial)) return;

          // Cache original maps if not already done using WeakMap
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

          // Upgrade to MeshPhysicalMaterial ONLY if advanced physical properties are actively used
          const needsPhysical = Boolean(
            (!isSlotForcedNull('clearcoat') && (clearcoatTex || (clearcoatFactor !== undefined && clearcoatFactor > 0))) ||
            (!isSlotForcedNull('sheen') && (sheenTex || (sheenRoughness !== undefined && sheenRoughness > 0 && sheenColor !== '#000000' && sheenColor !== '#ffffff'))) ||
            (!isSlotForcedNull('transmission') && (transmissionTex || (transmissionFactor !== undefined && transmissionFactor > 0)))
          );

          if (needsPhysical && !(mat instanceof THREE.MeshPhysicalMaterial)) {
            const physMat = upgradeToPhysicalMaterial(mat);
            originalMaterialCache.set(physMat, orig);
            mat = physMat;
            if (Array.isArray(mesh.material)) {
              mesh.material[matIdx] = physMat;
            } else {
              mesh.material = physMat;
            }
            structuralChange = true;
          }

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
            const targetBaseMap = isSlotForcedNull('baseColor')
              ? null
              : (baseColorTex || (loadFromCache ? orig.map : null));
            if (mat.map !== targetBaseMap) {
              mat.map = targetBaseMap;
              structuralChange = true;
            } else if (mat.map && targetBaseMap && mat.map.colorSpace !== targetBaseMap.colorSpace) {
              mat.map.colorSpace = targetBaseMap.colorSpace;
              structuralChange = true;
            }

            if (!targetBaseMap) {
              mat.color.set(0xd0ceca);
            } else {
              mat.color.copy(orig.color || new THREE.Color(1, 1, 1));
            }

            const targetNormalMap = isSlotForcedNull('normal')
              ? null
              : (normalTex || (loadFromCache ? orig.normalMap : null));
            if (mat.normalMap !== targetNormalMap) {
              mat.normalMap = targetNormalMap;
              structuralChange = true;
            }
            if (targetNormalMap) {
              if (typeof normalScale === 'number') {
                mat.normalScale.set(normalScale, normalInvertY ? -normalScale : normalScale);
              } else if (normalScale instanceof THREE.Vector2) {
                mat.normalScale.copy(normalScale);
              }
            }

            let targetAoMap: THREE.Texture | null = null;
            let targetRoughnessMap: THREE.Texture | null = null;
            let targetMetalnessMap: THREE.Texture | null = null;

            if (useOrmPack) {
              if (!isSlotForcedNull('orm')) {
                if (ormTex) {
                  targetAoMap = ormTex;
                  targetRoughnessMap = ormTex;
                  targetMetalnessMap = ormTex;
                } else if (loadFromCache) {
                  targetAoMap = orig.aoMap;
                  targetRoughnessMap = orig.roughnessMap;
                  targetMetalnessMap = orig.metalnessMap;
                }
              }
            } else {
              if (!isSlotForcedNull('ao')) {
                targetAoMap = aoTex || (loadFromCache ? orig.aoMap : null);
              }
              if (!isSlotForcedNull('roughness')) {
                targetRoughnessMap = roughnessTex || (loadFromCache ? orig.roughnessMap : null);
              }
              if (!isSlotForcedNull('metalness')) {
                targetMetalnessMap = metalnessTex || (loadFromCache ? orig.metalnessMap : null);
              }
            }

            if (mat.aoMap !== targetAoMap) {
              mat.aoMap = targetAoMap;
              structuralChange = true;
            }
            if (mat.aoMap && aoIntensity !== undefined) {
              mat.aoMapIntensity = aoIntensity;
            }

            if (mat.roughnessMap !== targetRoughnessMap) {
              mat.roughnessMap = targetRoughnessMap;
              structuralChange = true;
            }
            if (roughnessFactor !== undefined) {
              mat.roughness = roughnessFactor;
            }

            if (mat.metalnessMap !== targetMetalnessMap) {
              mat.metalnessMap = targetMetalnessMap;
              structuralChange = true;
            }
            if (metalnessFactor !== undefined) {
              mat.metalness = metalnessFactor;
            }

            // Emissive
            const targetEmissiveMap = isSlotForcedNull('emissive')
              ? null
              : (emissiveTex || (loadFromCache ? orig.emissiveMap : null));
            if (mat.emissiveMap !== targetEmissiveMap) {
              mat.emissiveMap = targetEmissiveMap;
              structuralChange = true;
            }
            if (targetEmissiveMap) {
              if (emissiveColor !== undefined) mat.emissive.set(emissiveColor);
              if (emissiveIntensity !== undefined) mat.emissiveIntensity = emissiveIntensity;
            } else if (isSlotForcedNull('emissive')) {
              mat.emissive.set(0x000000);
              mat.emissiveIntensity = 0;
            }

            // Physical properties
            if (mat instanceof THREE.MeshPhysicalMaterial) {
              const targetClearcoatMap = isSlotForcedNull('clearcoat')
                ? null
                : (clearcoatTex || (loadFromCache ? orig.clearcoatMap : null));
              if (mat.clearcoatMap !== targetClearcoatMap) {
                mat.clearcoatMap = targetClearcoatMap;
                structuralChange = true;
              }
              if (targetClearcoatMap && mat.clearcoat === 0) {
                mat.clearcoat = 1.0;
              } else if (clearcoatFactor !== undefined) {
                mat.clearcoat = clearcoatFactor;
              }
              if (clearcoatRoughness !== undefined) {
                mat.clearcoatRoughness = clearcoatRoughness;
              }

              const targetSheenMap = isSlotForcedNull('sheen')
                ? null
                : (sheenTex || (loadFromCache ? orig.sheenColorMap : null));
              if (mat.sheenColorMap !== targetSheenMap) {
                mat.sheenColorMap = targetSheenMap;
                structuralChange = true;
              }
              if (targetSheenMap && mat.sheen === 0) {
                mat.sheen = 1.0;
              }
              if (sheenColor !== undefined) {
                mat.sheenColor.set(sheenColor);
              }
              if (sheenRoughness !== undefined) {
                mat.sheenRoughness = sheenRoughness;
              }

              const targetTransmissionMap = isSlotForcedNull('transmission')
                ? null
                : (transmissionTex || (loadFromCache ? orig.transmissionMap : null));
              if (mat.transmissionMap !== targetTransmissionMap) {
                mat.transmissionMap = targetTransmissionMap;
                structuralChange = true;
              }
              if (targetTransmissionMap && mat.transmission === 0) {
                mat.transmission = 1.0;
              } else if (transmissionFactor !== undefined) {
                mat.transmission = transmissionFactor;
              }
              if (ior !== undefined) {
                mat.ior = ior;
              }
            }

            // Alpha / Opacity
            const targetAlphaMap = isSlotForcedNull('alpha')
              ? null
              : (alphaTex || (loadFromCache ? orig.alphaMap : null));
            if (mat.alphaMap !== targetAlphaMap) {
              mat.alphaMap = targetAlphaMap;
              structuralChange = true;
            }
            const isTransparent = Boolean(targetAlphaMap);
            if (mat.transparent !== isTransparent) {
              mat.transparent = isTransparent;
              mat.alphaTest = isTransparent ? 0.05 : 0;
              mat.opacity = 1.0;
              structuralChange = true;
            }

            // Displacement
            const targetDisplacementMap = isSlotForcedNull('displacement')
              ? null
              : (displacementTex || (loadFromCache ? orig.displacementMap : null));
            if (mat.displacementMap !== targetDisplacementMap) {
              mat.displacementMap = targetDisplacementMap;
              structuralChange = true;
            }
            mat.displacementScale = targetDisplacementMap ? (displacementScale ?? 0.02) : 0.0;
          } else if (debugChannel === 'albedo') {
            const targetBaseMap = isSlotForcedNull('baseColor')
              ? null
              : (baseColorTex || (loadFromCache ? orig.map : null));
            if (mat.map !== targetBaseMap) {
              mat.map = targetBaseMap;
              structuralChange = true;
            }
            if (mat.normalMap !== null) {
              mat.normalMap = null;
              structuralChange = true;
            }
            mat.roughness = 1.0;
            mat.metalness = 0.0;
            mat.emissive.set(0x000000);
          } else if (debugChannel === 'normal') {
            const targetNormalMap = isSlotForcedNull('normal')
              ? null
              : (normalTex || (loadFromCache ? orig.normalMap : null));
            if (mat.map !== null) {
              mat.map = null;
              structuralChange = true;
            }
            if (mat.normalMap !== targetNormalMap) {
              mat.normalMap = targetNormalMap;
              structuralChange = true;
            }
            if (targetNormalMap) {
              if (typeof normalScale === 'number') {
                mat.normalScale.set(normalScale, normalInvertY ? -normalScale : normalScale);
              } else if (normalScale instanceof THREE.Vector2) {
                mat.normalScale.copy(normalScale);
              }
            }
            mat.roughness = 0.5;
            mat.metalness = 0.0;
            mat.emissive.set(0x000000);
          } else if (debugChannel === 'roughness') {
            const rMap = useOrmPack
              ? (isSlotForcedNull('orm') ? null : ormTex)
              : (isSlotForcedNull('roughness') ? null : (roughnessTex || (loadFromCache ? orig.roughnessMap : null)));
            if (mat.map !== rMap) {
              mat.map = rMap;
              structuralChange = true;
            }
            if (mat.normalMap !== null) {
              mat.normalMap = null;
              structuralChange = true;
            }
            mat.roughness = roughnessFactor ?? 1.0;
            mat.metalness = 0.0;
            mat.emissive.set(0x000000);
          } else if (debugChannel === 'metalness') {
            const mMap = useOrmPack
              ? (isSlotForcedNull('orm') ? null : ormTex)
              : (isSlotForcedNull('metalness') ? null : (metalnessTex || (loadFromCache ? orig.metalnessMap : null)));
            if (mat.map !== mMap) {
              mat.map = mMap;
              structuralChange = true;
            }
            if (mat.normalMap !== null) {
              mat.normalMap = null;
              structuralChange = true;
            }
            mat.roughness = 0.5;
            mat.metalness = metalnessFactor ?? 1.0;
            mat.emissive.set(0x000000);
          } else if (debugChannel === 'ao') {
            const aMap = useOrmPack
              ? (isSlotForcedNull('orm') ? null : ormTex)
              : (isSlotForcedNull('ao') ? null : (aoTex || (loadFromCache ? orig.aoMap : null)));
            if (mat.map !== aMap) {
              mat.map = aMap;
              structuralChange = true;
            }
            if (mat.normalMap !== null) {
              mat.normalMap = null;
              structuralChange = true;
            }
            mat.roughness = 1.0;
            mat.metalness = 0.0;
            mat.emissive.set(0x000000);
          } else if (debugChannel === 'emissive') {
            const eMap = isSlotForcedNull('emissive') ? null : (emissiveTex || (loadFromCache ? orig.emissiveMap : null));
            if (mat.map !== eMap) {
              mat.map = eMap;
              structuralChange = true;
            }
            if (mat.normalMap !== null) {
              mat.normalMap = null;
              structuralChange = true;
            }
            if (isSlotForcedNull('emissive')) {
              mat.emissive.set(0x000000);
              mat.emissiveIntensity = 0;
            } else {
              if (emissiveColor !== undefined) {
                if (typeof emissiveColor === 'string') mat.emissive.set(emissiveColor);
                else mat.emissive.copy(emissiveColor);
              } else {
                mat.emissive.set(0xffffff);
              }
              mat.emissiveIntensity = emissiveIntensity ?? 1.0;
            }
            mat.roughness = 1.0;
            mat.metalness = 0.0;
          }

          meshCount++;

          // Conforms to F1 & F2: set needsUpdate = true ONLY when structural changes occurred
          if (structuralChange) {
            mat.needsUpdate = true;
          }
        });
      }
    });

    const tTraverseTotal = performance.now() - tTraverseStart;
    const tPbrTotal = performance.now() - tPbrStart;
    console.log(`[PERF: PBR] Material bindings applied to ${meshCount} mesh(es) in ${tTraverseTotal.toFixed(1)}ms (PBR total: ${tPbrTotal.toFixed(1)}ms)`);

    if ((window as any).__loadEntryStart) {
      const totalElapsed = performance.now() - (window as any).__loadEntryStart;
      console.log(`%c[PERF: 4/4 COMPLETED] Full entry load & render finished in ${totalElapsed.toFixed(1)}ms (${(totalElapsed / 1000).toFixed(2)}s)`, 'background: #2e7d32; color: white; font-weight: bold; padding: 3px 8px; border-radius: 2px;');
      console.groupEnd();
      delete (window as any).__loadEntryStart;
    }
  })();
}

/**
 * Backward-compatible helper applying both textures and dynamic uniforms.
 */
export async function applyPbrState(options: PbrStateOptions): Promise<void> {
  await applyPbrTextures(options);
  applyPbrUniforms(options.model, options);
}

export function clearTextureCache(): void {
  loadedTextureCache.forEach((tex) => tex.dispose());
  loadedTextureCache.clear();
  texturePromiseCache.clear();
}
