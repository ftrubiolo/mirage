import React from 'react';
import { Database, Box, Layers, X } from 'lucide-react';
import { useWorkbenchStore, ALL_SLOT_NAMES } from '../../store/workbenchStore';

export interface ContextVaultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContextVaultDrawer: React.FC<ContextVaultDrawerProps> = ({ isOpen, onClose }) => {
  const {
    productName,
    modelStats,
    unitType,
    slotEnabled,
    roughnessFactor,
    metalnessFactor,
    normalScale,
    aoIntensity
  } = useWorkbenchStore();

  if (!isOpen) return null;

  const dims = modelStats?.dimensions;
  const dimText = dims
    ? `${dims.width.toFixed(2)} × ${dims.height.toFixed(2)} × ${dims.depth.toFixed(2)} ${unitType}`
    : '—';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-surface-lowest border-l border-hairline flex flex-col font-body select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-hairline bg-surface-low flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-action" />
          <span className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
            Bóveda de Contexto
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-surface-high rounded-xs text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
          title="Cerrar bóveda"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Model Information */}
        <div className="space-y-1">
          <span className="text-[10px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
            Pieza Activa
          </span>
          <div className="font-semibold text-ink-primary text-sm truncate" title={productName || 'Sin modelo'}>
            {productName || 'Sin modelo'}
          </div>
        </div>

        {/* Metrology Details */}
        <div className="p-3 bg-surface-low border border-hairline rounded-xs space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="flex items-center gap-1.5 font-sans text-xs">
              <Box className="w-3.5 h-3.5 text-action" />
              Polígonos:
            </span>
            <span className="text-ink-primary font-semibold tabular-nums">
              {modelStats ? modelStats.triangleCount.toLocaleString() : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between text-ink-secondary">
            <span className="flex items-center gap-1.5 font-sans text-xs">
              <Layers className="w-3.5 h-3.5 text-action" />
              Mallas / Vértices:
            </span>
            <span className="text-ink-primary tabular-nums">
              {modelStats ? `${modelStats.meshCount} / ${modelStats.vertexCount.toLocaleString()}` : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between text-ink-secondary pt-1 border-t border-hairline">
            <span className="font-sans text-xs">Dimensiones:</span>
            <span className="text-ink-primary tabular-nums truncate max-w-[140px]" title={dimText}>
              {dimText}
            </span>
          </div>
        </div>

        {/* PBR Physical Values */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
            Parámetros Físicos
          </span>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
            <div className="p-2 bg-surface-low rounded-xs border border-hairline flex flex-col">
              <span className="text-ink-tertiary text-[10px]">Rugosidad</span>
              <span className="text-ink-primary font-semibold tabular-nums">{roughnessFactor.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-surface-low rounded-xs border border-hairline flex flex-col">
              <span className="text-ink-tertiary text-[10px]">Metalicidad</span>
              <span className="text-ink-primary font-semibold tabular-nums">{metalnessFactor.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-surface-low rounded-xs border border-hairline flex flex-col">
              <span className="text-ink-tertiary text-[10px]">Normal Scale</span>
              <span className="text-ink-primary font-semibold tabular-nums">{normalScale.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-surface-low rounded-xs border border-hairline flex flex-col">
              <span className="text-ink-tertiary text-[10px]">Oclusión (AO)</span>
              <span className="text-ink-primary font-semibold tabular-nums">{aoIntensity.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Texture Slots State */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
            Ranuras Asignadas
          </span>
          <div className="space-y-1">
            {ALL_SLOT_NAMES.slice(0, 7).map((slot) => {
              const isEnabled = slotEnabled[slot] ?? true;
              return (
                <div
                  key={slot}
                  className="flex items-center justify-between px-2 py-1 bg-surface-low/60 rounded-xs border border-hairline text-[11px]"
                >
                  <span className="capitalize text-ink-secondary">{slot}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs ${
                      isEnabled ? 'bg-emerald-50 text-emerald-800 border-emerald-300/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30' : 'text-ink-tertiary'
                    }`}
                  >
                    {isEnabled ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
