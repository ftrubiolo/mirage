import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Undo2,
  Check,
  X,
  Wrench
} from 'lucide-react';
import { ProposedAction } from '../../types/agent';
import { useAgentStore } from '../../store/agentStore';
import { commandManager } from '../../utils/commandManager';
import { StatusBadge } from '../UI/StatusBadge';
import { Button } from '../UI/Button';

interface ActionCardProps {
  action: ProposedAction;
}

export const ActionCard: React.FC<ActionCardProps> = ({ action }) => {
  const { applyProposedAction, rejectProposedAction } = useAgentStore();

  const handleUndo = async () => {
    await commandManager.undo();
  };

  return (
    <div className="my-2 p-3 bg-surface-lowest border border-hairline rounded-xs shadow-xs space-y-2.5 max-w-md">
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
          <StatusBadge variant="active" size="sm">
            <CheckCircle2 className="w-3 h-3 mr-1 inline" />
            Applied
          </StatusBadge>
        )}

        {action.status === 'pending' && (
          <StatusBadge variant="pending" size="sm">
            <Clock className="w-3 h-3 mr-1 inline" />
            Pending
          </StatusBadge>
        )}

        {action.status === 'rejected' && (
          <StatusBadge variant="critical" size="sm">
            <XCircle className="w-3 h-3 mr-1 inline" />
            Rejected
          </StatusBadge>
        )}
      </div>

      <p className="text-xs text-ink-secondary leading-snug">{action.summary}</p>

      {/* Diffs List */}
      {action.diff && action.diff.length > 0 && (
        <div className="bg-surface-low border border-hairline rounded-xs p-2 space-y-1 font-mono text-[11px]">
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
          <Button
            variant="ghost"
            size="xs"
            onClick={() => rejectProposedAction(action.id)}
            icon={<X className="w-3 h-3" />}
          >
            Dismiss
          </Button>
          <Button
            variant="primary"
            size="xs"
            onClick={() => applyProposedAction(action.id)}
            icon={<Check className="w-3 h-3" />}
          >
            Apply
          </Button>
        </div>
      )}

      {action.status === 'applied' && (
        <div className="flex items-center justify-between pt-1 text-[11px] text-ink-tertiary">
          <span>{action.appliedAt ? `Executed at ${action.appliedAt}` : 'Executed'}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleUndo}
            icon={<Undo2 className="w-3 h-3" />}
            title="Undo workbench change"
          >
            Undo (Ctrl+Z)
          </Button>
        </div>
      )}
    </div>
  );
};
