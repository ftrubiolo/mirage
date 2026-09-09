import React from 'react';
import { AlertCircle } from 'lucide-react';
import { MapVariantItem } from '../../store/workbenchStore';

export interface MapSlotDeleteCandidate {
  variant: MapVariantItem;
  affectedVariants: any[];
}

export interface MapSlotDeleteModalProps {
  deleteCandidate: MapSlotDeleteCandidate | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const MapSlotDeleteModal: React.FC<MapSlotDeleteModalProps> = ({
  deleteCandidate,
  onClose,
  onConfirm
}) => {
  if (!deleteCandidate) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full max-w-md p-5 space-y-4 cursor-default animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-xs shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-primary font-bold text-sm uppercase text-ink-primary">
              ¿Eliminar mapa en uso por otros perfiles?
            </h3>
            <p className="text-xs text-ink-secondary font-body leading-relaxed">
              El mapa{' '}
              <span className="font-mono text-ink-primary font-semibold">
                {deleteCandidate.variant.name || deleteCandidate.variant.fileName}
              </span>{' '}
              está siendo utilizado en los siguientes perfiles de esta pieza:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {deleteCandidate.affectedVariants.map((aff) => (
                <span
                  key={aff.id}
                  className="px-2 py-0.5 bg-surface-low border border-hairline rounded-xs text-[11px] font-medium text-ink-primary"
                >
                  {aff.name}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-ink-tertiary pt-1">
              Si confirmas la eliminación, este mapa se desvinculará de la pieza.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-hairline rounded-xs text-xs uppercase tracking-wider text-ink-secondary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xs text-xs font-primary font-semibold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
          >
            Eliminar de Todos Modos
          </button>
        </div>
      </div>
    </div>
  );
};
