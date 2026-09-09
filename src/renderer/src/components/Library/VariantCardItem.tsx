import React from 'react';
import {
  ArrowUpRight,
  Edit2,
  Copy,
  Star,
  Trash2,
  Palette
} from 'lucide-react';
import { EntryVariant } from '../../types/library';

export interface VariantCardItemProps {
  variant: EntryVariant;
  allVariantsCount: number;
  onOpenIn3D: (variantId: string) => void;
  onStartRename: (variant: EntryVariant) => void;
  onClone: (variant: EntryVariant) => void;
  onSetDefault: (variantId: string) => void;
  onStartDelete: (variant: EntryVariant) => void;
}

export const VariantCardItem: React.FC<VariantCardItemProps> = ({
  variant,
  allVariantsCount,
  onOpenIn3D,
  onStartRename,
  onClone,
  onSetDefault,
  onStartDelete
}) => {
  const mapsList = Object.entries(variant.maps || {}).filter(([_, m]) => Boolean(m?.fileName || m?.filePath));
  const s = variant.settings || {};

  return (
    <div
      key={variant.id}
      className="bg-surface-lowest border border-hairline hover:border-hairline-strong rounded-xs shadow-xs p-4 flex flex-col justify-between space-y-3 transition-all"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-2.5">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-primary font-bold text-sm text-ink-primary truncate">
              {variant.name}
            </h3>
            {variant.isDefault && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xs font-bold shrink-0">
                ★ Default
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-ink-tertiary block">
            ID: {variant.id}
          </span>
        </div>

        {/* Quick Menu Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onStartRename(variant)}
            title="Renombrar perfil"
            className="p-1 hover:bg-surface-container text-ink-tertiary hover:text-ink-primary rounded-xs border border-transparent hover:border-hairline transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onClone(variant)}
            title="Duplicar este perfil"
            className="p-1 hover:bg-surface-container text-ink-tertiary hover:text-ink-primary rounded-xs border border-transparent hover:border-hairline transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {!variant.isDefault && (
            <button
              onClick={() => onSetDefault(variant.id)}
              title="Establecer como variante por defecto"
              className="p-1 hover:bg-amber-500/10 text-ink-tertiary hover:text-amber-600 rounded-xs border border-transparent hover:border-amber-500/30 transition-colors cursor-pointer"
            >
              <Star className="w-3.5 h-3.5" />
            </button>
          )}

          {allVariantsCount > 1 && (
            <button
              onClick={() => onStartDelete(variant)}
              title="Eliminar perfil"
              className="p-1 hover:bg-rose-500/10 text-ink-tertiary hover:text-rose-600 rounded-xs border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Card Body: Map assignments & Material overview */}
      <div className="space-y-2.5 text-xs">
        {/* Assigned Maps */}
        <div>
          <span className="text-[10px] font-primary font-semibold uppercase tracking-wider text-ink-tertiary block mb-1">
            Mapas de Textura Asignados ({mapsList.length})
          </span>
          {mapsList.length === 0 ? (
            <div className="p-2 bg-surface-low rounded-xs border border-dashed border-hairline text-ink-tertiary text-[11px]">
              Sin mapas PBR asignados a este perfil
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {mapsList.map(([slot, mapItem]) => (
                <div
                  key={slot}
                  className="px-2 py-1 bg-surface-low border border-hairline rounded-xs flex items-center gap-1.5 text-[11px] font-mono text-ink-secondary"
                >
                  <Palette className="w-3 h-3 text-action shrink-0" />
                  <span className="font-semibold text-ink-primary capitalize">{slot}:</span>
                  <span className="truncate max-w-[120px]">{mapItem.fileName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Material Factors Summary */}
        <div className="p-2.5 bg-surface-low/60 rounded-xs border border-hairline grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums text-ink-secondary">
          <div>
            <span className="text-[9px] text-ink-tertiary uppercase block">Rugosidad</span>
            <span className="font-semibold text-ink-primary">{s.roughnessFactor ?? 1.0}</span>
          </div>
          <div>
            <span className="text-[9px] text-ink-tertiary uppercase block">Metálico</span>
            <span className="font-semibold text-ink-primary">{s.metalnessFactor ?? 1.0}</span>
          </div>
          <div>
            <span className="text-[9px] text-ink-tertiary uppercase block">Prof. Normal</span>
            <span className="font-semibold text-ink-primary">{s.normalScale ?? 1.0}x</span>
          </div>
        </div>
      </div>

      {/* Card Action Button */}
      <button
        onClick={() => onOpenIn3D(variant.id)}
        className="w-full mt-2 py-1.5 bg-surface-container hover:bg-action hover:text-white text-ink-primary border border-hairline text-xs font-primary font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
        <span>Abrir en Taller 3D ({variant.name})</span>
      </button>
    </div>
  );
};
