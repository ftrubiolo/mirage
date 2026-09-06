import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  Ruler,
  Grid,
  Sun,
  Moon,
  Camera,
  Layers,
  Box,
  Globe,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  Check,
  FolderOpen
} from 'lucide-react';
import { useViewportStore, EnvironmentPreset } from '../../store/viewportStore';
import { useWorkbenchStore, DebugChannel } from '../../store/workbenchStore';

export const ViewportToolbar: React.FC = () => {
  const {
    autoRotate,
    showDimensions,
    showGrid,
    showContactShadows,
    environmentIntensity,
    showEnvironmentBackground,
    viewportTheme,
    environmentPreset,
    customHdrName,
    toggleViewportTheme,
    setEnvironmentPreset,
    toggleEnvironmentBackground,
    setCustomHdr,
    toggleAutoRotate,
    toggleDimensions,
    toggleGrid,
    toggleContactShadows,
    setEnvironmentIntensity,
    triggerResetCamera,
    zoomIn3D,
    zoomOut3D
  } = useViewportStore();

  const debugChannel = useWorkbenchStore((state) => state.debugChannel);
  const setDebugChannel = useWorkbenchStore((state) => state.setDebugChannel);

  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
  const [isEnvDropdownOpen, setIsEnvDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const envDropdownRef = useRef<HTMLDivElement>(null);

  const debugChannels: { id: DebugChannel; label: string; desc: string }[] = [
    { id: 'lit', label: 'PBR Completo', desc: 'Renderizado realista final con iluminación' },
    { id: 'albedo', label: 'Albedo (Color)', desc: 'Inspección de mapa difuso / BaseColor' },
    { id: 'normal', label: 'Normales', desc: 'Relieve superficial y dirección de normales' },
    { id: 'roughness', label: 'Rugosidad', desc: 'Canal de aspereza en escala de grises' },
    { id: 'metalness', label: 'Metálico', desc: 'Canal metálico / dieléctrico' },
    { id: 'ao', label: 'Oclusión Ambiental', desc: 'Sombras de contacto y rincones (AO)' },
    { id: 'emissive', label: 'Emisivo', desc: 'Canal de auto-iluminación y brillo' },
    { id: 'wireframe', label: 'Modo Wireframe', desc: 'Topología y malla poligonal' }
  ];

  const environmentPresets: { id: EnvironmentPreset; label: string }[] = [
    { id: 'studio', label: 'Estudio' },
    { id: 'city', label: 'Ciudad' },
    { id: 'warehouse', label: 'Almacén' },
    { id: 'apartment', label: 'Apartamento' },
    { id: 'lobby', label: 'Lobby' },
    { id: 'sunset', label: 'Atardecer' },
    { id: 'night', label: 'Noche' },
    { id: 'park', label: 'Parque' }
  ];

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsChannelDropdownOpen(false);
      }
      if (envDropdownRef.current && !envDropdownRef.current.contains(event.target as Node)) {
        setIsEnvDropdownOpen(false);
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
        setIsEnvDropdownOpen(false);
      }
    }
  };

  const currentEnvLabel = customHdrName
    ? customHdrName
    : environmentPresets.find((p) => p.id === environmentPreset)?.label || 'Entorno';

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-1 p-1 rounded-xs bg-surface-lowest border border-hairline shadow-md">
      {/* Viewport Theme Toggle (Light/Dark mode isolated to 3D Viewer) */}
      <button
        onClick={toggleViewportTheme}
        title={
          viewportTheme === 'dark'
            ? 'Cambiar fondo del visor a Modo Claro'
            : 'Cambiar fondo del visor a Modo Oscuro'
        }
        className="p-1.5 rounded-xs transition-colors flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink-primary hover:bg-surface-container border border-transparent cursor-pointer"
      >
        {viewportTheme === 'dark' ? (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-ink-primary" />
        )}
      </button>

      <div className="w-px h-4 bg-hairline mx-0.5" />

      {/* Auto Rotate */}
      <button
        onClick={toggleAutoRotate}
        title={autoRotate ? 'Detener rotación automática' : 'Activar rotación automática'}
        className={`p-1.5 rounded-xs transition-colors flex items-center gap-1.5 text-xs font-medium border cursor-pointer ${
          autoRotate ? 'bg-action/15 text-action border-action/40' : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
        }`}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Dimensions */}
      <button
        onClick={toggleDimensions}
        title="Mostrar cotas y dimensiones arquitectónicas"
        className={`p-1.5 rounded-xs transition-colors flex items-center gap-1.5 text-xs font-medium border cursor-pointer ${
          showDimensions ? 'bg-action/15 text-action border-action/40' : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
        }`}
      >
        <Ruler className="w-3.5 h-3.5" />
      </button>

      {/* Channel Inspection Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsChannelDropdownOpen((prev) => !prev)}
          title="Inspección de Canales"
          className={`p-1.5 rounded-xs transition-colors flex items-center gap-1 text-xs font-medium border cursor-pointer ${
            debugChannel !== 'lit'
              ? 'bg-action/15 text-action border-action/40'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <ChevronDown
            className={`w-3 h-3 text-ink-tertiary transition-transform duration-150 ${
              isChannelDropdownOpen ? 'rotate-180 text-action' : ''
            }`}
          />
        </button>

        {isChannelDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 rounded-xs bg-surface-lowest border border-hairline shadow-xl p-1 z-50 flex flex-col gap-0.5">
            <div className="px-2 py-1 text-[10px] font-primary font-semibold text-ink-tertiary uppercase tracking-wider border-b border-hairline mb-1 flex items-center justify-between">
              <span>Inspección de Canales PBR</span>
            </div>

            {debugChannels.map((ch) => {
              const isSelected = debugChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setDebugChannel(ch.id);
                    setIsChannelDropdownOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xs text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
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

      {/* Environment / Reflection Map Dropdown */}
      <div className="relative" ref={envDropdownRef}>
        <button
          onClick={() => setIsEnvDropdownOpen((prev) => !prev)}
          title={`Reflejos e Iluminación (${currentEnvLabel})`}
          className={`p-1.5 rounded-xs transition-colors flex items-center gap-1 text-xs font-medium border cursor-pointer ${
            isEnvDropdownOpen
              ? 'bg-action/15 text-action border-action/40'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <ChevronDown
            className={`w-3 h-3 text-ink-tertiary transition-transform duration-150 ${
              isEnvDropdownOpen ? 'rotate-180 text-action' : ''
            }`}
          />
        </button>

        {isEnvDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 rounded-xs bg-surface-lowest border border-hairline shadow-xl p-1 z-50 flex flex-col gap-0.5">
            <div className="px-2 py-1 text-[10px] font-primary font-semibold text-ink-tertiary uppercase tracking-wider border-b border-hairline mb-1 flex items-center justify-between">
              <span>Reflejos de Entorno</span>
            </div>

            {/* Toggle 360° Scene Background */}
            <div className="px-2 py-1.5 border-b border-hairline mb-1 flex items-center justify-between">
              <span className="text-xs text-ink-primary font-medium">Fondo 360°</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEnvironmentBackground();
                }}
                className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                  showEnvironmentBackground ? 'bg-action' : 'bg-surface-container border border-hairline'
                }`}
                title={showEnvironmentBackground ? 'Ocultar fondo 360° de la escena' : 'Mostrar entorno HDRI como fondo 360° en la escena'}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transition-transform duration-150 absolute top-0.5 ${
                    showEnvironmentBackground ? 'left-3.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {environmentPresets.map((preset) => {
              const isSelected = !customHdrName && environmentPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setEnvironmentPreset(preset.id);
                    setIsEnvDropdownOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xs text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
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

            <div className="border-t border-hairline my-1 pt-1">
              <button
                type="button"
                onClick={handlePickCustomHdr}
                className="w-full px-2.5 py-1.5 rounded-xs text-left text-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-container flex items-center gap-2 transition-colors cursor-pointer"
                title="Cargar un archivo .hdr personalizado desde tu disco"
              >
                <FolderOpen className="w-3.5 h-3.5 text-action" />
                <span className="truncate">Cargar HDR...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={toggleGrid}
        title="Alternar grilla de taller"
        className={`p-1.5 rounded-xs transition-colors flex items-center gap-1.5 text-xs font-medium border cursor-pointer ${
          showGrid ? 'bg-surface-container text-ink-primary border-hairline' : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
        }`}
      >
        <Grid className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={toggleContactShadows}
        title="Alternar sombras de contacto"
        className={`p-1.5 rounded-xs transition-colors flex items-center gap-1.5 text-xs font-medium border cursor-pointer ${
          showContactShadows ? 'bg-surface-container text-ink-primary border-hairline' : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
        }`}
      >
        <Box className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-hairline mx-0.5" />

      {/* 3D Camera Zoom and Reset */}
      <button
        onClick={zoomIn3D}
        title="Acercar cámara 3D (Zoom In)"
        className="p-1.5 rounded-xs transition-colors text-ink-secondary hover:text-ink-primary hover:bg-surface-container cursor-pointer"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={zoomOut3D}
        title="Alejar cámara 3D (Zoom Out)"
        className="p-1.5 rounded-xs transition-colors text-ink-secondary hover:text-ink-primary hover:bg-surface-container cursor-pointer"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={triggerResetCamera}
        title="Reencuadrar cámara a escala 1:1"
        className="p-1.5 rounded-xs transition-colors text-ink-secondary hover:text-ink-primary hover:bg-surface-container cursor-pointer"
      >
        <Camera className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-hairline mx-0.5" />

      {/* Lighting Intensity slider */}
      <div className="flex items-center gap-1.5 px-1.5 text-xs text-ink-secondary">
        <Sun className="w-3.5 h-3.5 text-action" />
        <input
          type="range"
          min="0.2"
          max="2.5"
          step="0.1"
          value={environmentIntensity}
          onChange={(e) => setEnvironmentIntensity(parseFloat(e.target.value))}
          className="w-16 h-1 bg-surface-container rounded-none appearance-none cursor-pointer accent-action"
          title={`Intensidad de iluminación: ${environmentIntensity}x`}
        />
      </div>
    </div>
  );
};
