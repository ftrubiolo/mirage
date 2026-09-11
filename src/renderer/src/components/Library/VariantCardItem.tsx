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
import { Card, Button, IconButton, Badge } from '../UI';

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
  const mapsList = Object.entries(variant.maps || {}).filter(([_, m]) =>
    Boolean(m?.fileName || m?.filePath)
  );
  const s = variant.settings || {};

  return (
    <Card
      key={variant.id}
      hoverable
      className="p-4 flex flex-col justify-between space-y-3 cursor-default"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-2.5">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-primary font-bold text-sm text-ink-primary truncate">
              {variant.name}
            </h3>
            {variant.isDefault && (
              <Badge
                variant="outline"
                size="xs"
                className="bg-amber-500/10 text-amber-600 border-amber-500/20"
              >
                ★ Default
              </Badge>
            )}
          </div>
          <span className="text-[10px] font-mono text-ink-tertiary block">
            ID: {variant.id}
          </span>
        </div>

        {/* Quick Menu Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <IconButton
            icon={<Edit2 className="w-3.5 h-3.5" />}
            size="xs"
            variant="ghost"
            title="Renombrar perfil"
            onClick={() => onStartRename(variant)}
          />

          <IconButton
            icon={<Copy className="w-3.5 h-3.5" />}
            size="xs"
            variant="ghost"
            title="Duplicar este perfil"
            onClick={() => onClone(variant)}
          />

          {!variant.isDefault && (
            <IconButton
              icon={<Star className="w-3.5 h-3.5" />}
              size="xs"
              variant="ghost"
              title="Establecer como variante por defecto"
              onClick={() => onSetDefault(variant.id)}
              className="hover:text-amber-600 hover:bg-amber-500/10"
            />
          )}

          {allVariantsCount > 1 && (
            <IconButton
              icon={<Trash2 className="w-3.5 h-3.5" />}
              size="xs"
              variant="destructive"
              title="Eliminar perfil"
              onClick={() => onStartDelete(variant)}
            />
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
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onOpenIn3D(variant.id)}
        iconRight={<ArrowUpRight className="w-3.5 h-3.5" />}
        className="w-full mt-2 hover:bg-action hover:text-white"
      >
        Abrir en Taller 3D ({variant.name})
      </Button>
    </Card>
  );
};
