import React from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  isLoading?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-action hover:bg-action-hover active:bg-action-active text-on-action shadow-xs border border-transparent',
  secondary:
    'bg-surface-low hover:bg-surface-high text-ink-primary border border-hairline-strong shadow-xs',
  destructive:
    'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs border border-transparent',
  ghost:
    'bg-transparent hover:bg-surface-container text-ink-secondary hover:text-ink-primary border border-transparent',
  outline:
    'bg-transparent hover:bg-surface-container text-ink-primary border border-hairline hover:border-hairline-strong shadow-xs'
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-[10px] gap-1',
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-xs gap-2'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'sm',
      icon,
      iconRight,
      isLoading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'font-primary font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center shrink-0 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Spinner
            size={size === 'xs' ? 'xs' : 'sm'}
            variant={
              variant === 'primary'
                ? 'on-action'
                : variant === 'destructive'
                  ? 'white'
                  : 'action'
            }
          />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
