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
  const [dropIndicator, setDropIndicator] = useState<'before' | 'after' | null>(null);
  const dropPositionRef = useRef<'before' | 'after'>('before');

  const isSpacer = isToolbarSpacer(itemId);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Prevent dragging if interactive input is being manipulated
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.setData('application/x-mirage-bar', bar);
    e.dataTransfer.effectAllowed = 'move';

    // Custom high-fidelity drag badge (avoids ugly browser OS snapshots)
    try {
      if (typeof document !== 'undefined' && e.dataTransfer.setDragImage) {
        const itemName = (TOOLBAR_ITEM_NAMES as any)[itemId] || itemId;
        const badge = document.createElement('div');
        badge.style.position = 'fixed';
        badge.style.top = '-1000px';
        badge.style.left = '-1000px';
        badge.style.pointerEvents = 'none';
        badge.style.padding = '4px 10px';
        badge.style.borderRadius = '2px';
        badge.style.backgroundColor = '#181816';
        badge.style.border = '1px solid #d94e34';
        badge.style.color = '#ffffff';
        badge.style.fontFamily = 'monospace';
        badge.style.fontSize = '11px';
        badge.style.fontWeight = 'bold';
        badge.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.5)';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.gap = '6px';
        badge.style.zIndex = '9999';
        badge.innerText = `⋮⋮ ${itemName}`;
        document.body.appendChild(badge);
        e.dataTransfer.setDragImage(badge, 40, 12);
        setTimeout(() => badge.remove(), 0);
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
      draggable
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
        <div className="absolute -left-0.5 top-1 bottom-1 w-0.5 bg-action rounded-xs z-40 pointer-events-none animate-in fade-in duration-75" />
      )}
      {dropIndicator === 'after' && (
        <div className="absolute -right-0.5 top-1 bottom-1 w-0.5 bg-action rounded-xs z-40 pointer-events-none animate-in fade-in duration-75" />
      )}

      {children}
    </div>
  );
};
