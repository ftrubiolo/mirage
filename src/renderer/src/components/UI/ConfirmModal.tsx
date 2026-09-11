import React from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export type ConfirmVariant = 'destructive' | 'warning' | 'primary';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancelar',
  variant = 'destructive',
  isLoading = false
}) => {
  const icon =
    variant === 'destructive' ? (
      <div className="p-2 rounded-xs bg-rose-50 text-rose-600 border border-rose-200/50 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40">
        <Trash2 className="w-5 h-5" />
      </div>
    ) : variant === 'warning' ? (
      <div className="p-2 rounded-xs bg-amber-50 text-amber-600 border border-amber-200/50 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40">
        <AlertTriangle className="w-5 h-5" />
      </div>
    ) : (
      <div className="p-2 rounded-xs bg-action-subtle text-action border border-action/20">
        <Info className="w-5 h-5" />
      </div>
    );

  const defaultConfirmText =
    variant === 'destructive' ? 'Eliminar' : variant === 'warning' ? 'Continuar' : 'Confirmar';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText || defaultConfirmText}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0">{icon}</div>
        <div className="text-xs text-ink-secondary leading-relaxed space-y-2">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
      </div>
    </Modal>
  );
};
