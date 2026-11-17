import React from 'react';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'action' | 'neutral' | 'white' | 'on-action';
  className?: string;
  label?: string;
}

const SIZE_MAP = {
  xs: 'w-3.5 h-3.5 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-6 h-6 border-2'
};

const VARIANT_MAP = {
  action: 'border-action border-t-transparent',
  neutral: 'border-ink-tertiary border-t-transparent',
  white: 'border-white border-t-transparent',
  'on-action': 'border-on-action border-t-transparent'
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'action',
  className = '',
  label
}) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} role="status">
      <div
        className={`${SIZE_MAP[size]} ${VARIANT_MAP[variant]} rounded-full animate-spin shrink-0`}
        aria-hidden="true"
      />
      {label && (
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-secondary">
          {label}
        </span>
      )}
    </div>
  );
};
