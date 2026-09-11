import React, { useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { IconButton } from '../UI/IconButton';

export interface ChatInputAreaProps {
  inputText: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  /** Aborts the in-flight request, keeping whatever was already streamed. */
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  inputText,
  onInputChange,
  onSend,
  onStop,
  disabled = false,
  isStreaming = false,
  placeholder = 'Escribe una instrucción para el modelo o consulta técnica... (Enter para enviar)'
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim() && !disabled && !isStreaming) {
        onSend();
      }
    }
    // Escape acts as a panic stop while the model is generating.
    if (e.key === 'Escape' && isStreaming && onStop) {
      e.preventDefault();
      onStop();
    }
  };

  useEffect(() => {
    if (!disabled && !isStreaming) {
      inputRef.current?.focus();
    }
  }, [disabled, isStreaming]);

  return (
    <div className="flex items-end gap-2 bg-surface-lowest border border-hairline rounded-xs p-2 shadow-xs focus-within:border-action transition-all">
      <textarea
        ref={inputRef}
        rows={2}
        value={inputText}
        disabled={disabled || isStreaming}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent resize-none text-xs text-ink-primary placeholder:text-ink-tertiary focus:outline-none p-1 font-body leading-relaxed disabled:opacity-50 select-text"
      />

      {isStreaming && onStop ? (
        <IconButton
          size="md"
          variant="secondary"
          onClick={onStop}
          icon={<Square className="w-4 h-4" />}
          title="Detener la generación (Esc)"
        />
      ) : (
        <IconButton
          size="md"
          variant="primary"
          onClick={onSend}
          disabled={!inputText.trim() || disabled}
          icon={<Send className="w-4 h-4" />}
          title="Enviar instrucción (Enter)"
        />
      )}
    </div>
  );
};
