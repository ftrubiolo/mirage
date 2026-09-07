import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export interface InfoTooltipProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  iconClassName?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  position = 'top',
  align = 'center',
  size = 'md',
  className = '',
  iconClassName = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 0,
    left: 0,
    placement: 'top'
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<any>(null);

  const sizeWidths = {
    sm: 200,
    md: 260,
    lg: 320
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = sizeWidths[size];
    const estimatedHeight = 90;

    // Viewport collision detection: flip if placing on top would be cut off
    let placement: 'top' | 'bottom' = position;
    if (placement === 'top' && rect.top - estimatedHeight < 20) {
      placement = 'bottom';
    } else if (placement === 'bottom' && rect.bottom + estimatedHeight > window.innerHeight - 20) {
      placement = 'top';
    }

    const top = placement === 'bottom' ? rect.bottom + 6 : rect.top - 6;

    // Horizontal calculation with alignment, clamped to viewport margins
    let left: number;
    if (align === 'start') {
      left = rect.left;
    } else if (align === 'end') {
      left = rect.right - tooltipWidth;
    } else {
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    }

    // Ensure it NEVER gets cut off by left or right viewport boundaries
    left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, left));

    setCoords({ top, left, placement });
  };

  const show = () => {
    clearTimeout(timeoutRef.current);
    updatePosition();
    setIsVisible(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  useEffect(() => {
    if (!isVisible) return;

    const onScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScrollOrResize, { capture: true });
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isVisible]);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <span className={`inline-flex items-center justify-center shrink-0 leading-none cursor-default self-center -translate-y-[0.5px] ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Más información"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
        className="p-0 m-0 border-0 bg-transparent text-ink-tertiary hover:text-action focus:text-action focus:outline-none transition-colors cursor-default inline-flex items-center justify-center leading-none"
      >
        <Info className={`w-3.5 h-3.5 shrink-0 cursor-default ${iconClassName}`} />
      </button>

      {isVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${sizeWidths[size]}px`,
              transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none'
            }}
            className="z-50 p-2.5 rounded-xs bg-surface-lowest border border-hairline-strong shadow-2xl text-[11px] leading-relaxed text-ink-secondary font-body font-normal select-text pointer-events-none animate-in fade-in zoom-in-95 duration-100 text-left"
          >
            {content}
          </div>,
          document.body
        )}
    </span>
  );
};
