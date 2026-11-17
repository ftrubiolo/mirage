import { create } from 'zustand';

export type KeybindAction =
  | 'camera.iso'
  | 'camera.front'
  | 'camera.right'
  | 'camera.left'
  | 'camera.top'
  | 'camera.bottom'
  | 'camera.back'
  | 'camera.reset'
  | 'camera.toggleOrthographic'
  | 'gizmo.select'
  | 'gizmo.translate'
  | 'gizmo.rotate'
  | 'view.toggleGrid'
  | 'view.toggleDimensions'
  | 'view.toggleAutoRotate'
  | 'view.toggleWireframe'
  | 'view.toggleContactShadows'
  | 'view.toggleBackground'
  | 'view.toggleSidebar'
  | 'lighting.presetStudio'
  | 'lighting.presetNatural'
  | 'lighting.presetDramatic'
  | 'lighting.presetTechnical';

export interface KeybindMeta {
  id: KeybindAction;
  label: string;
  category: 'camera' | 'view' | 'lighting';
  desc: string;
}

export const KEYBIND_DEFINITIONS: KeybindMeta[] = [
  // Camera
  { id: 'camera.iso', label: 'Isometric View (3/4)', category: 'camera', desc: '3/4 perspective technical framing' },
  { id: 'camera.front', label: 'Front View', category: 'camera', desc: 'Direct front elevation of the model' },
  { id: 'camera.right', label: 'Right Side View', category: 'camera', desc: 'Right lateral profile' },
  { id: 'camera.left', label: 'Left Side View', category: 'camera', desc: 'Left lateral profile' },
  { id: 'camera.top', label: 'Top View (Plan)', category: 'camera', desc: 'Top-down orthographic angle' },
  { id: 'camera.bottom', label: 'Bottom View', category: 'camera', desc: 'Underside and base inspection' },
  { id: 'camera.back', label: 'Back View', category: 'camera', desc: 'Rear view of the model' },
  { id: 'camera.reset', label: 'Reframe Model (Focus)', category: 'camera', desc: 'Fit camera to the model bounds' },
  { id: 'camera.toggleOrthographic', label: 'Orthographic / Perspective', category: 'camera', desc: 'Toggle between perspective and orthographic projection' },

  // Viewport & Workbench
  { id: 'gizmo.select', label: 'Select / Cursor Mode', category: 'view', desc: 'Disable 3D transform gizmos' },
  { id: 'gizmo.translate', label: '3D Translate (Arrows)', category: 'view', desc: 'Enable 3-axis arrows to move the model in the viewport' },
  { id: 'gizmo.rotate', label: '3D Rotate (Rings)', category: 'view', desc: 'Enable 3-axis rings to rotate model orientation' },
  { id: 'view.toggleGrid', label: 'Reference Grid', category: 'view', desc: 'Toggle the metric floor reference grid' },
  { id: 'view.toggleDimensions', label: 'Bounds & Dimensions', category: 'view', desc: 'Show real-time bounding box dimensions' },
  { id: 'view.toggleAutoRotate', label: 'Auto-Rotate', category: 'view', desc: 'Smooth continuous turntable rotation' },
  { id: 'view.toggleWireframe', label: 'Wireframe Mode', category: 'view', desc: 'Inspect polygon topology and wireframe' },
  { id: 'view.toggleContactShadows', label: 'Contact Shadows', category: 'view', desc: 'Soft volumetric ground contact shadows' },
  { id: 'view.toggleBackground', label: '360° HDR Background', category: 'view', desc: 'Show or hide the HDRI environment backdrop' },
  { id: 'view.toggleSidebar', label: 'Toggle Workbench Panel', category: 'view', desc: 'Show or hide the material and geometry side panel' },

  // Lighting
  { id: 'lighting.presetStudio', label: 'Studio 3-Point Preset', category: 'lighting', desc: 'Soft 3-point studio lighting for PBR inspection' },
  { id: 'lighting.presetNatural', label: 'Natural Daylight Preset', category: 'lighting', desc: 'Warm directional sunlight with diffuse sky' },
  { id: 'lighting.presetDramatic', label: 'Dramatic / Showroom Preset', category: 'lighting', desc: 'High contrast, rim light, and sharp silhouettes' },
  { id: 'lighting.presetTechnical', label: 'Technical Flat Preset', category: 'lighting', desc: 'Flat, even lighting for texture verification' }
];

export const DEFAULT_KEYBINDS: Record<KeybindAction, string> = {
  'camera.iso': '0',
  'camera.front': '1',
  'camera.right': '3',
  'camera.left': 'Ctrl+3',
  'camera.top': '7',
  'camera.bottom': 'Ctrl+7',
  'camera.back': 'Ctrl+1',
  'camera.reset': 'F',
  'camera.toggleOrthographic': '5',
  'gizmo.select': 'Q',
  'gizmo.translate': 'W',
  'gizmo.rotate': 'E',
  'view.toggleGrid': 'G',
  'view.toggleDimensions': 'D',
  'view.toggleAutoRotate': 'Space',
  'view.toggleWireframe': 'Z',
  'view.toggleContactShadows': 'C',
  'view.toggleBackground': 'B',
  'view.toggleSidebar': 'Ctrl+B',
  'lighting.presetStudio': 'Alt+1',
  'lighting.presetNatural': 'Alt+2',
  'lighting.presetDramatic': 'Alt+3',
  'lighting.presetTechnical': 'Alt+4'
};

interface KeybindsState {
  keybinds: Record<string, string>;
  keybindsPath: string;
  isLoaded: boolean;
  init: () => Promise<void>;
  updateKeybind: (action: KeybindAction, shortcut: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  getShortcutLabel: (action: KeybindAction) => string;
  matchesEvent: (e: KeyboardEvent, action: KeybindAction) => boolean;
}

function normalizeKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export const useKeybindsStore = create<KeybindsState>((set, get) => ({
  keybinds: DEFAULT_KEYBINDS,
  keybindsPath: '',
  isLoaded: false,

  init: async () => {
    let path = '';
    if (typeof window !== 'undefined' && window.electronAPI) {
      if (window.electronAPI.getKeybindsPath) {
        try {
          path = await window.electronAPI.getKeybindsPath();
        } catch {
          path = '';
        }
      }
      if (window.electronAPI.loadKeybinds) {
        try {
          const loaded = await window.electronAPI.loadKeybinds();
          set({
            keybinds: { ...DEFAULT_KEYBINDS, ...loaded } as any,
            keybindsPath: path,
            isLoaded: true
          });
          return;
        } catch (err) {
          console.warn('[Keybinds] Could not load keybinds from disk, using defaults:', err);
        }
      }
    }
    set({ keybinds: DEFAULT_KEYBINDS, keybindsPath: path, isLoaded: true });
  },

  updateKeybind: async (action: KeybindAction, shortcut: string) => {
    const next = { ...get().keybinds, [action]: shortcut.trim() };
    set({ keybinds: next });
    if (typeof window !== 'undefined' && window.electronAPI?.saveKeybinds) {
      try {
        await window.electronAPI.saveKeybinds(next);
      } catch (err) {
        console.warn('[Keybinds] Failed to save keybinds to disk:', err);
      }
    }
  },

  resetToDefaults: async () => {
    set({ keybinds: DEFAULT_KEYBINDS });
    if (typeof window !== 'undefined' && window.electronAPI?.saveKeybinds) {
      try {
        await window.electronAPI.saveKeybinds(DEFAULT_KEYBINDS);
      } catch (err) {
        console.warn('[Keybinds] Failed to reset keybinds on disk:', err);
      }
    }
  },

  getShortcutLabel: (action: KeybindAction) => {
    return get().keybinds[action] || DEFAULT_KEYBINDS[action] || '';
  },

  matchesEvent: (e: KeyboardEvent, action: KeybindAction) => {
    const bind = get().keybinds[action] || DEFAULT_KEYBINDS[action];
    if (!bind) return false;

    const parts = bind.split('+').map((p) => p.trim());
    const targetKey = parts[parts.length - 1];
    const needCtrl = parts.some((p) => p.toLowerCase() === 'ctrl');
    const needAlt = parts.some((p) => p.toLowerCase() === 'alt');
    const needShift = parts.some((p) => p.toLowerCase() === 'shift');

    const hasCtrl = e.ctrlKey || e.metaKey;
    const hasAlt = e.altKey;
    const hasShift = e.shiftKey;

    if (needCtrl !== hasCtrl) return false;
    if (needAlt !== hasAlt) return false;
    if (needShift !== hasShift) return false;

    const pressedKey = normalizeKey(e.key);
    const expectedKey = normalizeKey(targetKey);

    return pressedKey.toLowerCase() === expectedKey.toLowerCase();
  }
}));
