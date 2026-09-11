import React from 'react';
import { Spinner } from './Spinner';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
export type IconButtonSize = 'xs' | 'sm' | 'md';

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
}

const VARIANT_STYLES: Record<IconButtonVariant, string> = {
  primary:
    'bg-action hover:bg-action-hover active:bg-action-active text-white shadow-xs border border-transparent',
  secondary:
    'bg-surface-low hover:bg-surface-high text-ink-primary border border-hairline-strong shadow-xs',
  ghost:
    'bg-transparent hover:bg-surface-container text-ink-secondary hover:text-ink-primary border border-transparent',
  outline:
    'bg-transparent hover:bg-surface-container text-ink-secondary hover:text-ink-primary border border-hairline hover:border-hairline-strong shadow-xs',
  destructive:
    'bg-transparent hover:bg-rose-600 hover:text-white text-ink-tertiary border border-hairline hover:border-rose-600'
};

const SIZE_STYLES: Record<IconButtonSize, string> = {
  xs: 'w-6 h-6 p-1 text-[10px]',
  sm: 'w-7 h-7 p-1.5 text-xs',
  md: 'w-8 h-8 p-2 text-xs'
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'ghost',
      size = 'sm',
      isLoading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`rounded-xs transition-colors inline-flex items-center justify-center shrink-0 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          VARIANT_STYLES[variant]
        } ${SIZE_STYLES[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Spinner
            size="xs"
            variant={variant === 'primary' ? 'white' : 'action'}
          />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
