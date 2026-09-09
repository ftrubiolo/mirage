import React from 'react';
import { ShieldAlert, Check, X, Wrench } from 'lucide-react';
import { ProposedAction } from '../../types/agent';

export interface ActionApprovalModalProps {
  isOpen: boolean;
  action: ProposedAction | null;
  onApprove: (actionId: string) => void;
  onReject: (actionId: string) => void;
  onClose?: () => void;
}

export const ActionApprovalModal: React.FC<ActionApprovalModalProps> = ({
  isOpen,
  action,
  onApprove,
  onReject,
  onClose
}) => {
  if (!isOpen || !action) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-lowest border border-hairline-strong rounded-xs overflow-hidden max-w-md w-full font-body select-none">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-hairline flex items-center justify-between bg-surface-low">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-action" />
            <span className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
              Aprobación Requerida
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-ink-tertiary hover:text-ink-primary p-1 rounded-xs transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-ink-primary font-semibold">
            <Wrench className="w-3.5 h-3.5 text-action shrink-0" />
            <span>{action.toolName.replace(/_/g, ' ')}</span>
          </div>

          <p className="text-ink-secondary leading-relaxed">{action.summary}</p>

          {/* Diffs */}
          {action.diff && action.diff.length > 0 && (
            <div className="bg-surface-low border border-hairline rounded-xs p-3 space-y-1.5 font-mono text-[11px]">
              <span className="text-[10px] uppercase font-bold text-ink-tertiary block mb-1">
                Modificaciones Propuestas:
              </span>
              {action.diff.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-ink-secondary">{d.property}:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-600 dark:text-rose-400 line-through">
                      {String(d.before ?? '0')}
                    </span>
                    <span className="text-ink-tertiary">→</span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                      {String(d.after)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-hairline bg-surface-low/50 flex items-center justify-end gap-2">
          <button
            onClick={() => onReject(action.id)}
            className="px-3 py-1.5 border border-hairline hover:bg-surface-high text-ink-primary text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Rechazar</span>
          </button>
          <button
            onClick={() => onApprove(action.id)}
            className="px-4 py-1.5 bg-action hover:bg-action-hover text-white text-xs font-semibold uppercase tracking-wider rounded-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Aprobar y Aplicar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
