import React from 'react';
import { Sun } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

export const LightingIntensityItem: React.FC = () => {
  const environmentIntensity = useViewportStore((s) => s.environmentIntensity);
  const setEnvironmentIntensity = useViewportStore((s) => s.setEnvironmentIntensity);

  return (
    <div
      className="flex items-center gap-1.5 px-1.5 text-xs text-ink-secondary"
      title={`Intensidad de iluminación: ${environmentIntensity.toFixed(1)}x`}
    >
      <Sun className="w-3.5 h-3.5 text-action shrink-0" />
      <input
        type="range"
        min="0.2"
        max="2.5"
        step="0.1"
        value={environmentIntensity}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => setEnvironmentIntensity(parseFloat(e.target.value))}
        data-interactive="true"
        className="w-14 sm:w-16 h-1 bg-surface-container rounded-none appearance-none cursor-pointer accent-action"
      />
      <span className="font-mono text-[10px] tabular-nums text-ink-tertiary w-7 shrink-0 text-right">
        {environmentIntensity.toFixed(1)}x
      </span>
    </div>
  );
};
