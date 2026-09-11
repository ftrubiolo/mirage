import { create } from 'zustand';
import {
  AIProviderConfig,
  ChatMessage,
  SessionItem,
  PermissionMode,
  ProposedAction
} from '../types/agent';
import { serializeSceneForPrompt } from '../agent/sceneSerializer';
import { MIRAGE_INTERNAL_TOOLS, getOpenAIToolsDeclarations } from '../agent/toolRegistry';
import { commandManager } from '../utils/commandManager';
import { usePbrMaterialStore } from './pbrMaterialStore';

interface AgentState {
  providers: AIProviderConfig[];
  activeProviderId: string | null;
  activeModel: string;
  permissionMode: PermissionMode;
  sessions: SessionItem[];
  activeSessionId: string;
  isStreaming: boolean;
  mcpTools: any[];
  pendingActions: ProposedAction[];

  // Actions
  init: () => Promise<void>;
  saveProvider: (provider: AIProviderConfig, secretKey?: string) => Promise<boolean>;
  deleteProvider: (providerId: string) => Promise<boolean>;
  setActiveProvider: (id: string | null) => void;
  setActiveModel: (model: string) => void;
  setPermissionMode: (mode: PermissionMode) => void;
  createSession: (title?: string) => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  clearCurrentSession: () => void;
  sendMessage: (text: string) => Promise<void>;
  /** Aborts the in-flight model request, keeping whatever was already streamed. */
  cancelStreaming: () => void;
  applyProposedAction: (actionId: string) => Promise<void>;
  rejectProposedAction: (actionId: string) => void;
}

const getStoredProviders = (): AIProviderConfig[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('sera-ai-providers');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse sera-ai-providers:', e);
  }
  return [];
};

const createInitialSession = (): SessionItem => ({
  id: 'session-default',
  title: 'Sesión Principal',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: []
});

const getStoredSessions = (): SessionItem[] => {
  if (typeof window === 'undefined') return [createInitialSession()];
  try {
    const raw = localStorage.getItem('sera-ai-sessions');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse sera-ai-sessions:', e);
  }
  return [createInitialSession()];
};

const getStoredActiveSessionId = (sessions: SessionItem[]): string => {
  if (typeof window === 'undefined') return sessions[0]?.id || 'session-default';
  try {
    const stored = localStorage.getItem('sera-ai-active-session-id');
    if (stored && sessions.some((s) => s.id === stored)) return stored;
  } catch (e) {
    console.warn('Failed to parse sera-ai-active-session-id:', e);
  }
  return sessions[0]?.id || 'session-default';
};

const saveSessionsToStorage = (sessions: SessionItem[], activeId?: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('sera-ai-sessions', JSON.stringify(sessions));
    if (activeId) {
      localStorage.setItem('sera-ai-active-session-id', activeId);
    }
  } catch (e) {
    console.warn('Failed to save sera-ai-sessions:', e);
  }
};

const initialSessions = getStoredSessions();
const initialActiveSessionId = getStoredActiveSessionId(initialSessions);

/**
 * Handle for the in-flight model request. Held at module scope because it is a
 * transient resource, not observable state: nothing renders differently based
 * on the controller itself.
 */
let activeAbortController: AbortController | null = null;

export const useAgentStore = create<AgentState>((set, get) => ({
  providers: getStoredProviders(),
  activeProviderId: null,
  activeModel: '',
  permissionMode: 'auto-apply',
  sessions: initialSessions,
  activeSessionId: initialActiveSessionId,
  isStreaming: false,
  mcpTools: [],
  pendingActions: [],

  init: async () => {
    const stored = getStoredProviders();
    const checkedProviders: AIProviderConfig[] = [];

    // Check which providers have stored keys in hardware vault
    for (const p of stored) {
      let hasKey = false;
      if (window.electronAPI) {
        hasKey = await window.electronAPI.hasSecret(`provider_${p.id}`);
      }
      checkedProviders.push({
        ...p,
        hasKey,
        status: hasKey ? 'active' : 'unconfigured'
      });
    }

    // Restore active session model and provider if session has them
    const curSessions = get().sessions;
    const curActive = curSessions.find((s) => s.id === get().activeSessionId) || curSessions[0];
    const firstActive = checkedProviders.find((p) => p.hasKey);

    const activeProvId = curActive?.providerId || (firstActive ? firstActive.id : null);
    const resolvedProv = checkedProviders.find((p) => p.id === activeProvId) || firstActive;
    const activeMdl = curActive?.modelId || (resolvedProv ? resolvedProv.defaultModel : '');

    // Also fetch available MCP tools from main process
    let mcpTools: any[] = [];
    if (window.electronAPI) {
      try {
        mcpTools = await window.electronAPI.listMcpTools();
        window.electronAPI.onMcpToolsChanged((tools) => set({ mcpTools: tools }));
      } catch (err) {
        console.warn('[AgentStore] Could not list MCP tools:', err);
      }
    }

    // `pendingActions` is deliberately not persisted, but the message copies of
    // those actions are. Any action still marked `pending` in a restored
    // session can therefore never be approved -- the store no longer holds it
    // and `applyProposedAction` would silently no-op. Mark them expired so the
    // UI stops offering a button that does nothing.
    const reconciledSessions = curSessions.map((s) => ({
      ...s,
      messages: s.messages.map((m) =>
        m.isStreaming || m.toolCalls?.some((tc) => tc.status === 'pending')
          ? {
              ...m,
              // A stream that was interrupted by an app restart cannot resume.
              isStreaming: false,
              toolCalls: m.toolCalls?.map((tc) =>
                tc.status === 'pending' ? { ...tc, status: 'rejected' as const } : tc
              )
            }
          : m
      )
    }));

    saveSessionsToStorage(reconciledSessions, get().activeSessionId);

    set({
      providers: checkedProviders,
      activeProviderId: resolvedProv ? resolvedProv.id : null,
      activeModel: activeMdl,
      mcpTools,
      sessions: reconciledSessions,
      pendingActions: []
    });
  },

  saveProvider: async (provider, secretKey) => {
    if (secretKey && window.electronAPI) {
      await window.electronAPI.setSecret(`provider_${provider.id}`, secretKey);
    }

    const current = get().providers;
    const existingIdx = current.findIndex((p) => p.id === provider.id);
    const updated = [...current];

    const updatedProvider: AIProviderConfig = {
      ...provider,
      hasKey: Boolean(secretKey) || provider.hasKey,
      status: (Boolean(secretKey) || provider.hasKey) ? 'active' : 'unconfigured'
    };

    if (existingIdx >= 0) {
      updated[existingIdx] = updatedProvider;
    } else {
      updated.push(updatedProvider);
    }

    localStorage.setItem('sera-ai-providers', JSON.stringify(updated));

    // If no active provider, select this one
    const activeId = get().activeProviderId || updatedProvider.id;
    const activeModel = get().activeModel || updatedProvider.defaultModel;

    set({
      providers: updated,
      activeProviderId: activeId,
      activeModel
    });
    return true;
  },

  deleteProvider: async (providerId) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteSecret(`provider_${providerId}`);
    }

    const updated = get().providers.filter((p) => p.id !== providerId);
    localStorage.setItem('sera-ai-providers', JSON.stringify(updated));

    const nextActive = updated.find((p) => p.hasKey);
    set({
      providers: updated,
      activeProviderId: nextActive ? nextActive.id : null,
      activeModel: nextActive ? nextActive.defaultModel : ''
    });
    return true;
  },

  setActiveProvider: (id) => {
    const p = get().providers.find((item) => item.id === id);
    const model = p ? p.defaultModel : '';
    const currentId = get().activeSessionId;
    const updatedSessions = get().sessions.map((s) =>
      s.id === currentId ? { ...s, providerId: id || undefined, modelId: model } : s
    );
    saveSessionsToStorage(updatedSessions, currentId);
    set({
      activeProviderId: id,
      activeModel: model,
      sessions: updatedSessions
    });
  },

  setActiveModel: (model) => {
    const currentId = get().activeSessionId;
    const updatedSessions = get().sessions.map((s) =>
      s.id === currentId ? { ...s, modelId: model } : s
    );
    saveSessionsToStorage(updatedSessions, currentId);
    set({
      activeModel: model,
      sessions: updatedSessions
    });
  },

  setPermissionMode: (mode) => set({ permissionMode: mode }),

  createSession: (title) => {
    const { activeProviderId, activeModel, sessions } = get();
    const newSession: SessionItem = {
      id: `session-${Date.now()}`,
      title: title || `Sesión ${sessions.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      providerId: activeProviderId || undefined,
      modelId: activeModel || undefined,
      messages: []
    };
    const updated = [newSession, ...sessions];
    saveSessionsToStorage(updated, newSession.id);
    set({
      sessions: updated,
      activeSessionId: newSession.id
    });
    return newSession.id;
  },

  switchSession: (id) => {
    // Pending approvals belong to the session that produced them; tool-call ids
    // are only unique within a run, so a flat list would cross-wire them.
    set({ pendingActions: [] });
    const session = get().sessions.find((s) => s.id === id);
    saveSessionsToStorage(get().sessions, id);
    if (session) {
      set({
        activeSessionId: id,
        ...(session.providerId ? { activeProviderId: session.providerId } : {}),
        ...(session.modelId ? { activeModel: session.modelId } : {})
      });
    } else {
      set({ activeSessionId: id });
    }
  },

  deleteSession: (id) => {
    const remaining = get().sessions.filter((s) => s.id !== id);
    const fallback = remaining.length > 0 ? remaining[0] : createInitialSession();
    const updated = remaining.length > 0 ? remaining : [fallback];
    saveSessionsToStorage(updated, fallback.id);
    set({
      sessions: updated,
      activeSessionId: fallback.id,
      ...(fallback.providerId ? { activeProviderId: fallback.providerId } : {}),
      ...(fallback.modelId ? { activeModel: fallback.modelId } : {})
    });
  },

  clearCurrentSession: () => {
    const currentId = get().activeSessionId;
    const updated = get().sessions.map((s) => (s.id === currentId ? { ...s, messages: [] } : s));
    saveSessionsToStorage(updated, currentId);
    set({ sessions: updated });
  },

  applyProposedAction: async (actionId) => {
    const action = get().pendingActions.find((a) => a.id === actionId);
    if (!action) return;

    const internalTool = MIRAGE_INTERNAL_TOOLS.find((t) => t.name === action.toolName);

    if (internalTool && action.rawArgs) {
      // Built-in tools mutate local scene state, so they are grouped into one
      // undoable transaction.
      commandManager.beginTransaction(action.summary);
      try {
        await internalTool.execute(action.rawArgs);
      } finally {
        await commandManager.commitTransaction(action.summary);
      }
    } else if (action.toolName.includes('__') && window.electronAPI) {
      // Approved MCP call. It cannot be undone — the effects are outside the
      // app — so it is recorded as applied with its arguments for the audit log.
      await window.electronAPI.callMcpTool(action.toolName, action.rawArgs || {});
    } else {
      return;
    }

    set((state) => ({
      pendingActions: state.pendingActions.filter((a) => a.id !== actionId),
      sessions: state.sessions.map((s) => {
        if (s.id !== state.activeSessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) => {
            if (!m.toolCalls) return m;
            return {
              ...m,
              toolCalls: m.toolCalls.map((tc) =>
                tc.id === actionId ? { ...tc, status: 'applied', appliedAt: new Date().toLocaleTimeString() } : tc
              )
            };
          })
        };
      })
    }));
  },

  rejectProposedAction: (actionId) => {
    set((state) => ({
      pendingActions: state.pendingActions.filter((a) => a.id !== actionId),
      sessions: state.sessions.map((s) => {
        if (s.id !== state.activeSessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) => {
            if (!m.toolCalls) return m;
            return {
              ...m,
              toolCalls: m.toolCalls.map((tc) =>
                tc.id === actionId ? { ...tc, status: 'rejected' } : tc
              )
            };
          })
        };
      })
    }));
  },

  cancelStreaming: () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
  },

  sendMessage: async (text: string) => {
    const { activeProviderId, providers, activeModel, activeSessionId, sessions, permissionMode, mcpTools } = get();

    const provider = providers.find((p) => p.id === activeProviderId);
    if (!provider || !provider.hasKey) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'No hay un proveedor de IA configurado o activo con clave válida. Por favor ve a Configuración > Modelos & Proveedores IA para conectar uno.',
        timestamp: new Date().toLocaleTimeString()
      };
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [...s.messages, errorMsg] } : s
        )
      }));
      return;
    }

    let apiKey = '';
    if (window.electronAPI) {
      apiKey = (await window.electronAPI.getSecret(`provider_${provider.id}`)) || '';
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString()
    };

    const assistantMsgId = `asst-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
      isStreaming: true,
      modelUsed: activeModel || provider.defaultModel
    };

    const curSession = sessions.find((s) => s.id === activeSessionId);
    const isFirstPrompt = !curSession || curSession.messages.filter((m) => m.role === 'user').length === 0;
    const autoTitle =
      isFirstPrompt && curSession && (curSession.title.startsWith('Sesión') || curSession.title === 'Sesión Principal')
        ? text.slice(0, 36).trim()
        : curSession?.title || 'Sesión';

    const updatedSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? {
            ...s,
            title: autoTitle,
            providerId: activeProviderId || s.providerId,
            modelId: activeModel || s.modelId,
            updatedAt: new Date().toISOString(),
            messages: [...s.messages, userMsg, assistantMsg]
          }
        : s
    );

    saveSessionsToStorage(updatedSessions, activeSessionId);

    set({
      isStreaming: true,
      sessions: updatedSessions
    });

    // Declared outside the try so the error path can preserve whatever the
    // model already produced instead of discarding it.
    let streamedContent = '';
    let streamedThought = '';

    try {
      const scenePrompt = serializeSceneForPrompt();
      const session = sessions.find((s) => s.id === activeSessionId);
      const conversationHistory = (session?.messages || []).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const systemPrompt = `Eres el Agente Asistente Técnico y Artístico de Mirage 3D Workbench (Sera Atelier).
Tu misión es ayudar a diseñadores, artistas técnicos y fabricantes a inspeccionar mallas 3D, configurar materiales PBR hiperrealistas (MeshPhysicalMaterial), auditar geometría para web y automatizar flujos de trabajo.

${scenePrompt}

Instrucciones Críticas:
1. Responde de forma técnica, precisa y concisa en Markdown.
2. Si el usuario solicita un ajuste de material, iluminación o pase de render, utiliza las herramientas disponibles (function calling).
3. Si recomiendas cambios en valores PBR (rugosidad, metalicidad, normal, etc.), explica brevemente la justificación física (ej: dieléctrico vs conductor, reflexión especular, microtextura).`;

      const tools = getOpenAIToolsDeclarations(mcpTools);

      const startTime = Date.now();
      const requestBody: any = {
        model: activeModel || provider.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-8),
          { role: 'user', content: text }
        ],
        stream: true,
        stream_options: { include_usage: true }
      };

      // Enable reasoning tokens for OpenRouter and reasoning-capable models (e.g. gpt-5.6-luna, r1, o1, o3)
      if (
        provider.baseUrl.includes('openrouter.ai') ||
        /r1|luna|reason|o1|o3|qwq/i.test(activeModel || provider.defaultModel)
      ) {
        requestBody.reasoning = { effort: 'medium' };
      }

      if (tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = 'auto';
      }

      const controller = new AbortController();
      activeAbortController = controller;

      const response = await fetch(`${provider.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200) || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No se pudo inicializar el stream de respuesta.');

      const decoder = new TextDecoder();
      let streamUsage: any = undefined;
      let activeStreamingTool: string | null = null;
      const toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {};

      // SSE frames are not aligned to chunk boundaries. A partial line is held
      // in `lineBuffer` until its terminating newline arrives; previously the
      // split fragments were parsed independently and silently dropped.
      let lineBuffer = '';
      let streamFinished = false;

      while (!streamFinished) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        // The last element is an incomplete line unless the chunk ended on \n.
        lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '').trim();
          if (dataStr === '') continue;
          if (dataStr === '[DONE]') {
            streamFinished = true;
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);

            // 1. Capture token usage (sent in final chunk or with choices)
            if (parsed.usage) {
              streamUsage = {
                promptTokens: parsed.usage.prompt_tokens ?? 0,
                completionTokens: parsed.usage.completion_tokens ?? 0,
                totalTokens: parsed.usage.total_tokens ?? 0,
                reasoningTokens: parsed.usage.completion_tokens_details?.reasoning_tokens
              };
            }

            const delta = parsed.choices?.[0]?.delta;
            if (!delta) {
              // Final chunk often has empty choices but includes usage
              if (streamUsage) {
                set((state) => ({
                  sessions: state.sessions.map((s) => {
                    if (s.id !== activeSessionId) return s;
                    return {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === assistantMsgId ? { ...m, usage: streamUsage } : m
                      )
                    };
                  })
                }));
              }
              continue;
            }

            // 2. Capture reasoning tokens (OpenRouter uses delta.reasoning, DeepSeek uses delta.reasoning_content)
            const reasoningChunk = delta.reasoning || delta.reasoning_content || '';
            if (reasoningChunk) {
              streamedThought += reasoningChunk;
              set((state) => ({
                sessions: state.sessions.map((s) => {
                  if (s.id !== activeSessionId) return s;
                  return {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMsgId ? { ...m, thought: streamedThought } : m
                    )
                  };
                })
              }));
            }

            // 3. Capture regular prose content
            if (delta.content) {
              streamedContent += delta.content;
              set((state) => ({
                sessions: state.sessions.map((s) => {
                  if (s.id !== activeSessionId) return s;
                  return {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: streamedContent } : m
                    )
                  };
                })
              }));
            }

            // 4. Capture tool calls and display tool execution in real-time
            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsMap[idx]) {
                  toolCallsMap[idx] = { id: tc.id || `call_${idx}`, name: '', arguments: '' };
                }
                if (tc.function?.name) toolCallsMap[idx].name += tc.function.name;
                if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments;
              }

              const currentTool = Object.values(toolCallsMap).find((t) => t.name)?.name;
              if (currentTool && currentTool !== activeStreamingTool) {
                activeStreamingTool = currentTool;
                set((state) => ({
                  sessions: state.sessions.map((s) => {
                    if (s.id !== activeSessionId) return s;
                    return {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === assistantMsgId
                          ? {
                              ...m,
                              steps: [
                                ...(streamedThought
                                  ? [
                                      {
                                        id: `step-think-${assistantMsgId}`,
                                        type: 'think' as const,
                                        title:
                                          streamedThought.split('\n')[0].slice(0, 80) ||
                                          'Razonamiento técnico',
                                        detail: streamedThought,
                                        status: 'done' as const
                                      }
                                    ]
                                  : []),
                                {
                                  id: `step-live-tool-${assistantMsgId}`,
                                  type: 'tool' as const,
                                  title: `${currentTool.replace(/_/g, ' ')} (ejecutando...)`,
                                  status: 'running' as const
                                }
                              ]
                            }
                          : m
                      )
                    };
                  })
                }));
              }
            }
          } catch {
            // Partial JSON chunk in stream
          }
        }
      }

      // Process completed tool calls
      const proposedActions: ProposedAction[] = [];
      const toolKeys = Object.keys(toolCallsMap).map(Number).sort((a, b) => a - b);

      for (const k of toolKeys) {
        const tc = toolCallsMap[k];
        let args: any = {};
        try {
          args = JSON.parse(tc.arguments || '{}');
        } catch {
          args = {};
        }

        // Check if internal tool
        const internalTool = MIRAGE_INTERNAL_TOOLS.find((t) => t.name === tc.name);
        if (internalTool) {
          if (permissionMode === 'auto-apply') {
            commandManager.beginTransaction(`IA: ${tc.name}`);
            const res = await internalTool.execute(args);
            await commandManager.commitTransaction(`IA: ${tc.name}`);
            proposedActions.push({
              id: tc.id,
              toolName: tc.name,
              summary: res.summary,
              diff: res.diff,
              status: 'applied',
              appliedAt: new Date().toLocaleTimeString(),
              rawArgs: args
            });
          } else {
            // Ask to confirm mode
            const pbr = usePbrMaterialStore.getState();
            const diff: any[] = [];
            if (tc.name === 'set_pbr_parameter' && args.property) {
              diff.push({ property: args.property, before: (pbr as any)[args.property], after: args.value });
            }
            const action: ProposedAction = {
              id: tc.id,
              toolName: tc.name,
              summary: `Ajuste propuesto: ${tc.name}`,
              diff,
              status: 'pending',
              rawArgs: args
            };
            proposedActions.push(action);
            set((state) => ({ pendingActions: [...state.pendingActions, action] }));
          }
        } else if (tc.name.includes('__') && window.electronAPI) {
          // MCP tool call.
          //
          // MCP tools are the ones that can touch the outside world (files,
          // shell, network), so they go through the SAME approval gate as the
          // built-in tools. Previously this branch executed unconditionally in
          // both permission modes, which made `ask-to-confirm` decorative for
          // exactly the tools that most needed it.
          if (permissionMode !== 'auto-apply') {
            const action: ProposedAction = {
              id: tc.id,
              toolName: tc.name,
              summary: `Herramienta MCP propuesta: ${tc.name}`,
              diff: [],
              status: 'pending',
              rawArgs: args
            };
            proposedActions.push(action);
            set((state) => ({ pendingActions: [...state.pendingActions, action] }));
          } else {
            try {
              const mcpRes = await window.electronAPI.callMcpTool(tc.name, args);
              proposedActions.push({
                id: tc.id,
                toolName: tc.name,
                summary: `Herramienta MCP ${tc.name} ejecutada`,
                diff: [],
                status: 'applied',
                appliedAt: new Date().toLocaleTimeString(),
                // Retained so the audit trail records what was actually sent.
                rawArgs: args
              });
              streamedContent += `\n\n*Resultado MCP:* \`\`\`json\n${JSON.stringify(mcpRes, null, 2)}\n\`\`\``;
            } catch (mcpErr: any) {
              streamedContent += `\n\n[Error] Error ejecutando herramienta MCP ${tc.name}: ${mcpErr.message}`;
            }
          }
        }
      }

      const durationMs = Date.now() - startTime;
      const durationSec = (durationMs / 1000).toFixed(1);
      const durationStr = `${durationSec}s`;

      if (!streamUsage) {
        const promptChars = text.length + systemPrompt.length;
        const completionChars = streamedContent.length + streamedThought.length;
        streamUsage = {
          promptTokens: Math.ceil(promptChars / 4),
          completionTokens: Math.ceil(completionChars / 4),
          totalTokens: Math.ceil((promptChars + completionChars) / 4)
        };
      }

      const finalSessions = get().sessions.map((s) => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          updatedAt: new Date().toISOString(),
          messages: s.messages.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content:
                    streamedContent ||
                    (proposedActions.length > 0
                      ? 'He ejecutado las acciones solicitadas en el taller.'
                      : ''),
                  thought: streamedThought || m.thought,
                  toolCalls: proposedActions.length > 0 ? proposedActions : undefined,
                  isStreaming: false,
                  duration: durationStr,
                  durationMs,
                  usage: streamUsage
                }
              : m
          )
        };
      });

      saveSessionsToStorage(finalSessions, activeSessionId);

      set({
        isStreaming: false,
        sessions: finalSessions
      });
    } catch (err: any) {
      // Distinguish a user-initiated stop from a genuine failure, and keep
      // whatever the model already produced. Replacing the partial answer with
      // the error string threw away the only useful output on the most common
      // failure mode (a mid-stream 429 / connection reset).
      const wasCancelled =
        err?.name === 'AbortError' || /abort/i.test(String(err?.message || ''));

      const notice = wasCancelled
        ? '\n\n---\n*Generación detenida por el usuario.*'
        : `\n\n---\n**Error de comunicación con el modelo:** ${err?.message || err}`;

      const preserved = streamedContent
        ? `${streamedContent}${notice}`
        : wasCancelled
        ? '*Generación detenida antes de recibir contenido.*'
        : `Error de comunicación con el modelo: ${err?.message || err}`;

      const errSessions = get().sessions.map((s) => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          updatedAt: new Date().toISOString(),
          messages: s.messages.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: preserved,
                  thought: streamedThought || m.thought,
                  isStreaming: false
                }
              : m
          )
        };
      });

      saveSessionsToStorage(errSessions, activeSessionId);

      set({
        isStreaming: false,
        sessions: errSessions
      });
    } finally {
      activeAbortController = null;
    }
  }
}));
