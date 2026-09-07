import { useState, useCallback } from 'react';

export interface UseResizableSidebarOptions {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number | (() => number);
  side?: 'left' | 'right';
}

export function useResizableSidebar({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  side = 'left'
}: UseResizableSidebarOptions) {
  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= minWidth) return val;
      }
    } catch {}
    return defaultWidth;
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startWidth = width;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = side === 'left' ? moveEvent.clientX - startX : startX - moveEvent.clientX;
        const currentMax = typeof maxWidth === 'function' ? maxWidth() : maxWidth;
        const next = Math.max(minWidth, Math.min(currentMax, startWidth + delta));
        setWidth(next);
        try {
          localStorage.setItem(storageKey, String(next));
        } catch {}
      };

      const onMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [width, minWidth, maxWidth, side, storageKey]
  );

  const handleReset = useCallback(() => {
    setWidth(defaultWidth);
    try {
      localStorage.setItem(storageKey, String(defaultWidth));
    } catch {}
  }, [defaultWidth, storageKey]);

  return {
    width,
    setWidth,
    isDragging,
    handleMouseDown,
    handleReset
  };
}
