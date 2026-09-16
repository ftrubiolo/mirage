import React, { useState, useRef, useEffect } from 'react';
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
  const barDropTarget = useViewportStore((s) => s.barDropTarget);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<'before' | 'after' | null>(null);
  const dropPositionRef = useRef<'before' | 'after'>('before');

  const isSpacer = isToolbarSpacer(itemId);

  const isExternalTarget =
    barDropTarget && barDropTarget.bar === bar && barDropTarget.targetItemId === itemId
      ? barDropTarget.position
      : null;

  const activeDropIndicator = dropIndicator || isExternalTarget;

  // Synchronously disable dragging only when interacting with form inputs (like range sliders)
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isSliderOrInput = Boolean(target.closest('input, select, textarea'));
    if (isSliderOrInput) {
      isScrubbingRef.current = true;
      wrapperRef.current?.setAttribute('draggable', 'false');
    } else {
      isScrubbingRef.current = false;
      wrapperRef.current?.setAttribute('draggable', 'true');
    }
  };

  const handlePointerOver = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isSliderOrInput = Boolean(target.closest('input, select, textarea'));
    if (isSliderOrInput) {
      wrapperRef.current?.setAttribute('draggable', 'false');
    } else if (!isScrubbingRef.current) {
      wrapperRef.current?.setAttribute('draggable', 'true');
    }
  };

  const handlePointerOut = (e: React.PointerEvent) => {
    if (!isScrubbingRef.current) {
      wrapperRef.current?.setAttribute('draggable', 'true');
    }
  };

  // Ensure draggable is restored after mouse is released anywhere
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      isScrubbingRef.current = false;
      wrapperRef.current?.setAttribute('draggable', 'true');
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('mouseup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('mouseup', handleGlobalPointerUp);
    };
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Never drag if target is a range slider or text input
    const target = e.target as HTMLElement;
    if (target.closest('input, select, textarea')) {
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
      ref={wrapperRef}
      draggable
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
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
      {activeDropIndicator === 'before' && (
        <div data-drop-indicator="before" className="absolute -left-0.5 top-1 bottom-1 w-0.5 bg-action rounded-xs z-40 pointer-events-none animate-in fade-in duration-75" />
      )}
      {activeDropIndicator === 'after' && (
        <div data-drop-indicator="after" className="absolute -right-0.5 top-1 bottom-1 w-0.5 bg-action rounded-xs z-40 pointer-events-none animate-in fade-in duration-75" />
      )}

      {children}
    </div>
  );
};
