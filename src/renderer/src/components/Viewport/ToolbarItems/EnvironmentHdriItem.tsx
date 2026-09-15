import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, FolderOpen } from 'lucide-react';
import { useViewportStore, EnvironmentPreset } from '../../../store/viewportStore';
import { Switch } from '../../UI';
import { useDropdownPlacement, getDropdownPlacementClass } from './useDropdownPlacement';

interface EnvironmentHdriItemProps {
  compact?: boolean;
  iconOnly?: boolean;
}

const ENVIRONMENT_PRESETS: { id: EnvironmentPreset; label: string }[] = [
  { id: 'studio', label: 'Estudio' },
  { id: 'city', label: 'Ciudad' },
  { id: 'warehouse', label: 'Almacén' },
  { id: 'apartment', label: 'Apartamento' },
  { id: 'lobby', label: 'Lobby' },
  { id: 'sunset', label: 'Atardecer' },
  { id: 'night', label: 'Noche' },
  { id: 'park', label: 'Parque' }
];

export const EnvironmentHdriItem: React.FC<EnvironmentHdriItemProps> = ({ compact, iconOnly }) => {
  const environmentPreset = useViewportStore((s) => s.environmentPreset);
  const setEnvironmentPreset = useViewportStore((s) => s.setEnvironmentPreset);
  const showEnvironmentBackground = useViewportStore((s) => s.showEnvironmentBackground);
  const toggleEnvironmentBackground = useViewportStore((s) => s.toggleEnvironmentBackground);
  const customHdrName = useViewportStore((s) => s.customHdrName);
  const setCustomHdr = useViewportStore((s) => s.setCustomHdr);

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
        setIsOpen(false);
      }
    }
  };

  const placement = useDropdownPlacement(containerRef, isOpen, 208);

  const currentEnvLabel = customHdrName
    ? customHdrName
    : ENVIRONMENT_PRESETS.find((p) => p.id === environmentPreset)?.label || 'Entorno';

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Entorno de Iluminación y Reflejos: ${currentEnvLabel}`}
        className={`h-6 px-1.5 rounded-xs transition-colors flex items-center gap-1 text-xs font-medium border cursor-pointer select-none ${
          isOpen
            ? 'bg-action/15 text-action border-action/40'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
        }`}
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        {!compact && !iconOnly && (
          <span className="font-primary font-bold uppercase tracking-wider text-[10px] text-ink-primary truncate max-w-[80px]">
            {currentEnvLabel}
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
            Entorno de Taller (HDRI)
          </div>

          {/* Toggle 360 Scene Background */}
          <div className="px-2.5 py-1.5 border-b border-hairline mb-1 flex items-center justify-between">
            <span className="text-xs text-ink-primary font-medium">Fondo 360°</span>
            <Switch
              checked={showEnvironmentBackground}
              onChange={toggleEnvironmentBackground}
              title={showEnvironmentBackground ? 'Ocultar fondo 360°' : 'Mostrar fondo 360°'}
            />
          </div>

          {ENVIRONMENT_PRESETS.map((preset) => {
            const isSelected = !customHdrName && environmentPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setEnvironmentPreset(preset.id);
                  setIsOpen(false);
                }}
                className={`w-full px-2 py-1.5 rounded-xs text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-action/10 text-action font-semibold'
                    : 'text-ink-primary hover:bg-surface-container'
                }`}
              >
                <span className="truncate">{preset.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-action shrink-0 ml-2" />}
              </button>
            );
          })}

          <div className="border-t border-hairline my-0.5 pt-0.5">
            <button
              type="button"
              onClick={handlePickCustomHdr}
              className="w-full px-2 py-1.5 rounded-xs text-left text-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-container flex items-center gap-2 transition-colors cursor-pointer"
              title="Cargar archivo .hdr personalizado"
            >
              <FolderOpen className="w-3.5 h-3.5 text-action" />
              <span className="truncate">Cargar HDR...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
