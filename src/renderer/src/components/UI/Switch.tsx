import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  label?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  className = '',
  title,
  label
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-xs p-0.5 border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-1 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        checked
          ? 'bg-action border-action'
          : 'bg-surface-container border-hairline-strong'
      } ${className}`}
    >
      {label && <span className="sr-only">{label}</span>}
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-xs transition-transform duration-150 ${
          checked ? 'translate-x-4 bg-white' : 'translate-x-0 bg-ink-tertiary'
        }`}
      />
    </button>
  );
};
