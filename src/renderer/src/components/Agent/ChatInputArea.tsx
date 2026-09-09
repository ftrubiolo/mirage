import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export interface ChatInputAreaProps {
  inputText: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  inputText,
  onInputChange,
  onSend,
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

      <button
        type="button"
        onClick={onSend}
        disabled={!inputText.trim() || disabled || isStreaming}
        className="p-2.5 bg-action hover:bg-action-hover text-white rounded-xs transition-colors disabled:opacity-40 shrink-0 cursor-pointer shadow-xs"
        title="Enviar instrucción (Enter)"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
};
