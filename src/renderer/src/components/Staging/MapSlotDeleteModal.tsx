import React from 'react';
import { MapVariantItem } from '../../store/variantStore';
import { ConfirmModal } from '../UI';

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
  return (
    <ConfirmModal
      isOpen={Boolean(deleteCandidate)}
      onClose={onClose}
      onConfirm={onConfirm}
      title="¿Eliminar mapa en uso por otros perfiles?"
      variant="warning"
      confirmText="Eliminar de Todos Modos"
      message={
        deleteCandidate ? (
          <div className="space-y-2">
            <p>
              El mapa{' '}
              <span className="font-mono text-ink-primary font-semibold">
                {deleteCandidate.variant.name || deleteCandidate.variant.fileName}
              </span>{' '}
              está siendo utilizado en los siguientes perfiles de esta pieza:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {deleteCandidate.affectedVariants.map((aff) => (
                <span
                  key={aff.id}
                  className="px-2 py-0.5 bg-surface-low border border-hairline rounded-xs text-[11px] font-medium text-ink-primary"
                >
                  {aff.name}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-ink-tertiary">
              Si confirmas la eliminación, este mapa se desvinculará de la pieza.
            </p>
          </div>
        ) : null
      }
    />
  );
};
