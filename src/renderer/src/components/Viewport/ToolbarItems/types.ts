export type StandardToolbarItemId =
  | 'channel-dropdown'
  | 'overlays'
  | 'transform-gizmo'
  | 'theme-toggle'
  | 'camera-orientation'
  | 'projection-toggle'
  | 'fit-model'
  | 'auto-rotate'
  | 'environment-hdri'
  | 'lighting-intensity'
  | 'snapshot-button'
  | 'variant-picker'
  | 'model-stats'
  | 'animation-controls';

export type StandardBarItemId = StandardToolbarItemId;
export type ToolbarItemId = StandardToolbarItemId | string;

export interface ToolbarItemMeta {
  id: ToolbarItemId;
  name: string;
  isSpacer?: boolean;
}

export const isToolbarSpacer = (id: string): boolean => {
  return id.startsWith('spacer');
};

export const TOOLBAR_ITEM_NAMES: Record<StandardToolbarItemId, string> = {
  'channel-dropdown': 'Canales PBR',
  'overlays': 'Guías y Sombras',
  'transform-gizmo': 'Manipulador 3D',
  'theme-toggle': 'Tema del Visor',
  'camera-orientation': 'Ángulos CAD',
  'projection-toggle': 'Modo Cámara (ORTO/PERSP)',
  'fit-model': 'Reencuadrar Pieza (1:1)',
  'auto-rotate': 'Giro Automático 360°',
  'environment-hdri': 'Entorno HDRI',
  'lighting-intensity': 'Intensidad de Luz',
  'snapshot-button': 'Captura PNG',
  'variant-picker': 'Selector de Variantes',
  'model-stats': 'Estadísticas del Modelo',
  'animation-controls': 'Control de Animación'
};

export interface ToggleableToolbarItem {
  id: StandardToolbarItemId;
  label: string;
}

export const TOGGLEABLE_TOOLBAR_ITEMS: ToggleableToolbarItem[] = [
  { id: 'channel-dropdown', label: 'Canales PBR' },
  { id: 'overlays', label: 'Guías y Sombras' },
  { id: 'transform-gizmo', label: 'Manipulador 3D' },
  { id: 'theme-toggle', label: 'Tema del Visor' },
  { id: 'camera-orientation', label: 'Ángulos CAD' },
  { id: 'projection-toggle', label: 'Modo Cámara (ORTO/PERSP)' },
  { id: 'fit-model', label: 'Reencuadrar Pieza (1:1)' },
  { id: 'auto-rotate', label: 'Giro Automático 360°' },
  { id: 'environment-hdri', label: 'Entorno HDRI' },
  { id: 'lighting-intensity', label: 'Intensidad de Luz' },
  { id: 'snapshot-button', label: 'Captura PNG' },
  { id: 'variant-picker', label: 'Selector de Variantes' },
  { id: 'model-stats', label: 'Estadísticas del Modelo' },
  { id: 'animation-controls', label: 'Control de Animación' }
];

export const ITEMS_WITH_TEXT: ToggleableToolbarItem[] = [
  { id: 'channel-dropdown', label: 'Canales PBR' },
  { id: 'camera-orientation', label: 'Ángulos CAD' },
  { id: 'environment-hdri', label: 'Entorno HDRI' },
  { id: 'projection-toggle', label: 'Modo Cámara (ORTO/PERSP)' },
  { id: 'variant-picker', label: 'Selector de Variantes' },
  { id: 'model-stats', label: 'Estadísticas del Modelo' },
  { id: 'animation-controls', label: 'Control de Animación' }
];

export const isItemWithText = (id: string): boolean => {
  return ITEMS_WITH_TEXT.some((item) => item.id === id);
};

