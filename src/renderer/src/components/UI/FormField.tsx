import React from 'react';

export interface FormFieldProps {
  label?: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  extra?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  hint,
  error,
  extra,
  htmlFor,
  className = '',
  children
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {(label || extra) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label
              htmlFor={htmlFor}
              className="text-[10px] font-primary font-semibold uppercase tracking-wider text-ink-secondary block select-none"
            >
              {label}
              {required && <span className="text-action ml-1">*</span>}
            </label>
          )}
          {extra && <div className="text-[11px] text-ink-tertiary shrink-0">{extra}</div>}
        </div>
      )}

      <div>{children}</div>

      {error ? (
        <p className="text-[11px] font-medium text-rose-600 animate-in fade-in duration-100">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-ink-tertiary leading-relaxed">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
