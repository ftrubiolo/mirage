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
  { id: 'iso', label: 'Isometric (3/4)', action: 'camera.iso' },
  { id: 'front', label: 'Front', action: 'camera.front' },
  { id: 'right', label: 'Right Side', action: 'camera.right' },
  { id: 'left', label: 'Left Side', action: 'camera.left' },
  { id: 'top', label: 'Top (Plan)', action: 'camera.top' },
  { id: 'bottom', label: 'Bottom', action: 'camera.bottom' },
  { id: 'back', label: 'Back', action: 'camera.back' }
];

const FOV_PRESETS = [
  { fov: 35, label: '35° (Telephoto CAD)' },
  { fov: 50, label: '50° (Natural Perspective)' },
  { fov: 75, label: '75° (Wide Angle)' }
];

const LIGHTING_PRESETS: { id: LightingPreset; label: string; action: KeybindAction }[] = [
  { id: 'studio', label: 'Studio (3-Point)', action: 'lighting.presetStudio' },
  { id: 'natural', label: 'Natural Daylight', action: 'lighting.presetNatural' },
  { id: 'dramatic', label: 'Dramatic / Showroom', action: 'lighting.presetDramatic' },
  { id: 'technical', label: 'Flat Technical Inspection', action: 'lighting.presetTechnical' }
];

const DEBUG_CHANNELS: { id: DebugChannel; label: string }[] = [
  { id: 'lit', label: 'Full PBR (Lit)' },
  { id: 'albedo', label: 'Albedo (Base Color)' },
  { id: 'normal', label: 'Normals' },
  { id: 'roughness', label: 'Roughness' },
  { id: 'metalness', label: 'Metalness' },
  { id: 'ao', label: 'Ambient Occlusion' },
  { id: 'emissive', label: 'Emissive' },
  { id: 'wireframe', label: 'Wireframe' }
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
    isOrthographic,
    toggleOrthographic,
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
      <ContextMenuHeader>Mirage 3D Viewport</ContextMenuHeader>

      {/* Submenu 1: Camera Views */}
      <ContextMenuSub label="Camera Views" icon={<Camera className="w-3.5 h-3.5 text-action" />}>
        <ContextMenuHeader>Camera Orientation</ContextMenuHeader>
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
          Frame Model
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuCheckbox
          label="Orthographic Mode"
          checked={isOrthographic}
          shortcut={getShortcutLabel('camera.toggleOrthographic')}
          onChange={toggleOrthographic}
        />

        <ContextMenuSeparator />
        <ContextMenuHeader>Field of View (FOV)</ContextMenuHeader>

        {FOV_PRESETS.map((f) => (
          <ContextMenuItem
            key={f.fov}
            checked={!isOrthographic && cameraFov === f.fov}
            disabled={isOrthographic}
            onClick={() => setCameraFov(f.fov)}
          >
            {f.label}
          </ContextMenuItem>
        ))}
      </ContextMenuSub>

      {/* Submenu 2: Lighting & Studio */}
      <ContextMenuSub label="Lighting &amp; Studio" icon={<Sun className="w-3.5 h-3.5 text-action" />} width={240}>
        <ContextMenuHeader>Lighting Presets</ContextMenuHeader>
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
        <ContextMenuHeader>Sun Rotation</ContextMenuHeader>

        <ContextMenuCustom>
          <div className="flex items-center justify-between gap-1 text-[11px] py-0.5">
            <button
              type="button"
              onClick={() => setSunAzimuth(sunAzimuth - 45)}
              className="px-2 py-1 bg-surface-container hover:bg-surface-high rounded-xs border border-hairline cursor-pointer"
              title="Rotate 45° left"
            >
              -45°
            </button>
            <span className="font-mono text-[10px] text-action font-semibold">
              {Math.round(sunAzimuth)}° Azimuth
            </span>
            <button
              type="button"
              onClick={() => setSunAzimuth(sunAzimuth + 45)}
              className="px-2 py-1 bg-surface-container hover:bg-surface-high rounded-xs border border-hairline cursor-pointer"
              title="Rotate 45° right"
            >
              +45°
            </button>
          </div>
        </ContextMenuCustom>

        <ContextMenuSeparator />

        <ContextMenuCheckbox
          label="Cast Shadows"
          checked={directionalShadows}
          onChange={toggleDirectionalShadows}
        />

        <ContextMenuCheckbox
          label="Floor Contact Shadows"
          checked={showContactShadows}
          shortcut={getShortcutLabel('view.toggleContactShadows')}
          onChange={toggleContactShadows}
        />

        <ContextMenuSeparator />

        <ContextMenuCheckbox
          label="360° HDR Background"
          checked={showEnvironmentBackground}
          shortcut={getShortcutLabel('view.toggleBackground')}
          onChange={toggleEnvironmentBackground}
        />
      </ContextMenuSub>

      {/* Submenu 3: PBR Debug Channels */}
      <ContextMenuSub label="PBR Passes (Channels)" icon={<Layers className="w-3.5 h-3.5 text-action" />}>
        <ContextMenuHeader>Material Inspection</ContextMenuHeader>
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
      <ContextMenuSub label="Guides &amp; Viewport" icon={<Compass className="w-3.5 h-3.5 text-action" />}>
        <ContextMenuHeader>Visual Aids</ContextMenuHeader>

        <ContextMenuCheckbox
          label="Bounds &amp; Dimensions"
          checked={showDimensions}
          shortcut={getShortcutLabel('view.toggleDimensions')}
          onChange={toggleDimensions}
        />

        <ContextMenuCheckbox
          label="Reference Grid"
          checked={showGrid}
          shortcut={getShortcutLabel('view.toggleGrid')}
          onChange={toggleGrid}
        />

        <ContextMenuCheckbox
          label="Wireframe Mode"
          checked={showWireframe}
          shortcut={getShortcutLabel('view.toggleWireframe')}
          onChange={toggleWireframe}
        />

        <ContextMenuCheckbox
          label="Auto-Rotate"
          checked={autoRotate}
          shortcut={getShortcutLabel('view.toggleAutoRotate')}
          onChange={toggleAutoRotate}
        />

        <ContextMenuCheckbox
          label="Workbench Panel"
          checked={!isWorkbenchSidebarCollapsed}
          shortcut={getShortcutLabel('view.toggleSidebar')}
          onChange={toggleWorkbenchSidebar}
        />

        <ContextMenuSeparator />

        <ContextMenuItem
          icon={viewportTheme === 'dark' ? <SunMedium className="w-3.5 h-3.5 text-ink-secondary" /> : <Moon className="w-3.5 h-3.5 text-ink-secondary" />}
          onClick={toggleViewportTheme}
        >
          {viewportTheme === 'dark' ? 'Light Background' : 'Dark Background'}
        </ContextMenuItem>
      </ContextMenuSub>

      <ContextMenuSeparator />

      {/* Quick Actions */}
      <ContextMenuItem
        icon={<Maximize2 className="w-3.5 h-3.5 text-ink-secondary" />}
        shortcut={getShortcutLabel('camera.reset')}
        onClick={triggerFitToModel}
      >
        Frame Model
      </ContextMenuItem>

      <ContextMenuItem
        icon={<ImageIcon className="w-3.5 h-3.5 text-ink-secondary" />}
        onClick={handleTakeSnapshot}
      >
        Quick HD Snapshot
      </ContextMenuItem>
    </ContextMenu>
  );
};
