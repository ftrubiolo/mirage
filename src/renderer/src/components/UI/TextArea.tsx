import React from 'react';

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
  mono?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ error, mono = false, disabled, className = '', ...props }, ref) => {
    const hasError = Boolean(error);

    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full p-2.5 bg-surface-lowest border rounded-xs shadow-xs text-xs text-ink-primary placeholder:text-ink-tertiary transition-colors outline-none ${
          mono ? 'font-mono tabular-nums' : 'font-body'
        } ${
          hasError
            ? 'border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500/20'
            : 'border-hairline focus:border-action focus:ring-1 focus:ring-action/20'
        } ${disabled ? 'opacity-60 bg-surface-low cursor-not-allowed' : ''} ${className}`}
        {...props}
      />
    );
  }
);

TextArea.displayName = 'TextArea';
