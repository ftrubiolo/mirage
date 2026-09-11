import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCw, RefreshCw, Box, Layers, Maximize2 } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { useAppStore } from '../../store/appStore';
import { viewportBridge } from '../../utils/viewportBridge';
import { EmptyState, IconButton, Button } from '../UI';

export const EmbeddedViewport: React.FC = () => {
  const modelUrl = useModelStore((state) => state.modelUrl);
  const debugChannel = usePbrMaterialStore((state) => state.debugChannel);
  const setDebugChannel = usePbrMaterialStore((state) => state.setDebugChannel);
  const setView = useAppStore((state) => state.setView);

  const [autoRotate, setAutoRotate] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  // Redraw preview to 2D canvas
  const updatePreview = useCallback(() => {
    if (!canvasRef.current) return;
    const success = viewportBridge.renderPreview(canvasRef.current);
    setIsReady(success);
  }, []);

  // Subscribe to bridge updates (model load, material change, uniforms, camera updates)
  useEffect(() => {
    const unsubscribe = viewportBridge.subscribe(() => {
      updatePreview();
    });

    // Initial draw attempt
    updatePreview();

    // Check periodically for the first 2 seconds if not yet initialized
    let timer: NodeJS.Timeout | null = null;
    if (!viewportBridge.isInitialized()) {
      let attempts = 0;
      timer = setInterval(() => {
        attempts++;
        if (viewportBridge.isInitialized() || attempts > 20) {
          updatePreview();
          if (timer) clearInterval(timer);
        }
      }, 100);
    }

    return () => {
      unsubscribe();
      if (timer) clearInterval(timer);
    };
  }, [updatePreview]);

  // Handle ResizeObserver to keep canvas sized correctly
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver(() => {
      updatePreview();
    });
    ro.observe(parent);

    return () => {
      ro.disconnect();
    };
  }, [updatePreview]);

  // On-demand auto-rotate animation loop (active ONLY when autoRotate is true)
  useEffect(() => {
    if (!autoRotate || !modelUrl) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let isRunning = true;
    const loop = () => {
      if (!isRunning) return;
      viewportBridge.orbit(0.015, 0);
      if (canvasRef.current) {
        viewportBridge.renderPreview(canvasRef.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [autoRotate, modelUrl]);

  // Interactive mouse / touch drag rotation (updates camera on demand, zero concurrent WebGL loops)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !canvasRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    // Orbit camera based on delta pixels
    viewportBridge.orbit(-dx * 0.01, -dy * 0.01);
    viewportBridge.renderPreview(canvasRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer capture already lost
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const delta = e.deltaY * 0.0015;
    viewportBridge.zoom(delta);
    viewportBridge.renderPreview(canvasRef.current);
  };

  const handleResetCamera = () => {
    viewportBridge.resetCamera();
    if (canvasRef.current) {
      viewportBridge.renderPreview(canvasRef.current);
    }
  };

  return (
    <div className="relative w-full h-[260px] bg-canvas border-b border-hairline overflow-hidden select-none shrink-0 group">
      {modelUrl ? (
        <div className="relative w-full h-full flex items-center justify-center bg-canvas">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className="w-full h-full cursor-grab active:cursor-grabbing block"
          />

          {!isReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-tertiary p-4 text-center pointer-events-none bg-canvas/80">
              <Box className="w-7 h-7 text-ink-tertiary/40 mb-2 animate-pulse" />
              <span className="text-xs font-medium">Sincronizando vista 3D...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4">
          <EmptyState
            icon={<Box className="w-7 h-7" />}
            title="Sin modelo en la mesa de trabajo"
            description="Carga un modelo 3D desde la pestaña de Geometría."
            action={
              <Button variant="secondary" size="sm" onClick={() => setView('workbench')}>
                Ir a cargar modelo
              </Button>
            }
          />
        </div>
      )}

      {/* Floating Mini Controls */}
      {modelUrl && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-surface-lowest/90 backdrop-blur-xs p-1 rounded-xs border border-hairline opacity-80 group-hover:opacity-100 transition-opacity z-10">
          <IconButton
            icon={<RotateCw className="w-3.5 h-3.5" />}
            size="xs"
            variant={autoRotate ? 'primary' : 'ghost'}
            onClick={() => setAutoRotate(!autoRotate)}
            title="Alternar rotación automática"
          />

          <IconButton
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            size="xs"
            variant="ghost"
            onClick={handleResetCamera}
            title="Resetear encuadre de cámara"
          />

          <IconButton
            icon={<Layers className="w-3.5 h-3.5" />}
            size="xs"
            variant={debugChannel === 'wireframe' ? 'primary' : 'ghost'}
            onClick={() =>
              setDebugChannel(debugChannel === 'wireframe' ? 'lit' : 'wireframe')
            }
            title="Alternar modo alambre / iluminado"
          />

          <IconButton
            icon={<Maximize2 className="w-3.5 h-3.5" />}
            size="xs"
            variant="ghost"
            onClick={() => setView('workbench')}
            title="Abrir mesa de trabajo completa"
          />
        </div>
      )}
    </div>
  );
};
