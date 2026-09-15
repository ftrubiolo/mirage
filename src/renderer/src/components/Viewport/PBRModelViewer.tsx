import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useThree, useFrame } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import { GLTFAnimationPointerExtension } from '@needle-tools/three-animation-pointer';
import { useModelStore, normalizeDegrees } from '../../store/modelStore';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { useViewportStore } from '../../store/viewportStore';
import { applyPbrTextures, applyPbrUniforms, captureOriginalMaterials, clearTextureCache } from '../../utils/pbrController';
import { analyzeGlbHierarchy, extractGlbManifest } from '../../utils/glbValidator';
import { viewportBridge } from '../../utils/viewportBridge';
import { commandManager, SetModelPositionCommand, SetModelRotationCommand } from '../../utils/commandManager';

// Shared singleton loaders to avoid repeatedly spawning workers and compiling WASM
let sharedGltfLoader: GLTFLoader | null = null;
let dracoConfigured = false;

export async function getSharedGltfLoader(): Promise<GLTFLoader> {
  if (!sharedGltfLoader) {
    sharedGltfLoader = new GLTFLoader();
    sharedGltfLoader.register((parser) => new GLTFAnimationPointerExtension(parser));
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
}

export const PBRModelViewer: React.FC<PBRModelViewerProps> = ({
  modelUrl,
  orbitControlsRef
}) => {
  const { camera } = useThree();
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rawSceneRef = useRef<THREE.Group | null>(null);
  const pivotRef = useRef<THREE.Group>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const [groundOffsetY, setGroundOffsetY] = useState(0);
  const transformControlsRef = useRef<any>(null);
  const dragStartPosition = useRef({ x: 0, y: 0, z: 0 });
  const dragStartRotation = useRef({ x: 0, y: 0, z: 0 });
  const isDraggingRef = useRef(false);

  const setModelStats = useModelStore((state) => state.setModelStats);
  const unitScale = useModelStore((state) => state.unitScale);
  const modelPosition = useModelStore((state) => state.modelPosition);
  const setPosition = useModelStore((state) => state.setPosition);
  const modelRotation = useModelStore((state) => state.modelRotation);
  const setRotation = useModelStore((state) => state.setRotation);
  const updateOrientedDimensions = useModelStore((state) => state.updateOrientedDimensions);
  const setIsModelLoading = useModelStore((state) => state.setIsModelLoading);

  const { showWireframe, resetCameraCounter, transformGizmoMode } = useViewportStore();

  const updateGroundAndDimensions = useCallback(
    (rot: { x: number; y: number; z: number }, scale: number) => {
      const mg = modelGroupRef.current;
      if (!mg) return;

      // Position temporarily at 0 to measure pure rotated/scaled bounds around geometric center
      mg.position.set(0, 0, 0);
      mg.rotation.set(
        THREE.MathUtils.degToRad(rot.x),
        THREE.MathUtils.degToRad(rot.y),
        THREE.MathUtils.degToRad(rot.z)
      );
      mg.scale.set(scale, scale, scale);
      mg.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(mg);
      const size = new THREE.Vector3();
      box.getSize(size);

      // Lift model so its lowest vertex rests on Y=0 (the floor)
      const newGroundOffsetY = -box.min.y;
      mg.position.set(0, newGroundOffsetY, 0);
      mg.updateMatrixWorld(true);

      setGroundOffsetY(newGroundOffsetY);

      updateOrientedDimensions({
        width: Number(size.x.toFixed(3)),
        height: Number(size.y.toFixed(3)),
        depth: Number(size.z.toFixed(3))
      });
    },
    [updateOrientedDimensions]
  );

  // Load Model
  useEffect(() => {
    if (!modelUrl) {
      setLoading(false);
            setIsModelLoading(false);
    
      return;
    }

    let isCancelled = false;
    const tModelStart = performance.now();
    console.log(`[PERF: 3D VIEWER] Starting GLB load for: ${modelUrl}`);

    setLoading(true);
        setIsModelLoading(true);
  
    setError(null);

    // Safety watchdog timeout (6000ms): guarantees isModelLoading is never permanently stuck
    const watchdog = setTimeout(() => {
      if (!isCancelled) {
        console.warn(`[PBRModelViewer] Watchdog triggered after 6000ms for ${modelUrl}. Clearing stuck loading overlay.`);
        useModelStore.getState().setIsModelLoading(false);
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

            // Dispose previous rawScene resources to prevent WebGL memory leak
            if (rawSceneRef.current && rawSceneRef.current !== gltf.scene) {
              rawSceneRef.current.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh;
                  if (mesh.geometry) {
                    mesh.geometry.dispose();
                  }
                  if (mesh.material) {
                    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    for (const material of materials) {
                      // Textures injected from the PBR library are cached
                      // module-wide and shared between materials, so disposing
                      // the material does not free them. Drop the whole texture
                      // cache with the old model; entries still in use by the
                      // new model are re-fetched on demand.
                      material.dispose();
                    }
                  }
                }
              });
              // Nothing now references the previous model's injected textures.
              clearTextureCache();
            }

            const scene = gltf.scene;
            captureOriginalMaterials(scene);
            rawSceneRef.current = scene;

            // 1. Analyze hierarchy and stats (raw scale 1.0)
            const stats = analyzeGlbHierarchy(scene);
            setModelStats(stats);
            console.log(`[PERF: 3D VIEWER] Model stats: ${stats.triangleCount.toLocaleString()} polys, ${stats.vertexCount.toLocaleString()} verts, ${stats.meshCount} meshes`);

            // Extract non-geometry GLB manifest (embedded textures, materials, extensions)
            try {
              const manifest = extractGlbManifest((gltf as any).parser?.json || gltf);
              useModelStore.getState().setGlbManifest(manifest);
            } catch (manifestErr) {
              console.warn('[PBRModelViewer] Could not extract GLB manifest:', manifestErr);
            }

            // 2. Center raw geometry permanently around its exact geometric center (0, 0, 0)
            const box = new THREE.Box3().setFromObject(scene);
            const center = new THREE.Vector3();
            box.getCenter(center);
            const size = new THREE.Vector3();
            box.getSize(size);

            // Shift raw scene so its exact geometric center is at (0, 0, 0)
            scene.position.set(-center.x, -center.y, -center.z);
            scene.rotation.set(0, 0, 0);
            scene.scale.set(1, 1, 1);
            scene.updateMatrixWorld(true);

            // Ground base on floor (Y=0)
            const initialGroundY = size.y / 2;
            setGroundOffsetY(initialGroundY);

            updateOrientedDimensions({
              width: Number(size.x.toFixed(3)),
              height: Number(size.y.toFixed(3)),
              depth: Number(size.z.toFixed(3))
            });

            // 3. Enable shadow casting & receiving
            scene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            // 4. Dynamic Camera Auto-Framing (Architectural 3/4 view)
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
            setIsModelLoading(false);
            setLoading(false);
            console.log(`[PERF: 3D VIEWER] Model placed in scene in ${(performance.now() - tModelStart).toFixed(1)}ms`);

            // 5. Setup glTF animations if present
            if (gltf.animations && gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(scene);
              viewportBridge.registerAnimations(mixer, gltf.animations);
              const storeClips = gltf.animations.map((c, i) => ({
                name: c.name || `Animación ${i + 1}`,
                duration: Number(c.duration.toFixed(2))
              }));
              useViewportStore.getState().setAnimations(storeClips);
              console.log(`[PERF: 3D VIEWER] glTF animations registered: ${gltf.animations.length} clip(s)`);
            } else {
              viewportBridge.registerAnimations(null, []);
              useViewportStore.getState().resetAnimationState();
            }
          },
          undefined,
          (err) => {
            clearTimeout(watchdog);
            if (isCancelled) return;
            console.error(`[PERF: 3D VIEWER] Error loading model after ${(performance.now() - tModelStart).toFixed(1)}ms:`, err);
            setError('No se pudo cargar el modelo 3D. Verifica el archivo.');
            setLoading(false);
            setIsModelLoading(false);
            viewportBridge.registerAnimations(null, []);
            useViewportStore.getState().resetAnimationState();
          }
        );
      } catch (err) {
        clearTimeout(watchdog);
        if (isCancelled) return;
        console.error(`[PERF: 3D VIEWER] Loader init error after ${(performance.now() - tModelStart).toFixed(1)}ms:`, err);
        setError('Error al inicializar el visor 3D.');
        setLoading(false);
        setIsModelLoading(false);
        viewportBridge.registerAnimations(null, []);
        useViewportStore.getState().resetAnimationState();
      }
    }

    loadModel();

    return () => {
      clearTimeout(watchdog);
      isCancelled = true;
      viewportBridge.registerModel(null);
      viewportBridge.registerAnimations(null, []);
      useViewportStore.getState().resetAnimationState();
      useModelStore.getState().setIsModelLoading(false);
    };
  }, [modelUrl]);

  // Register the interactive pivot group with viewportBridge for exports and staging
  useEffect(() => {
    if (pivotRef.current) {
      viewportBridge.registerModel(pivotRef.current);
    }
  }, [modelGroup]);

  // Synchronize transforms from store to groups when not actively dragging
  useEffect(() => {
    if (pivotRef.current && !isDraggingRef.current) {
      pivotRef.current.position.set(modelPosition.x, modelPosition.y, modelPosition.z);
    }
  }, [modelPosition.x, modelPosition.y, modelPosition.z]);

  useEffect(() => {
    if (modelGroupRef.current && !isDraggingRef.current && modelGroup) {
      updateGroundAndDimensions(modelRotation, unitScale);
    }
  }, [modelRotation.x, modelRotation.y, modelRotation.z, unitScale, modelGroup, updateGroundAndDimensions]);

  const baseColorMap = usePbrMaterialStore((state) => state.baseColorMap);
  const normalMap = usePbrMaterialStore((state) => state.normalMap);
  const ormMap = usePbrMaterialStore((state) => state.ormMap);
  const metalRoughnessMap = usePbrMaterialStore((state) => state.metalRoughnessMap);
  const aoMap = usePbrMaterialStore((state) => state.aoMap);
  const roughnessMap = usePbrMaterialStore((state) => state.roughnessMap);
  const metalnessMap = usePbrMaterialStore((state) => state.metalnessMap);
  const emissiveMap = usePbrMaterialStore((state) => state.emissiveMap);
  const clearcoatMap = usePbrMaterialStore((state) => state.clearcoatMap);
  const sheenMap = usePbrMaterialStore((state) => state.sheenMap);
  const transmissionMap = usePbrMaterialStore((state) => state.transmissionMap);
  const alphaMap = usePbrMaterialStore((state) => state.alphaMap);
  const displacementMap = usePbrMaterialStore((state) => state.displacementMap);
  const useOrmPack = usePbrMaterialStore((state) => state.useOrmPack);
  const materialPackingMode = usePbrMaterialStore((state) => state.materialPackingMode);
  const normalScale = usePbrMaterialStore((state) => state.normalScale);
  const normalInvertY = usePbrMaterialStore((state) => state.normalInvertY);
  const roughnessFactor = usePbrMaterialStore((state) => state.roughnessFactor);
  const metalnessFactor = usePbrMaterialStore((state) => state.metalnessFactor);
  const aoIntensity = usePbrMaterialStore((state) => state.aoIntensity);
  const emissiveIntensity = usePbrMaterialStore((state) => state.emissiveIntensity);
  const emissiveColor = usePbrMaterialStore((state) => state.emissiveColor);
  const emissiveFullGlow = usePbrMaterialStore((state) => state.emissiveFullGlow);
  const clearcoatFactor = usePbrMaterialStore((state) => state.clearcoatFactor);
  const clearcoatRoughness = usePbrMaterialStore((state) => state.clearcoatRoughness);
  const sheenColor = usePbrMaterialStore((state) => state.sheenColor);
  const sheenRoughness = usePbrMaterialStore((state) => state.sheenRoughness);
  const transmissionFactor = usePbrMaterialStore((state) => state.transmissionFactor);
  const ior = usePbrMaterialStore((state) => state.ior);
  const displacementScale = usePbrMaterialStore((state) => state.displacementScale);
  const loadFromCache = usePbrMaterialStore((state) => state.loadFromCache);
  const slotEnabled = usePbrMaterialStore((state) => state.slotEnabled);
  const debugChannel = usePbrMaterialStore((state) => state.debugChannel);
  const activeMaterialName = usePbrMaterialStore((state) => state.activeMaterialName);

  // Dynamic PBR uniform updates: synchronous, zero recompilation, 60 FPS slider response
  useEffect(() => {
    if (!modelGroup) return;

    const forcedNullSlots = (Object.entries(slotEnabled || {}) as [string, boolean][])
      .filter(([_, enabled]) => !enabled)
      .map(([slot]) => slot);

    applyPbrUniforms(modelGroup, {
      targetMaterialName: activeMaterialName,
      roughness: roughnessFactor,
      metalness: metalnessFactor,
      normalScale,
      normalInvertY,
      aoMapIntensity: aoIntensity,
      emissiveIntensity,
      emissive: emissiveColor,
      emissiveFullGlow,
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
    activeMaterialName,
    roughnessFactor,
    metalnessFactor,
    normalScale,
    normalInvertY,
    aoIntensity,
    emissiveIntensity,
    emissiveColor,
    emissiveFullGlow,
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
      targetMaterialName: activeMaterialName,
      baseColorUrl: baseColorMap.url,
      normalUrl: normalMap.url,
      ormUrl: ormMap.url,
      metalRoughnessUrl: metalRoughnessMap.url,
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
      materialPackingMode,
      normalScale,
      normalInvertY,
      roughnessFactor,
      metalnessFactor,
      aoIntensity,
      emissiveIntensity,
      emissiveColor,
      emissiveFullGlow,
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
    activeMaterialName,
    baseColorMap.url,
    normalMap.url,
    ormMap.url,
    metalRoughnessMap.url,
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
    materialPackingMode,
    loadFromCache,
    slotEnabled,
    emissiveFullGlow,
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

  // Synchronize pivot group position from store when not actively dragging
  useEffect(() => {
    if (pivotRef.current && !isDraggingRef.current) {
      pivotRef.current.position.set(modelPosition.x, modelPosition.y, modelPosition.z);
    }
  }, [modelPosition.x, modelPosition.y, modelPosition.z]);

  // OrbitControls arbitration: disable OrbitControls when user drags the TransformControls gizmo
  useEffect(() => {
    const controls = transformControlsRef.current;
    if (!controls) return;

    const handleDraggingChanged = (event: any) => {
      const isDragging = Boolean(event.value);
      isDraggingRef.current = isDragging;
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = !isDragging;
      }
      if (isDragging) {
        dragStartPosition.current = { ...useModelStore.getState().modelPosition };
        dragStartRotation.current = { ...useModelStore.getState().modelRotation };
      }
    };

    controls.addEventListener('dragging-changed', handleDraggingChanged);
    return () => {
      controls.removeEventListener('dragging-changed', handleDraggingChanged);
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = true;
      }
    };
  }, [transformGizmoMode]);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = false;
    }
    dragStartPosition.current = { ...useModelStore.getState().modelPosition };
    dragStartRotation.current = { ...useModelStore.getState().modelRotation };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = true;
    }

    if (transformGizmoMode === 'translate' && pivotRef.current) {
      const finalPos = {
        x: Number(pivotRef.current.position.x.toFixed(4)),
        y: Number(pivotRef.current.position.y.toFixed(4)),
        z: Number(pivotRef.current.position.z.toFixed(4))
      };
      if (
        Math.abs(finalPos.x - dragStartPosition.current.x) > 0.0001 ||
        Math.abs(finalPos.y - dragStartPosition.current.y) > 0.0001 ||
        Math.abs(finalPos.z - dragStartPosition.current.z) > 0.0001
      ) {
        commandManager.execute(new SetModelPositionCommand(finalPos, dragStartPosition.current));
      }
    } else if (transformGizmoMode === 'rotate' && modelGroupRef.current) {
      const rotEuler = new THREE.Euler().setFromQuaternion(modelGroupRef.current.quaternion, 'XYZ');
      const finalRot = {
        x: normalizeDegrees(THREE.MathUtils.radToDeg(rotEuler.x)),
        y: normalizeDegrees(THREE.MathUtils.radToDeg(rotEuler.y)),
        z: normalizeDegrees(THREE.MathUtils.radToDeg(rotEuler.z))
      };

      if (
        Math.abs(finalRot.x - dragStartRotation.current.x) > 0.05 ||
        Math.abs(finalRot.y - dragStartRotation.current.y) > 0.05 ||
        Math.abs(finalRot.z - dragStartRotation.current.z) > 0.05
      ) {
        commandManager.execute(new SetModelRotationCommand(finalRot, dragStartRotation.current));
      }

      updateGroundAndDimensions(finalRot, unitScale);
    }
  };

  const handleObjectChange = () => {
    if (transformGizmoMode === 'translate' && pivotRef.current) {
      const pos = pivotRef.current.position;
      setPosition({
        x: Number(pos.x.toFixed(4)),
        y: Number(pos.y.toFixed(4)),
        z: Number(pos.z.toFixed(4))
      });
    } else if (transformGizmoMode === 'rotate' && modelGroupRef.current) {
      const rotEuler = new THREE.Euler().setFromQuaternion(modelGroupRef.current.quaternion, 'XYZ');
      setRotation({
        x: normalizeDegrees(THREE.MathUtils.radToDeg(rotEuler.x)),
        y: normalizeDegrees(THREE.MathUtils.radToDeg(rotEuler.y)),
        z: normalizeDegrees(THREE.MathUtils.radToDeg(rotEuler.z))
      });
    }
  };

  // 60 FPS animation mixer tick
  useFrame((_, delta) => {
    const mixer = viewportBridge.mixer;
    if (!mixer) return;

    const { isAnimationPlaying, animationPlaybackSpeed } = useViewportStore.getState();
    if (isAnimationPlaying) {
      mixer.update(delta * animationPlaybackSpeed);
    }
  });

  if (loading || !modelGroup) return null;

  return (
    <>
      <group
        ref={pivotRef}
        position={[modelPosition.x, modelPosition.y, modelPosition.z]}
      >
        <group
          ref={modelGroupRef}
          position={[0, groundOffsetY, 0]}
        >
          <primitive object={modelGroup} />
        </group>
      </group>

      {transformGizmoMode !== 'none' && (
        <TransformControls
          key={transformGizmoMode}
          ref={transformControlsRef}
          object={(transformGizmoMode === 'rotate' ? modelGroupRef : pivotRef) as any}
          mode={transformGizmoMode}
          space="world"
          size={0.75}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onObjectChange={handleObjectChange}
        />
      )}
    </>
  );
};
