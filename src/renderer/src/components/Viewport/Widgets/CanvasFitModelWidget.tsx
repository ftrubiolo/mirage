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
          title="Reencuadrar pieza a escala 1:1 (Ctrl+0)"
          aria-label="Reencuadrar 1:1"
        >
          <Maximize2 size={20} className="text-ink-secondary group-hover:text-action" />
        </button>

        <button
          type="button"
          onClick={handleCenterOrigin}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group bg-surface-container/30 border-hairline text-ink-secondary hover:text-action hover:bg-surface-high hover:border-hairline-strong active:bg-action/20 active:border-action active:text-action`}
          title="Centrar punto de mira al origen (0, 0, 0)"
          aria-label="Centrar al origen"
        >
          <Crosshair size={20} className="text-ink-secondary group-hover:text-action" />
        </button>

        <button
          type="button"
          onClick={triggerResetCamera}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group bg-surface-container/30 border-hairline text-ink-secondary hover:text-action hover:bg-surface-high hover:border-hairline-strong active:bg-action/20 active:border-action active:text-action`}
          title="Restablecer posición inicial de la cámara"
          aria-label="Restablecer cámara"
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
            <div className="font-medium text-[11px] leading-tight text-ink-primary">Reencuadrar Pieza (1:1)</div>
            <div className="text-[9px] text-ink-tertiary">Ajusta encuadre al volumen del modelo (Ctrl+0)</div>
          </div>
        </button>

        <button
          type="button"
          onClick={handleCenterOrigin}
          className="w-full flex items-center gap-2.5 p-2 rounded-xs border border-hairline bg-surface-container/40 text-ink-secondary hover:text-ink-primary hover:bg-surface-high transition-colors text-left cursor-pointer"
        >
          <Crosshair size={16} className="text-action shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-[11px] leading-tight text-ink-primary">Centrar al Origen</div>
            <div className="text-[9px] text-ink-tertiary">Enfoca punto focal en coordenadas (0, 0, 0)</div>
          </div>
        </button>

        <button
          type="button"
          onClick={triggerResetCamera}
          className="w-full flex items-center gap-2.5 p-2 rounded-xs border border-hairline bg-surface-container/40 text-ink-secondary hover:text-ink-primary hover:bg-surface-high transition-colors text-left cursor-pointer"
        >
          <RotateCcw size={16} className="text-action shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-[11px] leading-tight text-ink-primary">Restablecer Cámara</div>
            <div className="text-[9px] text-ink-tertiary">Ángulo isométrico y distancia original</div>
          </div>
        </button>
      </div>

      {/* Optical Zoom Controls */}
      <div className="pt-1 border-t border-hairline flex items-center justify-between">
        <span className="text-[10px] text-ink-tertiary font-mono uppercase">Acercamiento Rápido</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomIn3D}
            className="p-1 rounded-xs border border-hairline bg-surface-container/50 text-ink-secondary hover:text-ink-primary hover:bg-surface-high transition-colors cursor-pointer"
            title="Acercar cámara (+)"
            aria-label="Acercar"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            onClick={zoomOut3D}
            className="p-1 rounded-xs border border-hairline bg-surface-container/50 text-ink-secondary hover:text-ink-primary hover:bg-surface-high transition-colors cursor-pointer"
            title="Alejar cámara (-)"
            aria-label="Alejar"
          >
            <ZoomOut size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
