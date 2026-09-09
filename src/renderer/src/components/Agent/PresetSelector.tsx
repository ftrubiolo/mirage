import React from 'react';
import { Sun, Check } from 'lucide-react';
import { EnvironmentPreset } from '../../store/viewportStore';

export interface PresetSelectorProps {
  currentPreset: EnvironmentPreset;
  onSelectPreset: (preset: EnvironmentPreset) => void;
  availablePresets?: EnvironmentPreset[];
}

const DEFAULT_PRESETS: EnvironmentPreset[] = ['studio', 'warehouse', 'city', 'apartment', 'sunset', 'night'];

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  currentPreset,
  onSelectPreset,
  availablePresets = DEFAULT_PRESETS
}) => {
  return (
    <div className="space-y-1.5 font-body text-xs select-none">
      <div className="flex items-center gap-1.5 pb-1 text-ink-secondary">
        <Sun className="w-3.5 h-3.5 text-action" />
        <span className="font-primary font-bold text-[10px] uppercase tracking-wider">
          Preajustes de Entorno
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
        {availablePresets.map((preset) => {
          const isActive = preset === currentPreset;
          return (
            <button
              key={preset}
              onClick={() => onSelectPreset(preset)}
              className={`px-2.5 py-1.5 rounded-xs border text-left transition-colors flex items-center justify-between capitalize cursor-pointer ${
                isActive
                  ? 'bg-surface-container border-action text-action font-semibold'
                  : 'bg-surface-low border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
              }`}
            >
              <span>{preset}</span>
              {isActive && <Check className="w-3 h-3 text-action" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
