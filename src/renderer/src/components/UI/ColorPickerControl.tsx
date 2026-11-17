import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Pipette, X } from 'lucide-react';
import { NumberInput } from './NumberInput';
import {
  HSV,
  RGB,
  hexToHsv,
  hsvToHex,
  hsvToRgb,
  rgbToHsv,
  rgbToHex,
  hexToRgb,
  isValidHex,
  normalizeHex
} from '../../utils/colorUtils';

export interface ColorPickerControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type ColorMode = 'RGB' | 'HSV' | 'Hex';

export const ColorPickerControl: React.FC<ColorPickerControlProps> = ({
  label,
  value,
  onChange,
  placeholder = '#ffffff',
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ColorMode>('HSV');
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isAbove, setIsAbove] = useState(false);

  // Internal HSV state synced from value
  const initialHsv = hexToHsv(isValidHex(value) ? value : placeholder);
  const [hsv, setHsv] = useState<HSV>(initialHsv);
  const [hexInput, setHexInput] = useState(value);

  const swatchBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const wheelCanvasRef = useRef<HTMLCanvasElement>(null);
  const valueSliderRef = useRef<HTMLDivElement>(null);

  // Sync HSV state when external value changes and popover is closed
  useEffect(() => {
    if (isValidHex(value)) {
      setHexInput(value);
      setHsv(hexToHsv(value));
    }
  }, [value]);

  const updateColorFromHsv = useCallback(
    (newHsv: HSV) => {
      setHsv(newHsv);
      const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
      setHexInput(newHex);
      onChange(newHex);
    },
    [onChange]
  );

  // Calculate Popover Position (Centered under the trigger swatch button)
  const updatePosition = useCallback((targetMode?: ColorMode) => {
    if (!swatchBtnRef.current) return;
    const rect = swatchBtnRef.current.getBoundingClientRect();
    const popoverEl = popoverRef.current;
    const currentMode = targetMode || mode;
    const estimatedHeight = currentMode === 'Hex' ? 270 : 330;
    const popoverWidth = popoverEl ? popoverEl.offsetWidth : 230;
    const popoverHeight = popoverEl ? popoverEl.offsetHeight : estimatedHeight;

    // Horizontally center with the swatch button
    const centerX = rect.left + rect.width / 2;
    let left = centerX - popoverWidth / 2;

    // Viewport bounds clamping
    left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, left));

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    const isPlacedAbove = spaceBelow < popoverHeight && spaceAbove > spaceBelow;
    let top: number;
    // Prefer below if there's enough space, otherwise flip above with 6px gap
    if (isPlacedAbove) {
      top = Math.max(12, rect.top - popoverHeight - 6);
    } else {
      top = rect.bottom + 6;
    }

    setIsAbove(isPlacedAbove);
    setPopoverPos({ top, left });
  }, [mode]);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition(mode);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Synchronously adjust popover position before paint on open or mode change
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, mode, updatePosition]);

  // Close on outside click or escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        swatchBtnRef.current &&
        !swatchBtnRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, updatePosition]);

  // Draw HSV Color Wheel on Canvas
  const WHEEL_RADIUS = 68; // CSS px radius
  const WHEEL_SIZE = WHEEL_RADIUS * 2; // 136px

  useEffect(() => {
    if (!isOpen || !wheelCanvasRef.current) return;
    const canvas = wheelCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WHEEL_SIZE * dpr;
    canvas.height = WHEEL_SIZE * dpr;
    ctx.scale(dpr, dpr);

    const cx = WHEEL_RADIUS;
    const cy = WHEEL_RADIUS;
    const imgData = ctx.createImageData(WHEEL_SIZE * dpr, WHEEL_SIZE * dpr);
    const data = imgData.data;

    for (let py = 0; py < WHEEL_SIZE * dpr; py++) {
      for (let px = 0; px < WHEEL_SIZE * dpr; px++) {
        const x = px / dpr - cx;
        const y = py / dpr - cy;
        const dist = Math.hypot(x, y);

        const idx = (py * (WHEEL_SIZE * dpr) + px) * 4;

        if (dist <= WHEEL_RADIUS) {
          const s = dist / WHEEL_RADIUS;
          // Red at bottom (angle 0 at bottom) matching standard 3D DCC wheel
          const angle = (Math.atan2(y, x) * 180 / Math.PI - 90 + 360) % 360;
          const { r, g, b } = hsvToRgb(angle, s, 1.0);

          // Edge anti-aliasing
          const edgeAlpha = dist > WHEEL_RADIUS - 1 ? (WHEEL_RADIUS - dist) : 1;

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = Math.round(edgeAlpha * 255);
        } else {
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [isOpen, WHEEL_SIZE, WHEEL_RADIUS]);

  // Handle Pointer dragging on Color Wheel (Smooth & lag-free)
  const handleWheelPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!wheelCanvasRef.current) return;
    const rect = wheelCanvasRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;

    const dist = Math.hypot(x, y);
    const s = Math.min(1, Math.max(0, dist / WHEEL_RADIUS));
    const h = (Math.atan2(y, x) * 180 / Math.PI - 90 + 360) % 360;

    updateColorFromHsv({ ...hsv, h, s });
  };

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handleWheelPointer(e);
  };

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons > 0) {
      handleWheelPointer(e);
    }
  };

  // Handle Value (Brightness) Slider Dragging
  const handleValueSliderPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!valueSliderRef.current) return;
    const rect = valueSliderRef.current.getBoundingClientRect();
    const offsetY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const v = 1 - offsetY / rect.height;
    updateColorFromHsv({ ...hsv, v: Math.max(0, Math.min(1, v)) });
  };

  const handleValueSliderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handleValueSliderPointer(e);
  };

  const handleValueSliderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons > 0) {
      handleValueSliderPointer(e);
    }
  };

  // Native EyeDropper API
  const handleEyedropper = async () => {
    if ((window as any).EyeDropper) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          const newHex = normalizeHex(result.sRGBHex);
          setHexInput(newHex);
          setHsv(hexToHsv(newHex));
          onChange(newHex);
        }
      } catch (err) {
        // User cancelled eyedropper
      }
    }
  };

  // Reticle (H, S) position in canvas
  const rad = ((hsv.h + 90) * Math.PI) / 180;
  const reticleX = WHEEL_RADIUS + hsv.s * WHEEL_RADIUS * Math.cos(rad);
  const reticleY = WHEEL_RADIUS + hsv.s * WHEEL_RADIUS * Math.sin(rad);

  // Pure Hue/Sat color for Value slider gradient
  const pureHex = hsvToHex(hsv.h, hsv.s, 1.0);
  const currentRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);

  return (
    <div className={`min-w-0 ${className}`}>
      {label && <div className="text-[11px] text-ink-secondary mb-1 truncate">{label}</div>}

      <div className="flex items-center gap-1.5 min-w-0 w-full">
        {/* Trigger Swatch Button */}
        <button
          ref={swatchBtnRef}
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className="w-7 h-7 rounded-xs border border-hairline-strong hover:border-action transition-colors cursor-pointer p-0.5 shrink-0 flex items-center justify-center shadow-xs focus:outline-none focus:ring-1 focus:ring-action disabled:opacity-50 disabled:cursor-not-allowed"
          title="Open 3D color picker"
        >
          <div
            className="w-full h-full rounded-xs border border-hairline"
            style={{ backgroundColor: isValidHex(value) ? value : placeholder }}
          />
        </button>

        {/* Text input for direct Hex entry */}
        <input
          type="text"
          value={hexInput}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            setHexInput(raw);
            if (isValidHex(raw)) {
              const clean = normalizeHex(raw);
              setHsv(hexToHsv(clean));
              onChange(clean);
            }
          }}
          onBlur={() => {
            if (isValidHex(hexInput)) {
              const clean = normalizeHex(hexInput);
              setHexInput(clean);
              setHsv(hexToHsv(clean));
              onChange(clean);
            } else {
              setHexInput(value);
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 w-full h-7 leading-7 py-0 px-2 rounded-xs bg-surface-lowest border border-hairline-strong text-xs font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-action disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
      </div>

      {/* Floating Popover Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              zIndex: 9999
            }}
            className={`w-[230px] bg-surface-lowest border border-hairline rounded-xs shadow-2xl p-3 select-none flex flex-col gap-3 font-body transition-all duration-150 ease-out animate-in fade-in zoom-in-95 ${
              isAbove ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
            }`}
          >
            {/* Header: Title + Close */}
            <div className="flex items-center justify-between border-b border-hairline pb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-xs border border-hairline shadow-xs shrink-0"
                  style={{ backgroundColor: hsvToHex(hsv.h, hsv.s, hsv.v) }}
                />
                <span className="font-primary font-bold text-[11px] uppercase tracking-wider text-ink-primary">
                  Color Picker
                </span>
              </div>
              <button
                onClick={handleClose}
                className="text-ink-tertiary hover:text-ink-primary p-0.5 rounded-xs transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Main Interactive Area: Color Wheel + Value Slider (Centered) */}
            <div className="flex items-center justify-center gap-3">
              {/* Circular Color Wheel Canvas */}
              <div className="relative w-[136px] h-[136px] shrink-0 cursor-crosshair">
                <canvas
                  ref={wheelCanvasRef}
                  style={{ width: `${WHEEL_SIZE}px`, height: `${WHEEL_SIZE}px` }}
                  onPointerDown={handleWheelPointerDown}
                  onPointerMove={handleWheelPointerMove}
                  className="rounded-full block"
                />
                {/* Dot Reticle */}
                <div
                  className="absolute pointer-events-none w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 border-white transition-transform duration-75"
                  style={{
                    left: `${reticleX}px`,
                    top: `${reticleY}px`
                  }}
                />
              </div>

              {/* Vertical Value (Brightness) Slider */}
              <div
                ref={valueSliderRef}
                onPointerDown={handleValueSliderPointerDown}
                onPointerMove={handleValueSliderPointerMove}
                className="relative w-4 h-[136px] rounded-xs border border-hairline cursor-ns-resize shrink-0 overflow-hidden"
                style={{
                  backgroundColor: '#000000',
                  backgroundImage: `linear-gradient(to bottom, ${pureHex}, #000000)`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '100% 100%'
                }}
                title="Brightness / Value (V)"
              >
                {/* Value Handle Indicator Line */}
                <div
                  className="absolute left-0 right-0 h-1.5 -mt-[3px] border-y border-white pointer-events-none"
                  style={{
                    top: `${(1 - hsv.v) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Mode Switcher Tabs (RGB | HSV | Hex) */}
            <div className="flex rounded-xs bg-surface-low p-0.5 border border-hairline text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setMode('RGB')}
                className={`flex-1 py-1 rounded-xs font-semibold text-center transition-colors cursor-pointer ${
                  mode === 'RGB'
                    ? 'bg-action text-white shadow-xs'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                RGB
              </button>
              <button
                type="button"
                onClick={() => setMode('HSV')}
                className={`flex-1 py-1 rounded-xs font-semibold text-center transition-colors cursor-pointer ${
                  mode === 'HSV'
                    ? 'bg-action text-white shadow-xs'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                HSV
              </button>
              <button
                type="button"
                onClick={() => setMode('Hex')}
                className={`flex-1 py-1 rounded-xs font-semibold text-center transition-colors cursor-pointer ${
                  mode === 'Hex'
                    ? 'bg-action text-white shadow-xs'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                Hex
              </button>
            </div>

            {/* Vertically Stacked Numerical Inputs & Pipette Tool */}
            <div className="flex items-start gap-2">
              <div className="flex-1 flex flex-col gap-1 font-mono text-[10px]">
                {mode === 'HSV' && (
                  <>
                    <NumberInput
                      prefix="H"
                      min={0}
                      max={1}
                      step={0.01}
                      precision={3}
                      value={parseFloat((hsv.h / 360).toFixed(3))}
                      onChange={(val) => updateColorFromHsv({ ...hsv, h: Math.max(0, Math.min(1, val)) * 360 })}
                      className="w-full h-6.5"
                    />
                    <NumberInput
                      prefix="S"
                      min={0}
                      max={1}
                      step={0.01}
                      precision={3}
                      value={parseFloat(hsv.s.toFixed(3))}
                      onChange={(val) => updateColorFromHsv({ ...hsv, s: Math.max(0, Math.min(1, val)) })}
                      className="w-full h-6.5"
                    />
                    <NumberInput
                      prefix="V"
                      min={0}
                      max={1}
                      step={0.01}
                      precision={3}
                      value={parseFloat(hsv.v.toFixed(3))}
                      onChange={(val) => updateColorFromHsv({ ...hsv, v: Math.max(0, Math.min(1, val)) })}
                      className="w-full h-6.5"
                    />
                  </>
                )}

                {mode === 'RGB' && (
                  <>
                    <NumberInput
                      prefix="R"
                      min={0}
                      max={255}
                      step={1}
                      precision={0}
                      value={currentRgb.r}
                      onChange={(val) => {
                        const newRgb: RGB = { ...currentRgb, r: Math.max(0, Math.min(255, val)) };
                        updateColorFromHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b));
                      }}
                      className="w-full h-6.5"
                    />
                    <NumberInput
                      prefix="G"
                      min={0}
                      max={255}
                      step={1}
                      precision={0}
                      value={currentRgb.g}
                      onChange={(val) => {
                        const newRgb: RGB = { ...currentRgb, g: Math.max(0, Math.min(255, val)) };
                        updateColorFromHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b));
                      }}
                      className="w-full h-6.5"
                    />
                    <NumberInput
                      prefix="B"
                      min={0}
                      max={255}
                      step={1}
                      precision={0}
                      value={currentRgb.b}
                      onChange={(val) => {
                        const newRgb: RGB = { ...currentRgb, b: Math.max(0, Math.min(255, val)) };
                        updateColorFromHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b));
                      }}
                      className="w-full h-6.5"
                    />
                  </>
                )}

                {mode === 'Hex' && (
                  <div className="inline-flex items-center h-6.5 rounded-xs bg-surface-lowest border border-hairline-strong focus-within:border-action focus-within:ring-1 focus-within:ring-action/30 transition-colors overflow-hidden">
                    <span className="w-5 text-center text-[10px] font-mono font-bold text-ink-tertiary border-r border-hairline select-none shrink-0 flex items-center justify-center h-full bg-surface-low/60">
                      #
                    </span>
                    <input
                      type="text"
                      value={hexInput.replace('#', '')}
                      onChange={(e) => {
                        const raw = `#${e.target.value}`;
                        setHexInput(raw);
                        if (isValidHex(raw)) {
                          const clean = normalizeHex(raw);
                          setHsv(hexToHsv(clean));
                          onChange(clean);
                        }
                      }}
                      onBlur={() => {
                        if (isValidHex(hexInput)) {
                          const clean = normalizeHex(hexInput);
                          setHexInput(clean);
                          setHsv(hexToHsv(clean));
                          onChange(clean);
                        } else {
                          setHexInput(value);
                        }
                      }}
                      className="w-full bg-transparent px-2 text-xs font-mono uppercase text-ink-primary tabular-nums focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Eyedropper Button beside stacked inputs */}
              {typeof window !== 'undefined' && 'EyeDropper' in window && (
                <button
                  type="button"
                  onClick={handleEyedropper}
                  className="w-6.5 h-6.5 rounded-xs border border-hairline bg-surface-low hover:bg-surface-high hover:text-action text-ink-secondary transition-colors shrink-0 flex items-center justify-center cursor-pointer shadow-xs"
                  title="Eyedropper (Sample screen pixel)"
                >
                  <Pipette className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
