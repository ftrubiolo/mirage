import React, { useRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { StoreEnvironment } from './StoreEnvironment';
import { DynamicDimensions } from './DynamicDimensions';
import { PBRModelViewer } from './PBRModelViewer';
import { ViewportToolbar } from './ViewportToolbar';
import { VariantBottomToolbar } from './VariantBottomToolbar';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { useViewportStore } from '../../store/viewportStore';
import { useAppStore } from '../../store/appStore';
import { viewportBridge } from '../../utils/viewportBridge';

const ViewportBridgeSync: React.FC = () => {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    viewportBridge.register(gl, scene, camera);
    return () => {
      viewportBridge.unregister();
    };
  }, [gl, scene, camera]);
  return null;
};

export const Canvas3D: React.FC = () => {
  const modelUrl = useWorkbenchStore((state) => state.modelUrl);
  const modelStats = useWorkbenchStore((state) => state.modelStats);
  const isModelLoading = useWorkbenchStore((state) => state.isModelLoading);
  const productName = useWorkbenchStore((state) => state.productName);
  const autoRotate = useViewportStore((state) => state.autoRotate);
  const cameraZoomAction = useViewportStore((state) => state.cameraZoomAction);
  const viewportTheme = useViewportStore((state) => state.viewportTheme);
  const orbitControlsRef = useRef<any>(null);
  const prevZoomAction = useRef(cameraZoomAction);

  useEffect(() => {
    if (!orbitControlsRef.current) return;
    if (cameraZoomAction > prevZoomAction.current) {
      orbitControlsRef.current.dollyIn(1.15);
      orbitControlsRef.current.update();
    } else if (cameraZoomAction < prevZoomAction.current) {
      orbitControlsRef.current.dollyOut(1.15);
      orbitControlsRef.current.update();
    }
    prevZoomAction.current = cameraZoomAction;
  }, [cameraZoomAction]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const filePath = window.electronAPI?.getPathForFile(file);
      if (filePath && (filePath.toLowerCase().endsWith('.glb') || filePath.toLowerCase().endsWith('.gltf'))) {
        const fileInfo = await window.electronAPI.getFileInfo(filePath);
        const activeSlug = useAppStore.getState().activeEntrySlug;
        let targetPath = filePath;
        let targetSize = fileInfo.size;

        if (activeSlug && window.electronAPI) {
          const normalizedPath = filePath.replace(/\\/g, '/');
          if (!normalizedPath.includes(`/${activeSlug}/`)) {
            try {
              const ext = filePath.split('.').pop() || 'glb';
              const copied = await window.electronAPI.copyFileToLibrary({
                entrySlug: activeSlug,
                sourceFilePath: filePath,
                targetType: 'model',
                ext
              });
              targetPath = copied.filePath;
              targetSize = copied.fileSize;
            } catch (copyErr) {
              console.warn('[Canvas3D] Could not copy model to library folder:', copyErr);
            }
          }
        }

        const assetUrl = window.electronAPI.toAssetUrl(targetPath);
        useWorkbenchStore.getState().setModel(targetPath, assetUrl, targetSize);
      }
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative w-full h-full overflow-hidden select-none transition-colors duration-200 ${
        viewportTheme === 'dark' ? 'bg-[#111110]' : 'bg-[#f7f5f2]'
      }`}
    >
      {/* Top Floating Controls */}
      <ViewportToolbar />

      {/* Bottom Left Variant Floating Toolbar */}
      <VariantBottomToolbar />

      {/* 3D R3F Canvas */}
      <Canvas
        camera={{ position: [0, 2, 4], fov: 50 }}
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
          toneMappingExposure: 1.0
        }}
        className="w-full h-full"
      >
        <ViewportBridgeSync />
        <StoreEnvironment />

        {modelUrl && (
          <Suspense fallback={null}>
            <PBRModelViewer modelUrl={modelUrl} orbitControlsRef={orbitControlsRef} />
          </Suspense>
        )}

        {modelStats?.dimensions && (
          <DynamicDimensions dimensions={modelStats.dimensions} />
        )}

        <OrbitControls
          ref={orbitControlsRef}
          autoRotate={autoRotate}
          autoRotateSpeed={0.7}
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 + 0.05}
          minDistance={0.5}
          maxDistance={15}
        />
      </Canvas>

      {/* 3D Loading Spinner Overlay */}
      {isModelLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-canvas/60 backdrop-blur-xs transition-opacity duration-200 pointer-events-none select-none">
          <div className="p-6 rounded-xs bg-surface-lowest/95 border border-hairline shadow-lg flex flex-col items-center gap-4 max-w-xs text-center animate-in fade-in zoom-in-95 duration-150">
            {/* Architectural Dual Spinner */}
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-hairline" />
              <div className="absolute inset-0 rounded-full border-2 border-action border-t-transparent animate-spin" />
              <div className="w-2.5 h-2.5 rounded-full bg-action shadow-xs" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-primary font-bold uppercase tracking-wider text-ink-primary block">
                Cargando Pieza 3D
              </span>
              <span className="text-[11px] font-mono text-ink-secondary block truncate max-w-[220px]">
                {productName || 'Inicializando geometría y texturas...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State Overlay */}
      {!modelUrl && !isModelLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-ink-tertiary">
          <div className="p-4 rounded-xs bg-surface-lowest border border-hairline shadow-xs mb-3">
            <svg className="w-8 h-8 text-ink-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-primary">Atelier 3D Sera</p>
          <p className="text-xs text-ink-secondary mt-1">Arrastra un archivo de mobiliario .glb o selecciónalo en el panel lateral</p>
        </div>
      )}
    </div>
  );
};
