import React from 'react';
import { Eye, Box, Sliders } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

interface CanvasProjectionWidgetProps {
  id?: string;
  mode?: 'full' | 'compressed';
  orientation?: 'horizontal' | 'vertical';
}

const FOCAL_LENGTH_PRESETS = [
  { mm: 24, fov: 74, label: '24mm', desc: 'Ultra-Gran Angular' },
  { mm: 35, fov: 54, label: '35mm', desc: 'Gran Angular' },
  { mm: 50, fov: 40, label: '50mm', desc: 'Estándar Ojo Humano' },
  { mm: 85, fov: 24, label: '85mm', desc: 'Teleobjetivo Detalle' }
];

export const CanvasProjectionWidget: React.FC<CanvasProjectionWidgetProps> = ({
  id = 'projection-toggle',
  mode: propMode,
  orientation: propOrientation
}) => {
  const storeMode = useViewportStore((s) => s.getCanvasWidgetMode(id));
  const storeOrientation = useViewportStore((s) => s.getCanvasWidgetOrientation(id));
  const mode = propMode ?? storeMode;
  const orientation = propOrientation ?? storeOrientation;

  const isOrthographic = useViewportStore((s) => s.isOrthographic);
  const setIsOrthographic = useViewportStore((s) => s.setIsOrthographic);
  const cameraFov = useViewportStore((s) => s.cameraFov);
  const setCameraFov = useViewportStore((s) => s.setCameraFov);
  const setCameraFocalLength = useViewportStore((s) => s.setCameraFocalLength);

  const isCompressed = mode === 'compressed';
  const isVertical = isCompressed && orientation === 'vertical';

  if (isCompressed) {
    return (
      <div
        className={`flex ${isVertical ? 'flex-col w-full' : 'flex-row'} p-0 gap-0 text-xs antialiased`}
        data-testid="canvas-projection-compressed"
        data-orientation={orientation}
      >
        <button
          type="button"
          onClick={() => setIsOrthographic(false)}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            !isOrthographic
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title="Modo Perspectiva (Visión humana natural)"
          aria-label="Perspectiva"
        >
          <Eye size={20} className={!isOrthographic ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>

        <button
          type="button"
          onClick={() => setIsOrthographic(true)}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            isOrthographic
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title="Modo Ortográfico (Proyección axonométrica paralela)"
          aria-label="Ortográfica"
        >
          <Box size={20} className={isOrthographic ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>
      </div>
    );
  }

  // Full detailed mode
  return (
    <div className="w-64 space-y-3 text-xs antialiased" data-testid="canvas-projection-full">
      {/* Projection Mode Switcher */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setIsOrthographic(false)}
          className={`flex items-center gap-2 p-2 rounded-xs border transition-colors text-left cursor-pointer ${
            !isOrthographic
              ? 'bg-action/15 border-action/40 text-action'
              : 'bg-surface-container/40 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
          }`}
        >
          <Eye size={16} className="shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-[11px] leading-tight">Perspectiva</div>
            <div className="text-[9px] opacity-75 font-mono">Profundidad óptica</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsOrthographic(true)}
          className={`flex items-center gap-2 p-2 rounded-xs border transition-colors text-left cursor-pointer ${
            isOrthographic
              ? 'bg-action/15 border-action/40 text-action'
              : 'bg-surface-container/40 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
          }`}
        >
          <Box size={16} className="shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-[11px] leading-tight">Ortográfica</div>
            <div className="text-[9px] opacity-75 font-mono">Escala CAD 1:1</div>
          </div>
        </button>
      </div>

      {/* Perspective Optics Controls (when not in orthographic) */}
      {!isOrthographic ? (
        <div className="p-2.5 rounded-xs bg-surface-container/30 border border-hairline space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-ink-secondary font-medium flex items-center gap-1.5">
              <Sliders size={12} />
              Campo de Visión (FOV)
            </span>
            <span className="font-mono text-ink-primary font-semibold">{Math.round(cameraFov)}°</span>
          </div>

          <input
            type="range"
            min="15"
            max="90"
            step="1"
            value={cameraFov}
            onChange={(e) => setCameraFov(parseInt(e.target.value, 10))}
            className="w-full h-1 bg-surface-high rounded-full appearance-none cursor-pointer accent-action"
          />

          {/* Focal Length Chips */}
          <div>
            <div className="text-[10px] text-ink-tertiary mb-1 font-mono uppercase tracking-wider">Focales Fotográficas</div>
            <div className="grid grid-cols-4 gap-1">
              {FOCAL_LENGTH_PRESETS.map((p) => {
                const isSelected = Math.abs(cameraFov - p.fov) < 3;
                return (
                  <button
                    key={p.mm}
                    type="button"
                    onClick={() => setCameraFocalLength(p.mm)}
                    title={`${p.label} - ${p.desc} (${p.fov}° FOV)`}
                    className={`py-1 text-center font-mono text-[10px] rounded-xs border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-action text-white border-action shadow-xs font-bold'
                        : 'bg-surface-container/50 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-xs bg-surface-container/30 border border-hairline space-y-1">
          <div className="text-[11px] font-medium text-ink-primary">Proyección Axonométrica Paralela</div>
          <div className="text-[10px] text-ink-secondary leading-relaxed">
            Elimina la distorsión de fuga visual para permitir mediciones técnicas exactas y alineación con estándares CAD.
          </div>
        </div>
      )}
    </div>
  );
};
