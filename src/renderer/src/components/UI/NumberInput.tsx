import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  unit?: string;
  prefix?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  precision,
  unit,
  prefix,
  className = '',
  disabled = false
}) => {
  const [localStr, setLocalStr] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalStr(String(value));
  }, [value]);

  const clampAndFormat = (val: number): number => {
    let clamped = Math.max(min, Math.min(max, val));
    if (precision !== undefined) {
      clamped = parseFloat(clamped.toFixed(precision));
    }
    return clamped;
  };

  const commitChange = (rawVal: string) => {
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed)) {
      const finalVal = clampAndFormat(parsed);
      onChange(finalVal);
      setLocalStr(String(finalVal));
    } else {
      setLocalStr(String(value));
    }
  };

  const handleStep = (direction: 'up' | 'down', multiplier = 1) => {
    if (disabled) return;
    const delta = (direction === 'up' ? step : -step) * multiplier;
    const nextVal = clampAndFormat(value + delta);
    onChange(nextVal);
    setLocalStr(String(nextVal));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitChange(localStr);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleStep('up', e.shiftKey ? 10 : 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleStep('down', e.shiftKey ? 10 : 1);
    }
  };

  return (
    <div
      className={`inline-flex items-center rounded-xs bg-surface-lowest border border-hairline-strong hover:border-ink-tertiary focus-within:border-action focus-within:ring-1 focus-within:ring-action/30 transition-colors overflow-hidden ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {prefix && (
        <span className="w-5 text-center text-[10px] font-mono font-bold text-ink-tertiary border-r border-hairline select-none shrink-0 flex items-center justify-center h-full bg-surface-low/60">
          {prefix}
        </span>
      )}

      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={localStr}
        onChange={(e) => setLocalStr(e.target.value)}
        onBlur={() => commitChange(localStr)}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent px-2 py-0.5 text-right font-mono tabular-nums text-xs text-ink-primary placeholder:text-ink-tertiary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
      />

      {unit && (
        <span className="text-[11px] font-mono tabular-nums text-ink-tertiary pr-1.5 select-none shrink-0">
          {unit}
        </span>
      )}

      {/* Architectural Micro-Steppers */}
      <div className="flex flex-col h-full border-l border-hairline shrink-0 select-none">
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || value >= max}
          onClick={() => handleStep('up')}
          className="px-1 flex-1 hover:bg-surface-high text-ink-tertiary hover:text-action disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-tertiary transition-colors flex items-center justify-center min-h-[12px]"
          title="Incrementar (Flecha arriba)"
        >
          <ChevronUp className="w-2.5 h-2.5 stroke-[2.5]" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || value <= min}
          onClick={() => handleStep('down')}
          className="px-1 flex-1 hover:bg-surface-high text-ink-tertiary hover:text-action disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-tertiary border-t border-hairline transition-colors flex items-center justify-center min-h-[12px]"
          title="Decrementar (Flecha abajo)"
        >
          <ChevronDown className="w-2.5 h-2.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
