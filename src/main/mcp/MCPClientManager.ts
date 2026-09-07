import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { app } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { resolveLoginShellEnvironment } from './envResolver';

export interface McpServerConfig {
  id: string;
  name: string;
  type: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
}

export interface McpToolItem {
  serverId: string;
  serverName: string;
  name: string;
  compositeId: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpServerState {
  id: string;
  name: string;
  status: 'connected' | 'connecting' | 'error' | 'disconnected';
  error?: string;
  toolCount: number;
}

interface ActiveServer {
  config: McpServerConfig;
  client: Client;
  transport: StdioClientTransport | SSEClientTransport;
  tools: any[];
  status: 'connected' | 'connecting' | 'error' | 'disconnected';
  error?: string;
}

export class MCPClientManager {
  private servers: Map<string, ActiveServer> = new Map();
  private configPath: string;
  private changeListeners: (() => void)[] = [];

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'mcp_config.json');
  }

  public onChange(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (e) {
        console.error('[MCP] Listener error:', e);
      }
    }
  }

  public async initialize(): Promise<void> {
    try {
      const exists = await fs.stat(this.configPath).then(() => true).catch(() => false);
      if (!exists) {
        await fs.mkdir(path.dirname(this.configPath), { recursive: true });
        await fs.writeFile(this.configPath, JSON.stringify({ mcpServers: {} }, null, 2), 'utf-8');
      }
      await this.loadAndSyncConfig();
    } catch (err) {
      console.warn('[MCP] Failed to initialize config:', err);
    }
  }

  public async loadAndSyncConfig(): Promise<void> {
    try {
      const raw = await fs.readFile(this.configPath, 'utf-8');
      const data = JSON.parse(raw);
      const mcpServers: Record<string, any> = data.mcpServers || {};

      for (const [id, conf] of Object.entries(mcpServers)) {
        if (!this.servers.has(id)) {
          const srvConfig: McpServerConfig = {
            id,
            name: conf.name || id,
            type: conf.url ? 'sse' : 'stdio',
            command: conf.command,
            args: conf.args || [],
            env: conf.env,
            url: conf.url,
            headers: conf.headers,
            enabled: conf.enabled !== false
          };

          if (srvConfig.enabled) {
            this.connectServer(srvConfig).catch((err) => {
              console.warn(`[MCP] Failed to auto-connect server ${id}:`, err);
            });
          }
        }
      }
    } catch (err) {
      console.error('[MCP] Error reading mcp_config.json:', err);
    }
  }

  public async connectServer(config: McpServerConfig): Promise<boolean> {
    await this.disconnectServer(config.id);

    const active: ActiveServer = {
      config,
      client: new Client(
        { name: 'Mirage-Workbench', version: app.getVersion() },
        { capabilities: {} }
      ),
      transport: null as any,
      tools: [],
      status: 'connecting'
    };

    this.servers.set(config.id, active);
    this.notify();

    try {
      if (config.type === 'sse' && config.url) {
        active.transport = new SSEClientTransport(new URL(config.url), {
          requestInit: { headers: config.headers }
        });
      } else if (config.command) {
        const shellEnv = resolveLoginShellEnvironment();
        const mergedEnv: Record<string, string> = {};
        for (const [k, v] of Object.entries({ ...shellEnv, ...(config.env || {}) })) {
          if (typeof v === 'string') mergedEnv[k] = v;
        }

        active.transport = new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: mergedEnv,
          stderr: 'pipe'
        });

        if (active.transport.stderr) {
          active.transport.stderr.on('data', (chunk: Buffer) => {
            console.debug(`[MCP:${config.id}]`, chunk.toString());
          });
        }
      } else {
        throw new Error('Configuración inválida: se requiere comando (stdio) o URL (sse).');
      }

      await active.client.connect(active.transport);
      active.status = 'connected';

      const toolList = await active.client.listTools();
      active.tools = toolList.tools || [];
      this.notify();
      return true;
    } catch (err: any) {
      active.status = 'error';
      active.error = err.message || String(err);
      this.notify();
      return false;
    }
  }

  public async disconnectServer(id: string): Promise<boolean> {
    const active = this.servers.get(id);
    if (!active) return false;

    try {
      await active.client.close();
    } catch (err) {
      console.warn(`[MCP] Disconnect warning for ${id}:`, err);
    }

    this.servers.delete(id);
    this.notify();
    return true;
  }

  public getServerStatuses(): McpServerState[] {
    return Array.from(this.servers.values()).map((s) => ({
      id: s.config.id,
      name: s.config.name,
      status: s.status,
      error: s.error,
      toolCount: s.tools.length
    }));
  }

  public getAllTools(): McpToolItem[] {
    const tools: McpToolItem[] = [];
    for (const active of this.servers.values()) {
      if (active.status !== 'connected') continue;
      for (const t of active.tools) {
        tools.push({
          serverId: active.config.id,
          serverName: active.config.name,
          name: t.name,
          compositeId: `${active.config.id}__${t.name}`,
          description: t.description,
          inputSchema: t.inputSchema as Record<string, unknown> | undefined
        });
      }
    }
    return tools;
  }

  public async callTool(compositeId: string, args: Record<string, unknown>): Promise<any> {
    const [serverId, ...rest] = compositeId.split('__');
    const toolName = rest.join('__');

    const active = this.servers.get(serverId);
    if (!active || active.status !== 'connected') {
      throw new Error(`El servidor MCP "${serverId}" no está conectado.`);
    }

    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 35000);

    try {
      const response = await active.client.callTool(
        { name: toolName, arguments: args },
        undefined,
        { signal: abortController.signal }
      );
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  public async shutdownAll(): Promise<void> {
    for (const id of Array.from(this.servers.keys())) {
      await this.disconnectServer(id);
    }
  }
}
