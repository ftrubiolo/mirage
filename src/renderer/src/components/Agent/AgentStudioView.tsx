import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Settings, MessageSquare } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import { useAppStore } from '../../store/appStore';
import { useResizableSidebar } from '../../hooks/useResizableSidebar';
import { ResizeDragOverlay } from '../UI/ResizeHandle';
import { StudioHeader } from './StudioHeader';
import { StudioLeftSidebar } from './StudioLeftSidebar';
import { StudioRightSidebar } from './StudioRightSidebar';
import { UserMessageBubble } from './UserMessageBubble';
import { AgentMessageView } from './AgentMessageView';
import { SessionStatsFooter } from './SessionStatsFooter';

export const AgentStudioView: React.FC = () => {
  const {
    providers,
    sessions,
    activeSessionId,
    isStreaming,
    sendMessage
  } = useAgentStore();

  const setView = useAppStore((state) => state.setView);

  const leftSidebar = useResizableSidebar({
    storageKey: 'mirage_agent_left_sidebar_width',
    defaultWidth: 320,
    minWidth: 260,
    maxWidth: () => Math.min(420, Math.floor(window.innerWidth * 0.35)),
    side: 'left'
  });

  const rightSidebar = useResizableSidebar({
    storageKey: 'mirage_agent_right_sidebar_width',
    defaultWidth: 280,
    minWidth: 220,
    maxWidth: () => Math.min(380, Math.floor(window.innerWidth * 0.35)),
    side: 'right'
  });

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const hasConfiguredProvider = providers.some((p) => p.hasKey);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isStreaming]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming) return;
    setInputText('');
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptChip = (chipText: string) => {
    setInputText(chipText);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 flex w-full h-full bg-canvas text-ink-primary overflow-hidden font-body select-none relative">
      {/* 1. Left Sidebar: Embedded Viewport & Active Model Metrology */}
      <StudioLeftSidebar
        width={leftSidebar.width}
        isDragging={leftSidebar.isDragging}
        onMouseDown={leftSidebar.handleMouseDown}
        onDoubleClick={leftSidebar.handleReset}
      />

      {/* 2. Center Studio: Full-Width Conversational Agent Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-canvas overflow-hidden">
        {/* Studio Control Header */}
        <StudioHeader />

        {/* Message Feed / Conversation Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-4xl mx-auto w-full min-h-full flex flex-col justify-end">
            {!hasConfiguredProvider ? (
              /* Unconfigured Provider State */
              <div className="my-auto flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 py-12">
                <div className="p-4 rounded-full bg-surface-low border border-hairline text-action shadow-xs">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-primary font-bold text-base uppercase tracking-tight text-ink-primary">
                    Estudio de Inteligencia Artificial
                  </h3>
                  <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">
                    Para interactuar con el agente y controlar el taller mediante lenguaje natural, configura tu primer proveedor (DeepSeek, NVIDIA, OpenRouter o local Ollama).
                  </p>
                </div>
                <button
                  onClick={() => setView('settings')}
                  className="px-4 py-2 bg-action hover:bg-action-hover text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  <span>Abrir Configuración de Proveedores</span>
                </button>
              </div>
            ) : !activeSession || activeSession.messages.length === 0 ? (
              /* Empty Session Starter Prompt Chips */
              <div className="my-auto flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 py-12">
                <div className="p-3.5 rounded-full bg-surface-low border border-hairline text-action shadow-xs">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-primary font-bold text-sm uppercase tracking-wide text-ink-primary">
                    Asistente Técnico del Atelier
                  </h3>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    Pregúntame sobre la malla activa, solicítame ajustes de materiales PBR o auditorías de fabricación.
                  </p>
                </div>

                {/* Starter Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
                  {[
                    'Auditar la geometría y el rendimiento del modelo',
                    'Ajustar el material a un cuero anilina cognac cálido',
                    'Cambiar el entorno a estudio fotográfico y encuadrar',
                    '¿El conteo poligonal es adecuado para comercio web?'
                  ].map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => handlePromptChip(chip)}
                      className="p-3 rounded-lg bg-surface-lowest border border-hairline hover:border-action/60 hover:bg-surface-low text-xs text-ink-secondary hover:text-ink-primary transition-all text-left shadow-xs cursor-pointer flex items-start gap-2"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-action shrink-0 mt-0.5" />
                      <span>{chip}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Messages List */
              <div className="space-y-4 py-2">
                {activeSession.messages.map((m) =>
                  m.role === 'user' ? (
                    <UserMessageBubble key={m.id} message={m} />
                  ) : (
                    <AgentMessageView key={m.id} message={m} />
                  )
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar with Session Info underneath (dsh style) */}
        <footer className="border-t border-hairline bg-surface-low/80 shrink-0">
          <div className="max-w-4xl mx-auto px-4 pt-3 pb-1 space-y-2">
            {/* Input Container */}
            <div className="flex items-end gap-2 bg-surface-lowest border border-hairline rounded-xl p-2 shadow-xs focus-within:border-action transition-all">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputText}
                disabled={!hasConfiguredProvider || isStreaming}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  hasConfiguredProvider
                    ? 'Escribe una instrucción para el modelo o consulta técnica... (Enter para enviar)'
                    : 'Configura un proveedor en Ajustes para habilitar el chat'
                }
                className="flex-1 bg-transparent resize-none text-xs text-ink-primary placeholder:text-ink-tertiary focus:outline-none p-1 font-body leading-relaxed disabled:opacity-50 select-text"
              />

              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isStreaming || !hasConfiguredProvider}
                className="p-2.5 bg-action hover:bg-action-hover text-white rounded-lg transition-colors disabled:opacity-40 shrink-0 cursor-pointer shadow-xs"
                title="Enviar instrucción (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Session Info Bar Underneath Input */}
            <SessionStatsFooter />
          </div>
        </footer>
      </main>

      {/* 3. Right Sidebar: Session History & Tools Catalog */}
      <StudioRightSidebar
        onInsertPrompt={handlePromptChip}
        width={rightSidebar.width}
        isDragging={rightSidebar.isDragging}
        onMouseDown={rightSidebar.handleMouseDown}
        onDoubleClick={rightSidebar.handleReset}
      />

      {(leftSidebar.isDragging || rightSidebar.isDragging) && <ResizeDragOverlay />}
    </div>
  );
};
