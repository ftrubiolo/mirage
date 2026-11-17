import React from 'react';
import { Play, Pause, RotateCw, RotateCcw, Zap, Gauge } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

interface CanvasAutoRotateWidgetProps {
  id?: string;
  mode?: 'full' | 'compressed';
  orientation?: 'horizontal' | 'vertical';
}

const SPEED_PRESETS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.7, label: '0.7x' },
  { value: 1.5, label: '1.5x' },
  { value: 3.0, label: '3.0x' }
];

export const CanvasAutoRotateWidget: React.FC<CanvasAutoRotateWidgetProps> = ({
  id = 'auto-rotate',
  mode: propMode,
  orientation: propOrientation
}) => {
  const storeMode = useViewportStore((s) => s.getCanvasWidgetMode(id));
  const storeOrientation = useViewportStore((s) => s.getCanvasWidgetOrientation(id));
  const mode = propMode ?? storeMode;
  const orientation = propOrientation ?? storeOrientation;

  const autoRotate = useViewportStore((s) => s.autoRotate);
  const toggleAutoRotate = useViewportStore((s) => s.toggleAutoRotate);
  const autoRotateSpeed = useViewportStore((s) => s.autoRotateSpeed);
  const setAutoRotateSpeed = useViewportStore((s) => s.setAutoRotateSpeed);
  const toggleAutoRotateDirection = useViewportStore((s) => s.toggleAutoRotateDirection);

  const isCompressed = mode === 'compressed';
  const isVertical = isCompressed && orientation === 'vertical';

  const speedMagnitude = Math.abs(autoRotateSpeed);
  const isClockwise = autoRotateSpeed > 0;

  const handleToggleFastSpeed = () => {
    const nextMag = speedMagnitude < 1.2 ? 2.5 : 0.7;
    setAutoRotateSpeed(isClockwise ? nextMag : -nextMag);
  };

  if (isCompressed) {
    return (
      <div
        className={`flex ${isVertical ? 'flex-col w-full' : 'flex-row'} p-0 gap-0 text-xs antialiased`}
        data-testid="canvas-auto-rotate-compressed"
        data-orientation={orientation}
      >
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={toggleAutoRotate}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            autoRotate
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title={autoRotate ? 'Pause auto-rotate (Space)' : 'Start 360° auto-rotate'}
          aria-label="Play or pause orbit"
        >
          {autoRotate ? (
            <Pause size={20} className="text-action" />
          ) : (
            <Play size={20} className="text-ink-secondary group-hover:text-ink-primary ml-0.5" />
          )}
        </button>

        {/* Direction Button */}
        <button
          type="button"
          onClick={toggleAutoRotateDirection}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group bg-surface-container/30 border-hairline text-ink-secondary hover:text-action hover:bg-surface-high hover:border-hairline-strong active:bg-action/20`}
          title={`Reverse rotation direction (${isClockwise ? 'Clockwise' : 'Counter-clockwise'})`}
          aria-label="Reverse direction"
        >
          {isClockwise ? (
            <RotateCw size={20} className="text-ink-secondary group-hover:text-action" />
          ) : (
            <RotateCcw size={20} className="text-ink-secondary group-hover:text-action" />
          )}
        </button>

        {/* Speed Quick Toggle */}
        <button
          type="button"
          onClick={handleToggleFastSpeed}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            speedMagnitude > 1.2
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title={`Toggle fast / slow speed (Current: ${speedMagnitude.toFixed(1)}x)`}
          aria-label="Toggle speed"
        >
          <Zap size={20} className={speedMagnitude > 1.2 ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>
      </div>
    );
  }

  // Full detailed mode
  return (
    <div className="w-64 space-y-3 text-xs antialiased" data-testid="canvas-auto-rotate-full">
      {/* Master Toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleAutoRotate}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xs font-medium border transition-colors cursor-pointer ${
            autoRotate
              ? 'bg-action text-on-action border-action shadow-xs'
              : 'bg-surface-container/50 border-hairline text-ink-primary hover:bg-surface-high'
          }`}
        >
          {autoRotate ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          <span>{autoRotate ? 'Pause Rotation' : 'Start 360° Orbit'}</span>
        </button>

        <button
          type="button"
          onClick={toggleAutoRotateDirection}
          className="p-2 rounded-xs border border-hairline bg-surface-container/50 text-ink-secondary hover:text-ink-primary hover:bg-surface-high transition-colors cursor-pointer"
          title={`Reverse direction (${isClockwise ? 'Clockwise' : 'Counter-clockwise'})`}
          aria-label="Reverse direction"
        >
          {isClockwise ? <RotateCw size={15} /> : <RotateCcw size={15} />}
        </button>
      </div>

      {/* Speed Slider & Readout */}
      <div className="p-2.5 rounded-xs bg-surface-container/30 border border-hairline space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-ink-secondary font-medium flex items-center gap-1.5">
            <Gauge size={12} />
            Orbit Speed
          </span>
          <span className="font-mono text-ink-primary font-semibold">{speedMagnitude.toFixed(2)}x</span>
        </div>

        <input
          type="range"
          min="0.1"
          max="4.0"
          step="0.05"
          value={speedMagnitude}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setAutoRotateSpeed(isClockwise ? val : -val);
          }}
          className="w-full h-1 bg-surface-high rounded-full appearance-none cursor-pointer accent-action"
        />

        {/* Speed Chips */}
        <div className="grid grid-cols-4 gap-1 pt-1">
          {SPEED_PRESETS.map((p) => {
            const isSelected = Math.abs(speedMagnitude - p.value) < 0.08;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setAutoRotateSpeed(isClockwise ? p.value : -p.value)}
                className={`py-0.5 text-center font-mono text-[10px] rounded-xs border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-action text-on-action border-action shadow-xs font-bold'
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
  );
};
