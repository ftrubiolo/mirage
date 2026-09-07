import React, { useMemo, useState } from 'react';
import { ChatMessage, AgentStepItem } from '../../types/agent';
import { AgentStepRow } from './AgentStepRow';
import { ActionCard } from './ActionCard';
import {
  Copy,
  Check,
  Atom,
  ChevronDown,
  ChevronRight,
  Database,
  Clock,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface AgentMessageViewProps {
  message: ChatMessage;
}

export const AgentMessageView: React.FC<AgentMessageViewProps> = ({ message }) => {
  const [isThoughtOpen, setIsThoughtOpen] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Extract <think> blocks if present in content or message.thought
  const { thoughtContent, isThinkingStreaming, mainProse } = useMemo(() => {
    let raw = message.content || '';
    let thought = message.thought || '';
    let isThinking = Boolean(message.isStreaming && !raw && thought);

    // Check for explicit <think>...</think> tags inside content
    const thinkMatch = raw.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      thought = (thought ? `${thought}\n` : '') + thinkMatch[1].trim();
      raw = raw.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    } else if (raw.includes('<think>')) {
      const parts = raw.split('<think>');
      thought = (thought ? `${thought}\n` : '') + (parts[1]?.trim() || '');
      raw = parts[0]?.trim() || '';
      isThinking = true;
    }

    return {
      thoughtContent: thought.trim(),
      isThinkingStreaming: isThinking,
      mainProse: raw
    };
  }, [message.content, message.thought, message.isStreaming]);

  // Combine non-think steps (tools, edits, etc.)
  const stepsToRender: AgentStepItem[] = useMemo(() => {
    const list: AgentStepItem[] = [];

    // Add explicit steps passed in message
    if (message.steps && message.steps.length > 0) {
      list.push(...message.steps.filter((s) => s.type !== 'think'));
    }

    // Add tool calls as discrete step rows if not already represented
    if (message.toolCalls && message.toolCalls.length > 0) {
      for (const tc of message.toolCalls) {
        if (!list.some((s) => s.id === `step-tool-${tc.id}`)) {
          list.push({
            id: `step-tool-${tc.id}`,
            type: 'tool',
            title: `${tc.toolName.replace(/_/g, ' ')} — ${tc.summary}`,
            detail: tc.rawArgs ? JSON.stringify(tc.rawArgs, null, 2) : undefined,
            status: tc.status === 'applied' ? 'done' : tc.status === 'rejected' ? 'error' : 'running',
            duration: tc.appliedAt
          });
        }
      }
    }

    return list;
  }, [message.steps, message.toolCalls]);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    } catch {
      // ignore
    }
  };

  const formatTok = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return `${n}`;
  };

  return (
    <div className="w-full my-4 text-xs leading-relaxed text-ink-primary font-sans select-text space-y-2.5">
      {/* 1. Thought block (dsh style: "Thought for a while v") */}
      {(thoughtContent || isThinkingStreaming) && (
        <div className="border-b border-hairline/40 pb-2 mb-2 space-y-1.5">
          <button
            onClick={() => setIsThoughtOpen(!isThoughtOpen)}
            className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary font-medium transition-colors cursor-pointer select-none group"
          >
            <Atom className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform" />
            <span>
              {message.duration ? `Thought for ${message.duration}` : 'Thought for a while'}
            </span>
            {isThoughtOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-ink-tertiary" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-ink-tertiary" />
            )}
            {isThinkingStreaming && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping ml-1" />
            )}
          </button>

          {(isThoughtOpen || isThinkingStreaming) && (
            <div className="pl-4 pt-1 space-y-1">
              <div className="text-[11px] font-mono text-ink-secondary whitespace-pre-wrap leading-relaxed bg-surface-low/50 p-2.5 rounded border border-hairline/60">
                {thoughtContent}
                {isThinkingStreaming && (
                  <span className="inline-block w-1.5 h-3 bg-indigo-400 ml-1 animate-pulse" />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Discrete action/tool rows (dsh style) */}
      {stepsToRender.length > 0 && (
        <div className="space-y-0.5 border-b border-hairline/40 pb-2 mb-2">
          {stepsToRender.map((step) => (
            <AgentStepRow key={step.id} step={step} />
          ))}
        </div>
      )}

      {/* 3. Full-width unboxed markdown prose */}
      {mainProse && (
        <div className="w-full text-ink-primary space-y-2">
          <FormattedProse content={mainProse} />
        </div>
      )}

      {/* 4. Streaming indicator if still working without prose or tool */}
      {message.isStreaming && !thoughtContent && stepsToRender.length === 0 && !mainProse && (
        <div className="flex items-center gap-1.5 text-action text-xs font-mono py-1 animate-pulse">
          <span className="w-1.5 h-3 bg-action rounded-xs" />
          <span className="text-[11px] text-ink-tertiary">Mirage IA está procesando...</span>
        </div>
      )}

      {/* 5. Action Cards for interactive confirmation / undo */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="pt-2 space-y-2">
          {message.toolCalls.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      )}

      {/* 6. Message Footer Actions & Metrics (dsh style) */}
      {!message.isStreaming && (
        <div className="flex items-center gap-2.5 pt-1.5 text-[11px] font-mono text-ink-tertiary select-none">
          <button
            onClick={handleCopyMessage}
            className="hover:text-ink-primary p-1 rounded hover:bg-surface-low transition-colors cursor-pointer"
            title="Copiar respuesta"
          >
            {copiedMsg ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            className="hover:text-ink-primary p-1 rounded hover:bg-surface-low transition-colors cursor-pointer"
            title="Útil"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            className="hover:text-ink-primary p-1 rounded hover:bg-surface-low transition-colors cursor-pointer"
            title="No útil"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>

          {/* Token Usage Badge */}
          {message.usage && message.usage.totalTokens > 0 && (
            <span className="flex items-center gap-1 text-ink-secondary ml-1.5">
              <Database className="w-3 h-3 text-ink-tertiary" />
              <span>Usage {formatTok(message.usage.totalTokens)} tok</span>
            </span>
          )}

          {/* Ran for Duration Badge */}
          {message.duration && (
            <span className="flex items-center gap-1 text-ink-tertiary">
              <Clock className="w-3 h-3" />
              <span>Ran for {message.duration}</span>
            </span>
          )}

          {/* Timestamp */}
          <span className="text-[10px] text-ink-tertiary ml-auto">
            {message.timestamp}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Lightweight Markdown Formatter (Headings, Code Blocks, Inline Code, Lists, Bold)
// ============================================================================
interface FormattedProseProps {
  content: string;
}

const FormattedProse: React.FC<FormattedProseProps> = ({ content }) => {
  const blocks = useMemo(() => {
    return content.split(/(```[\s\S]*?```)/g);
  }, [content]);

  return (
    <div className="space-y-2.5 leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const lines = block.slice(3, -3).trim().split('\n');
          const lang = lines[0]?.match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
          const code = lang ? lines.slice(1).join('\n') : lines.join('\n');
          return <CodeBlock key={idx} code={code} language={lang} />;
        }

        const paragraphs = block.split(/\n\n+/);
        return (
          <React.Fragment key={idx}>
            {paragraphs.map((para, pIdx) => {
              const trimmed = para.trim();
              if (!trimmed) return null;

              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={pIdx} className="font-semibold text-ink-primary text-xs pt-1">
                    <InlineFormatted text={trimmed.replace(/^###\s+/, '')} />
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3
                    key={pIdx}
                    className="font-semibold text-ink-primary text-sm pt-1.5 border-b border-hairline/30 pb-1"
                  >
                    <InlineFormatted text={trimmed.replace(/^##\s+/, '')} />
                  </h3>
                );
              }
              if (trimmed.startsWith('# ')) {
                return (
                  <h2 key={pIdx} className="font-bold text-ink-primary text-base pt-2">
                    <InlineFormatted text={trimmed.replace(/^#\s+/, '')} />
                  </h2>
                );
              }

              const lines = trimmed.split('\n');
              const isList = lines.every((l) => /^\s*([•\-\*]|\d+\.)\s+/.test(l));

              if (isList) {
                return (
                  <ul key={pIdx} className="space-y-1 my-1 pl-2">
                    {lines.map((line, lIdx) => {
                      const match = line.match(/^\s*([•\-\*]|\d+\.)\s+(.*)$/);
                      if (!match) return <li key={lIdx}>{line}</li>;
                      const bullet = match[1];
                      const itemText = match[2];
                      return (
                        <li key={lIdx} className="flex items-start gap-2">
                          <span className="text-ink-tertiary shrink-0 font-mono text-[11px] pt-0.5 select-none">
                            {bullet.includes('.') ? bullet : '•'}
                          </span>
                          <span className="flex-1">
                            <InlineFormatted text={itemText} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              return (
                <p key={pIdx} className="text-xs text-ink-primary leading-relaxed">
                  <InlineFormatted text={trimmed} />
                </p>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const InlineFormatted: React.FC<{ text: string }> = ({ text }) => {
  const parts = useMemo(() => {
    return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  }, [text]);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 mx-0.5 rounded bg-surface-low border border-hairline font-mono text-[11px] text-ink-primary"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <strong key={i} className="font-semibold text-ink-primary">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="my-2 rounded-lg bg-surface-lowest border border-hairline overflow-hidden font-mono text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-low/80 border-b border-hairline text-ink-tertiary">
        <span className="text-[10px] uppercase tracking-wider font-semibold">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-ink-primary transition-colors text-[10px] cursor-pointer"
          title="Copiar código"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-ink-primary leading-relaxed whitespace-pre font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
};
