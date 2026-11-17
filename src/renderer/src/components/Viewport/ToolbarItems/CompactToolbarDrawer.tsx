import React, { useRef, useEffect } from 'react';
import {
  Grid,
  Ruler,
  Box,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Rotate3d,
  MousePointer,
  Camera
} from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';
import { captureViewportSnapshot } from '../../../utils/viewportBridge';
import { Switch } from '../../UI';

interface CompactToolbarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompactToolbarDrawer: React.FC<CompactToolbarDrawerProps> = ({ isOpen, onClose }) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  const {
    showGrid,
    toggleGrid,
    showDimensions,
    toggleDimensions,
    showContactShadows,
    toggleContactShadows,
    autoRotate,
    toggleAutoRotate,
    isOrthographic,
    toggleOrthographic,
    zoomIn3D,
    zoomOut3D,
    showEnvironmentBackground,
    toggleEnvironmentBackground,
    environmentIntensity,
    setEnvironmentIntensity,
    transformGizmoMode,
    setTransformGizmoMode
  } = useViewportStore();

  const [isCapturing, setIsCapturing] = React.useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTakeSnapshot = async () => {
    try {
      setIsCapturing(true);
      const snap = await captureViewportSnapshot({
        width: 1920,
        height: 1080,
        transparent: false,
        format: 'png'
      });
      const a = document.createElement('a');
      a.href = snap.dataUrl;
      a.download = `mirage-snapshot-${Date.now()}.png`;
      a.click();
      onClose();
    } catch (err) {
      console.warn('[CompactToolbarDrawer] Snapshot capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div
      ref={drawerRef}
      className="absolute top-full right-0 mt-1 w-64 rounded-xs bg-surface-lowest border border-hairline shadow-2xl p-2.5 z-50 flex flex-col gap-3 text-xs animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Drawer Header */}
      <div className="pb-1.5 border-b border-hairline flex items-center justify-between">
        <span className="text-[10px] font-primary font-bold text-ink-tertiary uppercase tracking-wider">
          Viewport Tools
        </span>
        <span className="text-[10px] font-mono text-ink-tertiary">Mirage 3D</span>
      </div>

      {/* Group 0: 3D Transform Gizmo */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-primary font-semibold text-ink-tertiary uppercase tracking-wider block">
            3D Gizmo
          </span>
          <span className="text-[10px] text-ink-tertiary font-mono">Q / W / E</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setTransformGizmoMode('none')}
            className={`px-2 py-1 rounded-xs text-xs flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
              transformGizmoMode === 'none'
                ? 'bg-action/10 text-action border-action/40 font-semibold'
                : 'bg-surface-low border-hairline text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Select</span>
          </button>
          <button
            onClick={() => setTransformGizmoMode('translate')}
            className={`px-2 py-1 rounded-xs text-xs flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
              transformGizmoMode === 'translate'
                ? 'bg-action text-white border-action font-semibold'
                : 'bg-surface-low border-hairline text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>Move</span>
          </button>
          <button
            onClick={() => setTransformGizmoMode('rotate')}
            className={`px-2 py-1 rounded-xs text-xs flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
              transformGizmoMode === 'rotate'
                ? 'bg-action text-white border-action font-semibold'
                : 'bg-surface-low border-hairline text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <Rotate3d className="w-3.5 h-3.5" />
            <span>Rotate</span>
          </button>
        </div>
      </div>

      {/* Group 1: Scene Guides */}
      <div className="space-y-2 pt-1 border-t border-hairline">
        <span className="text-[10px] font-primary font-semibold text-ink-tertiary uppercase tracking-wider block">
          Guides &amp; Scene
        </span>
        <div className="flex items-center justify-between text-ink-primary">
          <span className="flex items-center gap-2">
            <Grid className="w-3.5 h-3.5 text-ink-secondary" />
            Reference grid
          </span>
          <Switch checked={showGrid} onChange={toggleGrid} />
        </div>
        <div className="flex items-center justify-between text-ink-primary">
          <span className="flex items-center gap-2">
            <Ruler className="w-3.5 h-3.5 text-ink-secondary" />
            Bounding dimensions
          </span>
          <Switch checked={showDimensions} onChange={toggleDimensions} />
        </div>
        <div className="flex items-center justify-between text-ink-primary">
          <span className="flex items-center gap-2">
            <Box className="w-3.5 h-3.5 text-ink-secondary" />
            Contact shadows
          </span>
          <Switch checked={showContactShadows} onChange={toggleContactShadows} />
        </div>
        <div className="flex items-center justify-between text-ink-primary">
          <span className="flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5 text-ink-secondary" />
            360° Auto-rotate
          </span>
          <Switch checked={autoRotate} onChange={toggleAutoRotate} />
        </div>
      </div>

      {/* Group 2: Camera & Projection */}
      <div className="space-y-2 pt-1 border-t border-hairline">
        <span className="text-[10px] font-primary font-semibold text-ink-tertiary uppercase tracking-wider block">
          Camera &amp; Zoom
        </span>
        <div className="flex items-center justify-between text-ink-primary">
          <span>Orthographic View</span>
          <Switch checked={isOrthographic} onChange={toggleOrthographic} />
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-ink-secondary">3D Zoom</span>
          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut3D}
              className="p-1 rounded-xs bg-surface-container hover:bg-surface-high transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={zoomIn3D}
              className="p-1 rounded-xs bg-surface-container hover:bg-surface-high transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Group 3: Lighting & Environment */}
      <div className="space-y-2 pt-1 border-t border-hairline">
        <span className="text-[10px] font-primary font-semibold text-ink-tertiary uppercase tracking-wider block">
          Lighting
        </span>
        <div className="flex items-center justify-between">
          <span className="text-ink-primary">360° HDRI Backdrop</span>
          <Switch
            checked={showEnvironmentBackground}
            onChange={toggleEnvironmentBackground}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-ink-secondary text-[11px]">
            <span>Light intensity</span>
            <span className="font-mono tabular-nums">
              {environmentIntensity.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="2.5"
            step="0.1"
            value={environmentIntensity}
            onChange={(e) => setEnvironmentIntensity(parseFloat(e.target.value))}
            className="w-full h-1 bg-surface-container rounded-none appearance-none cursor-pointer accent-action"
          />
        </div>
      </div>

      {/* Group 4: Quick Snapshot Export */}
      <div className="pt-1 border-t border-hairline">
        <button
          onClick={handleTakeSnapshot}
          disabled={isCapturing}
          className="w-full px-2.5 py-1.5 rounded-xs bg-surface-low hover:bg-surface-container text-ink-primary flex items-center justify-center gap-2 transition-colors cursor-pointer border border-hairline disabled:opacity-50"
        >
          <Camera className="w-3.5 h-3.5 text-action" />
          <span className="font-medium text-xs">Capture PNG Snapshot</span>
        </button>
      </div>
    </div>
  );
};
