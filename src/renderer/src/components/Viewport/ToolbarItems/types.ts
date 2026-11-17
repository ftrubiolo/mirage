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
  'channel-dropdown': 'PBR Channels',
  'overlays': 'Guides & Shadows',
  'transform-gizmo': '3D Gizmo',
  'theme-toggle': 'Viewport Theme',
  'camera-orientation': 'CAD Camera Views',
  'projection-toggle': 'Camera Mode (ORTHO/PERSP)',
  'fit-model': 'Reframe Model (1:1)',
  'auto-rotate': '360° Auto Orbit',
  'environment-hdri': 'HDRI Environment',
  'lighting-intensity': 'Light Intensity',
  'snapshot-button': 'PNG Snapshot',
  'variant-picker': 'Variant Picker',
  'model-stats': 'Model Statistics',
  'animation-controls': 'Animation Controls'
};

export interface ToggleableToolbarItem {
  id: StandardToolbarItemId;
  label: string;
}

export const TOGGLEABLE_TOOLBAR_ITEMS: ToggleableToolbarItem[] = [
  { id: 'channel-dropdown', label: 'PBR Channels' },
  { id: 'overlays', label: 'Guides & Shadows' },
  { id: 'transform-gizmo', label: '3D Gizmo' },
  { id: 'theme-toggle', label: 'Viewport Theme' },
  { id: 'camera-orientation', label: 'CAD Camera Views' },
  { id: 'projection-toggle', label: 'Camera Mode (ORTHO/PERSP)' },
  { id: 'fit-model', label: 'Reframe Model (1:1)' },
  { id: 'auto-rotate', label: '360° Auto Orbit' },
  { id: 'environment-hdri', label: 'HDRI Environment' },
  { id: 'lighting-intensity', label: 'Light Intensity' },
  { id: 'snapshot-button', label: 'PNG Snapshot' },
  { id: 'variant-picker', label: 'Variant Picker' },
  { id: 'model-stats', label: 'Model Statistics' },
  { id: 'animation-controls', label: 'Animation Controls' }
];

export const ITEMS_WITH_TEXT: ToggleableToolbarItem[] = [
  { id: 'channel-dropdown', label: 'PBR Channels' },
  { id: 'camera-orientation', label: 'CAD Camera Views' },
  { id: 'environment-hdri', label: 'HDRI Environment' },
  { id: 'projection-toggle', label: 'Camera Mode (ORTHO/PERSP)' },
  { id: 'variant-picker', label: 'Variant Picker' },
  { id: 'model-stats', label: 'Model Statistics' },
  { id: 'animation-controls', label: 'Animation Controls' }
];

export const isItemWithText = (id: string): boolean => {
  return ITEMS_WITH_TEXT.some((item) => item.id === id);
};

