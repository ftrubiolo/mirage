import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  id
}) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <label
      htmlFor={inputId}
      className={`inline-flex ${description ? 'items-start' : 'items-center'} gap-2 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'
      } ${className}`}
    >
      <div className={`relative flex items-center justify-center shrink-0 ${description ? 'mt-0.5' : ''}`}>
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={`w-4 h-4 rounded-xs border transition-colors duration-150 flex items-center justify-center ${
            checked
              ? 'bg-action border-action text-white shadow-xs'
              : 'bg-surface-lowest border-hairline-strong group-hover:border-action/60'
          } peer-focus-visible:ring-2 peer-focus-visible:ring-action peer-focus-visible:ring-offset-1`}
        >
          <Check
            className={`w-3 h-3 stroke-[3] transition-opacity duration-150 ${
              checked ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      </div>

      {(label || description) && (
        <div className="flex flex-col text-xs leading-none">
          {label && (
            <span
              className={`font-medium transition-colors ${
                checked
                  ? 'text-ink-primary font-semibold'
                  : 'text-ink-secondary group-hover:text-ink-primary'
              }`}
            >
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-ink-tertiary mt-1 leading-tight">{description}</span>
          )}
        </div>
      )}
    </label>
  );
};
