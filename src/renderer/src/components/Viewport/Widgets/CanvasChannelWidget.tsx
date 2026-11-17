import React from 'react';
import { Layers } from 'lucide-react';
import { usePbrMaterialStore, DebugChannel } from '../../../store/pbrMaterialStore';

const CHANNELS: { id: DebugChannel; label: string; desc: string }[] = [
  { id: 'lit', label: 'Full PBR', desc: 'Realistic lit rendering' },
  { id: 'albedo', label: 'Albedo (Color)', desc: 'BaseColor texture inspection' },
  { id: 'normal', label: 'Normals', desc: 'Surface relief & tangent normals' },
  { id: 'roughness', label: 'Roughness', desc: 'Microfacet & gloss channel' },
  { id: 'metalness', label: 'Metalness', desc: 'Dielectric / conductor mask' },
  { id: 'ao', label: 'Occlusion (AO)', desc: 'Crevice ambient shadowing' },
  { id: 'emissive', label: 'Emissive', desc: 'Self-illumination maps' },
  { id: 'wireframe', label: 'Wireframe', desc: 'Mesh topology & edges' }
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
