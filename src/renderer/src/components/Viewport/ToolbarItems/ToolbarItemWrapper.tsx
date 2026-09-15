import React, { useState, useRef } from 'react';
import { useViewportStore } from '../../../store/viewportStore';
import { isToolbarSpacer } from './types';

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
