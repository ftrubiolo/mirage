import { useState, useCallback, useRef, useEffect } from 'react';

export interface ResizeCalculationOptions {
  startX: number;
  currentX: number;
  startWidth: number;
  minWidth: number;
  maxWidth: number | (() => number);
  side?: 'left' | 'right';
  collapsible?: boolean;
  collapseThreshold?: number;
  isCollapsed?: boolean;
}

export interface ResizeCalculationResult {
  nextWidth: number;
  shouldCollapse: boolean;
  shouldUncollapse: boolean;
}

/**
 * Pure resize drag math helper implementing the Sera Atelier layout physics specification:
 * - Left side vs Right side delta calculation
 * - Clamping between minWidth and maxWidth
 * - Auto-collapse detection below (minWidth - collapseThreshold)
 * - Auto-uncollapse detection when dragging outwards (> 30px uncollapse threshold)
 */
export function calculateSidebarResize(options: ResizeCalculationOptions): ResizeCalculationResult {
  const {
    startX,
    currentX,
    startWidth,
    minWidth,
    maxWidth,
    side = 'left',
    collapsible = false,
    collapseThreshold = 60,
    isCollapsed = false
  } = options;

  const delta = side === 'left' ? currentX - startX : startX - currentX;
  const currentMax = typeof maxWidth === 'function' ? maxWidth() : maxWidth;

  // Uncollapse detection from collapsed state
  if (collapsible && isCollapsed) {
    if (delta > 30) {
      return {
        nextWidth: Math.max(minWidth, Math.min(currentMax, minWidth + (delta - 30))),
        shouldCollapse: false,
        shouldUncollapse: true
      };
    }
    return {
      nextWidth: 0,
      shouldCollapse: false,
      shouldUncollapse: false
    };
  }

  // Raw unconstrained width
  const rawWidth = startWidth + delta;

  // Collapse threshold check: dragging below (minWidth - threshold)
  if (collapsible && rawWidth < minWidth - collapseThreshold) {
    return {
      nextWidth: 0,
      shouldCollapse: true,
      shouldUncollapse: false
    };
  }

  // Normal bounded clamping
  const nextWidth = Math.max(minWidth, Math.min(currentMax, rawWidth));

  return {
    nextWidth,
    shouldCollapse: false,
    shouldUncollapse: false
  };
}

export interface UseResizableSidebarOptions {
  storageKey?: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number | (() => number);
  side?: 'left' | 'right';
  // Controlled mode support (for external stores like appStore)
  width?: number;
  onWidthChange?: (width: number) => void;
  // Collapsible threshold support
  collapsible?: boolean;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  collapseThreshold?: number; // default: 60px below minWidth
}

export interface UseResizableSidebarReturn {
  width: number;
  setWidth: (width: number) => void;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleReset: () => void;
}

export function useResizableSidebar({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  side = 'left',
  width: controlledWidth,
  onWidthChange,
  collapsible = false,
  isCollapsed = false,
  onCollapseChange,
  collapseThreshold = 60
}: UseResizableSidebarOptions): UseResizableSidebarReturn {
  const isControlled = typeof controlledWidth === 'number';

  const [internalWidth, setInternalWidth] = useState<number>(() => {
    if (isControlled) {
      return controlledWidth;
    }
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const val = parseInt(saved, 10);
          if (!isNaN(val) && val >= minWidth) return val;
        }
      } catch {}
    }
    return defaultWidth;
  });

  const [isDragging, setIsDragging] = useState(false);

  const activeWidth = isControlled ? controlledWidth : internalWidth;

  const optionsRef = useRef({
    storageKey,
    defaultWidth,
    minWidth,
    maxWidth,
    side,
    isControlled,
    activeWidth,
    onWidthChange,
    collapsible,
    isCollapsed,
    onCollapseChange,
    collapseThreshold
  });

  optionsRef.current = {
    storageKey,
    defaultWidth,
    minWidth,
    maxWidth,
    side,
    isControlled,
    activeWidth,
    onWidthChange,
    collapsible,
    isCollapsed,
    onCollapseChange,
    collapseThreshold
  };

  const setWidth = useCallback((newWidth: number) => {
    const opts = optionsRef.current;
    if (!opts.isControlled) {
      setInternalWidth(newWidth);
    }
    opts.onWidthChange?.(newWidth);
    if (opts.storageKey) {
      try {
        localStorage.setItem(opts.storageKey, String(newWidth));
      } catch {}
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const opts = optionsRef.current;
      const startX = e.clientX;
      const startWidth = opts.activeWidth;
      const preDragWidth = startWidth;

      let sessionCollapsed = Boolean(opts.collapsible && opts.isCollapsed);

      const onMouseMove = (moveEvent: MouseEvent) => {
        const currentOpts = optionsRef.current;
        const res = calculateSidebarResize({
          startX,
          currentX: moveEvent.clientX,
          startWidth,
          minWidth: currentOpts.minWidth,
          maxWidth: currentOpts.maxWidth,
          side: currentOpts.side,
          collapsible: currentOpts.collapsible,
          collapseThreshold: currentOpts.collapseThreshold,
          isCollapsed: sessionCollapsed
        });

        if (res.shouldCollapse) {
          if (!sessionCollapsed) {
            sessionCollapsed = true;
            currentOpts.onCollapseChange?.(true);
            setWidth(preDragWidth);
          }
          return;
        }

        if (res.shouldUncollapse) {
          sessionCollapsed = false;
          currentOpts.onCollapseChange?.(false);
          setWidth(res.nextWidth);
          return;
        }

        if (!sessionCollapsed) {
          setWidth(res.nextWidth);
        }
      };

      const onMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        const currentOpts = optionsRef.current;
        if (currentOpts.collapsible && sessionCollapsed) {
          setWidth(preDragWidth);
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [setWidth]
  );

  const handleReset = useCallback(() => {
    const opts = optionsRef.current;
    setWidth(opts.defaultWidth);
    if (opts.collapsible && opts.isCollapsed) {
      opts.onCollapseChange?.(false);
    }
  }, [setWidth]);

  return {
    width: activeWidth,
    setWidth,
    isDragging,
    handleMouseDown,
    handleReset
  };
}
