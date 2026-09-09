import React from 'react';
import { Clock, CheckCircle2, XCircle, Undo2, Wrench } from 'lucide-react';
import { ProposedAction } from '../../types/agent';
import { commandManager } from '../../agent/commandManager';

export interface AuditLogViewerProps {
  actions: ProposedAction[];
  onUndoAction?: (actionId: string) => void;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ actions }) => {
  const handleUndo = async () => {
    await commandManager.undo();
  };

  return (
    <div className="space-y-2 font-mono text-xs select-none">
      <div className="flex items-center justify-between pb-1 border-b border-hairline">
        <span className="font-primary font-bold text-[10px] uppercase tracking-wider text-ink-secondary">
          Registro de Auditoría de Acciones
        </span>
        <span className="text-[10px] text-ink-tertiary tabular-nums">
          {actions.length} entradas
        </span>
      </div>

      {actions.length === 0 ? (
        <div className="p-4 text-center text-ink-tertiary text-xs">
          No hay acciones registradas en la sesión activa.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {actions.map((act) => (
            <div
              key={act.id}
              className="p-2.5 bg-surface-lowest border border-hairline rounded-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-ink-primary text-[11px]">
                  <Wrench className="w-3 h-3 text-action" />
                  <span>{act.toolName.replace(/_/g, ' ')}</span>
                </div>

                {act.status === 'applied' ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-emerald-50 text-emerald-800 border-emerald-300/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30 text-[10px] font-medium border">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Aplicado</span>
                  </span>
                ) : act.status === 'rejected' ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-rose-50 text-rose-800 border-rose-300/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30 text-[10px] font-medium border">
                    <XCircle className="w-2.5 h-2.5" />
                    <span>Rechazado</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-amber-50 text-amber-800 border-amber-300/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/30 text-[10px] font-medium border">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Pendiente</span>
                  </span>
                )}
              </div>

              <div className="text-[11px] text-ink-secondary leading-snug">{act.summary}</div>

              {act.appliedAt && (
                <div className="flex items-center justify-between pt-1 text-[10px] text-ink-tertiary border-t border-hairline/40">
                  <span className="tabular-nums">{act.appliedAt}</span>
                  {act.status === 'applied' && (
                    <button
                      onClick={handleUndo}
                      className="hover:text-action flex items-center gap-1 transition-colors cursor-pointer"
                      title="Deshacer esta acción"
                    >
                      <Undo2 className="w-2.5 h-2.5" />
                      <span>Deshacer</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
