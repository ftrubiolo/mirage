import React from 'react';
import { Layers, Edit2 } from 'lucide-react';
import { EntryVariant } from '../../types/library';
import { Modal, ConfirmModal, FormField, TextInput, Button } from '../UI';

export interface CreateVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newVariantName: string;
  setNewVariantName: (name: string) => void;
  cloneFromVariantId: string | null;
  setCloneFromVariantId: (id: string | null) => void;
  rawVariants: EntryVariant[];
}

export const CreateVariantModal: React.FC<CreateVariantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  newVariantName,
  setNewVariantName,
  cloneFromVariantId,
  setCloneFromVariantId,
  rawVariants
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Finish Profile / Variant"
      icon={<Layers className="w-4 h-4 text-action" />}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={(e) => {
              e.preventDefault();
              onSubmit(e);
            }}
            disabled={!newVariantName.trim()}
          >
            Create Variant
          </Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Variant Name" required>
          <TextInput
            required
            autoFocus
            value={newVariantName}
            onChange={(e) => setNewVariantName(e.target.value)}
            placeholder="e.g., Brushed Steel & Matte Black"
          />
        </FormField>

        <FormField label="Clone initial configuration from">
          <select
            value={cloneFromVariantId || ''}
            onChange={(e) => setCloneFromVariantId(e.target.value || null)}
            className="w-full px-2.5 py-1.5 bg-surface-lowest border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs shadow-xs"
          >
            <option value="">Blank (No texture maps)</option>
            {rawVariants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </FormField>
      </form>
    </Modal>
  );
};

export interface RenameVariantModalProps {
  candidate: EntryVariant | null;
  renameValue: string;
  setRenameValue: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RenameVariantModal: React.FC<RenameVariantModalProps> = ({
  candidate,
  renameValue,
  setRenameValue,
  onClose,
  onSubmit
}) => {
  return (
    <Modal
      isOpen={Boolean(candidate)}
      onClose={onClose}
      title="Rename Variant"
      icon={<Edit2 className="w-4 h-4 text-action" />}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={(e) => {
              e.preventDefault();
              onSubmit(e);
            }}
            disabled={!renameValue.trim()}
          >
            Save Name
          </Button>
        </div>
      }
    >
      <form onSubmit={onSubmit}>
        <FormField label="New Name" required>
          <TextInput
            required
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
};

export interface DeleteVariantModalProps {
  candidate: EntryVariant | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteVariantModal: React.FC<DeleteVariantModalProps> = ({
  candidate,
  onClose,
  onConfirm
}) => {
  return (
    <ConfirmModal
      isOpen={Boolean(candidate)}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete variant "${candidate?.name}"?`}
      confirmText="Delete Variant"
      variant="destructive"
      message={
        candidate ? (
          <div>
            <p>This action will remove the texture map and parameter configuration for this variant.</p>
            {candidate.isDefault && (
              <span className="block mt-1 text-action font-semibold">
                Note: Since this is the default variant, another variant will automatically be promoted as the new Default.
              </span>
            )}
          </div>
        ) : null
      }
    />
  );
};
