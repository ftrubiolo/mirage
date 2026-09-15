import React from 'react';
import { Globe, FolderOpen, Eye, EyeOff } from 'lucide-react';
import { useViewportStore, EnvironmentPreset } from '../../../store/viewportStore';

const ENVIRONMENT_PRESETS: { id: EnvironmentPreset; label: string; desc: string }[] = [
  { id: 'studio', label: 'Estudio', desc: 'Neutral, alta fidelidad' },
  { id: 'city', label: 'Ciudad', desc: 'Urbano, luz solar suave' },
  { id: 'warehouse', label: 'Almacén', desc: 'Industrial, contrastado' },
  { id: 'apartment', label: 'Apartamento', desc: 'Cálido, interiores' },
  { id: 'sunset', label: 'Atardecer', desc: 'Tonos dorados y rasantes' },
  { id: 'night', label: 'Noche', desc: 'Luz fría y acentos' }
];

export const CanvasEnvironmentWidget: React.FC = () => {
  const environmentPreset = useViewportStore((s) => s.environmentPreset);
  const setEnvironmentPreset = useViewportStore((s) => s.setEnvironmentPreset);
  const showEnvironmentBackground = useViewportStore((s) => s.showEnvironmentBackground);
  const toggleEnvironmentBackground = useViewportStore((s) => s.toggleEnvironmentBackground);
  const customHdrName = useViewportStore((s) => s.customHdrName);
  const setCustomHdr = useViewportStore((s) => s.setCustomHdr);

  const handlePickCustomHdr = async () => {
    if (window.electronAPI) {
      const file = await window.electronAPI.openFileDialog({
        title: 'Seleccionar mapa de entorno HDRI (.hdr)',
        filters: [{ name: 'HDRI Environment Map', extensions: ['hdr'] }]
      });
      if (file) {
        const url = window.electronAPI.toAssetUrl(file);
        const name = file.split(/[/\\]/).pop() || 'Custom HDRI';
        setCustomHdr(url, name);
      }
    }
  };

  return (
    <div className="w-72 flex flex-col gap-2 text-xs">
      {/* Background Toggle */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-surface-container/40 rounded-xs border border-hairline">
        <div className="flex items-center gap-1.5 text-ink-secondary">
          {showEnvironmentBackground ? <Eye size={13} className="text-action" /> : <EyeOff size={13} className="text-ink-tertiary" />}
          <span>Mostrar cielo/fondo 3D</span>
        </div>
        <button
          type="button"
          onClick={toggleEnvironmentBackground}
          className={`px-2 py-0.5 rounded-xs font-mono text-[10px] transition-colors border ${
            showEnvironmentBackground
              ? 'bg-action text-white border-action font-bold'
              : 'bg-surface-lowest text-ink-tertiary border-hairline hover:text-ink-primary'
          }`}
        >
          {showEnvironmentBackground ? 'Visible' : 'Oculto'}
        </button>
      </div>

      {/* Preset Chips Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {ENVIRONMENT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setEnvironmentPreset(preset.id)}
            className={`p-2 rounded-xs text-left transition-colors border flex flex-col gap-0.5 ${
              environmentPreset === preset.id && !customHdrName
                ? 'bg-action/15 border-action/50 text-action font-medium'
                : 'bg-surface-container/30 border-hairline hover:bg-surface-high text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <span className="font-mono font-bold text-[11px]">{preset.label}</span>
            <span className="text-[10px] text-ink-tertiary">{preset.desc}</span>
          </button>
        ))}
      </div>

      {/* Custom HDR Button */}
      <button
        type="button"
        onClick={handlePickCustomHdr}
        className="flex items-center justify-between p-2 rounded-xs bg-surface-container/30 hover:bg-surface-high border border-hairline text-ink-secondary hover:text-ink-primary transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <FolderOpen size={13} className="text-action shrink-0" />
          <span className="font-mono text-[11px] truncate max-w-[160px]">
            {customHdrName || 'Cargar archivo .hdr personalizado'}
          </span>
        </div>
        <span className="text-[9px] font-mono uppercase text-ink-tertiary">Examinar</span>
      </button>
    </div>
  );
};
