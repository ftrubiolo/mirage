import React from 'react';
import { Layers, X, AlertCircle } from 'lucide-react';
import { EntryVariant } from '../../types/library';

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
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full max-w-md p-5 space-y-4 cursor-default animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="flex items-center justify-between border-b border-hairline pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-action" />
            <h3 className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
              Añadir Perfil / Variante
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xs text-ink-tertiary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
              Nombre de la Variante
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              placeholder="Ej: Nogal Oscuro & Cuero Negro"
              className="w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
              Duplicar configuración inicial desde:
            </label>
            <select
              value={cloneFromVariantId || ''}
              onChange={(e) => setCloneFromVariantId(e.target.value || null)}
              className="w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs"
            >
              <option value="">En blanco (Sin mapas)</option>
              {rawVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-hairline rounded-xs text-xs uppercase tracking-wider text-ink-secondary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!newVariantName.trim()}
              className="px-4 py-1.5 bg-action hover:bg-action-hover text-white rounded-xs text-xs font-primary font-semibold uppercase tracking-wider shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Crear Perfil
            </button>
          </div>
        </form>
      </div>
    </div>
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
  if (!candidate) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full max-w-md p-5 space-y-4 cursor-default animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="flex items-center justify-between border-b border-hairline pb-2.5">
          <h3 className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
            Renombrar Perfil
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xs text-ink-tertiary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
              Nuevo Nombre
            </label>
            <input
              type="text"
              required
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-hairline rounded-xs text-xs uppercase tracking-wider text-ink-secondary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!renameValue.trim()}
              className="px-4 py-1.5 bg-action hover:bg-action-hover text-white rounded-xs text-xs font-primary font-semibold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
            >
              Guardar Nombre
            </button>
          </div>
        </form>
      </div>
    </div>
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
  if (!candidate) return null;

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
          <div className="p-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-700 rounded-xs">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-primary font-bold text-sm uppercase text-ink-primary">
              ¿Eliminar perfil "{candidate.name}"?
            </h3>
            <p className="text-xs text-ink-secondary font-body leading-relaxed">
              Esta acción eliminará la configuración de mapas y parámetros de este perfil.
              {candidate.isDefault && (
                <span className="block mt-1 text-action font-semibold">
                  Nota: Al ser el perfil por defecto, se promoverá automáticamente otro perfil como nuevo Default.
                </span>
              )}
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
            Eliminar Perfil
          </button>
        </div>
      </div>
    </div>
  );
};
