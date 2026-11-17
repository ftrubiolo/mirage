import React, { useState, useRef, useEffect } from 'react';
import { Compass, ChevronDown, Check } from 'lucide-react';
import { useViewportStore, CameraPreset } from '../../../store/viewportStore';
import { useDropdownPlacement, getDropdownPlacementClass } from './useDropdownPlacement';

interface CameraOrientationItemProps {
  compact?: boolean;
  iconOnly?: boolean;
}

const CAMERA_PRESETS: { id: CameraPreset; label: string; short: string; shortcut: string }[] = [
  { id: 'iso', label: 'Isometric (3/4)', short: 'ISO', shortcut: '0' },
  { id: 'front', label: 'Front', short: 'Front', shortcut: '1' },
  { id: 'right', label: 'Right Side', short: 'Right', shortcut: '3' },
  { id: 'left', label: 'Left Side', short: 'Left', shortcut: 'Ctrl+3' },
  { id: 'top', label: 'Top (Plan)', short: 'Top', shortcut: '7' },
  { id: 'bottom', label: 'Bottom (Base)', short: 'Bottom', shortcut: 'Ctrl+7' },
  { id: 'back', label: 'Back', short: 'Back', shortcut: 'Ctrl+1' }
];

export const CameraOrientationItem: React.FC<CameraOrientationItemProps> = ({ compact, iconOnly }) => {
  const cameraPreset = useViewportStore((s) => s.cameraPreset);
  const setCameraPreset = useViewportStore((s) => s.setCameraPreset);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const placement = useDropdownPlacement(containerRef, isOpen, 208);

  const activePreset = CAMERA_PRESETS.find((p) => p.id === (cameraPreset || 'iso'));
  const currentLabel = compact ? activePreset?.short : (activePreset?.label || 'Isometric (3/4)');

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title={`CAD camera orientation: ${currentLabel}`}
        className="h-6 px-1.5 rounded-xs transition-colors flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink-primary hover:bg-surface-container border border-transparent cursor-pointer select-none"
      >
        <Compass className="w-3.5 h-3.5 text-action shrink-0" />
        {!iconOnly && (
          <span className="font-primary font-bold uppercase tracking-wider text-[10px] text-ink-primary truncate max-w-[110px]">
            {currentLabel}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 text-ink-tertiary transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-action' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className={`absolute ${getDropdownPlacementClass(placement)} w-52 rounded-xs bg-surface-lowest border border-hairline shadow-xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100`}>
          <div className="px-2.5 py-1 text-[10px] font-primary font-bold text-ink-tertiary uppercase tracking-wider border-b border-hairline mb-1">
            CAD Camera Angles
          </div>

          {CAMERA_PRESETS.map((preset) => {
            const isSelected = cameraPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setCameraPreset(preset.id);
                  setIsOpen(false);
                }}
                className={`w-full px-2 py-1.5 rounded-xs text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-action/10 text-action font-semibold'
                    : 'text-ink-primary hover:bg-surface-container'
                }`}
              >
                <span className="flex-1 truncate">{preset.label}</span>
                <span className="text-[10px] font-mono text-ink-tertiary ml-2 shrink-0">{preset.shortcut}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-action shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
