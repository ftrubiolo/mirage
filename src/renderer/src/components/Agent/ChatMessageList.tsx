import React from 'react';
import { Bot, MessageSquare } from 'lucide-react';
import { ChatMessage } from '../../types/agent';
import { UserMessageBubble } from './UserMessageBubble';
import { AgentMessageView } from './AgentMessageView';
import { EmptyState, Button } from '../UI';

export interface ChatMessageListProps {
  messages: ChatMessage[];
  hasConfiguredProvider: boolean;
  isStreaming?: boolean;
  onOpenSettings?: () => void;
  onPromptChipSelect?: (prompt: string) => void;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
}

const STARTER_PROMPT_CHIPS = [
  'Auditar la geometría y el rendimiento del modelo',
  'Ajustar el material a un cuero anilina cognac cálido',
  'Cambiar el entorno a estudio fotográfico y encuadrar',
  '¿El conteo poligonal es adecuado para comercio web?'
];

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  hasConfiguredProvider,
  onOpenSettings,
  onPromptChipSelect,
  messagesEndRef
}) => {
  if (!hasConfiguredProvider) {
    return (
      <div className="my-auto py-12 max-w-md mx-auto w-full">
        <EmptyState
          icon={<Bot className="w-8 h-8 text-action" />}
          title="Estudio de Inteligencia Artificial"
          description="Para interactuar con el agente y controlar el taller mediante lenguaje natural, configura tu primer proveedor."
          action={
            onOpenSettings && (
              <Button variant="primary" onClick={onOpenSettings}>
                Abrir Configuración de Proveedores
              </Button>
            )
          }
        />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="my-auto flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 py-12">
        <div className="p-3.5 rounded-xs bg-surface-low border border-hairline text-action shadow-xs">
          <Bot className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-primary font-bold text-sm uppercase tracking-wide text-ink-primary">
            Asistente Técnico del Atelier
          </h3>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Pregúntame sobre la malla activa, solicítame ajustes de materiales PBR o auditorías de fabricación.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
          {STARTER_PROMPT_CHIPS.map((chip, i) => (
            <button
              key={i}
              onClick={() => onPromptChipSelect?.(chip)}
              className="p-3 rounded-xs bg-surface-lowest border border-hairline hover:border-action/60 hover:bg-surface-low text-xs text-ink-secondary hover:text-ink-primary transition-all text-left shadow-xs cursor-pointer flex items-start gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5 text-action shrink-0 mt-0.5" />
              <span>{chip}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {messages.map((m) =>
        m.role === 'user' ? (
          <UserMessageBubble key={m.id} message={m} />
        ) : (
          <AgentMessageView key={m.id} message={m} />
        )
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
