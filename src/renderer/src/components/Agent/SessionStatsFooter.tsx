import React from 'react';
import { useAgentStore } from '../../store/agentStore';
import { MIRAGE_INTERNAL_TOOLS } from '../../agent/toolRegistry';

export const SessionStatsFooter: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    activeModel,
    activeProviderId,
    providers,
    permissionMode,
    mcpTools,
    isStreaming
  } = useAgentStore();

  const session = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const provider = providers.find((p) => p.id === activeProviderId);

  // Turns: Count of user messages
  const turns = session ? session.messages.filter((m) => m.role === 'user').length : 0;

  // Steps: Count of tool calls + steps + thoughts
  const steps = session
    ? session.messages.reduce((acc, m) => {
        const toolsCount = m.toolCalls ? m.toolCalls.length : 0;
        const stepsCount = m.steps ? m.steps.length : 0;
        const thoughtCount = m.thought || m.content.includes('<think>') ? 1 : 0;
        return acc + Math.max(1, toolsCount + stepsCount + thoughtCount);
      }, 0)
    : 0;

  // Token metrics
  const totalTokens = session
    ? session.messages.reduce((acc, m) => acc + (m.usage?.totalTokens || 0), 0)
    : 0;
  const promptTokens = session
    ? session.messages.reduce((acc, m) => acc + (m.usage?.promptTokens || 0), 0)
    : 0;
  const completionTokens = session
    ? session.messages.reduce((acc, m) => acc + (m.usage?.completionTokens || 0), 0)
    : 0;

  const formatTok = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return `${n}`;
  };

  const modelDisplayName = activeModel || provider?.defaultModel || 'No Model';
  const totalTools = MIRAGE_INTERNAL_TOOLS.length + mcpTools.length;

  return (
    <div className="w-full py-1.5 px-4 flex items-center justify-center gap-3 text-[11px] font-mono text-ink-tertiary select-none overflow-x-auto whitespace-nowrap">
      {/* 1. Turns and Steps */}
      <span className="flex items-center gap-1.5 text-ink-secondary">
        <span className="font-semibold text-ink-primary">{turns}</span>
        <span>turns</span>
        <span className="text-ink-tertiary">·</span>
        <span className="font-semibold text-ink-primary">{steps}</span>
        <span>steps</span>
      </span>

      <span className="text-hairline-strong">|</span>

      {/* 2. Active Model */}
      <span className="truncate max-w-[200px]" title={modelDisplayName}>
        {modelDisplayName}
      </span>

      {/* 3. Token metrics */}
      {totalTokens > 0 && (
        <>
          <span className="text-hairline-strong">|</span>
          <span
            className="text-ink-secondary flex items-center gap-1"
            title={`Prompt: ${promptTokens.toLocaleString()} · Salida: ${completionTokens.toLocaleString()}`}
          >
            <span className="font-semibold text-ink-primary">{formatTok(totalTokens)}</span>
            <span>tok</span>
            <span className="text-[10px] text-ink-tertiary">
              (In {formatTok(promptTokens)} · Out {formatTok(completionTokens)})
            </span>
          </span>
        </>
      )}

      <span className="text-hairline-strong">|</span>

      {/* 4. Execution Mode */}
      <span className="flex items-center gap-1">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            permissionMode === 'auto-apply' ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        />
        <span>{permissionMode === 'auto-apply' ? 'Auto-apply' : 'HITL Confirm'}</span>
      </span>

      <span className="text-hairline-strong">|</span>

      {/* 5. Active Tools */}
      <span>
        {totalTools} tools active
      </span>

      {isStreaming && (
        <>
          <span className="text-hairline-strong">|</span>
          <span className="text-action animate-pulse font-medium">
            ● Streaming
          </span>
        </>
      )}
    </div>
  );
};
