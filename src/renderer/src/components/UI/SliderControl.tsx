import React from 'react';

export interface SliderControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatDecimals?: number;
  formatValue?: (val: number) => string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.05,
  unit = '',
  formatDecimals = 2,
  formatValue,
  disabled = false,
  compact = false,
  className = ''
}) => {
  const formattedText = formatValue
    ? formatValue(value)
    : `${value.toFixed(formatDecimals)}${unit}`;

  return (
    <div className={`min-w-0 ${className}`}>
      <div
        className={`flex items-center justify-between text-ink-secondary mb-1 ${
          compact ? 'text-[10px]' : 'text-[11px]'
        }`}
      >
        <span className="truncate mr-1">{label}</span>
        <span className="font-mono tabular-nums text-action font-semibold shrink-0">
          {formattedText}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-surface-container rounded-none appearance-none cursor-pointer accent-action disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
};
