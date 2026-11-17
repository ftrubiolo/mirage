import React from 'react';
import { MessageSquare, Plus, Trash2, RefreshCw, Wrench } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import { MIRAGE_INTERNAL_TOOLS } from '../../agent/toolRegistry';
import { ResizeHandle, IconButton, Button } from '../UI';

export interface StudioRightSidebarProps {
  onInsertPrompt?: (prompt: string) => void;
  width?: number;
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
}

export const StudioRightSidebar: React.FC<StudioRightSidebarProps> = ({
  onInsertPrompt,
  width,
  isDragging = false,
  onMouseDown,
  onDoubleClick
}) => {
  const {
    sessions,
    activeSessionId,
    mcpTools,
    createSession,
    switchSession,
    deleteSession,
    clearCurrentSession
  } = useAgentStore();

  return (
    <aside
      style={width !== undefined ? { width: `${width}px` } : undefined}
      className={`shrink-0 border-l border-hairline bg-surface-lowest flex flex-col min-h-0 text-xs select-none relative ${
        width === undefined ? 'w-[280px]' : ''
      } ${isDragging ? 'select-none' : ''}`}
    >
      {onMouseDown && (
        <ResizeHandle
          position="left"
          isDragging={isDragging}
          onMouseDown={onMouseDown}
          onDoubleClick={onDoubleClick}
          title="Drag to resize right panel (Double-click to reset)"
        />
      )}
      {/* Sessions Header */}
      <div className="p-3.5 border-b border-hairline bg-surface-low flex items-center justify-between shrink-0">
        <span className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-action" />
          Session History
        </span>
        <IconButton
          icon={<Plus className="w-4 h-4" />}
          size="xs"
          variant="ghost"
          onClick={() => createSession()}
          title="Create new chat session"
        />
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 border-b border-hairline max-h-[36vh]">
        {sessions.map((s) => {
          const isActive = s.id === activeSessionId;
          return (
            <div
              key={s.id}
              onClick={() => switchSession(s.id)}
              className={`group flex items-center justify-between p-2 rounded-xs cursor-pointer transition-colors ${
                isActive
                  ? 'bg-surface-low border border-hairline text-action font-semibold'
                  : 'text-ink-secondary hover:bg-surface-low/50 hover:text-ink-primary'
              }`}
            >
              <div className="truncate flex-1 pr-2">
                <div className="truncate text-xs">{s.title}</div>
                <div className="text-[10px] text-ink-tertiary font-mono flex items-center gap-1.5 truncate mt-0.5">
                  <span>{s.messages.length} messages</span>
                  {s.modelId && (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-[110px]" title={s.modelId}>
                        {s.modelId.includes('/') ? s.modelId.split('/').pop() : s.modelId}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {sessions.length > 1 && (
                <IconButton
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id);
                  }}
                  title="Delete session"
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-500"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Clear Current Session Button */}
      <div className="p-2.5 border-b border-hairline shrink-0">
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="w-3 h-3" />}
          className="w-full"
          onClick={clearCurrentSession}
        >
          Clear Current Chat
        </Button>
      </div>

      {/* Action & Tools Catalog Header */}
      <div className="p-3 border-b border-hairline bg-surface-low shrink-0 flex items-center justify-between">
        <span className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-action" />
          Tools Catalog
        </span>
        <span className="text-[10px] font-mono text-ink-tertiary">
          {MIRAGE_INTERNAL_TOOLS.length + mcpTools.length} ready
        </span>
      </div>

      {/* Tools Catalog List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Internal Tools */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-primary font-semibold uppercase text-ink-tertiary block">
            3D Workbench Tools
          </span>
          {MIRAGE_INTERNAL_TOOLS.map((t) => (
            <button
              key={t.name}
              onClick={() => onInsertPrompt?.(`Run ${t.name}: `)}
              className="w-full p-2 bg-surface-low hover:bg-surface-high border border-hairline rounded-xs text-left transition-colors group cursor-pointer"
            >
              <div className="font-mono text-[11px] font-semibold text-ink-primary group-hover:text-action truncate">
                {t.name}
              </div>
              <div className="text-[10px] text-ink-tertiary line-clamp-2 mt-0.5">
                {t.description}
              </div>
            </button>
          ))}
        </div>

        {/* MCP Tools */}
        {mcpTools.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-hairline">
            <span className="text-[10px] font-primary font-semibold uppercase text-ink-tertiary block">
              Connected MCP Servers
            </span>
            {mcpTools.map((m) => (
              <div
                key={m.compositeId}
                className="p-2 bg-surface-low border border-hairline rounded-xs text-left"
              >
                <div className="font-mono text-[11px] font-semibold text-action truncate">
                  {m.name}
                </div>
                <div className="text-[10px] text-ink-tertiary truncate">
                  {m.serverName}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
