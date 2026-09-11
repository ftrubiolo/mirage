import React from 'react';
import { X } from 'lucide-react';

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  inputSize?: 'sm' | 'md';
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: boolean | string;
  mono?: boolean;
  onClear?: () => void;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      inputSize = 'sm',
      prefix,
      suffix,
      error,
      mono = false,
      onClear,
      disabled,
      className = '',
      value,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const showClear = Boolean(onClear && value && !disabled);

    const sizeClasses = {
      sm: 'h-8 text-xs py-1.5 px-2.5',
      md: 'h-9 text-xs py-2 px-3'
    };

    return (
      <div
        className={`relative flex items-center bg-surface-lowest border rounded-xs shadow-xs transition-colors ${
          hasError
            ? 'border-rose-500 focus-within:border-rose-600 focus-within:ring-1 focus-within:ring-rose-500/20'
            : 'border-hairline focus-within:border-action focus-within:ring-1 focus-within:ring-action/20'
        } ${disabled ? 'opacity-60 bg-surface-low cursor-not-allowed' : ''} ${className}`}
      >
        {prefix && (
          <div className="pl-2.5 pr-1 flex items-center text-ink-tertiary select-none shrink-0">
            {prefix}
          </div>
        )}

        <input
          ref={ref}
          disabled={disabled}
          value={value}
          className={`flex-1 w-full bg-transparent text-ink-primary placeholder:text-ink-tertiary outline-none border-none ${
            mono ? 'font-mono tabular-nums' : 'font-body'
          } ${sizeClasses[inputSize]} ${prefix ? '!pl-1' : ''} ${
            suffix || showClear ? '!pr-1' : ''
          } disabled:cursor-not-allowed`}
          {...props}
        />

        {showClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear?.();
            }}
            tabIndex={-1}
            title="Borrar texto"
            className="p-1 mr-1.5 text-ink-tertiary hover:text-ink-primary rounded-xs transition-colors cursor-pointer select-none"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {suffix && (
          <div className="pr-2.5 pl-1 flex items-center text-ink-tertiary shrink-0">
            {suffix}
          </div>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
