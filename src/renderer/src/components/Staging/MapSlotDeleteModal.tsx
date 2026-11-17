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
      title="Delete map used by other variants?"
      variant="warning"
      confirmText="Delete Anyway"
      message={
        deleteCandidate ? (
          <div className="space-y-2">
            <p>
              The map{' '}
              <span className="font-mono text-ink-primary font-semibold">
                {deleteCandidate.variant.name || deleteCandidate.variant.fileName}
              </span>{' '}
              is currently used by the following variants of this model:
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
              If you confirm deletion, this map will be unlinked from the model.
            </p>
          </div>
        ) : null
      }
    />
  );
};
