import React, { useRef, useEffect, useState, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { StoreEnvironment } from './StoreEnvironment';
import { DynamicDimensions } from './DynamicDimensions';
import { PBRModelViewer } from './PBRModelViewer';
import { CameraController } from './CameraController';
import { ViewportContextMenu } from './ViewportContextMenu';
import { ViewportToolbar } from './ViewportToolbar';
import { VariantBottomToolbar } from './VariantBottomToolbar';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { useViewportStore } from '../../store/viewportStore';
import { useAppStore } from '../../store/appStore';
import { useKeybindsStore } from '../../utils/keybindsManager';
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

const ViewportResizeHandler: React.FC = () => {
  const { gl, camera, invalidate } = useThree();
  const sidebarWidth = useAppStore((s) => s.workbenchSidebarWidth);
  const isCollapsed = useAppStore((s) => s.isWorkbenchSidebarCollapsed);
  const currentView = useAppStore((s) => s.currentView);

  useEffect(() => {
    const parent = gl.domElement?.parentElement;
    if (!parent) return;

    const syncSize = () => {
      const rect = parent.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        gl.setSize(rect.width, rect.height, false);
        if ('aspect' in camera) {
          (camera as THREE.PerspectiveCamera).aspect = rect.width / rect.height;
          (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        }
        invalidate();
      }
    };

    syncSize();

    const ro = new ResizeObserver(() => {
      syncSize();
    });
    ro.observe(parent);

    const raf = requestAnimationFrame(syncSize);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [gl, camera, sidebarWidth, isCollapsed, currentView, invalidate]);

  return null;
};

export const Canvas3D: React.FC = React.memo(() => {
  const modelUrl = useWorkbenchStore((state) => state.modelUrl);
  const modelStats = useWorkbenchStore((state) => state.modelStats);
  const isModelLoading = useWorkbenchStore((state) => state.isModelLoading);
  const productName = useWorkbenchStore((state) => state.productName);
  const autoRotate = useViewportStore((state) => state.autoRotate);
  const cameraZoomAction = useViewportStore((state) => state.cameraZoomAction);
  const viewportTheme = useViewportStore((state) => state.viewportTheme);
  const currentView = useAppStore((state) => state.currentView);
  const orbitControlsRef = useRef<any>(null);
  const prevZoomAction = useRef(cameraZoomAction);

  // Safety watchdog: auto-dismiss overlay if stuck for more than 5s
  useEffect(() => {
    if (isModelLoading) {
      const timer = setTimeout(() => {
        console.warn('[Canvas3D] Watchdog: isModelLoading active for >5s, auto-dismissing overlay.');
        useWorkbenchStore.getState().setIsModelLoading(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isModelLoading]);

  // Right-click context menu state & drag-detection
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number }>({
    isOpen: false,
    x: 0,
    y: 0
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isRightDownRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, time: 0 });
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2) {
        isRightDownRef.current = true;
        hasDraggedRef.current = false;
        dragStartRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isRightDownRef.current) {
        const dx = Math.abs(e.clientX - dragStartRef.current.x);
        const dy = Math.abs(e.clientY - dragStartRef.current.y);
        // Any motion greater than 3px confirms user is panning/dragging
        if (dx > 3 || dy > 3) {
          hasDraggedRef.current = true;
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 2 && isRightDownRef.current) {
        isRightDownRef.current = false;
        const dt = performance.now() - dragStartRef.current.time;
        // Open context menu ONLY if cursor did NOT move and click was intentional
        if (!hasDraggedRef.current && dt < 450) {
          setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
        }
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Unconditionally block native browser menu
    };

    container.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    container.addEventListener('contextmenu', onContextMenu);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  // Initialize keybinds and register keyboard shortcuts
  useEffect(() => {
    useKeybindsStore.getState().init();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const matches = useKeybindsStore.getState().matchesEvent;
      const vp = useViewportStore.getState();

      if (matches(e, 'camera.iso')) {
        e.preventDefault();
        vp.setCameraPreset('iso');
      } else if (matches(e, 'camera.front')) {
        e.preventDefault();
        vp.setCameraPreset('front');
      } else if (matches(e, 'camera.right')) {
        e.preventDefault();
        vp.setCameraPreset('right');
      } else if (matches(e, 'camera.left')) {
        e.preventDefault();
        vp.setCameraPreset('left');
      } else if (matches(e, 'camera.top')) {
        e.preventDefault();
        vp.setCameraPreset('top');
      } else if (matches(e, 'camera.bottom')) {
        e.preventDefault();
        vp.setCameraPreset('bottom');
      } else if (matches(e, 'camera.back')) {
        e.preventDefault();
        vp.setCameraPreset('back');
      } else if (matches(e, 'camera.reset')) {
        e.preventDefault();
        vp.triggerFitToModel();
      } else if (matches(e, 'view.toggleGrid')) {
        e.preventDefault();
        vp.toggleGrid();
      } else if (matches(e, 'view.toggleDimensions')) {
        e.preventDefault();
        vp.toggleDimensions();
      } else if (matches(e, 'view.toggleAutoRotate')) {
        e.preventDefault();
        vp.toggleAutoRotate();
      } else if (matches(e, 'view.toggleWireframe')) {
        e.preventDefault();
        vp.toggleWireframe();
      } else if (matches(e, 'view.toggleContactShadows')) {
        e.preventDefault();
        vp.toggleContactShadows();
      } else if (matches(e, 'view.toggleBackground')) {
        e.preventDefault();
        vp.toggleEnvironmentBackground();
      } else if (matches(e, 'view.toggleSidebar')) {
        e.preventDefault();
        useAppStore.getState().toggleWorkbenchSidebar();
      } else if (matches(e, 'lighting.presetStudio')) {
        e.preventDefault();
        vp.setLightingPreset('studio');
      } else if (matches(e, 'lighting.presetNatural')) {
        e.preventDefault();
        vp.setLightingPreset('natural');
      } else if (matches(e, 'lighting.presetDramatic')) {
        e.preventDefault();
        vp.setLightingPreset('dramatic');
      } else if (matches(e, 'lighting.presetTechnical')) {
        e.preventDefault();
        vp.setLightingPreset('technical');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      ref={containerRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative w-full h-full overflow-hidden select-none transition-colors duration-200 ${
        viewportTheme === 'dark' ? 'bg-[#111110]' : 'bg-[#f7f5f2]'
      }`}
    >
      {/* Top Floating Controls - Preserved per user instruction */}
      <ViewportToolbar />

      {/* Bottom Left Variant Floating Toolbar */}
      <VariantBottomToolbar />

      {/* Right-Click Context Menu */}
      <ViewportContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 3D R3F Canvas - frameloop pauses when workbench is not active */}
      <Canvas
        frameloop={currentView === 'workbench' ? 'always' : 'never'}
        resize={{ debounce: 0, scroll: false }}
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
        <ViewportResizeHandler />
        <StoreEnvironment />
        <CameraController orbitControlsRef={orbitControlsRef} />

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
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-canvas/60 backdrop-blur-xs transition-opacity duration-200 select-none">
          <div className="p-6 rounded-xs bg-surface-lowest/95 border border-hairline shadow-lg flex flex-col items-center gap-3 max-w-xs text-center animate-in fade-in zoom-in-95 duration-150">
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

            <button
              onClick={() => useWorkbenchStore.getState().setIsModelLoading(false)}
              className="mt-1 text-[10px] font-mono text-ink-tertiary hover:text-ink-primary underline underline-offset-2 transition-colors cursor-pointer"
            >
              Omitir espera
            </button>
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
});
