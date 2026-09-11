import React from 'react';
import { Box, Layers } from 'lucide-react';
import { ALL_SLOT_NAMES, PbrSlotMap, SlotName, usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { useModelStore } from '../../store/modelStore';
import { EmbeddedViewport } from '../Viewport/EmbeddedViewport';
import { ResizeHandle } from '../UI/ResizeHandle';

export interface StudioLeftSidebarProps {
  width?: number;
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
}

export const StudioLeftSidebar: React.FC<StudioLeftSidebarProps> = ({
  width,
  isDragging = false,
  onMouseDown,
  onDoubleClick
}) => {
  const productName = useModelStore((s) => s.productName);
  const modelStats = useModelStore((s) => s.modelStats);
  const unitType = useModelStore((s) => s.unitType);
  const slotEnabled = usePbrMaterialStore((s) => s.slotEnabled);
  const roughnessFactor = usePbrMaterialStore((s) => s.roughnessFactor);
  const metalnessFactor = usePbrMaterialStore((s) => s.metalnessFactor);
  const normalScale = usePbrMaterialStore((s) => s.normalScale);
  const aoIntensity = usePbrMaterialStore((s) => s.aoIntensity);
  // The seven slots listed below are subscribed individually so the map badges stay live.
  const baseColorMap = usePbrMaterialStore((s) => s.baseColorMap);
  const normalMap = usePbrMaterialStore((s) => s.normalMap);
  const ormMap = usePbrMaterialStore((s) => s.ormMap);
  const aoMap = usePbrMaterialStore((s) => s.aoMap);
  const roughnessMap = usePbrMaterialStore((s) => s.roughnessMap);
  const metalnessMap = usePbrMaterialStore((s) => s.metalnessMap);
  const emissiveMap = usePbrMaterialStore((s) => s.emissiveMap);

  const slotMaps: Partial<Record<SlotName, PbrSlotMap>> = {
    baseColor: baseColorMap,
    normal: normalMap,
    orm: ormMap,
    ao: aoMap,
    roughness: roughnessMap,
    metalness: metalnessMap,
    emissive: emissiveMap
  };

  const dims = modelStats?.dimensions;
  const dimText = dims
    ? `${dims.width.toFixed(2)} × ${dims.height.toFixed(2)} × ${dims.depth.toFixed(2)} ${unitType}`
    : '—';

  return (
    <aside
      style={width !== undefined ? { width: `${width}px` } : undefined}
      className={`shrink-0 border-r border-hairline bg-surface-lowest flex flex-col min-h-0 select-none relative ${
        width === undefined ? 'w-[320px]' : ''
      } ${isDragging ? 'select-none' : ''}`}
    >
      {onMouseDown && (
        <ResizeHandle
          position="right"
          isDragging={isDragging}
          onMouseDown={onMouseDown}
          onDoubleClick={onDoubleClick}
          title="Arrastra para redimensionar panel izquierdo (Doble clic para restablecer)"
        />
      )}
      {/* Top: Mini Interactive 3D Canvas */}
      <EmbeddedViewport />

      {/* Bottom: Model Geometry & PBR Metrology */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Active Model Header */}
        <div className="space-y-1">
          <span className="text-[10px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
            Pieza Activa del Taller
          </span>
          <div className="font-semibold text-ink-primary text-sm truncate" title={productName || 'Modelo no guardado'}>
            {productName || 'Modelo no guardado'}
          </div>
        </div>

        {/* Geometry Metrology Box */}
        <div className="p-3 bg-surface-low border border-hairline rounded-xs space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="flex items-center gap-1.5 font-sans text-xs">
              <Box className="w-3.5 h-3.5 text-action" />
              Polígonos:
            </span>
            <span className="text-ink-primary font-semibold">
              {modelStats ? modelStats.triangleCount.toLocaleString() : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between text-ink-secondary">
            <span className="flex items-center gap-1.5 font-sans text-xs">
              <Layers className="w-3.5 h-3.5 text-action" />
              Mallas / Vértices:
            </span>
            <span className="text-ink-primary">
              {modelStats ? `${modelStats.meshCount} / ${modelStats.vertexCount.toLocaleString()}` : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between text-ink-secondary pt-1 border-t border-hairline">
            <span className="font-sans text-xs">Dimensiones:</span>
            <span className="text-ink-primary truncate max-w-[140px]" title={dimText}>
              {dimText}
            </span>
          </div>
        </div>

        {/* Active PBR Parameters Glance */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
            Parámetros Físicos PBR
          </span>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
            <div className="p-2 bg-surface-low rounded-xs border border-hairline flex flex-col">
              <span className="text-ink-tertiary text-[10px]">Rugosidad</span>
              <span className="text-ink-primary font-semibold">{roughnessFactor.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-surface-low rounded-xs border border-hairline flex flex-col">
              <span className="text-ink-tertiary text-[10px]">Metalicidad</span>
              <span className="text-ink-primary font-semibold">{metalnessFactor.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-surface-low rounded-xs border border-hairline flex flex-col">
              <span className="text-ink-tertiary text-[10px]">Normal Scale</span>
              <span className="text-ink-primary font-semibold">{normalScale.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-surface-low rounded-xs border border-hairline flex flex-col">
              <span className="text-ink-tertiary text-[10px]">Oclusión (AO)</span>
              <span className="text-ink-primary font-semibold">{aoIntensity.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* PBR Slot Maps List */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
            Ranuras de Textura
          </span>
          <div className="space-y-1">
            {ALL_SLOT_NAMES.slice(0, 7).map((slot) => {
              const isEnabled = slotEnabled[slot] ?? true;
              const map = slotMaps[slot];
              const hasMap = Boolean(map?.url || map?.filePath);

              return (
                <div
                  key={slot}
                  className="flex items-center justify-between px-2 py-1 bg-surface-low/60 rounded-xs border border-hairline text-[11px]"
                >
                  <span className="capitalize text-ink-secondary">{slot}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs ${
                      hasMap
                        ? isEnabled
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                        : 'text-ink-tertiary'
                    }`}
                  >
                    {hasMap ? (isEnabled ? 'Asignado' : 'Inactivo') : 'Vacío'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
