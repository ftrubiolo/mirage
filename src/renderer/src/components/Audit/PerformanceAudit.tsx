import React from 'react';
import { Cpu, CheckCircle2, AlertTriangle, Layers, ShieldCheck } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { EmptyState, Badge } from '../UI';

export const PerformanceAudit: React.FC = () => {
  const modelStats = useModelStore((state) => state.modelStats);
  const modelFileSize = useModelStore((state) => state.modelFileSize);

  if (!modelStats) {
    return (
      <EmptyState
        icon={<Cpu className="w-6 h-6" />}
        title="Performance Audit"
        description="Load a .glb model to inspect draw calls and polygon budget."
      />
    );
  }

  const { triangleCount, vertexCount, meshCount, materials } = modelStats;

  const isPolyOptimal = triangleCount < 100000;
  const isPolyAcceptable = triangleCount >= 100000 && triangleCount <= 250000;

  const isDrawCallOptimal = meshCount <= 10;
  const fileSizeMb = modelFileSize / (1024 * 1024);
  const isFileSizeOptimal = fileSizeMb < 15;

  return (
    <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-action" />
          Performance &amp; Geometry Audit
        </h4>
        <ShieldCheck className="w-4 h-4 text-ink-tertiary" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xs bg-surface-low border border-hairline space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider font-primary text-ink-secondary block">
            Polygons (Triangles)
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono tabular-nums font-semibold text-ink-primary">
              {triangleCount.toLocaleString()}
            </span>
            {isPolyOptimal ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : isPolyAcceptable ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            )}
          </div>
          <span className="text-[9px] text-ink-tertiary block font-mono tabular-nums">
            {isPolyOptimal ? 'Optimal (<100k)' : isPolyAcceptable ? 'Acceptable (<250k)' : 'Heavy (>250k)'}
          </span>
        </div>

        <div className="p-2.5 rounded-xs bg-surface-low border border-hairline space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider font-primary text-ink-secondary block">
            Meshes (Draw Calls)
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono tabular-nums font-semibold text-ink-primary">{meshCount}</span>
            {isDrawCallOptimal ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <span className="text-[9px] text-ink-tertiary block font-mono tabular-nums">
            {isDrawCallOptimal ? 'Optimal (≤10 meshes)' : 'Multiple draw calls'}
          </span>
        </div>

        <div className="p-2.5 rounded-xs bg-surface-low border border-hairline space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider font-primary text-ink-secondary block">
            Total Vertices
          </span>
          <span className="font-mono tabular-nums font-semibold text-ink-primary block">
            {vertexCount.toLocaleString()}
          </span>
          <span className="text-[9px] text-ink-tertiary block font-mono tabular-nums">Mesh topology</span>
        </div>

        <div className="p-2.5 rounded-xs bg-surface-low border border-hairline space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider font-primary text-ink-secondary block">
            .GLB File Size
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono tabular-nums font-semibold text-ink-primary">{fileSizeMb.toFixed(2)} MB</span>
            {isFileSizeOptimal ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <span className="text-[9px] text-ink-tertiary block font-mono tabular-nums">
            {isFileSizeOptimal ? 'Lightweight (<15 MB)' : 'Consider optimization'}
          </span>
        </div>
      </div>

      {/* Materials List */}
      <div className="space-y-1">
        <span className="text-[10px] font-primary font-semibold text-ink-secondary block uppercase tracking-wider">
          Detected GLTF Materials ({materials.length})
        </span>
        <div className="flex flex-wrap gap-1">
          {materials.map((m, idx) => (
            <Badge
              key={idx}
              variant="neutral"
            >
              {m}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};
