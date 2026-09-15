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

const SNAP_THRESHOLD = 20;

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
  const [isSnapped, setIsSnapped] = useState<{ left: boolean; right: boolean; top: boolean; bottom: boolean }>({
    left: false,
    right: false,
    top: false,
    bottom: false
  });
  const [dockTarget, setDockTarget] = useState<'toolbar' | 'statusbar' | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const cachedDimensions = useRef({ width: 260, height: 120 });
  const cachedBounds = useRef({ width: 1000, height: 800 });
  const currentPosRef = useRef({ x, y });
  const dockTargetRef = useRef<'toolbar' | 'statusbar' | null>(null);

  // Sync prop changes when position changes externally
  useEffect(() => {
    setPos({ x, y });
    currentPosRef.current = { x, y };
  }, [x, y]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Don't start canvas dragging if clicking interactive controls inside header
    if (target.closest('button, input, select, [data-interactive="true"]')) {
      return;
    }

    // Cache dimensions and bounds once at drag start (prevents layout thrashing during pointermove)
    const card = cardRef.current;
    if (card) {
      cachedDimensions.current = {
        width: card.offsetWidth || 260,
        height: card.offsetHeight || 120
      };
      const parent = card.parentElement;
      cachedBounds.current = {
        width: containerBounds?.width || parent?.clientWidth || window.innerWidth,
        height: containerBounds?.height || parent?.clientHeight || window.innerHeight
      };
    }

    isDraggingRef.current = true;
    dragStartOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
    dockTargetRef.current = null;
    setDockTarget(null);

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingRef.current || !cardRef.current) return;

      const cardW = cachedDimensions.current.width;
      const cardH = cachedDimensions.current.height;
      const maxW = Math.max(0, cachedBounds.current.width - cardW);
      const maxH = Math.max(0, cachedBounds.current.height - cardH);

      const rawX = moveEv.clientX - dragStartOffset.current.x;
      const rawY = moveEv.clientY - dragStartOffset.current.y;

      // Detect docking back to top toolbar or bottom statusbar
      let activeDock: 'toolbar' | 'statusbar' | null = null;
      if (moveEv.clientY <= 52 || rawY < -15) {
        activeDock = 'toolbar';
      } else if (moveEv.clientY >= window.innerHeight - 52 || rawY > maxH + 15) {
        activeDock = 'statusbar';
      }

      if (activeDock !== dockTargetRef.current) {
        dockTargetRef.current = activeDock;
        setDockTarget(activeDock);
      }

      // Edge snapping with continuous edge sliding
      const snapLeft = rawX <= SNAP_THRESHOLD;
      const snapRight = rawX >= maxW - SNAP_THRESHOLD;
      const snapTop = rawY <= SNAP_THRESHOLD;
      const snapBottom = rawY >= maxH - SNAP_THRESHOLD;

      let clampedX = rawX;
      let clampedY = rawY;

      if (snapLeft) {
        clampedX = 0;
      } else if (snapRight) {
        clampedX = maxW;
      }

      if (snapTop) {
        clampedY = 0;
      } else if (snapBottom) {
        clampedY = maxH;
      }

      // Final boundary clamp
      clampedX = Math.max(0, Math.min(maxW, clampedX));
      clampedY = Math.max(0, Math.min(maxH, clampedY));

      currentPosRef.current = { x: clampedX, y: clampedY };

      // Direct GPU transform update: 0 layout thrash, 60-144 FPS smooth
      cardRef.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;

      setIsSnapped({
        left: snapLeft,
        right: snapRight,
        top: snapTop,
        bottom: snapBottom
      });
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;

        if (dockTargetRef.current) {
          const target = dockTargetRef.current;
          dockTargetRef.current = null;
          setDockTarget(null);
          removeCanvasWidget(id, target);
        } else {
          const finalX = currentPosRef.current.x;
          const finalY = currentPosRef.current.y;
          setPos({ x: finalX, y: finalY });
          updateCanvasWidgetPosition(id, finalX, finalY);
          setIsSnapped({ left: false, right: false, top: false, bottom: false });
        }
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const snapClass =
    isSnapped.left || isSnapped.right || isSnapped.top || isSnapped.bottom
      ? 'border-action shadow-2xl'
      : 'border-hairline shadow-2xl';

  const dockIndicatorClass =
    dockTarget === 'toolbar' || dockTarget === 'statusbar'
      ? 'border-action ring-1 ring-action'
      : '';

  return (
    <div
      ref={cardRef}
      data-canvas-widget={id}
      onDragStart={(e) => e.preventDefault()}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        left: 0,
        top: 0
      }}
      className={`absolute z-30 select-none rounded-xs border bg-surface-lowest/95 backdrop-blur-md text-ink-primary transition-shadow duration-100 ${snapClass} ${dockIndicatorClass}`}
    >
      {/* Widget Header & Drag Handle */}
      <div
        onPointerDown={handlePointerDown}
        className="flex items-center justify-between h-7 px-2 border-b border-hairline bg-surface-container/60 cursor-grab active:cursor-grabbing text-xs"
      >
        <div
          title="Arrastrar para mover (o acercar al borde para anclar)"
          className="flex items-center gap-1.5 min-w-0 cursor-grab active:cursor-grabbing hover:text-ink-primary"
        >
          <GripHorizontal size={13} className="text-ink-tertiary hover:text-action shrink-0" />
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
            className="flex items-center justify-center w-5 h-5 rounded-xs text-ink-tertiary hover:text-action hover:bg-surface-high/80 transition-colors"
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
