import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

const sizeClasses: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl'
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  size = 'md',
  children,
  footer,
  className = '',
  closeOnBackdrop = true
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={closeOnBackdrop ? onClose : undefined}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full ${sizeClasses[size]} overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 cursor-default select-text ${className}`}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-hairline bg-surface-low flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            {icon && <span className="text-action shrink-0">{icon}</span>}
            <h3 className="font-primary font-bold text-sm tracking-wide uppercase text-ink-primary">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xs text-ink-tertiary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
            title="Cerrar modal (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto max-h-[75vh] space-y-4">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-hairline bg-surface-low flex items-center justify-end gap-2 shrink-0 select-none">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
