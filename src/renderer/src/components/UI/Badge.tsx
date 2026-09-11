import React from 'react';

export type BadgeVariant = 'neutral' | 'action' | 'outline' | 'contrast';
export type BadgeSize = 'xs' | 'sm';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  mono?: boolean;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-container text-ink-secondary border border-hairline',
  action: 'bg-action text-white shadow-xs border border-transparent',
  outline: 'bg-transparent text-ink-secondary border border-hairline',
  contrast: 'bg-ink-primary text-surface-lowest border border-transparent'
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[9px]',
  sm: 'px-2 py-0.5 text-[10px]'
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  mono = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center font-semibold uppercase tracking-wider rounded-xs select-none ${
        mono ? 'font-mono' : 'font-primary'
      } ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
