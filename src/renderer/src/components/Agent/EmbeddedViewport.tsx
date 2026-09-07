import React, { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { RotateCw, RefreshCw, Box, Layers, Maximize2 } from 'lucide-react';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { useAppStore } from '../../store/appStore';
import { StoreEnvironment } from '../Viewport/StoreEnvironment';
import { PBRModelViewer } from '../Viewport/PBRModelViewer';

export const EmbeddedViewport: React.FC = () => {
  const modelUrl = useWorkbenchStore((state) => state.modelUrl);
  const debugChannel = useWorkbenchStore((state) => state.debugChannel);
  const setDebugChannel = useWorkbenchStore((state) => state.setDebugChannel);
  const setView = useAppStore((state) => state.setView);

  const [autoRotate, setAutoRotate] = useState(false);
  const orbitRef = useRef<any>(null);

  const handleResetCamera = () => {
    if (orbitRef.current) {
      orbitRef.current.reset();
    }
  };

  return (
    <div className="relative w-full h-[260px] bg-canvas border-b border-hairline overflow-hidden select-none shrink-0 group">
      {modelUrl ? (
        <Canvas
          camera={{ position: [0, 0.8, 2.2], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          className="w-full h-full"
        >
          <Suspense fallback={null}>
            <StoreEnvironment />
            <PBRModelViewer modelUrl={modelUrl} orbitControlsRef={orbitRef} isEmbeddedPreview={true} />
            <OrbitControls
              ref={orbitRef}
              autoRotate={autoRotate}
              autoRotateSpeed={1.5}
              enableDamping
              dampingFactor={0.08}
              makeDefault
            />
          </Suspense>
        </Canvas>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-ink-tertiary p-4 text-center">
          <Box className="w-8 h-8 text-ink-tertiary/40 mb-2" />
          <span className="text-xs font-medium">Sin modelo en la mesa de trabajo</span>
          <button
            onClick={() => setView('workbench')}
            className="mt-2 px-2.5 py-1 text-[11px] bg-surface-low hover:bg-surface-high text-action rounded border border-hairline transition-colors"
          >
            Ir a cargar modelo
          </button>
        </div>
      )}

      {/* Floating Mini Controls */}
      {modelUrl && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-surface-lowest/80 backdrop-blur-xs p-1 rounded-md border border-hairline opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1 rounded transition-colors ${
              autoRotate ? 'text-action bg-surface-container' : 'text-ink-secondary hover:text-ink-primary'
            }`}
            title="Alternar rotación automática"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetCamera}
            className="p-1 rounded text-ink-secondary hover:text-ink-primary hover:bg-surface-low transition-colors"
            title="Resetear encuadre de cámara"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() =>
              setDebugChannel(debugChannel === 'wireframe' ? 'lit' : 'wireframe')
            }
            className={`p-1 rounded transition-colors ${
              debugChannel === 'wireframe'
                ? 'text-action bg-surface-container'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
            title="Alternar modo alambre / iluminado"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setView('workbench')}
            className="p-1 rounded text-ink-secondary hover:text-ink-primary hover:bg-surface-low transition-colors"
            title="Abrir mesa de trabajo completa"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
