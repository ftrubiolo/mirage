import React from 'react';
import { Maximize2, Crosshair, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

interface CanvasFitModelWidgetProps {
  id?: string;
  mode?: 'full' | 'compressed';
  orientation?: 'horizontal' | 'vertical';
}

export const CanvasFitModelWidget: React.FC<CanvasFitModelWidgetProps> = ({
  id = 'fit-model',
  mode: propMode,
  orientation: propOrientation
}) => {
  const storeMode = useViewportStore((s) => s.getCanvasWidgetMode(id));
  const storeOrientation = useViewportStore((s) => s.getCanvasWidgetOrientation(id));
  const mode = propMode ?? storeMode;
  const orientation = propOrientation ?? storeOrientation;

  const triggerFitToModel = useViewportStore((s) => s.triggerFitToModel);
  const triggerResetCamera = useViewportStore((s) => s.triggerResetCamera);
  const focusOnPoint = useViewportStore((s) => s.focusOnPoint);
  const zoomIn3D = useViewportStore((s) => s.zoomIn3D);
  const zoomOut3D = useViewportStore((s) => s.zoomOut3D);

  const isCompressed = mode === 'compressed';
  const isVertical = isCompressed && orientation === 'vertical';

  const handleCenterOrigin = () => {
    focusOnPoint([0, 0, 0]);
  };

  if (isCompressed) {
    return (
      <div
        className={`flex ${isVertical ? 'flex-col w-full' : 'flex-row'} p-0 gap-0 text-xs antialiased`}
        data-testid="canvas-fit-model-compressed"
        data-orientation={orientation}
      >
        <button
          type="button"
          onClick={triggerFitToModel}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group bg-surface-container/30 border-hairline text-ink-secondary hover:text-action hover:bg-surface-high hover:border-hairline-strong active:bg-action/20 active:border-action active:text-action`}
          title="Reframe model to 1:1 scale (Ctrl+0)"
          aria-label="Reframe 1:1"
        >
          <Maximize2 size={20} className="text-ink-secondary group-hover:text-action" />
        </button>

        <button
          type="button"
          onClick={handleCenterOrigin}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group bg-surface-container/30 border-hairline text-ink-secondary hover:text-action hover:bg-surface-high hover:border-hairline-strong active:bg-action/20 active:border-action active:text-action`}
          title="Center focal target to origin (0, 0, 0)"
          aria-label="Center to origin"
        >
          <Crosshair size={20} className="text-ink-secondary group-hover:text-action" />
        </button>

        <button
          type="button"
          onClick={triggerResetCamera}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group bg-surface-container/30 border-hairline text-ink-secondary hover:text-action hover:bg-surface-high hover:border-hairline-strong active:bg-action/20 active:border-action active:text-action`}
          title="Reset camera to initial position"
          aria-label="Reset camera"
        >
          <RotateCcw size={20} className="text-ink-secondary group-hover:text-action" />
        </button>
      </div>
    );
  }

  // Full detailed mode
  return (
    <div className="w-64 space-y-2.5 text-xs antialiased" data-testid="canvas-fit-model-full">
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={triggerFitToModel}
          className="w-full flex items-center gap-2.5 p-2 rounded-xs border border-hairline bg-surface-container/40 text-ink-secondary hover:text-ink-primary hover:bg-surface-high transition-colors text-left cursor-pointer"
        >
          <Maximize2 size={16} className="text-action shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-[11px] leading-tight text-ink-primary">Reframe Model (1:1)</div>
            <div className="text-[9px] text-ink-tertiary">Fits framing to model bounds (Ctrl+0)</div>
          </div>
        </button>

        <button
          type="button"
          onClick={handleCenterOrigin}
          className="w-full flex items-center gap-2.5 p-2 rounded-xs border border-hairline bg-surface-container/40 text-ink-secondary hover:text-ink-primary hover:bg-surface-high transition-colors text-left cursor-pointer"
        >
          <Crosshair size={16} className="text-action shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-[11px] leading-tight text-ink-primary">Center to Origin</div>
            <div className="text-[9px] text-ink-tertiary">Focuses camera target on coordinates (0, 0, 0)</div>
          </div>
        </button>

        <button
          type="button"
          onClick={triggerResetCamera}
          className="w-full flex items-center gap-2.5 p-2 rounded-xs border border-hairline bg-surface-container/40 text-ink-secondary hover:text-ink-primary hover:bg-surface-high transition-colors text-left cursor-pointer"
        >
          <RotateCcw size={16} className="text-action shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-[11px] leading-tight text-ink-primary">Reset Camera</div>
            <div className="text-[9px] text-ink-tertiary">Original isometric angle and distance</div>
          </div>
        </button>
      </div>

      {/* Optical Zoom Controls */}
      <div className="pt-1 border-t border-hairline flex items-center justify-between">
        <span className="text-[10px] text-ink-tertiary font-mono uppercase">Quick Zoom</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomIn3D}
            className="p-1 rounded-xs border border-hairline bg-surface-container/50 text-ink-secondary hover:text-ink-primary hover:bg-surface-high transition-colors cursor-pointer"
            title="Zoom in (+)"
            aria-label="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            onClick={zoomOut3D}
            className="p-1 rounded-xs border border-hairline bg-surface-container/50 text-ink-secondary hover:text-ink-primary hover:bg-surface-high transition-colors cursor-pointer"
            title="Zoom out (-)"
            aria-label="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
