import React from 'react';
import {
  Camera,
  Sun,
  Layers,
  Maximize2,
  Image as ImageIcon,
  Compass,
  Moon,
  SunMedium
} from 'lucide-react';
import {
  useViewportStore,
  CameraPreset,
  LightingPreset
} from '../../store/viewportStore';
import { usePbrMaterialStore, DebugChannel } from '../../store/pbrMaterialStore';
import { useAppStore } from '../../store/appStore';
import { useKeybindsStore, KeybindAction } from '../../utils/keybindsManager';
import { captureViewportSnapshot } from '../../utils/viewportBridge';
import {
  ContextMenu,
  ContextMenuHeader,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSeparator,
  ContextMenuCheckbox,
  ContextMenuCustom
} from '../UI';

interface ViewportContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
}

const CAMERA_PRESETS: { id: CameraPreset; label: string; action: KeybindAction }[] = [
  { id: 'iso', label: 'Isométrica (3/4)', action: 'camera.iso' },
  { id: 'front', label: 'Frontal', action: 'camera.front' },
  { id: 'right', label: 'Lateral Derecha', action: 'camera.right' },
  { id: 'left', label: 'Lateral Izquierda', action: 'camera.left' },
  { id: 'top', label: 'Superior (Planta)', action: 'camera.top' },
  { id: 'bottom', label: 'Inferior', action: 'camera.bottom' },
  { id: 'back', label: 'Posterior', action: 'camera.back' }
];

const FOV_PRESETS = [
  { fov: 35, label: '35° (Teleobjetivo Ortogonal)' },
  { fov: 50, label: '50° (Perspectiva Natural)' },
  { fov: 75, label: '75° (Gran Angular)' }
];

const LIGHTING_PRESETS: { id: LightingPreset; label: string; action: KeybindAction }[] = [
  { id: 'studio', label: 'Estudio Atelier (3 Puntos)', action: 'lighting.presetStudio' },
  { id: 'natural', label: 'Luz Solar Natural', action: 'lighting.presetNatural' },
  { id: 'dramatic', label: 'Dramático / Showroom', action: 'lighting.presetDramatic' },
  { id: 'technical', label: 'Inspección Técnica Plana', action: 'lighting.presetTechnical' }
];

const DEBUG_CHANNELS: { id: DebugChannel; label: string }[] = [
  { id: 'lit', label: 'PBR Completo' },
  { id: 'albedo', label: 'Albedo (Color Base)' },
  { id: 'normal', label: 'Normales' },
  { id: 'roughness', label: 'Rugosidad' },
  { id: 'metalness', label: 'Metálico' },
  { id: 'ao', label: 'Oclusión Ambiental' },
  { id: 'emissive', label: 'Emisivo' },
  { id: 'wireframe', label: 'Malla Poligonal' }
];

export const ViewportContextMenu: React.FC<ViewportContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose
}) => {
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
    directionalShadows,
    toggleDirectionalShadows,
    showContactShadows,
    toggleContactShadows,
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
    toggleViewportTheme
  } = useViewportStore();

  const isWorkbenchSidebarCollapsed = useAppStore((s) => s.isWorkbenchSidebarCollapsed);
  const toggleWorkbenchSidebar = useAppStore((s) => s.toggleWorkbenchSidebar);

  const debugChannel = usePbrMaterialStore((s) => s.debugChannel);
  const setDebugChannel = usePbrMaterialStore((s) => s.setDebugChannel);
  const getShortcutLabel = useKeybindsStore((s) => s.getShortcutLabel);

  const handleTakeSnapshot = async () => {
    onClose();
    try {
      const snap = await captureViewportSnapshot({
        width: 1920,
        height: 1080,
        transparent: false,
        format: 'png'
      });
      const a = document.createElement('a');
      a.href = snap.dataUrl;
      a.download = `mirage-snapshot-${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.warn('[ContextMenu] Snapshot error:', err);
    }
  };

  return (
    <ContextMenu isOpen={isOpen} position={{ x, y }} onClose={onClose}>
      <ContextMenuHeader>Taller 3D Mirage</ContextMenuHeader>

      {/* Submenu 1: Camera Views */}
      <ContextMenuSub label="Vistas de Cámara" icon={<Camera className="w-3.5 h-3.5 text-action" />}>
        <ContextMenuHeader>Orientación de Cámara</ContextMenuHeader>
        {CAMERA_PRESETS.map((item) => (
          <ContextMenuItem
            key={item.id}
            checked={cameraPreset === item.id}
            shortcut={getShortcutLabel(item.action)}
            onClick={() => setCameraPreset(item.id)}
          >
            {item.label}
          </ContextMenuItem>
        ))}

        <ContextMenuSeparator />

        <ContextMenuItem
          icon={<Maximize2 className="w-3.5 h-3.5 text-ink-secondary" />}
          shortcut={getShortcutLabel('camera.reset')}
          onClick={triggerFitToModel}
        >
          Reencuadrar Pieza
        </ContextMenuItem>

        <ContextMenuSeparator />
        <ContextMenuHeader>Campo de Visión (FOV)</ContextMenuHeader>

        {FOV_PRESETS.map((f) => (
          <ContextMenuItem
            key={f.fov}
            checked={cameraFov === f.fov}
            onClick={() => setCameraFov(f.fov)}
          >
            {f.label}
          </ContextMenuItem>
        ))}
      </ContextMenuSub>

      {/* Submenu 2: Lighting & Studio */}
      <ContextMenuSub label="Iluminación y Estudio" icon={<Sun className="w-3.5 h-3.5 text-action" />} width={240}>
        <ContextMenuHeader>Presets de Iluminación</ContextMenuHeader>
        {LIGHTING_PRESETS.map((item) => (
          <ContextMenuItem
            key={item.id}
            checked={lightingPreset === item.id}
            shortcut={getShortcutLabel(item.action)}
            onClick={() => setLightingPreset(item.id)}
          >
            {item.label}
          </ContextMenuItem>
        ))}

        <ContextMenuSeparator />
        <ContextMenuHeader>Rotación de Luz Solar</ContextMenuHeader>

        <ContextMenuCustom>
          <div className="flex items-center justify-between gap-1 text-[11px] py-0.5">
            <button
              type="button"
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
              type="button"
              onClick={() => setSunAzimuth(sunAzimuth + 45)}
              className="px-2 py-1 bg-surface-container hover:bg-surface-high rounded-xs border border-hairline cursor-pointer"
              title="Girar 45° a la derecha"
            >
              +45°
            </button>
          </div>
        </ContextMenuCustom>

        <ContextMenuSeparator />

        <ContextMenuCheckbox
          label="Sombras Arrojadas"
          checked={directionalShadows}
          onChange={toggleDirectionalShadows}
        />

        <ContextMenuCheckbox
          label="Sombras de Contacto Piso"
          checked={showContactShadows}
          shortcut={getShortcutLabel('view.toggleContactShadows')}
          onChange={toggleContactShadows}
        />

        <ContextMenuSeparator />

        <ContextMenuCheckbox
          label="Fondo 360° HDR"
          checked={showEnvironmentBackground}
          shortcut={getShortcutLabel('view.toggleBackground')}
          onChange={toggleEnvironmentBackground}
        />
      </ContextMenuSub>

      {/* Submenu 3: PBR Debug Channels */}
      <ContextMenuSub label="Pases PBR (Canales)" icon={<Layers className="w-3.5 h-3.5 text-action" />}>
        <ContextMenuHeader>Inspección de Material</ContextMenuHeader>
        {DEBUG_CHANNELS.map((ch) => (
          <ContextMenuItem
            key={ch.id}
            checked={debugChannel === ch.id}
            onClick={() => setDebugChannel(ch.id)}
          >
            {ch.label}
          </ContextMenuItem>
        ))}
      </ContextMenuSub>

      {/* Submenu 4: Viewport Helpers */}
      <ContextMenuSub label="Guías y Taller" icon={<Compass className="w-3.5 h-3.5 text-action" />}>
        <ContextMenuHeader>Ayudas Visuales</ContextMenuHeader>

        <ContextMenuCheckbox
          label="Cotas y Dimensiones"
          checked={showDimensions}
          shortcut={getShortcutLabel('view.toggleDimensions')}
          onChange={toggleDimensions}
        />

        <ContextMenuCheckbox
          label="Grilla de Taller"
          checked={showGrid}
          shortcut={getShortcutLabel('view.toggleGrid')}
          onChange={toggleGrid}
        />

        <ContextMenuCheckbox
          label="Modo Wireframe"
          checked={showWireframe}
          shortcut={getShortcutLabel('view.toggleWireframe')}
          onChange={toggleWireframe}
        />

        <ContextMenuCheckbox
          label="Giro Automático"
          checked={autoRotate}
          shortcut={getShortcutLabel('view.toggleAutoRotate')}
          onChange={toggleAutoRotate}
        />

        <ContextMenuCheckbox
          label="Panel de Taller"
          checked={!isWorkbenchSidebarCollapsed}
          shortcut={getShortcutLabel('view.toggleSidebar')}
          onChange={toggleWorkbenchSidebar}
        />

        <ContextMenuSeparator />

        <ContextMenuItem
          icon={viewportTheme === 'dark' ? <SunMedium className="w-3.5 h-3.5 text-ink-secondary" /> : <Moon className="w-3.5 h-3.5 text-ink-secondary" />}
          onClick={toggleViewportTheme}
        >
          Fondo {viewportTheme === 'dark' ? 'Claro' : 'Oscuro'}
        </ContextMenuItem>
      </ContextMenuSub>

      <ContextMenuSeparator />

      {/* Quick Actions */}
      <ContextMenuItem
        icon={<Maximize2 className="w-3.5 h-3.5 text-ink-secondary" />}
        shortcut={getShortcutLabel('camera.reset')}
        onClick={triggerFitToModel}
      >
        Reencuadrar Pieza
      </ContextMenuItem>

      <ContextMenuItem
        icon={<ImageIcon className="w-3.5 h-3.5 text-ink-secondary" />}
        onClick={handleTakeSnapshot}
      >
        Captura Rápida HD
      </ContextMenuItem>
    </ContextMenu>
  );
};
