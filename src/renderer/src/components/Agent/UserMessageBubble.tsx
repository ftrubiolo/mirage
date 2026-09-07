import React from 'react';
import { ChatMessage } from '../../types/agent';

interface UserMessageBubbleProps {
  message: ChatMessage;
}

export const UserMessageBubble: React.FC<UserMessageBubbleProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-end gap-1 my-3">
      {/* Bubble containing ONLY the user message */}
      <div className="bg-action text-white px-4 py-2.5 rounded-2xl max-w-xl text-xs font-medium shadow-xs leading-relaxed whitespace-pre-wrap select-text">
        {message.content}
      </div>

      {/* Timestamp strictly placed underneath the bubble */}
      <span className="text-[10px] text-ink-tertiary font-mono mr-1">
        {message.timestamp}
      </span>
    </div>
  );
};
