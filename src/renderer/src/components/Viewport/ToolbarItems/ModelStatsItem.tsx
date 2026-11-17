import React from 'react';
import { Box } from 'lucide-react';
import { useModelStore } from '../../../store/modelStore';

interface ModelStatsItemProps {
  compact?: boolean;
  iconOnly?: boolean;
}

export const ModelStatsItem: React.FC<ModelStatsItemProps> = ({ compact, iconOnly }) => {
  const modelStats = useModelStore((state) => state.modelStats);
  const modelUrl = useModelStore((state) => state.modelUrl);

  if (iconOnly) {
    if (modelStats) {
      const statsTooltip = `Polygons: ${modelStats.triangleCount.toLocaleString()} | Dimensions: ${modelStats.dimensions.width}×${modelStats.dimensions.height}×${modelStats.dimensions.depth}m`;
      return (
        <div
          className="flex items-center justify-center h-6 px-1.5 rounded-xs text-xs font-medium text-ink-secondary hover:text-ink-primary hover:bg-surface-container cursor-default"
          title={statsTooltip}
        >
          <Box className="w-3.5 h-3.5 text-action shrink-0" />
        </div>
      );
    }
    if (modelUrl) {
      return (
        <div
          className="flex items-center justify-center h-6 px-1.5 rounded-xs text-xs text-ink-tertiary cursor-default"
          title="Calculating geometry..."
        >
          <Box className="w-3.5 h-3.5 text-ink-tertiary animate-pulse shrink-0" />
        </div>
      );
    }
    return (
      <div
        className="flex items-center justify-center h-6 px-1.5 rounded-xs text-xs text-ink-tertiary/40 cursor-default"
        title="No geometry loaded"
      >
        <Box className="w-3.5 h-3.5 shrink-0" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs select-none">
      {modelStats ? (
        <div className="flex items-center gap-2.5 text-ink-secondary font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded-xs">
          <span>
            Polygons: <strong className="text-ink-primary">{modelStats.triangleCount.toLocaleString()}</strong>
          </span>
          {!compact && (
            <span>
              Dim: <strong className="text-ink-primary">{modelStats.dimensions.width}×{modelStats.dimensions.height}×{modelStats.dimensions.depth}m</strong>
            </span>
          )}
        </div>
      ) : modelUrl ? (
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-ink-tertiary">
          <Box className="w-3.5 h-3.5 text-ink-tertiary animate-pulse" />
          <span>Calculating geometry...</span>
        </div>
      ) : (
        <span className="text-[11px] font-mono text-ink-tertiary hidden sm:inline">
          No geometry loaded
        </span>
      )}
    </div>
  );
};
