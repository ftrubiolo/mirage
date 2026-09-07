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

export interface PbrStateOptions {
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
  normalScale?: number;
  normalInvertY?: boolean;
  roughnessFactor?: number;
  metalnessFactor?: number;
  aoIntensity?: number;
  emissiveIntensity?: number;
  emissiveColor?: string;
  clearcoatFactor?: number;
  clearcoatRoughness?: number;
  sheenColor?: string;
  sheenRoughness?: number;
  transmissionFactor?: number;
  ior?: number;
  displacementScale?: number;
  loadFromCache?: boolean;
  forcedNullSlots?: string[];

  debugChannel?: 'lit' | 'albedo' | 'normal' | 'roughness' | 'metalness' | 'ao' | 'emissive' | 'wireframe';
  wireframe?: boolean;
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

export async function applyPbrState(options: PbrStateOptions): Promise<void> {
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
    normalScale = 1.0,
    normalInvertY = false,
    roughnessFactor = 1.0,
    metalnessFactor = 1.0,
    aoIntensity = 1.0,
    emissiveIntensity = 1.0,
    emissiveColor = '#ffffff',
    clearcoatFactor = 0.0,
    clearcoatRoughness = 0.1,
    sheenColor = '#ffffff',
    sheenRoughness = 0.5,
    transmissionFactor = 0.0,
    ior = 1.5,
    displacementScale = 0.02,
    debugChannel = 'lit',
    wireframe = false
  } = options;

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

        // Upgrade to MeshPhysicalMaterial ONLY if advanced physical properties are actively used
        const needsPhysical = Boolean(
          (!isSlotForcedNull('clearcoat') && (clearcoatTex || clearcoatFactor > 0)) ||
          (!isSlotForcedNull('sheen') && (sheenTex || ((sheenRoughness > 0) && sheenColor !== '#000000' && sheenColor !== '#ffffff'))) ||
          (!isSlotForcedNull('transmission') && (transmissionTex || transmissionFactor > 0))
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
        }

        mat.wireframe = wireframe || debugChannel === 'wireframe';

        if (debugChannel === 'lit') {
          if (isSlotForcedNull('baseColor')) {
            mat.map = null;
            mat.color = new THREE.Color(0xd0ceca);
          } else if (!baseColorTex && !loadFromCache) {
            mat.map = null;
            mat.color = new THREE.Color(0xd0ceca);
          } else {
            mat.map = baseColorTex || (loadFromCache ? orig.map : null);
            mat.color = orig.color ? orig.color.clone() : new THREE.Color(1, 1, 1);
          }

          if (isSlotForcedNull('normal')) {
            mat.normalMap = null;
          } else {
            const nMap = normalTex || (loadFromCache ? orig.normalMap : null);
            if (nMap) {
              mat.normalMap = nMap;
              mat.normalScale = new THREE.Vector2(normalScale, normalInvertY ? -normalScale : normalScale);
            } else {
              mat.normalMap = null;
            }
          }

          if (useOrmPack) {
            if (isSlotForcedNull('orm')) {
              mat.aoMap = null;
              mat.roughnessMap = null;
              mat.metalnessMap = null;
            } else if (ormTex) {
              mat.aoMap = ormTex;
              mat.aoMapIntensity = aoIntensity;
              mat.roughnessMap = ormTex;
              mat.metalnessMap = ormTex;
            } else {
              mat.aoMap = loadFromCache ? orig.aoMap : null;
              if (mat.aoMap) mat.aoMapIntensity = aoIntensity;
              mat.roughnessMap = loadFromCache ? orig.roughnessMap : null;
              mat.metalnessMap = loadFromCache ? orig.metalnessMap : null;
            }
          } else {
            if (isSlotForcedNull('ao')) {
              mat.aoMap = null;
            } else {
              mat.aoMap = aoTex || (loadFromCache ? orig.aoMap : null);
              if (mat.aoMap) mat.aoMapIntensity = aoIntensity;
            }

            if (isSlotForcedNull('roughness')) {
              mat.roughnessMap = null;
            } else {
              mat.roughnessMap = roughnessTex || (loadFromCache ? orig.roughnessMap : null);
            }

            if (isSlotForcedNull('metalness')) {
              mat.metalnessMap = null;
            } else {
              mat.metalnessMap = metalnessTex || (loadFromCache ? orig.metalnessMap : null);
            }
          }

          mat.roughness = roughnessFactor;
          mat.metalness = metalnessFactor;

          // Emissive
          if (isSlotForcedNull('emissive')) {
            mat.emissiveMap = null;
            mat.emissive = new THREE.Color(0, 0, 0);
            mat.emissiveIntensity = 0;
          } else {
            const eMap = emissiveTex || (loadFromCache ? orig.emissiveMap : null);
            if (eMap) {
              mat.emissiveMap = eMap;
              mat.emissive = new THREE.Color(emissiveColor);
              mat.emissiveIntensity = emissiveIntensity;
            } else {
              mat.emissiveMap = null;
              mat.emissive = new THREE.Color(0, 0, 0);
            }
          }

          // Advanced Physical properties
          if (mat instanceof THREE.MeshPhysicalMaterial) {
            if (isSlotForcedNull('clearcoat')) {
              mat.clearcoatMap = null;
              mat.clearcoat = 0.0;
            } else {
              const cMap = clearcoatTex || (loadFromCache ? orig.clearcoatMap : null);
              mat.clearcoatMap = cMap;
              mat.clearcoat = cMap ? 1.0 : clearcoatFactor;
              mat.clearcoatRoughness = clearcoatRoughness;
            }

            if (isSlotForcedNull('sheen')) {
              mat.sheenColorMap = null;
              mat.sheen = 0.0;
            } else {
              const sMap = sheenTex || (loadFromCache ? orig.sheenColorMap : null);
              mat.sheenColorMap = sMap;
              mat.sheen = sMap ? 1.0 : (sheenColor !== '#000000' && sheenColor !== '#ffffff' ? 1.0 : 0.0);
              mat.sheenColor = new THREE.Color(sheenColor);
              mat.sheenRoughness = sheenRoughness;
            }

            if (isSlotForcedNull('transmission')) {
              mat.transmissionMap = null;
              mat.transmission = 0.0;
            } else {
              const tMap = transmissionTex || (loadFromCache ? orig.transmissionMap : null);
              mat.transmissionMap = tMap;
              mat.transmission = tMap ? 1.0 : transmissionFactor;
              mat.ior = ior;
            }
          }

          // Alpha / Opacity
          if (isSlotForcedNull('alpha')) {
            mat.alphaMap = null;
            mat.transparent = false;
            mat.opacity = 1.0;
          } else {
            const aMap = alphaTex || (loadFromCache ? orig.alphaMap : null);
            if (aMap) {
              mat.alphaMap = aMap;
              mat.transparent = true;
              mat.alphaTest = 0.05;
            } else {
              mat.alphaMap = null;
            }
          }

          // Displacement
          if (isSlotForcedNull('displacement')) {
            mat.displacementMap = null;
            mat.displacementScale = 0.0;
          } else {
            const dMap = displacementTex || (loadFromCache ? orig.displacementMap : null);
            if (dMap) {
              mat.displacementMap = dMap;
              mat.displacementScale = displacementScale;
            } else {
              mat.displacementMap = null;
            }
          }
        } else if (debugChannel === 'albedo') {
          mat.map = isSlotForcedNull('baseColor') ? null : (baseColorTex || (loadFromCache ? orig.map : null));
          mat.normalMap = null;
          mat.roughness = 1.0;
          mat.metalness = 0.0;
          mat.emissive = new THREE.Color(0, 0, 0);
        } else if (debugChannel === 'normal') {
          const nMap = isSlotForcedNull('normal') ? null : (normalTex || (loadFromCache ? orig.normalMap : null));
          mat.map = null;
          mat.normalMap = nMap;
          if (nMap) {
            mat.normalScale = new THREE.Vector2(normalScale, normalInvertY ? -normalScale : normalScale);
          }
          mat.roughness = 0.5;
          mat.metalness = 0.0;
          mat.emissive = new THREE.Color(0, 0, 0);
        } else if (debugChannel === 'roughness') {
          const rMap = useOrmPack
            ? (isSlotForcedNull('orm') ? null : ormTex)
            : (isSlotForcedNull('roughness') ? null : (roughnessTex || (loadFromCache ? orig.roughnessMap : null)));
          mat.map = rMap;
          mat.normalMap = null;
          mat.roughness = roughnessFactor;
          mat.metalness = 0.0;
          mat.emissive = new THREE.Color(0, 0, 0);
        } else if (debugChannel === 'metalness') {
          const mMap = useOrmPack
            ? (isSlotForcedNull('orm') ? null : ormTex)
            : (isSlotForcedNull('metalness') ? null : (metalnessTex || (loadFromCache ? orig.metalnessMap : null)));
          mat.map = mMap;
          mat.normalMap = null;
          mat.roughness = 0.5;
          mat.metalness = metalnessFactor;
          mat.emissive = new THREE.Color(0, 0, 0);
        } else if (debugChannel === 'ao') {
          const aMap = useOrmPack
            ? (isSlotForcedNull('orm') ? null : ormTex)
            : (isSlotForcedNull('ao') ? null : (aoTex || (loadFromCache ? orig.aoMap : null)));
          mat.map = aMap;
          mat.normalMap = null;
          mat.roughness = 1.0;
          mat.metalness = 0.0;
          mat.emissive = new THREE.Color(0, 0, 0);
        } else if (debugChannel === 'emissive') {
          const eMap = isSlotForcedNull('emissive') ? null : (emissiveTex || (loadFromCache ? orig.emissiveMap : null));
          mat.map = eMap;
          mat.normalMap = null;
          mat.emissive = isSlotForcedNull('emissive') ? new THREE.Color(0, 0, 0) : new THREE.Color(emissiveColor);
          mat.emissiveIntensity = isSlotForcedNull('emissive') ? 0 : emissiveIntensity;
          mat.roughness = 1.0;
          mat.metalness = 0.0;
        }

        meshCount++;
        // Always mark needsUpdate so texture bindings, channel swaps and slot clears immediately recompile
        mat.needsUpdate = true;
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
}

export function clearTextureCache(): void {
  loadedTextureCache.forEach((tex) => tex.dispose());
  loadedTextureCache.clear();
  texturePromiseCache.clear();
}
