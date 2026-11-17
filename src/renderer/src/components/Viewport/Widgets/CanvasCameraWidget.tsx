import React from 'react';
import { Focus, Box, Eye, Camera } from 'lucide-react';
import { useViewportStore, CameraPreset, CAMERA_FOCAL_LENGTHS } from '../../../store/viewportStore';

const CAMERA_PRESETS: { id: CameraPreset; label: string; short: string; shortcut?: string }[] = [
  { id: 'iso', label: 'Isometric (3/4)', short: 'ISO', shortcut: '0' },
  { id: 'front', label: 'Front', short: 'Front', shortcut: '1' },
  { id: 'right', label: 'Right Side', short: 'Right', shortcut: '3' },
  { id: 'left', label: 'Left Side', short: 'Left', shortcut: 'Ctrl+3' },
  { id: 'top', label: 'Top (Plan)', short: 'Top', shortcut: '7' },
  { id: 'bottom', label: 'Bottom (Base)', short: 'Bottom', shortcut: 'Ctrl+7' },
  { id: 'back', label: 'Back', short: 'Back', shortcut: 'Ctrl+1' }
];

export const CanvasCameraWidget: React.FC = () => {
  const cameraPreset = useViewportStore((s) => s.cameraPreset);
  const setCameraPreset = useViewportStore((s) => s.setCameraPreset);
  const isOrthographic = useViewportStore((s) => s.isOrthographic);
  const toggleOrthographic = useViewportStore((s) => s.toggleOrthographic);
  const cameraFov = useViewportStore((s) => s.cameraFov);
  const setCameraFov = useViewportStore((s) => s.setCameraFov);
  const setCameraFocalLength = useViewportStore((s) => s.setCameraFocalLength);
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
          title="Toggle between perspective and orthographic projection (5)"
        >
          <Box size={13} />
          <span>{isOrthographic ? 'Orthographic (CAD)' : 'Perspective'}</span>
        </button>

        <button
          type="button"
          onClick={triggerFitToModel}
          className="py-1.5 px-2 rounded-xs bg-surface-container/60 hover:bg-surface-high border border-hairline text-ink-secondary hover:text-ink-primary font-mono text-[11px] transition-colors flex items-center gap-1"
          title="Center and fit the model (F)"
        >
          <Focus size={13} className="text-action" />
          <span>Fit</span>
        </button>
      </div>

      {/* Camera Presets Grid */}
      <div className="flex flex-col gap-1 bg-surface-container/30 p-2 rounded-xs border border-hairline">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold tracking-wider text-ink-tertiary">
          <span>Standard CAD Views</span>
          <span className="text-[9px] font-normal text-ink-tertiary lowercase">double click focuses point</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setCameraPreset(preset.id)}
              title={`${preset.label}${preset.shortcut ? ` (${preset.shortcut})` : ''}`}
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

      {/* Field of View (FOV) & Lens Presets (only in perspective mode) */}
      {!isOrthographic && (
        <div className="flex flex-col gap-1.5 bg-surface-container/30 p-2 rounded-xs border border-hairline">
          <div className="flex items-center justify-between text-[11px] font-medium text-ink-primary">
            <div className="flex items-center gap-1.5">
              <Eye size={13} className="text-action shrink-0" />
              <span>Lens & Field of View</span>
            </div>
            <span className="font-mono text-[10px] tabular-nums text-ink-tertiary">
              {Math.round(cameraFov)}°
            </span>
          </div>

          {/* Focal Length Lens Presets */}
          <div className="grid grid-cols-4 gap-1">
            {CAMERA_FOCAL_LENGTHS.map((lens) => {
              const isSelected = Math.abs(cameraFov - lens.fov) <= 2;
              return (
                <button
                  key={lens.mm}
                  type="button"
                  onClick={() => setCameraFocalLength(lens.mm)}
                  title={`${lens.label}: ${lens.desc} (${lens.fov}°)`}
                  className={`py-0.5 rounded-xs font-mono text-[10px] text-center border transition-colors ${
                    isSelected
                      ? 'bg-action/15 text-action border-action/40 font-bold'
                      : 'bg-surface-lowest text-ink-secondary border-hairline hover:bg-surface-high hover:text-ink-primary'
                  }`}
                >
                  {lens.label}
                </button>
              );
            })}
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
            className="w-full h-1.5 bg-surface-high rounded-none appearance-none cursor-pointer accent-action mt-1"
          />
        </div>
      )}
    </div>
  );
};
