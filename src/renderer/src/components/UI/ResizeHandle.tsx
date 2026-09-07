import React from 'react';

export interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  isDragging?: boolean;
  position: 'left' | 'right';
  className?: string;
  title?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onMouseDown,
  onDoubleClick,
  isDragging = false,
  position,
  className = '',
  title = 'Arrastra para redimensionar (Doble clic para restablecer)'
}) => {
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      className={`absolute top-0 bottom-0 ${
        position === 'left' ? '-left-1.5' : '-right-1.5'
      } w-3 z-30 cursor-col-resize group select-none flex items-center justify-center ${className}`}
      title={title}
    >
      <div
        className={`w-1 h-full transition-colors ${
          isDragging ? 'bg-action' : 'group-hover:bg-action/60'
        }`}
      />
    </div>
  );
};

export const ResizeDragOverlay: React.FC = () => (
  <div
    className="fixed inset-0 z-50 cursor-col-resize select-none"
    style={{ userSelect: 'none' }}
  />
);
