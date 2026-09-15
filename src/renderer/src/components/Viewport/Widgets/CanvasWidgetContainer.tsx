import React, { useRef, useState, useEffect } from 'react';
import { GripHorizontal, ArrowDownToLine } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

interface CanvasWidgetContainerProps {
  id: string;
  title: string;
  x: number;
  y: number;
  containerBounds?: { width: number; height: number };
  children: React.ReactNode;
}

export const CanvasWidgetContainer: React.FC<CanvasWidgetContainerProps> = ({
  id,
  title,
  x,
  y,
  containerBounds,
  children
}) => {
  const updateCanvasWidgetPosition = useViewportStore((s) => s.updateCanvasWidgetPosition);
  const removeCanvasWidget = useViewportStore((s) => s.removeCanvasWidget);

  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const isDraggingRef = useRef(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });

  // Sync prop changes when position changes externally
  useEffect(() => {
    setPos({ x, y });
  }, [x, y]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from header/handle
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }

    isDraggingRef.current = true;
    dragStartOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingRef.current) return;

      const cardWidth = cardRef.current?.offsetWidth || 240;
      const cardHeight = cardRef.current?.offsetHeight || 100;
      const maxW = (containerBounds?.width || window.innerWidth) - cardWidth - 12;
      const maxH = (containerBounds?.height || window.innerHeight) - cardHeight - 12;

      const newX = Math.max(12, Math.min(maxW, moveEv.clientX - dragStartOffset.current.x));
      const newY = Math.max(12, Math.min(maxH, moveEv.clientY - dragStartOffset.current.y));

      setPos({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setPos((current) => {
          updateCanvasWidgetPosition(id, current.x, current.y);
          return current;
        });
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      ref={cardRef}
      data-canvas-widget={id}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`
      }}
      className="absolute z-30 select-none rounded-xs border border-hairline bg-surface-lowest/95 backdrop-blur-md shadow-2xl text-ink-primary animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Widget Header & Drag Handle */}
      <div
        onPointerDown={handlePointerDown}
        className="flex items-center justify-between h-7 px-2 border-b border-hairline bg-surface-container/60 cursor-grab active:cursor-grabbing text-xs"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal size={13} className="text-ink-tertiary shrink-0" />
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-ink-secondary truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Dock back to bar button */}
          <button
            type="button"
            onClick={() => removeCanvasWidget(id)}
            title="Anclar nuevamente a la barra"
            className="flex items-center justify-center w-5 h-5 rounded-xs text-ink-tertiary hover:text-ink-primary hover:bg-surface-high/80 transition-colors"
          >
            <ArrowDownToLine size={12} />
          </button>
        </div>
      </div>

      {/* Widget Body */}
      <div className="p-2.5">
        {children}
      </div>
    </div>
  );
};
