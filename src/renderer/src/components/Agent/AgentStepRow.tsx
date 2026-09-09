import React, { useState } from 'react';
import {
  Atom,
  Terminal,
  Pencil,
  Cpu,
  ChevronRight,
  ChevronDown,
  Wrench,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AgentStepItem } from '../../types/agent';

interface AgentStepRowProps {
  step: AgentStepItem;
}

export const AgentStepRow: React.FC<AgentStepRowProps> = ({ step }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getIcon = () => {
    switch (step.type) {
      case 'think':
        return <Atom className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
      case 'tool':
        return <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'edit':
        return <Pencil className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'audit':
        return <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-ink-secondary shrink-0" />;
    }
  };

  const getLabel = () => {
    switch (step.type) {
      case 'think':
        return 'Think';
      case 'tool':
        return 'Tool';
      case 'edit':
        return 'Edit';
      case 'audit':
        return 'Audit';
      default:
        return 'Step';
    }
  };

  return (
    <div className="my-1 text-[11px] font-mono select-text">
      <div
        onClick={() => step.detail && setIsExpanded(!isExpanded)}
        className={`flex items-start gap-1.5 py-0.5 text-ink-secondary hover:text-ink-primary transition-colors ${
          step.detail ? 'cursor-pointer group' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {getIcon()}
          <span className="font-semibold text-ink-secondary group-hover:text-ink-primary">
            {getLabel()}
          </span>
          <span className="text-ink-tertiary">·</span>
        </div>

        <span className="text-ink-secondary group-hover:text-ink-primary flex-1 truncate">
          {step.title}
        </span>

        {step.duration && (
          <span className="text-[10px] text-ink-tertiary shrink-0 ml-1">
            {step.duration}
          </span>
        )}

        {step.detail && (
          <span className="text-ink-tertiary group-hover:text-ink-secondary shrink-0 ml-0.5">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
      </div>

      {/* Expandable detail box */}
      {isExpanded && step.detail && (
        <div className="mt-1 ml-5 p-2 rounded-xs bg-surface-low border border-hairline text-ink-tertiary text-[10px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
          {step.detail}
        </div>
      )}
    </div>
  );
};
