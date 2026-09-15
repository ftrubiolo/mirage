import React, { useRef, useEffect, useState, Suspense } from 'react';
import * as THREE from 'three';
import { Upload } from 'lucide-react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { StoreEnvironment } from './StoreEnvironment';
import { DynamicDimensions } from './DynamicDimensions';
import { PBRModelViewer } from './PBRModelViewer';
import { CameraController } from './CameraController';
import { ViewportContextMenu } from './ViewportContextMenu';
import { ViewportToolbar } from './ViewportToolbar';
import { ViewportStatusBar } from './ViewportStatusBar';
import { CanvasWidgetRenderer } from './Widgets';
import { useModelStore } from '../../store/modelStore';
import { useViewportStore } from '../../store/viewportStore';
import { useAppStore } from '../../store/appStore';
import { useKeybindsStore } from '../../utils/keybindsManager';
import { viewportBridge } from '../../utils/viewportBridge';
import { handleCanvasDrop } from '../../utils/canvasDropHandler';
import { Spinner, Button } from '../UI';

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
        } else if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
          const orthoCam = camera as THREE.OrthographicCamera;
          const aspect = rect.width / rect.height;
          const frustumHeight = orthoCam.top - orthoCam.bottom;
          const frustumWidth = frustumHeight * aspect;
          orthoCam.left = -frustumWidth / 2;
          orthoCam.right = frustumWidth / 2;
          orthoCam.updateProjectionMatrix();
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
  const modelUrl = useModelStore((state) => state.modelUrl);
  const modelStats = useModelStore((state) => state.modelStats);
  const modelPosition = useModelStore((state) => state.modelPosition);
  const isModelLoading = useModelStore((state) => state.isModelLoading);
  const productName = useModelStore((state) => state.productName);
  const autoRotate = useViewportStore((state) => state.autoRotate);
  const cameraZoomAction = useViewportStore((state) => state.cameraZoomAction);
  const viewportTheme = useViewportStore((state) => state.viewportTheme);
  const canvasWidgets = useViewportStore((state) => state.canvasWidgets);
  const currentView = useAppStore((state) => state.currentView);
  const orbitControlsRef = useRef<any>(null);
  const prevZoomAction = useRef(cameraZoomAction);
  const [isContextLost, setIsContextLost] = useState(false);
  const contextCleanupRef = useRef<(() => void) | null>(null);

  // Release the WebGL context-loss listeners when the canvas unmounts.
  useEffect(() => {
    return () => {
      contextCleanupRef.current?.();
      contextCleanupRef.current = null;
    };
  }, []);

  // Safety watchdog: auto-dismiss overlay if stuck for more than 5s
  useEffect(() => {
    if (isModelLoading) {
      const timer = setTimeout(() => {
        console.warn('[Canvas3D] Watchdog: isModelLoading active for >5s, auto-dismissing overlay.');
        useModelStore.getState().setIsModelLoading(false);
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
  const stageRef = useRef<HTMLDivElement>(null);
  const isRightDownRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, time: 0 });
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const isExcludedTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest('header') ||
        target.closest('footer') ||
        target.closest('[data-no-canvas-menu]') ||
        target.closest('[role="menu"]') ||
        target.closest('.z-50')
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isExcludedTarget(e.target)) return;
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
        if (isExcludedTarget(e.target)) return;
        const dt = performance.now() - dragStartRef.current.time;
        // Open context menu ONLY if cursor did NOT move and click was intentional
        if (!hasDraggedRef.current && dt < 450) {
          setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
        }
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (isExcludedTarget(e.target)) return;
      e.preventDefault(); // Unconditionally block native browser menu on canvas
    };

    stage.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    stage.addEventListener('contextmenu', onContextMenu);

    return () => {
      stage.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('contextmenu', onContextMenu);
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
      } else if (matches(e, 'gizmo.select')) {
        e.preventDefault();
        vp.setTransformGizmoMode('none');
      } else if (matches(e, 'gizmo.translate')) {
        e.preventDefault();
        vp.setTransformGizmoMode('translate');
      } else if (matches(e, 'gizmo.rotate')) {
        e.preventDefault();
        vp.setTransformGizmoMode('rotate');
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

  const [isDragOverFile, setIsDragOverFile] = useState(false);
  const [isDragOverBarItem, setIsDragOverBarItem] = useState(false);
  const dragCounterRef = useRef(0);
  const [stageBounds, setStageBounds] = useState({ width: 1000, height: 800 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setStageBounds({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Guarantee drag state is ALWAYS cleared on global cancellation, dragend, or drop
  useEffect(() => {
    const handleGlobalDragReset = () => {
      dragCounterRef.current = 0;
      setIsDragOverFile(false);
      setIsDragOverBarItem(false);
    };
    window.addEventListener('dragend', handleGlobalDragReset);
    window.addEventListener('drop', handleGlobalDragReset);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragReset);
      window.removeEventListener('drop', handleGlobalDragReset);
    };
  }, []);

  const handleStageDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;

    const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
    if (types.includes('Files')) {
      setIsDragOverFile(true);
      setIsDragOverBarItem(false);
    } else if (types.includes('application/x-mirage-bar') || types.includes('text/plain')) {
      setIsDragOverBarItem(true);
      setIsDragOverFile(false);
    }
  };

  const handleStageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
    if (types.includes('Files')) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    } else {
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleStageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOverFile(false);
      setIsDragOverBarItem(false);
    }
  };

  const handleStageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOverFile(false);
    setIsDragOverBarItem(false);

    // 1. External OS File Drop
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      await handleCanvasDrop(files);
      return;
    }

    // 2. Toolbar/StatusBar Item Drop onto Canvas Stage
    const sourceId = e.dataTransfer?.getData ? e.dataTransfer.getData('text/plain') : '';
    if (sourceId && stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const dropX = Math.max(16, Math.min(rect.width - 280, e.clientX - rect.left - 100));
      const dropY = Math.max(16, Math.min(rect.height - 140, e.clientY - rect.top - 20));
      useViewportStore.getState().addCanvasWidget(sourceId, dropX, dropY);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none flex flex-col transition-colors duration-200 ${
        viewportTheme === 'dark' ? 'bg-[#111110]' : 'bg-[#f7f5f2]'
      }`}
    >
      {/* Top Viewport Toolbar: Full width, docked at top */}
      <ViewportToolbar />

      {/* 3D Viewport Main Stage */}
      <div
        ref={stageRef}
        onDragEnter={handleStageDragEnter}
        onDragOver={handleStageDragOver}
        onDragLeave={handleStageDragLeave}
        onDrop={handleStageDrop}
        className="flex-1 relative w-full h-full min-h-0 overflow-hidden"
      >
        {/* Visual Drag & Drop Overlay for External OS Files */}
        {isDragOverFile && (
          <div className="absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center bg-action-subtle/80 backdrop-blur-xs border-2 border-dashed border-action m-3 rounded-xs animate-in fade-in duration-150">
            <div className="p-6 rounded-xs bg-surface-lowest/95 border border-hairline shadow-lg flex flex-col items-center gap-3 max-w-sm text-center">
              <div className="w-12 h-12 rounded-xs bg-surface-container text-action border border-hairline flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-primary font-bold uppercase tracking-wider text-ink-primary block">
                  Soltar en Visor 3D
                </span>
                <span className="text-[11px] text-ink-secondary block">
                  Auto-asignación de mapas PBR (_baseColor, _normal, _orm...) o modelo .glb
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Visual Drop Zone Indicator for Canvas Floating Widgets */}
        {isDragOverBarItem && (
          <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center bg-action/5 backdrop-blur-[2px] border-2 border-dashed border-action m-3 rounded-xs animate-in fade-in duration-100">
            <div className="px-4 py-2.5 rounded-xs bg-surface-lowest/95 border border-action shadow-xl flex items-center gap-2 text-action">
              <Upload className="w-4 h-4" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                Soltar para anclar widget flotante en el visor
              </span>
            </div>
          </div>
        )}

        {/* Floating Canvas Widgets */}
        {canvasWidgets.map((widget) => (
          <CanvasWidgetRenderer
            key={widget.id}
            id={widget.id}
            x={widget.x}
            y={widget.y}
            containerBounds={stageBounds}
          />
        ))}

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
        onCreated={({ gl }) => {
          const canvas = gl.domElement;

          const handleContextLost = (event: Event) => {
            // Without preventDefault the context is never restorable and the
            // viewport stays blank for the rest of the session.
            event.preventDefault();
            console.warn('[Canvas3D] WebGL context lost; awaiting restore.');
            setIsContextLost(true);
          };

          const handleContextRestored = () => {
            console.info('[Canvas3D] WebGL context restored.');
            setIsContextLost(false);
          };

          canvas.addEventListener('webglcontextlost', handleContextLost);
          canvas.addEventListener('webglcontextrestored', handleContextRestored);

          contextCleanupRef.current = () => {
            canvas.removeEventListener('webglcontextlost', handleContextLost);
            canvas.removeEventListener('webglcontextrestored', handleContextRestored);
          };
        }}
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
          <group position={[modelPosition.x, modelPosition.y, modelPosition.z]}>
            <DynamicDimensions dimensions={modelStats.dimensions} />
          </group>
        )}

        <OrbitControls
          ref={orbitControlsRef}
          autoRotate={autoRotate && currentView === 'workbench'}
          autoRotateSpeed={0.7}
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 + 0.05}
          minDistance={0.5}
          maxDistance={15}
          minZoom={0.05}
          maxZoom={40}
          onChange={() => viewportBridge.notify()}
        />
      </Canvas>

      {/* WebGL context loss: reported instead of leaving a silently blank viewport */}
      {isContextLost && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-canvas/90 select-none">
          <div className="p-6 rounded-xs bg-surface-lowest border border-rose-500/40 shadow-lg flex flex-col items-center gap-3 max-w-sm text-center">
            <span className="text-xs font-primary font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Contexto WebGL perdido
            </span>
            <p className="text-xs text-ink-secondary font-body">
              El controlador gráfico ha reiniciado el contexto de render. Se restaurará
              automáticamente; si no ocurre, reinicia la aplicación.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Reiniciar aplicación
            </Button>
          </div>
        </div>
      )}

      {/* 3D Loading Spinner Overlay */}
      {isModelLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-canvas/60 backdrop-blur-xs transition-opacity duration-200 select-none">
          <div className="p-6 rounded-xs bg-surface-lowest/95 border border-hairline shadow-lg flex flex-col items-center gap-3 max-w-xs text-center animate-in fade-in zoom-in-95 duration-150">
            {/* Architectural Spinner */}
            <Spinner size="lg" />

            <div className="space-y-1">
              <span className="text-xs font-primary font-bold uppercase tracking-wider text-ink-primary block">
                Cargando Pieza 3D
              </span>
              <span className="text-[11px] font-mono text-ink-secondary block truncate max-w-[220px]">
                {productName || 'Inicializando geometría y texturas...'}
              </span>
            </div>

            <button
              onClick={() => useModelStore.getState().setIsModelLoading(false)}
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
            <p className="text-xs text-ink-secondary mt-1">Arrastra un archivo .glb o mapas de textura (_baseColor, _normal, _orm...)</p>
          </div>
        )}
      </div>

      {/* Viewport Status Bar: Variants + Model Metrology */}
      <ViewportStatusBar />
    </div>
  );
});
