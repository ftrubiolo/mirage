import React from 'react';
import { useModelStore } from '../../../store/modelStore';

export const CanvasMetrologyWidget: React.FC = () => {
  const modelStats = useModelStore((s) => s.modelStats);
  const rawDimensions = useModelStore((s) => s.rawDimensions);
  const unitScale = useModelStore((s) => s.unitScale);

  const triCount = modelStats?.triangleCount || 0;
  const vertCount = modelStats?.vertexCount || 0;
  const meshCount = modelStats?.meshCount || 0;

  const dims = rawDimensions || modelStats?.dimensions || { width: 0, height: 0, depth: 0 };
  const w = (dims.width * unitScale).toFixed(3);
  const h = (dims.height * unitScale).toFixed(3);
  const d = (dims.depth * unitScale).toFixed(3);
  const volume = (
    dims.width *
    dims.height *
    dims.depth *
    Math.pow(unitScale, 3)
  ).toFixed(4);

  return (
    <div className="w-64 flex flex-col gap-2">
      {/* Geometry Counts Grid */}
      <div className="grid grid-cols-3 gap-1.5 pb-2 border-b border-hairline text-center">
        <div className="p-1.5 rounded-xs bg-surface-container/40 border border-hairline">
          <span className="block text-[9px] uppercase font-mono text-ink-tertiary">Polygons</span>
          <span className="font-mono text-xs font-bold tabular-nums text-ink-primary">
            {triCount.toLocaleString()}
          </span>
        </div>
        <div className="p-1.5 rounded-xs bg-surface-container/40 border border-hairline">
          <span className="block text-[9px] uppercase font-mono text-ink-tertiary">Vertices</span>
          <span className="font-mono text-xs font-bold tabular-nums text-ink-primary">
            {vertCount.toLocaleString()}
          </span>
        </div>
        <div className="p-1.5 rounded-xs bg-surface-container/40 border border-hairline">
          <span className="block text-[9px] uppercase font-mono text-ink-tertiary">Meshes</span>
          <span className="font-mono text-xs font-bold tabular-nums text-ink-primary">
            {meshCount}
          </span>
        </div>
      </div>

      {/* Oriented Bounding Box Dimensions */}
      <div className="space-y-1 text-xs">
        <span className="block text-[10px] font-mono uppercase text-ink-tertiary font-medium">
          Oriented Dimensions (m)
        </span>
        <div className="grid grid-cols-3 gap-1 font-mono text-[11px] tabular-nums">
          <div className="flex items-center justify-between px-1.5 py-0.5 rounded-xs bg-surface-high/40 border border-hairline">
            <span className="text-red-400 font-bold">X:</span>
            <span>{w}m</span>
          </div>
          <div className="flex items-center justify-between px-1.5 py-0.5 rounded-xs bg-surface-high/40 border border-hairline">
            <span className="text-green-400 font-bold">Y:</span>
            <span>{h}m</span>
          </div>
          <div className="flex items-center justify-between px-1.5 py-0.5 rounded-xs bg-surface-high/40 border border-hairline">
            <span className="text-blue-400 font-bold">Z:</span>
            <span>{d}m</span>
          </div>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-between pt-1 border-t border-hairline font-mono text-[11px] text-ink-secondary">
        <span>Bounding volume:</span>
        <span className="tabular-nums font-bold text-ink-primary">{volume} m³</span>
      </div>
    </div>
  );
};
