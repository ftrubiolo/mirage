import React from 'react';
import { Database, Clock, Cpu, Layers } from 'lucide-react';

export interface ExecutionTelemetryCardProps {
  turns: number;
  steps: number;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  modelId?: string;
  duration?: string;
  isStreaming?: boolean;
}

export const ExecutionTelemetryCard: React.FC<ExecutionTelemetryCardProps> = ({
  turns,
  steps,
  totalTokens = 0,
  promptTokens = 0,
  completionTokens = 0,
  modelId,
  duration,
  isStreaming = false
}) => {
  const formatTok = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return `${n}`;
  };

  return (
    <div className="p-3 bg-surface-lowest border border-hairline rounded-xs space-y-2 font-mono text-xs select-none shadow-xs">
      <div className="flex items-center justify-between border-b border-hairline pb-1.5">
        <span className="font-primary font-bold text-[10px] uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-action" />
          Telemetría de Ejecución
        </span>
        {isStreaming && (
          <span className="text-action text-[10px] font-medium animate-pulse">
            ● Streaming
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="p-2 bg-surface-low rounded-xs border border-hairline flex flex-col">
          <span className="text-ink-tertiary text-[10px]">Turnos / Pasos</span>
          <span className="text-ink-primary font-semibold tabular-nums">
            {turns} turns · {steps} steps
          </span>
        </div>

        <div className="p-2 bg-surface-low rounded-xs border border-hairline flex flex-col">
          <span className="text-ink-tertiary text-[10px]">Tokens Totales</span>
          <span className="text-ink-primary font-semibold tabular-nums">
            {formatTok(totalTokens)} tok
          </span>
        </div>
      </div>

      {(promptTokens > 0 || completionTokens > 0) && (
        <div className="flex items-center justify-between text-[10px] text-ink-tertiary px-1">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            <span>Prompt: {formatTok(promptTokens)}</span>
          </span>
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            <span>Salida: {formatTok(completionTokens)}</span>
          </span>
        </div>
      )}

      {(modelId || duration) && (
        <div className="flex items-center justify-between text-[10px] text-ink-tertiary pt-1 border-t border-hairline/40">
          {modelId && <span className="truncate max-w-[160px]">{modelId}</span>}
          {duration && (
            <span className="flex items-center gap-1 shrink-0 ml-auto">
              <Clock className="w-3 h-3" />
              <span>{duration}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
