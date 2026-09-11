import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight } from 'lucide-react';

interface ContextMenuContextValue {
  onClose: () => void;
  rootX: number;
  rootY: number;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  children,
  width = 224, // w-56 default
  className = ''
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !position) return null;

  const estimatedHeight = 320;
  const clampedX = Math.max(8, Math.min(window.innerWidth - width - 8, position.x));
  const clampedY = Math.max(8, Math.min(window.innerHeight - estimatedHeight - 8, position.y));

  return createPortal(
    <ContextMenuContext.Provider value={{ onClose, rootX: clampedX, rootY: clampedY }}>
      <div
        ref={menuRef}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: `${clampedX}px`,
          top: `${clampedY}px`,
          width: `${width}px`
        }}
        className={`z-50 rounded-xs bg-surface-lowest border border-hairline-strong shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-75 font-body text-ink-primary ${className}`}
      >
        {children}
      </div>
    </ContextMenuContext.Provider>,
    document.body
  );
};

export interface ContextMenuHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const ContextMenuHeader: React.FC<ContextMenuHeaderProps> = ({
  children,
  className = ''
}) => {
  return (
    <div
      className={`px-3 py-1 text-[10px] font-primary font-bold uppercase tracking-wider text-ink-tertiary border-b border-hairline flex items-center justify-between ${className}`}
    >
      <span>{children}</span>
    </div>
  );
};

export interface ContextMenuItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  shortcut?: string;
  badge?: React.ReactNode;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  closeOnClick?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  title?: string;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  children,
  icon,
  shortcut,
  badge,
  checked,
  danger = false,
  disabled = false,
  closeOnClick = true,
  onClick,
  className = '',
  title
}) => {
  const ctx = useContext(ContextMenuContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClick?.(e);
    if (closeOnClick && ctx) {
      ctx.onClose();
    }
  };

  const hasCheckSlot = checked !== undefined;

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={handleClick}
      className={`group w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? 'text-ink-secondary hover:bg-rose-600 hover:text-white'
          : 'text-ink-primary hover:bg-surface-container'
      } ${className}`}
    >
      <div className="flex items-center gap-2 truncate min-w-0 flex-1">
        {hasCheckSlot && (
          <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
            {checked && <Check className="w-3.5 h-3.5 text-action shrink-0" />}
          </span>
        )}
        {icon && (
          <span
            className={`shrink-0 ${
              danger ? 'group-hover:text-white' : 'text-action'
            }`}
          >
            {icon}
          </span>
        )}
        <span className="truncate">{children}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {badge && <span className="shrink-0">{badge}</span>}
        {shortcut && (
          <span
            className={`font-mono text-[10px] uppercase shrink-0 ${
              danger
                ? 'text-ink-tertiary group-hover:text-white/80'
                : 'text-ink-tertiary'
            }`}
          >
            {shortcut}
          </span>
        )}
      </div>
    </button>
  );
};

export interface ContextMenuSubProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
  className?: string;
}

export const ContextMenuSub: React.FC<ContextMenuSubProps> = ({
  label,
  icon,
  children,
  width = 224,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const ctx = useContext(ContextMenuContext);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Determine whether to open left or right based on window boundary
  const openLeft = useCallback(() => {
    if (!ctx) return false;
    const estimatedRight = ctx.rootX + 224 + width;
    return estimatedRight > window.innerWidth;
  }, [ctx, width]);

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`px-3 py-1.5 flex items-center justify-between hover:bg-surface-container cursor-pointer transition-colors text-ink-primary ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-action shrink-0">{icon}</span>}
          <span className="truncate">{label}</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-ink-tertiary shrink-0 ml-1.5" />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            [openLeft() ? 'right' : 'left']: '100%',
            width: `${width}px`
          }}
          className="z-50 rounded-xs bg-surface-lowest border border-hairline-strong shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-75 font-body text-ink-primary"
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const ContextMenuSeparator: React.FC<{ className?: string }> = ({
  className = ''
}) => {
  return <div className={`border-t border-hairline my-1 ${className}`} />;
};

export interface ContextMenuCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  className?: string;
}

export const ContextMenuCheckbox: React.FC<ContextMenuCheckboxProps> = ({
  label,
  checked,
  onChange,
  icon,
  shortcut,
  disabled,
  className
}) => {
  return (
    <ContextMenuItem
      checked={checked}
      icon={icon}
      shortcut={shortcut}
      disabled={disabled}
      closeOnClick={false}
      onClick={() => onChange(!checked)}
      className={className}
    >
      {label}
    </ContextMenuItem>
  );
};

export const ContextMenuCustom: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return <div className={`px-3 py-1 text-xs ${className}`}>{children}</div>;
};
