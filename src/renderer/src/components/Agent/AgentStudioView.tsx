import React, { useState, useRef, useEffect } from 'react';
import { useAgentStore } from '../../store/agentStore';
import { useAppStore } from '../../store/appStore';
import { useResizableSidebar } from '../../hooks/useResizableSidebar';
import { ResizeDragOverlay } from '../UI/ResizeHandle';
import { StudioHeader } from './StudioHeader';
import { StudioLeftSidebar } from './StudioLeftSidebar';
import { StudioRightSidebar } from './StudioRightSidebar';
import { ChatMessageList } from './ChatMessageList';
import { ChatInputArea } from './ChatInputArea';
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

  const handlePromptChip = (chipText: string) => {
    setInputText(chipText);
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
            <ChatMessageList
              messages={activeSession?.messages || []}
              hasConfiguredProvider={hasConfiguredProvider}
              isStreaming={isStreaming}
              onOpenSettings={() => setView('settings')}
              onPromptChipSelect={handlePromptChip}
              messagesEndRef={messagesEndRef}
            />
          </div>
        </div>

        {/* Input Bar with Session Info underneath (dsh style) */}
        <footer className="border-t border-hairline bg-surface-low/80 shrink-0">
          <div className="max-w-4xl mx-auto px-4 pt-3 pb-1 space-y-2">
            <ChatInputArea
              inputText={inputText}
              onInputChange={setInputText}
              onSend={handleSend}
              disabled={!hasConfiguredProvider}
              isStreaming={isStreaming}
              placeholder={
                hasConfiguredProvider
                  ? 'Escribe una instrucción para el modelo o consulta técnica... (Enter para enviar)'
                  : 'Configura un proveedor en Ajustes para habilitar el chat'
              }
            />

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
