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
  className?: string;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  variant = 'action',
  size = 'sm',
  className = ''
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    xs: 'p-0.5 text-[10px]',
    sm: 'p-0.5 text-[11px]'
  };

  const itemPadding = {
    xs: 'px-2 py-0.5',
    sm: 'px-2.5 py-1'
  };

  return (
    <div
      className={`inline-flex items-center bg-surface-container rounded-xs border border-hairline select-none ${sizeClasses[size]} ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;

        const activeStyles =
          variant === 'action'
            ? 'bg-action text-white shadow-xs'
            : 'bg-surface-lowest text-action shadow-xs border border-hairline';

        const inactiveStyles =
          'text-ink-secondary hover:text-ink-primary hover:bg-surface-container-high/40 border border-transparent';

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
              itemPadding[size]
            } ${isActive ? activeStyles : inactiveStyles}`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            {opt.label && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
