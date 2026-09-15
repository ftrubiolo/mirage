import React from 'react';
import { Compass, Focus, Box, Eye } from 'lucide-react';
import { useViewportStore, CameraPreset } from '../../../store/viewportStore';

const CAMERA_PRESETS: { id: CameraPreset; label: string; short: string }[] = [
  { id: 'iso', label: 'Isométrica (3/4)', short: 'ISO' },
  { id: 'front', label: 'Frontal', short: 'Frontal' },
  { id: 'right', label: 'Derecha', short: 'Der' },
  { id: 'left', label: 'Izquierda', short: 'Izq' },
  { id: 'top', label: 'Planta (Superior)', short: 'Top' },
  { id: 'bottom', label: 'Inferior', short: 'Bottom' },
  { id: 'back', label: 'Posterior', short: 'Back' }
];

export const CanvasCameraWidget: React.FC = () => {
  const cameraPreset = useViewportStore((s) => s.cameraPreset);
  const setCameraPreset = useViewportStore((s) => s.setCameraPreset);
  const isOrthographic = useViewportStore((s) => s.isOrthographic);
  const toggleOrthographic = useViewportStore((s) => s.toggleOrthographic);
  const cameraFov = useViewportStore((s) => s.cameraFov);
  const setCameraFov = useViewportStore((s) => s.setCameraFov);
  const triggerFitToModel = useViewportStore((s) => s.triggerFitToModel);

  return (
    <div className="w-72 flex flex-col gap-2.5 text-xs">
      {/* Projection Mode & Fit Action */}
      <div className="flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={toggleOrthographic}
          className={`flex-1 py-1.5 px-2 rounded-xs font-mono text-[11px] font-bold border transition-colors flex items-center justify-center gap-1.5 ${
            isOrthographic
              ? 'bg-action text-white border-action shadow-xs'
              : 'bg-surface-container/60 hover:bg-surface-high border-hairline text-ink-secondary'
          }`}
          title="Alternar entre proyección perspectiva y ortográfica"
        >
          <Box size={13} />
          <span>{isOrthographic ? 'Ortográfica (CAD)' : 'Perspectiva'}</span>
        </button>

        <button
          type="button"
          onClick={triggerFitToModel}
          className="py-1.5 px-2 rounded-xs bg-surface-container/60 hover:bg-surface-high border border-hairline text-ink-secondary hover:text-ink-primary font-mono text-[11px] transition-colors flex items-center gap-1"
          title="Centrar y encuadrar el modelo (F)"
        >
          <Focus size={13} className="text-action" />
          <span>Encuadrar</span>
        </button>
      </div>

      {/* Camera Presets Grid */}
      <div className="flex flex-col gap-1 bg-surface-container/30 p-2 rounded-xs border border-hairline">
        <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-ink-tertiary">
          Orientaciones Estándar CAD
        </span>
        <div className="grid grid-cols-4 gap-1">
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setCameraPreset(preset.id)}
              className={`py-1 rounded-xs font-mono text-[10px] text-center border transition-colors ${
                cameraPreset === preset.id
                  ? 'bg-action/15 text-action border-action/40 font-bold'
                  : 'bg-surface-lowest text-ink-secondary border-hairline hover:bg-surface-high hover:text-ink-primary'
              }`}
            >
              {preset.short}
            </button>
          ))}
        </div>
      </div>

      {/* Field of View (FOV) Slider (only in perspective mode) */}
      {!isOrthographic && (
        <div className="flex flex-col gap-1 bg-surface-container/30 p-2 rounded-xs border border-hairline">
          <div className="flex items-center justify-between text-[11px] font-medium text-ink-primary">
            <div className="flex items-center gap-1.5">
              <Eye size={13} className="text-action shrink-0" />
              <span>Campo de Visión (FOV)</span>
            </div>
            <span className="font-mono text-[10px] tabular-nums text-ink-tertiary">
              {Math.round(cameraFov)}°
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={90}
            step={1}
            value={cameraFov}
            draggable={false}
            onDragStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => setCameraFov(parseInt(e.target.value, 10))}
            data-interactive="true"
            className="w-full h-1.5 bg-surface-high rounded-none appearance-none cursor-pointer accent-action"
          />
        </div>
      )}
    </div>
  );
};
