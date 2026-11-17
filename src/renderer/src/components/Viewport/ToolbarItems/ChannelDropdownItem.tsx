import React, { useState, useRef, useEffect } from 'react';
import { Layers, ChevronDown, Check } from 'lucide-react';
import { usePbrMaterialStore, DebugChannel } from '../../../store/pbrMaterialStore';
import { useDropdownPlacement, getDropdownPlacementClass } from './useDropdownPlacement';

interface ChannelDropdownItemProps {
  compact?: boolean;
  iconOnly?: boolean;
}

const DEBUG_CHANNELS: { id: DebugChannel; label: string; desc: string }[] = [
  { id: 'lit', label: 'Full PBR (Lit)', desc: 'Final photorealistic render with scene lighting' },
  { id: 'albedo', label: 'Albedo (Color)', desc: 'Inspect diffuse / BaseColor map' },
  { id: 'normal', label: 'Normals', desc: 'Surface detail and normal direction' },
  { id: 'roughness', label: 'Roughness', desc: 'Grayscale surface roughness channel' },
  { id: 'metalness', label: 'Metalness', desc: 'Metallic / dielectric mask channel' },
  { id: 'ao', label: 'Ambient Occlusion', desc: 'Contact and crevice shadows (AO)' },
  { id: 'emissive', label: 'Emissive', desc: 'Self-illumination and glow channel' },
  { id: 'wireframe', label: 'Wireframe', desc: 'Mesh topology and polygon wireframe' }
];

export const ChannelDropdownItem: React.FC<ChannelDropdownItemProps> = ({ compact, iconOnly }) => {
  const debugChannel = usePbrMaterialStore((state) => state.debugChannel);
  const setDebugChannel = usePbrMaterialStore((state) => state.setDebugChannel);
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

  const placement = useDropdownPlacement(containerRef, isOpen, 224);
  const currentChannel = DEBUG_CHANNELS.find((c) => c.id === debugChannel);
  const currentChannelLabel = currentChannel?.label || 'PBR';

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title={`PBR Channel Inspection: ${currentChannelLabel}`}
        className={`h-6 px-1.5 rounded-xs transition-colors flex items-center gap-1 text-xs font-medium border cursor-pointer select-none ${
          debugChannel !== 'lit'
            ? 'bg-action/15 text-action border-action/40'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
        }`}
      >
        <Layers className="w-3.5 h-3.5 shrink-0" />
        {!compact && !iconOnly && (
          <span className="font-primary font-bold uppercase tracking-wider text-[10px] text-ink-primary truncate max-w-[100px]">
            {currentChannelLabel}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 text-ink-tertiary transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-action' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className={`absolute ${getDropdownPlacementClass(placement)} w-56 rounded-xs bg-surface-lowest border border-hairline shadow-xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100`}>
          <div className="px-2.5 py-1 text-[10px] font-primary font-bold text-ink-tertiary uppercase tracking-wider border-b border-hairline mb-1">
            PBR Material Channels
          </div>

          {DEBUG_CHANNELS.map((ch) => {
            const isSelected = debugChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => {
                  setDebugChannel(ch.id);
                  setIsOpen(false);
                }}
                className={`w-full px-2 py-1.5 rounded-xs text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-action/10 text-action font-semibold'
                    : 'text-ink-primary hover:bg-surface-container'
                }`}
                title={ch.desc}
              >
                <span className="truncate">{ch.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-action shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
