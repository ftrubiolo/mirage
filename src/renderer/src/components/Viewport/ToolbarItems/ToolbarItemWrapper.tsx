import React, { useState, useRef } from 'react';
import { useViewportStore } from '../../../store/viewportStore';
import { isToolbarSpacer, TOOLBAR_ITEM_NAMES } from './types';

interface ToolbarItemWrapperProps {
  itemId: string;
  index: number;
  bar?: 'toolbar' | 'statusbar';
  children: React.ReactNode;
  onContextMenu?: (e: React.MouseEvent, itemId: string) => void;
}

export const ToolbarItemWrapper: React.FC<ToolbarItemWrapperProps> = ({
  itemId,
  bar = 'toolbar',
  children,
  onContextMenu
}) => {
  const toolbarItems = useViewportStore((s) => s.toolbarItems);
  const moveBarItem = useViewportStore((s) => s.moveBarItem);

  const [isDragging, setIsDragging] = useState(false);
  const [canDrag, setCanDrag] = useState(true);
  const [dropIndicator, setDropIndicator] = useState<'before' | 'after' | null>(null);
  const dropPositionRef = useRef<'before' | 'after'>('before');

  const isSpacer = isToolbarSpacer(itemId);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't drag if clicking interactive inputs, sliders, selects, or interactive controls
    if (target.closest('input, button, select, [data-interactive="true"]')) {
      setCanDrag(false);
    } else {
      setCanDrag(true);
    }
  };

  const handleMouseUp = () => {
    setCanDrag(true);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Extra safety guard: never drag if target is an interactive input
    const target = e.target as HTMLElement;
    if (target.closest('input, button, select, [data-interactive="true"]')) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.setData('application/x-mirage-bar', bar);
    e.dataTransfer.effectAllowed = 'move';

    // High-fidelity drag preview: clone the actual component element so the user sees the real widget
    try {
      if (typeof document !== 'undefined' && e.dataTransfer.setDragImage && e.currentTarget) {
        const clone = e.currentTarget.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[data-drop-indicator]').forEach((el) => el.remove());
        clone.style.position = 'fixed';
        clone.style.top = '-9999px';
        clone.style.left = '-9999px';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '999999';
        clone.style.opacity = '0.94';
        clone.style.transform = 'none';
        clone.style.transition = 'none';
        clone.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6), 0 0 0 1px #d94e34';
        clone.style.borderRadius = '2px';
        clone.style.backgroundColor = '#181816';
        document.body.appendChild(clone);

        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = Math.max(12, Math.min(rect.width - 12, e.clientX - rect.left));
        const offsetY = Math.max(8, Math.min(rect.height - 8, e.clientY - rect.top));
        e.dataTransfer.setDragImage(clone, offsetX, offsetY);
        setTimeout(() => clone.remove(), 0);
      }
    } catch {
      // Ignore if setDragImage is unsupported or running in headless test
    }

    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const pos = e.clientX < midX ? 'before' : 'after';
    dropPositionRef.current = pos;
    setDropIndicator(pos);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the wrapper element entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropIndicator(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDropIndicator(null);
    setIsDragging(false);

    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === itemId) return;

    const sourceBar =
      (e.dataTransfer.getData('application/x-mirage-bar') as 'toolbar' | 'statusbar') ||
      (toolbarItems.includes(sourceId) ? 'toolbar' : 'statusbar');

    moveBarItem(sourceId, sourceBar, bar, undefined, itemId, dropPositionRef.current);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDropIndicator(null);
  };

  return (
    <div
      draggable={canDrag}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      onContextMenu={(e) => onContextMenu?.(e, itemId)}
      data-toolbar-item={itemId}
      data-bar-item={itemId}
      data-bar={bar}
      className={`relative ${
        isSpacer ? 'flex-1 min-w-4 flex items-center' : 'shrink-0 flex items-center'
      } ${isDragging ? 'opacity-40' : 'opacity-100'} transition-opacity duration-150`}
    >
      {/* Visual Drop Indicators */}
      {dropIndicator === 'before' && (
        <div data-drop-indicator="before" className="absolute -left-0.5 top-1 bottom-1 w-0.5 bg-action rounded-xs z-40 pointer-events-none animate-in fade-in duration-75" />
      )}
      {dropIndicator === 'after' && (
        <div data-drop-indicator="after" className="absolute -right-0.5 top-1 bottom-1 w-0.5 bg-action rounded-xs z-40 pointer-events-none animate-in fade-in duration-75" />
      )}

      {children}
    </div>
  );
};
