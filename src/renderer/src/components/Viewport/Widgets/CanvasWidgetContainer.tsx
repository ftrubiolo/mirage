import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GripHorizontal, ArrowDownToLine, MoreHorizontal } from 'lucide-react';
import { useViewportStore, BarDropTarget } from '../../../store/viewportStore';
import { BarItemRenderer } from '../ToolbarItems/BarItemRenderer';

interface CanvasWidgetContainerProps {
  id: string;
  title: string;
  x: number;
  y: number;
  containerBounds?: { width: number; height: number };
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  noPadding?: boolean;
  verticalHeader?: boolean;
  expandableHeader?: boolean;
}

interface CachedWidgetBox {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

const SNAP_THRESHOLD = 20;
const SNAP_PROXIMITY = 40;

export const CanvasWidgetContainer: React.FC<CanvasWidgetContainerProps> = ({
  id,
  title,
  x,
  y,
  containerBounds,
  children,
  headerActions,
  noPadding = false,
  verticalHeader = false,
  expandableHeader = false
}) => {
  const updateCanvasWidgetPosition = useViewportStore((s) => s.updateCanvasWidgetPosition);
  const removeCanvasWidget = useViewportStore((s) => s.removeCanvasWidget);
  const moveBarItem = useViewportStore((s) => s.moveBarItem);
  const setBarDropTarget = useViewportStore((s) => s.setBarDropTarget);

  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [isSnapped, setIsSnapped] = useState<{
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
    widget: boolean;
  }>({
    left: false,
    right: false,
    top: false,
    bottom: false,
    widget: false
  });
  const [dockTarget, setDockTarget] = useState<'toolbar' | 'statusbar' | null>(null);
  const [isPopped, setIsPopped] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const cachedDimensions = useRef({ width: 260, height: 120 });
  const cachedBounds = useRef({ width: 1000, height: 800 });
  const cachedOtherWidgets = useRef<CachedWidgetBox[]>([]);
  const currentPosRef = useRef({ x, y });
  const dockTargetRef = useRef<'toolbar' | 'statusbar' | null>(null);
  const activeSlotRef = useRef<{
    bar: 'toolbar' | 'statusbar';
    targetItemId?: string;
    position: 'before' | 'after';
    targetIndex?: number;
  } | null>(null);

  // Sync prop changes when position changes externally
  useEffect(() => {
    setPos({ x, y });
    currentPosRef.current = { x, y };
  }, [x, y]);

  // Clean up any lingering drop targets if unmounted while dragging
  useEffect(() => {
    return () => {
      setBarDropTarget(null);
    };
  }, [setBarDropTarget]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Don't start canvas dragging if clicking interactive controls inside header
    if (target.closest('button, input, select, [data-interactive="true"]')) {
      return;
    }

    // Cache dimensions and bounds once at drag start (prevents layout thrashing during pointermove)
    const card = cardRef.current;
    if (card) {
      const cardRect = card.getBoundingClientRect();
      const isVerticalCard = verticalHeader || card.classList.contains('w-[46px]');
      const fallbackW = isVerticalCard ? 46 : 260;
      cachedDimensions.current = {
        width: card.offsetWidth || (cardRect.width > 0 ? cardRect.width : fallbackW),
        height: card.offsetHeight || (cardRect.height > 0 ? cardRect.height : 120)
      };
      const parent = card.parentElement;
      cachedBounds.current = {
        width: containerBounds?.width || parent?.clientWidth || window.innerWidth,
        height: containerBounds?.height || parent?.clientHeight || window.innerHeight
      };

      // Query and cache bounding boxes of all other canvas widgets
      const otherBoxes: CachedWidgetBox[] = [];
      const allWidgetEls = (parent || document).querySelectorAll('[data-canvas-widget]');
      allWidgetEls.forEach((el) => {
        const otherId = el.getAttribute('data-canvas-widget');
        if (otherId && otherId !== id && el !== card) {
          const htmlEl = el as HTMLElement;
          const elRect = htmlEl.getBoundingClientRect();
          const pRect = parent?.getBoundingClientRect();
          const isOtherVertical = htmlEl.classList.contains('w-[46px]');
          const fallbackOtherW = isOtherVertical ? 46 : 260;

          const otherWidth = htmlEl.offsetWidth || (elRect.width > 0 ? elRect.width : fallbackOtherW);
          const otherHeight = htmlEl.offsetHeight || (elRect.height > 0 ? elRect.height : 120);
          let otherLeft = 0;
          let otherTop = 0;

          if (elRect.width > 0) {
            otherLeft = elRect.left - (pRect?.left || 0);
            otherTop = elRect.top - (pRect?.top || 0);
          } else {
            const storeWidget = useViewportStore.getState().canvasWidgets.find((w) => w.id === otherId);
            if (storeWidget) {
              otherLeft = storeWidget.x;
              otherTop = storeWidget.y;
            }
          }

          otherBoxes.push({
            id: otherId,
            left: otherLeft,
            right: otherLeft + otherWidth,
            top: otherTop,
            bottom: otherTop + otherHeight,
            width: otherWidth,
            height: otherHeight
          });
        }
      });
      cachedOtherWidgets.current = otherBoxes;
    }

    isDraggingRef.current = true;
    dragStartOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
    dockTargetRef.current = null;
    activeSlotRef.current = null;
    setDockTarget(null);
    setIsPopped(false);
    setBarDropTarget(null);

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingRef.current || !cardRef.current) return;

      const cardW = cachedDimensions.current.width;
      const cardH = cachedDimensions.current.height;
      const maxW = Math.max(0, cachedBounds.current.width - cardW);
      const maxH = Math.max(0, cachedBounds.current.height - cardH);

      const rawX = moveEv.clientX - dragStartOffset.current.x;
      const rawY = moveEv.clientY - dragStartOffset.current.y;

      // Detect if cursor is in top toolbar or bottom statusbar zone
      const toolbarEl = document.querySelector('header[aria-label*="toolbar"]');
      const statusbarEl = document.querySelector('footer[aria-label*="Status bar"]');

      let activeBar: 'toolbar' | 'statusbar' | null = null;
      if (toolbarEl) {
        const tRect = toolbarEl.getBoundingClientRect();
        const toolbarBottom = tRect.height > 0 ? tRect.bottom + 6 : 52;
        if (moveEv.clientY <= toolbarBottom || rawY < -15) {
          activeBar = 'toolbar';
        }
      } else if (moveEv.clientY <= 52 || rawY < -15) {
        activeBar = 'toolbar';
      }

      if (!activeBar) {
        if (statusbarEl) {
          const sRect = statusbarEl.getBoundingClientRect();
          const statusbarTop =
            sRect.height > 0
              ? sRect.top - 6
              : containerBounds?.height
                ? containerBounds.height - 52
                : window.innerHeight - 52;
          if (moveEv.clientY >= statusbarTop || rawY > maxH + 15) {
            activeBar = 'statusbar';
          }
        } else if (
          moveEv.clientY >= (containerBounds?.height ? containerBounds.height - 52 : window.innerHeight - 52) ||
          rawY > maxH + 15
        ) {
          activeBar = 'statusbar';
        }
      }

      // Transition to/from Popped Bar Drag State
      if (activeBar) {
        // Pop into compact bar item preview
        if (!isPopped) {
          setIsPopped(true);
        }

        // Hide full canvas widget card while dragging over bar
        cardRef.current.style.opacity = '0';
        cardRef.current.style.pointerEvents = 'none';

        // Position compact preview directly under pointer
        if (previewRef.current) {
          previewRef.current.style.display = 'flex';
          const pW = previewRef.current.offsetWidth || 80;
          const pH = previewRef.current.offsetHeight || 28;
          previewRef.current.style.transform = `translate3d(${moveEv.clientX - pW / 2}px, ${moveEv.clientY - pH / 2}px, 0)`;
        }

        // Compute drop slot in the target bar
        const itemEls = Array.from(
          document.querySelectorAll(`[data-bar="${activeBar}"][data-bar-item]`)
        ) as HTMLElement[];

        let targetItemId: string | undefined = undefined;
        let position: 'before' | 'after' = 'before';
        let targetIndex: number | undefined = undefined;

        if (itemEls.length === 0) {
          targetItemId = undefined;
          position = 'before';
          targetIndex = 0;
        } else {
          let found = false;
          for (let i = 0; i < itemEls.length; i++) {
            const el = itemEls[i];
            const rect = el.getBoundingClientRect();
            const itId = el.getAttribute('data-bar-item') || '';

            if (moveEv.clientX < rect.left + rect.width / 2) {
              targetItemId = itId;
              position = 'before';
              targetIndex = i;
              found = true;
              break;
            }
          }
          if (!found) {
            const lastEl = itemEls[itemEls.length - 1];
            targetItemId = lastEl.getAttribute('data-bar-item') || undefined;
            position = 'after';
            targetIndex = itemEls.length;
          }
        }

        const nextSlot: BarDropTarget = {
          bar: activeBar,
          targetItemId,
          position,
          targetIndex
        };

        const prevSlot = activeSlotRef.current;
        if (
          !prevSlot ||
          prevSlot.bar !== nextSlot.bar ||
          prevSlot.targetItemId !== nextSlot.targetItemId ||
          prevSlot.position !== nextSlot.position
        ) {
          activeSlotRef.current = nextSlot;
          setBarDropTarget(nextSlot);
        }

        if (activeBar !== dockTargetRef.current) {
          dockTargetRef.current = activeBar;
          setDockTarget(activeBar);
        }
      } else {
        // Cursor is inside canvas: restore widget card, hide bar preview, clear bar drop target
        if (dockTargetRef.current || activeSlotRef.current) {
          dockTargetRef.current = null;
          activeSlotRef.current = null;
          setDockTarget(null);
          setBarDropTarget(null);
        }

        setIsPopped(false);
        cardRef.current.style.opacity = '1';
        cardRef.current.style.pointerEvents = 'auto';

        if (previewRef.current) {
          previewRef.current.style.display = 'none';
        }

        // Edge snapping & Widget-to-Widget snapping with magnetic alignment
        let bestDistX = SNAP_THRESHOLD + 1;
        let bestSnapX = rawX;
        let snapLeft = false;
        let snapRight = false;
        let snappedWidgetX = false;

        // 1. Screen boundaries (X)
        const distScreenLeft = Math.abs(rawX - 0);
        if (distScreenLeft <= SNAP_THRESHOLD && distScreenLeft < bestDistX) {
          bestDistX = distScreenLeft;
          bestSnapX = 0;
          snapLeft = true;
        }

        const distScreenRight = Math.abs(rawX - maxW);
        if (distScreenRight <= SNAP_THRESHOLD && distScreenRight < bestDistX) {
          bestDistX = distScreenRight;
          bestSnapX = maxW;
          snapRight = true;
          snapLeft = false;
        }

        // 2. Widget-to-widget snapping (X)
        for (const other of cachedOtherWidgets.current) {
          const gapY = Math.max(0, Math.max(rawY - other.bottom, other.top - (rawY + cardH)));
          if (gapY <= SNAP_PROXIMITY) {
            const candidatesX = [
              other.right,                                      // Attach to right: [other][dragged]
              other.left - cardW,                               // Attach to left:  [dragged][other]
              other.left,                                       // Align left edges
              other.right - cardW,                              // Align right edges
              other.left + Math.round((other.width - cardW) / 2) // Align horizontal center
            ];

            for (const candX of candidatesX) {
              const dist = Math.abs(rawX - candX);
              if (dist <= SNAP_THRESHOLD && dist < bestDistX) {
                bestDistX = dist;
                bestSnapX = candX;
                snappedWidgetX = true;
                snapLeft = false;
                snapRight = false;
              }
            }
          }
        }

        let bestDistY = SNAP_THRESHOLD + 1;
        let bestSnapY = rawY;
        let snapTop = false;
        let snapBottom = false;
        let snappedWidgetY = false;

        // 1. Screen boundaries (Y)
        const distScreenTop = Math.abs(rawY - 0);
        if (distScreenTop <= SNAP_THRESHOLD && distScreenTop < bestDistY) {
          bestDistY = distScreenTop;
          bestSnapY = 0;
          snapTop = true;
        }

        const distScreenBottom = Math.abs(rawY - maxH);
        if (distScreenBottom <= SNAP_THRESHOLD && distScreenBottom < bestDistY) {
          bestDistY = distScreenBottom;
          bestSnapY = maxH;
          snapBottom = true;
          snapTop = false;
        }

        // 2. Widget-to-widget snapping (Y)
        for (const other of cachedOtherWidgets.current) {
          const gapX = Math.max(0, Math.max(rawX - other.right, other.left - (rawX + cardW)));
          if (gapX <= SNAP_PROXIMITY) {
            const candidatesY = [
              other.bottom,                                       // Attach to bottom: [other] / [dragged]
              other.top - cardH,                                  // Attach to top:    [dragged] / [other]
              other.top,                                          // Align top edges
              other.bottom - cardH,                               // Align bottom edges
              other.top + Math.round((other.height - cardH) / 2)   // Align vertical center
            ];

            for (const candY of candidatesY) {
              const dist = Math.abs(rawY - candY);
              if (dist <= SNAP_THRESHOLD && dist < bestDistY) {
                bestDistY = dist;
                bestSnapY = candY;
                snappedWidgetY = true;
                snapTop = false;
                snapBottom = false;
              }
            }
          }
        }

        // Final boundary clamp inside canvas
        const clampedX = Math.max(0, Math.min(maxW, bestSnapX));
        const clampedY = Math.max(0, Math.min(maxH, bestSnapY));

        currentPosRef.current = { x: clampedX, y: clampedY };
        cardRef.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;

        const isSnappedToWidget = snappedWidgetX || snappedWidgetY;
        setIsSnapped({
          left: snapLeft,
          right: snapRight,
          top: snapTop,
          bottom: snapBottom,
          widget: isSnappedToWidget
        });
      }
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsPopped(false);
        setBarDropTarget(null);

        if (previewRef.current) {
          previewRef.current.style.display = 'none';
        }

        if (cardRef.current) {
          cardRef.current.style.opacity = '1';
          cardRef.current.style.pointerEvents = 'auto';
        }

        if (activeSlotRef.current) {
          // Drop into exact chosen slot in bar
          const slot = activeSlotRef.current;
          activeSlotRef.current = null;
          dockTargetRef.current = null;
          setDockTarget(null);
          moveBarItem(id, 'canvas', slot.bar, slot.targetIndex, slot.targetItemId, slot.position);
        } else if (dockTargetRef.current) {
          // Fallback dock if bar slot wasn't resolved
          const target = dockTargetRef.current;
          dockTargetRef.current = null;
          setDockTarget(null);
          removeCanvasWidget(id, target);
        } else {
          // Commit position in canvas
          const finalX = currentPosRef.current.x;
          const finalY = currentPosRef.current.y;
          setPos({ x: finalX, y: finalY });
          updateCanvasWidgetPosition(id, finalX, finalY);
          setIsSnapped({ left: false, right: false, top: false, bottom: false, widget: false });
        }
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const snapClass =
    isSnapped.left || isSnapped.right || isSnapped.top || isSnapped.bottom || isSnapped.widget
      ? 'border-action ring-1 ring-action/50 shadow-2xl'
      : 'border-hairline shadow-2xl';

  const dockIndicatorClass =
    dockTarget === 'toolbar' || dockTarget === 'statusbar'
      ? 'border-action ring-1 ring-action'
      : '';

  return (
    <>
      <div
        ref={cardRef}
        data-canvas-widget={id}
        data-snapped={isSnapped.widget ? 'widget' : isSnapped.left || isSnapped.right || isSnapped.top || isSnapped.bottom ? 'edge' : undefined}
        onDragStart={(e) => e.preventDefault()}
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          left: 0,
          top: 0
        }}
        className={`absolute z-30 select-none rounded-none border bg-surface-lowest shadow-2xl text-ink-primary antialiased transition-shadow duration-100 ${snapClass} ${dockIndicatorClass} ${verticalHeader ? 'w-[46px]' : ''}`}
      >
        {/* Widget Header & Drag Handle */}
        {verticalHeader ? (
          <div
            onPointerDown={handlePointerDown}
            className="flex flex-col border-b border-hairline bg-surface-container/60 cursor-grab active:cursor-grabbing text-xs w-full"
          >
            {/* Row 1: Drag handle + Expandable "..." button */}
            <div className="flex items-center justify-between h-5 px-1.5">
              <div
                title={title ? `${title} (Drag to move)` : 'Drag to move'}
                className="flex items-center cursor-grab active:cursor-grabbing hover:text-ink-primary"
              >
                <GripHorizontal size={11} className="text-ink-tertiary hover:text-action shrink-0" />
              </div>
              <button
                type="button"
                onClick={() => setIsHeaderExpanded((prev) => !prev)}
                title={isHeaderExpanded ? 'Hide options' : 'Show options'}
                aria-label={isHeaderExpanded ? 'Hide options' : 'More options'}
                className={`flex items-center justify-center w-4 h-4 rounded-none transition-colors cursor-pointer ${
                  isHeaderExpanded
                    ? 'text-action bg-surface-high/80'
                    : 'text-ink-tertiary hover:text-action hover:bg-surface-high/80'
                }`}
              >
                <MoreHorizontal size={12} />
              </button>
            </div>
            {/* Row 2: Expanded actions row (Only visible when isHeaderExpanded === true) */}
            {isHeaderExpanded && (
              <div className="flex items-center justify-between h-4.5 px-1 border-t border-hairline/60 bg-surface-container/40 text-xs w-full animate-in slide-in-from-top-1 duration-100">
                {headerActions}
                <button
                  type="button"
                  onClick={() => removeCanvasWidget(id)}
                  title="Dock back to bar"
                  aria-label="Dock back to bar"
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-none text-ink-tertiary hover:text-action hover:bg-surface-high/80 transition-colors cursor-pointer"
                >
                  <ArrowDownToLine size={9} />
                </button>
              </div>
            )}
          </div>
        ) : expandableHeader ? (
          <div
            onPointerDown={handlePointerDown}
            className="flex items-center justify-between h-5 px-1.5 border-b border-hairline bg-surface-container/60 cursor-grab active:cursor-grabbing text-xs"
          >
            <div
              title={title ? `${title} (Drag to move)` : 'Drag to move'}
              className="flex items-center gap-1 cursor-grab active:cursor-grabbing hover:text-ink-primary"
            >
              <GripHorizontal size={12} className="text-ink-tertiary hover:text-action shrink-0" />
            </div>

            <div className="flex items-center gap-0.5 shrink-0 ml-1">
              {isHeaderExpanded && (
                <div className="flex items-center gap-0.5 animate-in fade-in duration-100">
                  {headerActions}
                  <button
                    type="button"
                    onClick={() => removeCanvasWidget(id)}
                    title="Dock back to bar"
                    aria-label="Dock back to bar"
                    className="flex items-center justify-center w-4 h-4 rounded-none text-ink-tertiary hover:text-action hover:bg-surface-high/80 transition-colors cursor-pointer"
                  >
                    <ArrowDownToLine size={10} />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsHeaderExpanded((prev) => !prev)}
                title={isHeaderExpanded ? 'Hide options' : 'Show options'}
                aria-label={isHeaderExpanded ? 'Hide options' : 'More options'}
                className={`flex items-center justify-center w-4 h-4 rounded-none transition-colors cursor-pointer ${
                  isHeaderExpanded
                    ? 'text-action bg-surface-high/80'
                    : 'text-ink-tertiary hover:text-action hover:bg-surface-high/80'
                }`}
              >
                <MoreHorizontal size={12} />
              </button>
            </div>
          </div>
        ) : (
          <div
            onPointerDown={handlePointerDown}
            className="flex items-center justify-between h-5 px-1.5 border-b border-hairline bg-surface-container/60 cursor-grab active:cursor-grabbing text-xs"
          >
            <div
              title={title ? `${title} (Drag to move)` : 'Drag to move'}
              className="flex items-center gap-1 cursor-grab active:cursor-grabbing hover:text-ink-primary"
            >
              <GripHorizontal size={12} className="text-ink-tertiary hover:text-action shrink-0" />
            </div>

            <div className="flex items-center gap-0.5 shrink-0 ml-1">
              {headerActions}
              {/* Dock back to bar button */}
              <button
                type="button"
                onClick={() => removeCanvasWidget(id)}
                title="Dock back to bar"
                className="flex items-center justify-center w-4 h-4 rounded-none text-ink-tertiary hover:text-action hover:bg-surface-high/80 transition-colors cursor-pointer"
              >
                <ArrowDownToLine size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Widget Body */}
        <div className={noPadding ? 'p-0' : 'p-2.5'}>
          {children}
        </div>
      </div>

      {/* Popped Bar Drag Preview (Portal rendered directly to body to avoid overflow containment) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={previewRef}
            data-canvas-widget-drag-preview={id}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              zIndex: 999999,
              pointerEvents: 'none',
              display: isPopped ? 'flex' : 'none',
              transform: 'none'
            }}
            className="items-center h-7 px-1.5 rounded-none border border-action bg-surface-lowest shadow-2xl ring-1 ring-action/50 text-ink-primary select-none animate-in zoom-in-95 duration-75 antialiased"
          >
            <BarItemRenderer id={id} compact={true} iconOnly={false} />
          </div>,
          document.body
        )}
    </>
  );
};
