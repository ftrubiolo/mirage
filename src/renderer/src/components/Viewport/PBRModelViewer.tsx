import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useThree } from '@react-three/fiber';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { useViewportStore } from '../../store/viewportStore';
import { applyPbrState, applyPbrTextures, applyPbrUniforms } from '../../utils/pbrController';
import { analyzeGlbHierarchy } from '../../utils/glbValidator';
import { viewportBridge } from '../../utils/viewportBridge';

// Shared singleton loaders to avoid repeatedly spawning workers and compiling WASM
let sharedGltfLoader: GLTFLoader | null = null;
let dracoConfigured = false;

export async function getSharedGltfLoader(): Promise<GLTFLoader> {
  if (!sharedGltfLoader) {
    sharedGltfLoader = new GLTFLoader();
  }

  if (!dracoConfigured && window.electronAPI) {
    try {
      const dracoPath = await window.electronAPI.getResourcePath('draco/gltf/');
      const cleanPath = dracoPath.endsWith('/') ? dracoPath : `${dracoPath}/`;
      const dracoUrl = window.electronAPI.toAssetUrl(cleanPath);
      const finalDecoderPath = dracoUrl.endsWith('/') ? dracoUrl : `${dracoUrl}/`;
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(finalDecoderPath);
      sharedGltfLoader.setDRACOLoader(dracoLoader);
      dracoConfigured = true;
    } catch (err) {
      console.warn('[PBRModelViewer] Could not initialize local DRACO decoder:', err);
    }
  }

  return sharedGltfLoader;
}

interface PBRModelViewerProps {
  modelUrl: string;
  orbitControlsRef: React.MutableRefObject<any>;
  isEmbeddedPreview?: boolean;
}

export const PBRModelViewer: React.FC<PBRModelViewerProps> = ({
  modelUrl,
  orbitControlsRef,
  isEmbeddedPreview = false
}) => {
  const { camera } = useThree();
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rawSceneRef = useRef<THREE.Group | null>(null);

  const {
    setModelStats,
    unitScale,
    setIsModelLoading
  } = useWorkbenchStore();

  const { showWireframe, resetCameraCounter } = useViewportStore();

  // Load Model
  useEffect(() => {
    let isCancelled = false;
    const tModelStart = performance.now();
    console.log(`[PERF: 3D VIEWER] Starting GLB load for: ${modelUrl}`);

    setLoading(true);
    if (!isEmbeddedPreview) {
      setIsModelLoading(true);
    }
    setError(null);

    // Safety watchdog timeout (6000ms): guarantees isModelLoading is never permanently stuck
    const watchdog = setTimeout(() => {
      if (!isEmbeddedPreview && !isCancelled) {
        console.warn(`[PBRModelViewer] Watchdog triggered after 6000ms for ${modelUrl}. Clearing stuck loading overlay.`);
        useWorkbenchStore.getState().setIsModelLoading(false);
      }
    }, 6000);

    async function loadModel() {
      try {
        const loader = await getSharedGltfLoader();
        if (isCancelled) return;
        const tLoaderReady = performance.now();
        console.log(`[PERF: 3D VIEWER] GLTFLoader ready in ${(tLoaderReady - tModelStart).toFixed(1)}ms. Fetching & parsing GLB binary...`);

        loader.load(
          modelUrl,
          (gltf) => {
            clearTimeout(watchdog);
            if (isCancelled) return;
            const tGltfParsed = performance.now();
            console.log(`[PERF: 3D VIEWER] GLB binary fetched & parsed in ${(tGltfParsed - tLoaderReady).toFixed(1)}ms`);

            const scene = gltf.scene;
            rawSceneRef.current = scene;

            // 1. Analyze hierarchy and stats (raw scale 1.0)
            const stats = analyzeGlbHierarchy(scene);
            setModelStats(stats);
            console.log(`[PERF: 3D VIEWER] Model stats: ${stats.triangleCount.toLocaleString()} polys, ${stats.vertexCount.toLocaleString()} verts, ${stats.meshCount} meshes`);

            // 2. Apply initial unit scale
            scene.scale.set(unitScale, unitScale, unitScale);
            scene.updateMatrixWorld(true);

            // 3. Ground Placement (lowest point at Y=0, centered on X/Z)
            const box = new THREE.Box3().setFromObject(scene);
            const center = new THREE.Vector3();
            box.getCenter(center);
            const size = new THREE.Vector3();
            box.getSize(size);

            scene.position.set(-center.x, -box.min.y, -center.z);
            scene.updateMatrixWorld(true);

            // 4. Enable shadow casting & receiving
            scene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            // 5. Dynamic Camera Auto-Framing (Architectural 3/4 view)
            const maxDim = Math.max(size.x, size.y, size.z, 0.2);
            const persCam = camera as THREE.PerspectiveCamera;
            const fovRad = (persCam.fov || 50) * (Math.PI / 180);
            const fitDistance = ((maxDim / 2) / Math.tan(fovRad / 2)) * 1.35;
            const centerY = size.y / 2;

            camera.position.set(fitDistance * 0.75, centerY + fitDistance * 0.4, fitDistance * 0.75);
            camera.lookAt(0, centerY, 0);

            if (orbitControlsRef.current) {
              orbitControlsRef.current.target.set(0, centerY, 0);
              orbitControlsRef.current.minDistance = maxDim * 0.3;
              orbitControlsRef.current.maxDistance = maxDim * 4.0;
              orbitControlsRef.current.update();
            }

            setModelGroup(scene);
            if (!isEmbeddedPreview) {
              viewportBridge.registerModel(scene);
              setIsModelLoading(false);
            }
            setLoading(false);
            console.log(`[PERF: 3D VIEWER] Model placed in scene in ${(performance.now() - tModelStart).toFixed(1)}ms`);
          },
          undefined,
          (err) => {
            clearTimeout(watchdog);
            if (isCancelled) return;
            console.error(`[PERF: 3D VIEWER] Error loading model after ${(performance.now() - tModelStart).toFixed(1)}ms:`, err);
            setError('No se pudo cargar el modelo 3D. Verifica el archivo.');
            setLoading(false);
            if (!isEmbeddedPreview) {
              setIsModelLoading(false);
            }
          }
        );
      } catch (err) {
        clearTimeout(watchdog);
        if (isCancelled) return;
        console.error(`[PERF: 3D VIEWER] Loader init error after ${(performance.now() - tModelStart).toFixed(1)}ms:`, err);
        setError('Error al inicializar el visor 3D.');
        setLoading(false);
        if (!isEmbeddedPreview) {
          setIsModelLoading(false);
        }
      }
    }

    loadModel();

    return () => {
      clearTimeout(watchdog);
      isCancelled = true;
      if (!isEmbeddedPreview) {
        viewportBridge.registerModel(null);
        useWorkbenchStore.getState().setIsModelLoading(false);
      }
    };
  }, [modelUrl, isEmbeddedPreview]);

  // Handle dynamic unit scale change (e.g. mm -> m or cm -> m)
  useEffect(() => {
    const scene = rawSceneRef.current;
    if (!scene || !modelGroup) return;

    scene.scale.set(unitScale, unitScale, unitScale);
    scene.updateMatrixWorld(true);

    // Compute bounding box and re-center on floor
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    scene.position.x += -center.x;
    scene.position.y += -box.min.y;
    scene.position.z += -center.z;
    scene.updateMatrixWorld(true);

    // Re-frame camera
    const maxDim = Math.max(size.x, size.y, size.z, 0.2);
    const persCam = camera as THREE.PerspectiveCamera;
    const fovRad = (persCam.fov || 50) * (Math.PI / 180);
    const fitDistance = ((maxDim / 2) / Math.tan(fovRad / 2)) * 1.35;
    const centerY = size.y / 2;

    camera.position.set(fitDistance * 0.75, centerY + fitDistance * 0.4, fitDistance * 0.75);
    camera.lookAt(0, centerY, 0);

    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.set(0, centerY, 0);
      orbitControlsRef.current.minDistance = maxDim * 0.3;
      orbitControlsRef.current.maxDistance = maxDim * 4.0;
      orbitControlsRef.current.update();
    }
  }, [unitScale]);

  const {
    baseColorMap,
    normalMap,
    ormMap,
    aoMap,
    roughnessMap,
    metalnessMap,
    emissiveMap,
    clearcoatMap,
    sheenMap,
    transmissionMap,
    alphaMap,
    displacementMap,
    useOrmPack,
    normalScale,
    normalInvertY,
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
    loadFromCache,
    slotEnabled,
    debugChannel
  } = useWorkbenchStore();

  // Dynamic PBR uniform updates: synchronous, zero recompilation, 60 FPS slider response
  useEffect(() => {
    if (!modelGroup) return;

    const forcedNullSlots = (Object.entries(slotEnabled || {}) as [string, boolean][])
      .filter(([_, enabled]) => !enabled)
      .map(([slot]) => slot);

    applyPbrUniforms(modelGroup, {
      roughness: roughnessFactor,
      metalness: metalnessFactor,
      normalScale,
      normalInvertY,
      aoMapIntensity: aoIntensity,
      emissiveIntensity,
      emissive: emissiveColor,
      clearcoat: clearcoatFactor,
      clearcoatRoughness,
      sheenColor,
      sheenRoughness,
      transmission: transmissionFactor,
      ior,
      displacementScale,
      forcedNullSlots,
      slotEnabled
    });
  }, [
    modelGroup,
    roughnessFactor,
    metalnessFactor,
    normalScale,
    normalInvertY,
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
    slotEnabled
  ]);

  // Texture maps and structural PBR updates: asynchronous, recompiles shaders ONLY on structural changes
  useEffect(() => {
    if (!modelGroup) return;

    const forcedNullSlots = (Object.entries(slotEnabled || {}) as [string, boolean][])
      .filter(([_, enabled]) => !enabled)
      .map(([slot]) => slot);

    applyPbrTextures({
      model: modelGroup,
      baseColorUrl: baseColorMap.url,
      normalUrl: normalMap.url,
      ormUrl: ormMap.url,
      aoUrl: aoMap.url,
      roughnessUrl: roughnessMap.url,
      metalnessUrl: metalnessMap.url,
      emissiveUrl: emissiveMap.url,
      clearcoatUrl: clearcoatMap.url,
      sheenUrl: sheenMap.url,
      transmissionUrl: transmissionMap.url,
      alphaUrl: alphaMap.url,
      displacementUrl: displacementMap.url,
      useOrmPack,
      normalScale,
      normalInvertY,
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
      loadFromCache,
      forcedNullSlots,
      debugChannel,
      wireframe: showWireframe
    });
  }, [
    modelGroup,
    baseColorMap.url,
    normalMap.url,
    ormMap.url,
    aoMap.url,
    roughnessMap.url,
    metalnessMap.url,
    emissiveMap.url,
    clearcoatMap.url,
    sheenMap.url,
    transmissionMap.url,
    alphaMap.url,
    displacementMap.url,
    useOrmPack,
    loadFromCache,
    slotEnabled,
    debugChannel,
    showWireframe
  ]);

  // Trigger camera reframing on demand
  useEffect(() => {
    if (!modelGroup || resetCameraCounter === 0) return;

    const box = new THREE.Box3().setFromObject(modelGroup);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.2);
    const persCam = camera as THREE.PerspectiveCamera;
    const fovRad = (persCam.fov || 50) * (Math.PI / 180);
    const fitDistance = ((maxDim / 2) / Math.tan(fovRad / 2)) * 1.35;
    const centerY = size.y / 2;

    camera.position.set(fitDistance * 0.75, centerY + fitDistance * 0.4, fitDistance * 0.75);
    camera.lookAt(0, centerY, 0);

    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.set(0, centerY, 0);
      orbitControlsRef.current.update();
    }
  }, [resetCameraCounter]);

  if (loading || !modelGroup) return null;

  return <primitive object={modelGroup} />;
};
