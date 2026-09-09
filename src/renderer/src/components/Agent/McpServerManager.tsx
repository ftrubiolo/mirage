import React from 'react';
import { Server, Wrench, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';

export interface McpServerInfo {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
  command?: string;
  toolCount?: number;
}

export interface McpServerManagerProps {
  servers?: McpServerInfo[];
  onRefresh?: () => void;
}

export const McpServerManager: React.FC<McpServerManagerProps> = ({ servers, onRefresh }) => {
  const { mcpTools } = useAgentStore();

  // Derive unique servers from registered tools if not explicitly passed
  const activeServers: McpServerInfo[] = servers || Array.from(
    new Set((mcpTools || []).map((t: any) => t.serverName || 'Default MCP'))
  ).map((serverName) => ({
    id: `srv-${serverName}`,
    name: serverName as string,
    status: 'connected',
    toolCount: (mcpTools || []).filter((t: any) => (t.serverName || 'Default MCP') === serverName).length
  }));

  return (
    <div className="space-y-3 font-body text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-hairline">
        <div className="flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-action" />
          <span className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
            Servidores MCP Conectados
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 hover:bg-surface-high rounded-xs text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
            title="Refrescar servidores MCP"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Servers list */}
      {activeServers.length === 0 ? (
        <div className="p-3 bg-surface-low border border-hairline rounded-xs text-ink-tertiary text-center text-xs">
          No hay servidores MCP configurados en este momento.
        </div>
      ) : (
        <div className="space-y-2">
          {activeServers.map((srv) => (
            <div
              key={srv.id}
              className="p-2.5 bg-surface-lowest border border-hairline rounded-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-primary font-mono text-[11px]">
                  {srv.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-xs border bg-emerald-50 text-emerald-800 border-emerald-300/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Conectado</span>
                </span>
              </div>

              {srv.toolCount !== undefined && (
                <div className="text-[10px] font-mono text-ink-tertiary">
                  {srv.toolCount} herramienta(s) disponible(s)
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Exposed Tools */}
      {mcpTools && mcpTools.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-hairline">
          <span className="text-[10px] font-primary font-bold uppercase tracking-wider text-ink-secondary flex items-center gap-1">
            <Wrench className="w-3 h-3 text-action" />
            Herramientas Expuestas ({mcpTools.length})
          </span>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {mcpTools.map((tool: any) => (
              <div
                key={tool.compositeId || tool.name}
                className="p-2 bg-surface-low border border-hairline rounded-xs text-left"
              >
                <div className="font-mono text-[11px] font-semibold text-action truncate">
                  {tool.name}
                </div>
                <div className="text-[10px] text-ink-tertiary truncate">{tool.serverName}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
