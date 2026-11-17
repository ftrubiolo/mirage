import React from 'react';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'action' | 'surface';
  size?: 'xs' | 'sm';
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  variant = 'action',
  size = 'sm',
  fullWidth,
  className = ''
}: SegmentedControlProps<T>) {
  const isFull =
    fullWidth !== undefined
      ? fullWidth
      : className.includes('w-full') || className.includes('flex-1') || className.includes('justify-between');

  const sizeClasses = {
    xs: 'p-0.5 text-[10px]',
    sm: 'p-0.5 text-[11px]'
  };

  const itemPadding = {
    xs: isFull ? 'px-1.5 py-1' : 'px-2 py-0.5',
    sm: isFull ? 'px-2 py-1' : 'px-2.5 py-1'
  };

  return (
    <div
      className={`items-center rounded-xs select-none ${
        isFull ? 'flex w-full' : 'inline-flex'
      } ${sizeClasses[size]} ${className} ${variant === 'action' ? 'bg-surface-container' : ''}`}
      role="tablist"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;

        const activeStyles =
          variant === 'action'
            ? 'bg-action text-on-action shadow-xs font-semibold'
            : 'text-action font-semibold';

        const inactiveStyles =
          'text-ink-secondary hover:text-ink-primary hover:bg-surface-container-high/40';

        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={opt.disabled}
            title={opt.title}
            onClick={() => !opt.disabled && onChange(opt.value)}
            className={`rounded-xs font-primary font-medium uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isFull ? 'flex-1 min-w-0 text-center' : ''
            } ${itemPadding[size]} ${isActive ? activeStyles : inactiveStyles}`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            {opt.label && <span className="truncate">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
