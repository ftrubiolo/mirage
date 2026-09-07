import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Sun,
  Layers,
  Ruler,
  Grid,
  Box,
  RotateCcw,
  Check,
  ChevronRight,
  Maximize2,
  Image as ImageIcon,
  Compass,
  Sliders,
  Eye,
  Moon,
  PanelRight
} from 'lucide-react';
import { useViewportStore, CameraPreset, LightingPreset, EnvironmentPreset } from '../../store/viewportStore';
import { useWorkbenchStore, DebugChannel } from '../../store/workbenchStore';
import { useAppStore } from '../../store/appStore';
import { useKeybindsStore, KeybindAction } from '../../utils/keybindsManager';
import { captureViewportSnapshot } from '../../utils/viewportBridge';

interface ViewportContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ViewportContextMenu: React.FC<ViewportContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuTimeoutRef = useRef<any>(null);

  const {
    cameraPreset,
    setCameraPreset,
    cameraFov,
    setCameraFov,
    triggerFitToModel,
    lightingPreset,
    setLightingPreset,
    sunAzimuth,
    setSunAzimuth,
    sunElevation,
    setSunElevation,
    directionalShadows,
    toggleDirectionalShadows,
    showContactShadows,
    toggleContactShadows,
    environmentPreset,
    setEnvironmentPreset,
    showEnvironmentBackground,
    toggleEnvironmentBackground,
    showDimensions,
    toggleDimensions,
    showGrid,
    toggleGrid,
    showWireframe,
    toggleWireframe,
    autoRotate,
    toggleAutoRotate,
    viewportTheme,
    toggleViewportTheme,
    triggerResetCamera
  } = useViewportStore();

  const isWorkbenchSidebarCollapsed = useAppStore((s) => s.isWorkbenchSidebarCollapsed);
  const toggleWorkbenchSidebar = useAppStore((s) => s.toggleWorkbenchSidebar);

  const { debugChannel, setDebugChannel } = useWorkbenchStore();
  const getShortcutLabel = useKeybindsStore((s) => s.getShortcutLabel);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Clamping coordinates so menu remains visible inside screen
  const menuWidth = 230;
  const menuHeight = 310;
  const clampedX = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, x));
  const clampedY = Math.max(10, Math.min(window.innerHeight - menuHeight - 10, y));

  // Submenu direction: open right unless near screen edge
  const openSubmenuLeft = clampedX + menuWidth + 210 > window.innerWidth;

  const handleSubmenuEnter = (name: string) => {
    clearTimeout(submenuTimeoutRef.current);
    setActiveSubmenu(name);
  };

  const handleSubmenuLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 180);
  };

  const handleTakeSnapshot = async () => {
    onClose();
    try {
      const snap = await captureViewportSnapshot({
        width: 1920,
        height: 1080,
        transparent: false,
        format: 'png'
      });
      // Trigger download
      const a = document.createElement('a');
      a.href = snap.dataUrl;
      a.download = `mirage-snapshot-${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.warn('[ContextMenu] Snapshot error:', err);
    }
  };

  const debugChannels: { id: DebugChannel; label: string }[] = [
    { id: 'lit', label: 'PBR Completo' },
    { id: 'albedo', label: 'Albedo (Color Base)' },
    { id: 'normal', label: 'Normales' },
    { id: 'roughness', label: 'Rugosidad' },
    { id: 'metalness', label: 'Metálico' },
    { id: 'ao', label: 'Oclusión Ambiental' },
    { id: 'emissive', label: 'Emisivo' },
    { id: 'wireframe', label: 'Malla Poligonal' }
  ];

  const envPresets: { id: EnvironmentPreset; label: string }[] = [
    { id: 'studio', label: 'Estudio' },
    { id: 'city', label: 'Ciudad' },
    { id: 'warehouse', label: 'Almacén' },
    { id: 'apartment', label: 'Apartamento' },
    { id: 'lobby', label: 'Lobby' },
    { id: 'sunset', label: 'Atardecer' },
    { id: 'night', label: 'Noche' },
    { id: 'park', label: 'Parque' }
  ];

  return (
    <div
      ref={menuRef}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: `${clampedX}px`, top: `${clampedY}px` }}
      className="fixed z-50 w-56 rounded-xs bg-surface-lowest border border-hairline-strong shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100 font-body text-ink-primary"
    >
      {/* Header Title */}
      <div className="px-3 py-1 text-[10px] font-primary font-bold uppercase tracking-wider text-ink-tertiary border-b border-hairline flex items-center justify-between">
        <span>Taller 3D Mirage</span>
      </div>

      <div className="py-1">
        {/* Submenu 1: Camera Views */}
        <div
          className="relative"
          onMouseEnter={() => handleSubmenuEnter('camera')}
          onMouseLeave={handleSubmenuLeave}
        >
          <div className="px-3 py-1.5 flex items-center justify-between hover:bg-surface-container cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-action" />
              <span>Vistas de Cámara</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-ink-tertiary" />
          </div>

          {activeSubmenu === 'camera' && (
            <div
              style={{
                [openSubmenuLeft ? 'right' : 'left']: '100%',
                top: '-4px'
              }}
              className="absolute z-50 w-56 rounded-xs bg-surface-lowest border border-hairline-strong shadow-2xl py-1"
            >
              <div className="px-3 py-1 text-[10px] font-primary font-bold uppercase tracking-wider text-ink-tertiary border-b border-hairline">
                Orientación de Cámara
              </div>
              <div className="py-1">
                {[
                  { id: 'iso', label: 'Isométrica (3/4)', action: 'camera.iso' },
                  { id: 'front', label: 'Frontal', action: 'camera.front' },
                  { id: 'right', label: 'Lateral Derecha', action: 'camera.right' },
                  { id: 'left', label: 'Lateral Izquierda', action: 'camera.left' },
                  { id: 'top', label: 'Superior (Planta)', action: 'camera.top' },
                  { id: 'bottom', label: 'Inferior', action: 'camera.bottom' },
                  { id: 'back', label: 'Posterior', action: 'camera.back' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCameraPreset(item.id as CameraPreset);
                      onClose();
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {cameraPreset === item.id ? (
                        <Check className="w-3.5 h-3.5 text-action shrink-0" />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="font-mono text-[10px] text-ink-tertiary uppercase ml-2 shrink-0">
                      {getShortcutLabel(item.action as KeybindAction)}
                    </span>
                  </button>
                ))}

                <div className="border-t border-hairline my-1" />

                <button
                  onClick={() => {
                    triggerFitToModel();
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-3.5 h-3.5 text-ink-secondary" />
                    <span>Reencuadrar Pieza</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-tertiary uppercase ml-2">
                    {getShortcutLabel('camera.reset')}
                  </span>
                </button>

                <div className="border-t border-hairline my-1" />
                <div className="px-3 py-1 text-[10px] font-primary font-bold uppercase tracking-wider text-ink-tertiary">
                  Campo de Visión (FOV)
                </div>

                {[
                  { fov: 35, label: '35° (Teleobjetivo Ortogonal)' },
                  { fov: 50, label: '50° (Perspectiva Natural)' },
                  { fov: 75, label: '75° (Gran Angular)' }
                ].map((f) => (
                  <button
                    key={f.fov}
                    onClick={() => {
                      setCameraFov(f.fov);
                      onClose();
                    }}
                    className="w-full px-3 py-1 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {cameraFov === f.fov ? (
                        <Check className="w-3.5 h-3.5 text-action shrink-0" />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      <span>{f.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submenu 2: Lighting & Studio */}
        <div
          className="relative"
          onMouseEnter={() => handleSubmenuEnter('lighting')}
          onMouseLeave={handleSubmenuLeave}
        >
          <div className="px-3 py-1.5 flex items-center justify-between hover:bg-surface-container cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-action" />
              <span>Iluminación y Estudio</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-ink-tertiary" />
          </div>

          {activeSubmenu === 'lighting' && (
            <div
              style={{
                [openSubmenuLeft ? 'right' : 'left']: '100%',
                top: '-4px'
              }}
              className="absolute z-50 w-60 rounded-xs bg-surface-lowest border border-hairline-strong shadow-2xl py-1"
            >
              <div className="px-3 py-1 text-[10px] font-primary font-bold uppercase tracking-wider text-ink-tertiary border-b border-hairline">
                Presets de Iluminación
              </div>
              <div className="py-1">
                {[
                  { id: 'studio', label: 'Estudio Atelier (3 Puntos)', action: 'lighting.presetStudio' },
                  { id: 'natural', label: 'Luz Solar Natural', action: 'lighting.presetNatural' },
                  { id: 'dramatic', label: 'Dramático / Showroom', action: 'lighting.presetDramatic' },
                  { id: 'technical', label: 'Inspección Técnica Plana', action: 'lighting.presetTechnical' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setLightingPreset(item.id as LightingPreset);
                      onClose();
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {lightingPreset === item.id ? (
                        <Check className="w-3.5 h-3.5 text-action shrink-0" />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="font-mono text-[10px] text-ink-tertiary uppercase ml-2 shrink-0">
                      {getShortcutLabel(item.action as KeybindAction)}
                    </span>
                  </button>
                ))}

                <div className="border-t border-hairline my-1" />

                <div className="px-3 py-1 text-[10px] font-primary font-bold uppercase tracking-wider text-ink-tertiary">
                  Rotación de Luz Solar
                </div>

                <div className="px-3 py-1 flex items-center justify-between gap-1 text-[11px]">
                  <button
                    onClick={() => setSunAzimuth(sunAzimuth - 45)}
                    className="px-2 py-1 bg-surface-container hover:bg-surface-high rounded-xs border border-hairline cursor-pointer"
                    title="Girar 45° a la izquierda"
                  >
                    -45°
                  </button>
                  <span className="font-mono text-[10px] text-action font-semibold">
                    {Math.round(sunAzimuth)}° Azimut
                  </span>
                  <button
                    onClick={() => setSunAzimuth(sunAzimuth + 45)}
                    className="px-2 py-1 bg-surface-container hover:bg-surface-high rounded-xs border border-hairline cursor-pointer"
                    title="Girar 45° a la derecha"
                  >
                    +45°
                  </button>
                </div>

                <div className="border-t border-hairline my-1" />

                <button
                  onClick={() => toggleDirectionalShadows()}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {directionalShadows ? (
                      <Check className="w-3.5 h-3.5 text-action shrink-0" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span>Sombras Arrojadas</span>
                  </div>
                </button>

                <button
                  onClick={() => toggleContactShadows()}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {showContactShadows ? (
                      <Check className="w-3.5 h-3.5 text-action shrink-0" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span>Sombras de Contacto Piso</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-tertiary uppercase ml-2">
                    {getShortcutLabel('view.toggleContactShadows')}
                  </span>
                </button>

                <div className="border-t border-hairline my-1" />

                <button
                  onClick={() => toggleEnvironmentBackground()}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {showEnvironmentBackground ? (
                      <Check className="w-3.5 h-3.5 text-action shrink-0" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span>Fondo 360° HDR</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-tertiary uppercase ml-2">
                    {getShortcutLabel('view.toggleBackground')}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submenu 3: PBR Debug Channels */}
        <div
          className="relative"
          onMouseEnter={() => handleSubmenuEnter('channels')}
          onMouseLeave={handleSubmenuLeave}
        >
          <div className="px-3 py-1.5 flex items-center justify-between hover:bg-surface-container cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-action" />
              <span>Pases PBR (Canales)</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-ink-tertiary" />
          </div>

          {activeSubmenu === 'channels' && (
            <div
              style={{
                [openSubmenuLeft ? 'right' : 'left']: '100%',
                top: '-4px'
              }}
              className="absolute z-50 w-52 rounded-xs bg-surface-lowest border border-hairline-strong shadow-2xl py-1"
            >
              <div className="px-3 py-1 text-[10px] font-primary font-bold uppercase tracking-wider text-ink-tertiary border-b border-hairline">
                Inspección de Material
              </div>
              <div className="py-1">
                {debugChannels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setDebugChannel(ch.id);
                      onClose();
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {debugChannel === ch.id ? (
                        <Check className="w-3.5 h-3.5 text-action shrink-0" />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      <span className="truncate">{ch.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submenu 4: Viewport Helpers */}
        <div
          className="relative"
          onMouseEnter={() => handleSubmenuEnter('helpers')}
          onMouseLeave={handleSubmenuLeave}
        >
          <div className="px-3 py-1.5 flex items-center justify-between hover:bg-surface-container cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-action" />
              <span>Guías y Taller</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-ink-tertiary" />
          </div>

          {activeSubmenu === 'helpers' && (
            <div
              style={{
                [openSubmenuLeft ? 'right' : 'left']: '100%',
                top: '-4px'
              }}
              className="absolute z-50 w-52 rounded-xs bg-surface-lowest border border-hairline-strong shadow-2xl py-1"
            >
              <div className="px-3 py-1 text-[10px] font-primary font-bold uppercase tracking-wider text-ink-tertiary border-b border-hairline">
                Ayudas Visuales
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    toggleDimensions();
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {showDimensions ? (
                      <Check className="w-3.5 h-3.5 text-action shrink-0" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span>Cotas y Dimensiones</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-tertiary uppercase ml-2">
                    {getShortcutLabel('view.toggleDimensions')}
                  </span>
                </button>

                <button
                  onClick={() => {
                    toggleGrid();
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {showGrid ? (
                      <Check className="w-3.5 h-3.5 text-action shrink-0" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span>Grilla de Taller</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-tertiary uppercase ml-2">
                    {getShortcutLabel('view.toggleGrid')}
                  </span>
                </button>

                <button
                  onClick={() => {
                    toggleWireframe();
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {showWireframe ? (
                      <Check className="w-3.5 h-3.5 text-action shrink-0" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span>Modo Wireframe</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-tertiary uppercase ml-2">
                    {getShortcutLabel('view.toggleWireframe')}
                  </span>
                </button>

                <button
                  onClick={() => {
                    toggleAutoRotate();
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {autoRotate ? (
                      <Check className="w-3.5 h-3.5 text-action shrink-0" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span>Giro Automático</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-tertiary uppercase ml-2">
                    {getShortcutLabel('view.toggleAutoRotate')}
                  </span>
                </button>

                <button
                  onClick={() => {
                    toggleWorkbenchSidebar();
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {!isWorkbenchSidebarCollapsed ? (
                      <Check className="w-3.5 h-3.5 text-action shrink-0" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span>Panel de Taller</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-tertiary uppercase ml-2">
                    {getShortcutLabel('view.toggleSidebar')}
                  </span>
                </button>

                <div className="border-t border-hairline my-1" />

                <button
                  onClick={() => {
                    toggleViewportTheme();
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5 text-ink-secondary" />
                    <span>Fondo {viewportTheme === 'dark' ? 'Claro' : 'Oscuro'}</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-hairline my-1" />

      {/* Quick Actions */}
      <div className="py-0.5">
        <button
          onClick={() => {
            triggerFitToModel();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-ink-secondary" />
            <span>Reencuadrar Pieza</span>
          </div>
          <span className="font-mono text-[10px] text-ink-tertiary uppercase ml-2">
            {getShortcutLabel('camera.reset')}
          </span>
        </button>

        <button
          onClick={handleTakeSnapshot}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-container text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-ink-secondary" />
            <span>Captura Rápida HD</span>
          </div>
        </button>
      </div>
    </div>
  );
};
