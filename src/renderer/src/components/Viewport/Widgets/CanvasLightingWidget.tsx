import React from 'react';
import { Sun, CloudSun, Moon, Sliders, ShieldCheck, Sparkles } from 'lucide-react';
import { useViewportStore, LightingPreset } from '../../../store/viewportStore';

const LIGHTING_PRESETS: { id: LightingPreset; label: string }[] = [
  { id: 'studio', label: 'Estudio' },
  { id: 'natural', label: 'Natural' },
  { id: 'dramatic', label: 'Dramático' },
  { id: 'technical', label: 'Técnico' }
];

export const CanvasLightingWidget: React.FC = () => {
  const environmentIntensity = useViewportStore((s) => s.environmentIntensity);
  const setEnvironmentIntensity = useViewportStore((s) => s.setEnvironmentIntensity);
  const lightingPreset = useViewportStore((s) => s.lightingPreset);
  const setLightingPreset = useViewportStore((s) => s.setLightingPreset);
  const showContactShadows = useViewportStore((s) => s.showContactShadows);
  const toggleContactShadows = useViewportStore((s) => s.toggleContactShadows);

  return (
    <div className="w-72 flex flex-col gap-2.5 text-xs">
      {/* Lighting Preset Selector */}
      <div className="flex items-center gap-1 bg-surface-container/50 p-1 rounded-xs border border-hairline">
        <Sparkles size={12} className="text-action shrink-0 ml-1 mr-0.5" />
        <div className="grid grid-cols-4 gap-1 flex-1">
          {LIGHTING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setLightingPreset(preset.id)}
              className={`py-1 rounded-xs text-[10px] font-mono text-center transition-colors border ${
                lightingPreset === preset.id
                  ? 'bg-action/15 text-action border-action/40 font-bold'
                  : 'text-ink-secondary border-hairline hover:bg-surface-high'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Environment Intensity Slider */}
      <div className="flex flex-col gap-1 bg-surface-container/30 p-2 rounded-xs border border-hairline">
        <div className="flex items-center justify-between text-[11px] font-medium text-ink-primary">
          <div className="flex items-center gap-1.5">
            <Sun size={13} className="text-action shrink-0" />
            <span>Intensidad de Entorno (HDRI)</span>
          </div>
          <span className="font-mono text-[10px] tabular-nums text-ink-tertiary">
            {environmentIntensity.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={environmentIntensity}
          draggable={false}
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => setEnvironmentIntensity(parseFloat(e.target.value))}
          data-interactive="true"
          className="w-full h-1.5 bg-surface-high rounded-none appearance-none cursor-pointer accent-action"
        />
        <div className="flex justify-between text-[9px] font-mono text-ink-tertiary">
          <span>0.1x (Tenue)</span>
          <span>1.0x (Normal)</span>
          <span>3.0x (Brillante)</span>
        </div>
      </div>

      {/* Shadow Toggles */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-surface-container/30 rounded-xs border border-hairline">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-secondary">
          <ShieldCheck size={13} className={showContactShadows ? 'text-action' : 'text-ink-tertiary'} />
          <span>Sombras de Contacto (Ground)</span>
        </div>
        <button
          type="button"
          onClick={toggleContactShadows}
          className={`px-2 py-0.5 rounded-xs font-mono text-[10px] transition-colors border ${
            showContactShadows
              ? 'bg-action text-white border-action font-bold'
              : 'bg-surface-lowest text-ink-tertiary border-hairline hover:text-ink-primary'
          }`}
        >
          {showContactShadows ? 'Activo' : 'Inactivo'}
        </button>
      </div>
    </div>
  );
};
