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
  // Camara
  { id: 'camera.iso', label: 'Vista Isométrica (3/4)', category: 'camera', desc: 'Encuadre técnico en perspectiva 3/4' },
  { id: 'camera.front', label: 'Vista Frontal', category: 'camera', desc: 'Elevación frontal directa a la pieza' },
  { id: 'camera.right', label: 'Vista Lateral Derecha', category: 'camera', desc: 'Perfil lateral derecho' },
  { id: 'camera.left', label: 'Vista Lateral Izquierda', category: 'camera', desc: 'Perfil lateral izquierdo' },
  { id: 'camera.top', label: 'Vista Superior (Planta)', category: 'camera', desc: 'Vista cenital técnica' },
  { id: 'camera.bottom', label: 'Vista Inferior', category: 'camera', desc: 'Vista de base y estructura inferior' },
  { id: 'camera.back', label: 'Vista Posterior', category: 'camera', desc: 'Vista trasera de la pieza' },
  { id: 'camera.reset', label: 'Reencuadrar Pieza (Focus)', category: 'camera', desc: 'Ajustar la cámara al tamaño de la pieza' },
  { id: 'camera.toggleOrthographic', label: 'Proyección Ortográfica / Perspectiva', category: 'camera', desc: 'Alternar entre perspectiva y vista ortogonal' },

  // Visor y Taller
  { id: 'gizmo.select', label: 'Modo Selección / Cursor', category: 'view', desc: 'Desactiva los controles de transformación 3D' },
  { id: 'gizmo.translate', label: 'Desplazamiento 3D (Flechas)', category: 'view', desc: 'Activa las 3 flechas para mover la pieza en el visor' },
  { id: 'gizmo.rotate', label: 'Rotación 3D (Aros)', category: 'view', desc: 'Activa los 3 aros para girar la orientación del modelo' },
  { id: 'view.toggleGrid', label: 'Grilla Milimétrica', category: 'view', desc: 'Alternar la cuadrícula de piso de referencia' },
  { id: 'view.toggleDimensions', label: 'Cotas y Dimensiones', category: 'view', desc: 'Mostrar cotas volumétricas en tiempo real' },
  { id: 'view.toggleAutoRotate', label: 'Rotación Automática', category: 'view', desc: 'Giro continuo suave del modelo' },
  { id: 'view.toggleWireframe', label: 'Modo Wireframe', category: 'view', desc: 'Inspeccionar topología y malla poligonal' },
  { id: 'view.toggleContactShadows', label: 'Sombras de Contacto', category: 'view', desc: 'Sombras volumétricas de apoyo en el suelo' },
  { id: 'view.toggleBackground', label: 'Fondo 360° HDR', category: 'view', desc: 'Mostrar u ocultar el entorno HDRI de fondo' },
  { id: 'view.toggleSidebar', label: 'Alternar Panel de Taller', category: 'view', desc: 'Mostrar u ocultar el panel lateral de mapas y geometría' },

  // Iluminacion
  { id: 'lighting.presetStudio', label: 'Preset Estudio Atelier', category: 'lighting', desc: 'Luz suave de 3 puntos para inspección PBR' },
  { id: 'lighting.presetNatural', label: 'Preset Luz Natural', category: 'lighting', desc: 'Luz solar direccional cálida con cielo difuso' },
  { id: 'lighting.presetDramatic', label: 'Preset Dramático / Showroom', category: 'lighting', desc: 'Alto contraste, luz rasante y siluetas' },
  { id: 'lighting.presetTechnical', label: 'Preset Inspección Técnica', category: 'lighting', desc: 'Luz plana y uniforme para control de texturas' }
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
