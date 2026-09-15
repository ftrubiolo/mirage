import React from 'react';
import { Layers } from 'lucide-react';
import { usePbrMaterialStore, DebugChannel } from '../../../store/pbrMaterialStore';

const CHANNELS: { id: DebugChannel; label: string; desc: string }[] = [
  { id: 'lit', label: 'PBR Completo', desc: 'Renderizado realista con iluminación' },
  { id: 'albedo', label: 'Albedo (Color)', desc: 'Inspección de texturas BaseColor' },
  { id: 'normal', label: 'Normales', desc: 'Relieve superficial y tangentes' },
  { id: 'roughness', label: 'Rugosidad', desc: 'Canal de microfaceting y brillo' },
  { id: 'metalness', label: 'Metálico', desc: 'Separación dieléctrico / conductor' },
  { id: 'ao', label: 'Oclusión (AO)', desc: 'Sombreado ambiental de hendiduras' },
  { id: 'emissive', label: 'Emisivo', desc: 'Mapas de auto-iluminación' },
  { id: 'wireframe', label: 'Malla Alámbrica', desc: 'Topología y aristas de geometría' }
];

export const CanvasChannelWidget: React.FC = () => {
  const debugChannel = usePbrMaterialStore((state) => state.debugChannel);
  const setDebugChannel = usePbrMaterialStore((state) => state.setDebugChannel);

  return (
    <div className="w-72 flex flex-col gap-1.5 text-xs">
      <div className="grid grid-cols-2 gap-1.5">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setDebugChannel(ch.id)}
            className={`p-2 rounded-xs text-left transition-colors border flex flex-col gap-0.5 ${
              debugChannel === ch.id
                ? 'bg-action/15 border-action/60 text-action font-medium'
                : 'bg-surface-container/30 border-hairline hover:bg-surface-high text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <span className="font-mono font-bold text-[11px]">{ch.label}</span>
            <span className="text-[10px] text-ink-tertiary truncate">{ch.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
