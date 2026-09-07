import React from 'react';
import {
  Sliders,
  CheckCircle2,
  Clock,
  XCircle,
  Undo2,
  Check,
  X,
  Layers,
  Wrench
} from 'lucide-react';
import { ProposedAction } from '../../types/agent';
import { useAgentStore } from '../../store/agentStore';
import { commandManager } from '../../agent/commandManager';

interface ActionCardProps {
  action: ProposedAction;
}

export const ActionCard: React.FC<ActionCardProps> = ({ action }) => {
  const { applyProposedAction, rejectProposedAction } = useAgentStore();

  const handleUndo = async () => {
    await commandManager.undo();
  };

  return (
    <div className="my-2 p-3 bg-surface-lowest border border-hairline rounded-lg shadow-xs space-y-2.5 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-action" />
          <span className="font-primary font-semibold text-xs tracking-wide text-ink-primary">
            {action.toolName.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Status Badge */}
        {action.status === 'applied' && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Aplicado</span>
          </span>
        )}

        {action.status === 'pending' && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>Pendiente</span>
          </span>
        )}

        {action.status === 'rejected' && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-medium border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>Descartado</span>
          </span>
        )}
      </div>

      <p className="text-xs text-ink-secondary leading-snug">{action.summary}</p>

      {/* Diffs List */}
      {action.diff && action.diff.length > 0 && (
        <div className="bg-surface-low border border-hairline rounded-md p-2 space-y-1 font-mono text-[11px]">
          {action.diff.map((d, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-ink-tertiary">{d.property}:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-rose-400/80 line-through">{String(d.before ?? '0')}</span>
                <span className="text-ink-tertiary">→</span>
                <span className="text-emerald-400 font-semibold">{String(d.after)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {action.status === 'pending' && (
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={() => rejectProposedAction(action.id)}
            className="px-2.5 py-1 text-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-low rounded-md transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Descartar</span>
          </button>
          <button
            onClick={() => applyProposedAction(action.id)}
            className="px-3 py-1 bg-action hover:bg-action-hover text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            <span>Aplicar</span>
          </button>
        </div>
      )}

      {action.status === 'applied' && (
        <div className="flex items-center justify-between pt-1 text-[11px] text-ink-tertiary">
          <span>{action.appliedAt ? `Ejecutado a las ${action.appliedAt}` : 'Ejecutado'}</span>
          <button
            onClick={handleUndo}
            className="hover:text-action flex items-center gap-1 transition-colors"
            title="Deshacer cambio en el taller"
          >
            <Undo2 className="w-3 h-3" />
            <span>Deshacer (Ctrl+Z)</span>
          </button>
        </div>
      )}
    </div>
  );
};
