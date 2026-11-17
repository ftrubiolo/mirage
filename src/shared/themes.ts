/**
 * Shared Theme Specification, Color Derivation, and JSON Theme Parser.
 *
 * Consumed by both Electron Main (theme discovery, seeding & hot-reload watchers)
 * and Renderer (CSS custom property injection, 3D viewport palette, Settings UI).
 */

export type ThemeSourceKind = 'builtin' | 'local';
export type ThemeColorMode = 'dark' | 'light';

export interface MirageViewportTokens {
  background: string;
  gridPrimary: string;
  gridSecondary: string;
  hemisphereSky: string;
  hemisphereGround: string;
  dimensionLine: string;
}

export interface MirageThemeTokens {
  canvas: string;
  canvasSubtle: string;
  canvasStone: string;
  surfaceLowest: string;
  surfaceLow: string;
  surfaceContainer: string;
  surfaceHigh: string;
  surfaceHighest: string;
  inkPrimary: string;
  inkSecondary: string;
  inkTertiary: string;
  hairline: string;
  hairlineStrong: string;
  action: string;
  actionHover: string;
  actionActive: string;
  actionSubtle: string;
  actionInk: string;
  onAction: string;
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  viewport: MirageViewportTokens;
}

export interface MirageThemeFonts {
  primary?: string;
  body?: string;
  mono?: string;
}

/**
 * Partial seed format allowed in user JSON theme files.
 * Any omitted stepped surface, hairline, or viewport tokens are derived
 * automatically from `canvas`, `inkPrimary`, and `action`.
 */
export interface MirageThemePaletteSeed {
  canvas: string;
  canvasSubtle?: string;
  canvasStone?: string;
  surfaceLowest?: string;
  surfaceLow?: string;
  surfaceContainer?: string;
  surfaceHigh?: string;
  surfaceHighest?: string;
  inkPrimary: string;
  inkSecondary?: string;
  inkTertiary?: string;
  hairline?: string;
  hairlineStrong?: string;
  action: string;
  actionHover?: string;
  actionActive?: string;
  actionSubtle?: string;
  actionInk?: string;
  onAction?: string;
  scrollbarTrack?: string;
  scrollbarThumb?: string;
  scrollbarThumbHover?: string;
  viewport?: Partial<MirageViewportTokens>;
}

export interface MirageThemeFile {
  id?: string;
  name: string;
  description?: string;
  author?: string;
  version?: string;
  fonts?: MirageThemeFonts;
  preferredMode?: ThemeColorMode;
  /** Single-mode palette seed (used with `preferredMode`, e.g. Omarchy templates). */
  palette?: MirageThemePaletteSeed;
  dark?: MirageThemePaletteSeed;
  light?: MirageThemePaletteSeed;
}

export interface MirageThemeDefinition {
  id: string;
  name: string;
  description: string;
  author?: string;
  source: ThemeSourceKind;
  filePath?: string;
  /** Native polarity reported by external sources (Omarchy/Pywal). */
  preferredMode?: ThemeColorMode;
  fonts?: MirageThemeFonts;
  dark: MirageThemeTokens;
  light: MirageThemeTokens;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CSS_RGBA_RE =
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;

/** Validates and normalizes 3/6-digit hex strings to lowercase `#rrggbb`. */
export function normalizeHexColor(input: string, fallback = '#000000'): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (!HEX_COLOR_RE.test(trimmed)) return fallback;
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  if (trimmed.length === 9) {
    return trimmed.slice(0, 7).toLowerCase();
  }
  return trimmed.toLowerCase();
}

/** Accepts either a valid hex or rgb()/rgba() CSS string; returns fallback otherwise. */
export function sanitizeCssColor(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (HEX_COLOR_RE.test(trimmed)) {
    return trimmed.length === 9 ? trimmed.toLowerCase() : normalizeHexColor(trimmed, fallback);
  }
  if (CSS_RGBA_RE.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function hexToRgb(hex: string): RGBColor {
  const norm = normalizeHexColor(hex, '#000000');
  const num = parseInt(norm.slice(1, 7), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1)}`;
}

/** Linearly mixes `hexA` toward `hexB` by `weight` in [0, 1]. */
export function mixHex(hexA: string, hexB: string, weight: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, weight));
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

export function rgbaFromHex(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

/** WCAG 2.1 relative luminance in [0, 1]. */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const linearize = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const l1 = getRelativeLuminance(hexA);
  const l2 = getRelativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Picks dark `#0e1715` or crisp `#ffffff` for maximum contrast over `bgHex`. */
export function pickContrastForeground(bgHex: string): string {
  const darkInk = '#0e1715';
  const lightInk = '#ffffff';
  return getContrastRatio(bgHex, darkInk) >= getContrastRatio(bgHex, lightInk)
    ? darkInk
    : lightInk;
}

/**
 * Expands a full or minimal `MirageThemePaletteSeed` into a complete,
 * WCAG-calibrated `MirageThemeTokens` object.
 */
export function normalizePalette(
  seed: MirageThemePaletteSeed,
  isDark: boolean
): MirageThemeTokens {
  const canvas = normalizeHexColor(seed.canvas, isDark ? '#1e2123' : '#fcfcfd');
  const inkPrimary = normalizeHexColor(seed.inkPrimary, isDark ? '#e7e9eb' : '#181a1b');
  const action = normalizeHexColor(seed.action, isDark ? '#41c9b4' : '#2cb696');

  const surfaceLowest = sanitizeCssColor(
    seed.surfaceLowest,
    isDark ? mixHex(canvas, '#ffffff', 0.032) : '#ffffff'
  );
  const canvasSubtle = sanitizeCssColor(
    seed.canvasSubtle,
    isDark ? mixHex(canvas, '#000000', 0.14) : mixHex(canvas, inkPrimary, 0.035)
  );
  const surfaceLow = sanitizeCssColor(
    seed.surfaceLow,
    isDark ? mixHex(canvas, '#ffffff', 0.055) : mixHex(canvas, inkPrimary, 0.035)
  );
  const canvasStone = sanitizeCssColor(
    seed.canvasStone,
    isDark ? mixHex(canvas, '#ffffff', 0.05) : mixHex(canvas, inkPrimary, 0.065)
  );
  const surfaceContainer = sanitizeCssColor(
    seed.surfaceContainer,
    isDark ? mixHex(canvas, '#ffffff', 0.09) : mixHex(canvas, inkPrimary, 0.065)
  );
  const surfaceHigh = sanitizeCssColor(
    seed.surfaceHigh,
    isDark ? mixHex(canvas, '#ffffff', 0.135) : mixHex(canvas, inkPrimary, 0.12)
  );
  const surfaceHighest = sanitizeCssColor(
    seed.surfaceHighest,
    isDark ? mixHex(canvas, '#ffffff', 0.185) : mixHex(canvas, inkPrimary, 0.17)
  );

  const inkSecondary = sanitizeCssColor(
    seed.inkSecondary,
    mixHex(inkPrimary, canvas, 0.28)
  );
  const inkTertiary = sanitizeCssColor(
    seed.inkTertiary,
    mixHex(inkPrimary, canvas, 0.50)
  );

  const hairline = sanitizeCssColor(
    seed.hairline,
    rgbaFromHex(inkPrimary, isDark ? 0.1 : 0.1)
  );
  const hairlineStrong = sanitizeCssColor(
    seed.hairlineStrong,
    rgbaFromHex(inkPrimary, isDark ? 0.22 : 0.22)
  );

  const actionHover = sanitizeCssColor(
    seed.actionHover,
    isDark ? mixHex(action, '#ffffff', 0.14) : mixHex(action, '#000000', 0.15)
  );
  const actionActive = sanitizeCssColor(
    seed.actionActive,
    isDark ? mixHex(action, '#000000', 0.18) : mixHex(action, '#000000', 0.28)
  );
  const actionSubtle = sanitizeCssColor(
    seed.actionSubtle,
    rgbaFromHex(action, isDark ? 0.15 : 0.11)
  );
  const actionInk = sanitizeCssColor(
    seed.actionInk,
    isDark ? mixHex(action, '#ffffff', 0.5) : mixHex(action, '#000000', 0.45)
  );
  const onAction = sanitizeCssColor(seed.onAction, pickContrastForeground(action));

  const scrollbarTrack = sanitizeCssColor(seed.scrollbarTrack, canvasSubtle);
  const scrollbarThumb = sanitizeCssColor(seed.scrollbarThumb, surfaceContainer);
  const scrollbarThumbHover = sanitizeCssColor(seed.scrollbarThumbHover, surfaceHighest);

  const vp = seed.viewport || {};
  const vpBg = normalizeHexColor(vp.background || '', isDark ? canvas : canvasSubtle);

  const viewport: MirageViewportTokens = {
    background: vpBg,
    gridPrimary: normalizeHexColor(
      vp.gridPrimary || '',
      isDark ? mixHex(vpBg, inkPrimary, 0.16) : mixHex(vpBg, inkPrimary, 0.18)
    ),
    gridSecondary: normalizeHexColor(
      vp.gridSecondary || '',
      isDark ? mixHex(vpBg, inkPrimary, 0.07) : mixHex(vpBg, inkPrimary, 0.07)
    ),
    hemisphereSky: normalizeHexColor(
      vp.hemisphereSky || '',
      isDark ? mixHex(vpBg, '#ffffff', 0.12) : '#ffffff'
    ),
    hemisphereGround: normalizeHexColor(
      vp.hemisphereGround || '',
      isDark ? mixHex(vpBg, '#000000', 0.15) : mixHex(vpBg, inkPrimary, 0.14)
    ),
    dimensionLine: normalizeHexColor(vp.dimensionLine || '', action)
  };

  return {
    canvas,
    canvasSubtle,
    canvasStone,
    surfaceLowest,
    surfaceLow,
    surfaceContainer,
    surfaceHigh,
    surfaceHighest,
    inkPrimary,
    inkSecondary,
    inkTertiary,
    hairline,
    hairlineStrong,
    action,
    actionHover,
    actionActive,
    actionSubtle,
    actionInk,
    onAction,
    scrollbarTrack,
    scrollbarThumb,
    scrollbarThumbHover,
    viewport
  };
}

/**
 * Generates a complementary light or dark seed when a theme file or external
 * source only specifies one polarity.
 */
function deriveOppositeSeed(seed: MirageThemePaletteSeed, targetDark: boolean): MirageThemePaletteSeed {
  const action = normalizeHexColor(seed.action, targetDark ? '#41c9b4' : '#2cb696');
  const adjustedAction = targetDark
    ? getRelativeLuminance(action) < 0.18
      ? mixHex(action, '#ffffff', 0.25)
      : action
    : getRelativeLuminance(action) > 0.55
      ? mixHex(action, '#000000', 0.22)
      : action;

  if (targetDark) {
    return {
      canvas: '#1a1d1f',
      inkPrimary: '#e7e9eb',
      action: adjustedAction
    };
  }
  return {
    canvas: '#fcfcfd',
    surfaceLowest: '#ffffff',
    inkPrimary: '#181a1b',
    action: adjustedAction
  };
}

/**
 * Default Main Theme — derived from /home/rei/Work/portfolio/src/styles/global.css
 */
export const PORTFOLIO_MIRAGE_THEME: MirageThemeDefinition = {
  id: 'mirage',
  name: 'Mirage Slate',
  description: 'Portfolio-derived slate charcoal and bright teal-mint surfaces.',
  author: 'Mirage',
  source: 'builtin',
  light: normalizePalette(
    {
      canvas: '#fcfcfd',
      canvasSubtle: '#f4f6f8',
      canvasStone: '#eaeef2',
      surfaceLowest: '#ffffff',
      surfaceLow: '#f4f6f8',
      surfaceContainer: '#eaeef2',
      surfaceHigh: '#dde3e9',
      surfaceHighest: '#cfd7df',
      inkPrimary: '#181a1b',
      inkSecondary: '#4a525a',
      inkTertiary: '#6c747c',
      hairline: 'rgba(24, 26, 27, 0.10)',
      hairlineStrong: 'rgba(24, 26, 27, 0.24)',
      action: '#2cb696',
      actionHover: '#239b7f',
      actionActive: '#1b7d66',
      actionSubtle: 'rgba(65, 201, 180, 0.11)',
      actionInk: '#115e4e',
      onAction: '#0e1715',
      scrollbarTrack: '#eaeef2',
      scrollbarThumb: '#cfd7df',
      scrollbarThumbHover: '#b6bec5',
      viewport: {
        background: '#f4f6f8',
        gridPrimary: '#cfd7df',
        gridSecondary: '#e5eaef',
        hemisphereSky: '#ffffff',
        hemisphereGround: '#dbe2e8',
        dimensionLine: '#239b7f'
      }
    },
    false
  ),
  dark: normalizePalette(
    {
      canvas: '#1e2123',
      canvasSubtle: '#191c1e',
      canvasStone: '#282c30',
      surfaceLowest: '#24282b',
      surfaceLow: '#282c30',
      surfaceContainer: '#2f3439',
      surfaceHigh: '#383e44',
      surfaceHighest: '#434a52',
      inkPrimary: '#e7e9eb',
      inkSecondary: '#b6bec5',
      inkTertiary: '#868f97',
      hairline: 'rgba(255, 255, 255, 0.10)',
      hairlineStrong: 'rgba(255, 255, 255, 0.24)',
      action: '#41c9b4',
      actionHover: '#53d6c2',
      actionActive: '#2cb696',
      actionSubtle: 'rgba(65, 201, 180, 0.14)',
      actionInk: '#9bf0e2',
      onAction: '#0e1715',
      scrollbarTrack: '#191c1e',
      scrollbarThumb: '#2f3439',
      scrollbarThumbHover: '#434a52',
      viewport: {
        background: '#1e2123',
        gridPrimary: '#343a40',
        gridSecondary: '#25292c',
        hemisphereSky: '#2f3439',
        hemisphereGround: '#181a1c',
        dimensionLine: '#41c9b4'
      }
    },
    true
  )
};

/**
 * Original Mirage Theme — Basalt & Brick Crimson (preserved as template & classic preset)
 */
export const BASALT_CLASSIC_THEME: MirageThemeDefinition = {
  id: 'basalt',
  name: 'Basalt Crimson',
  description: 'Original Mirage volcanic basalt and warm mineral limestone with brick crimson.',
  author: 'Mirage',
  source: 'builtin',
  light: normalizePalette(
    {
      canvas: '#fdfdfd',
      canvasSubtle: '#f7f5f2',
      canvasStone: '#efece6',
      surfaceLowest: '#ffffff',
      surfaceLow: '#f7f5f2',
      surfaceContainer: '#efece6',
      surfaceHigh: '#ded9d1',
      surfaceHighest: '#d5cfc5',
      inkPrimary: '#161514',
      inkSecondary: '#5c5854',
      inkTertiary: '#8e8a84',
      hairline: 'rgba(22, 21, 20, 0.10)',
      hairlineStrong: 'rgba(22, 21, 20, 0.20)',
      action: '#9a2716',
      actionHover: '#801f10',
      actionActive: '#6b190d',
      actionSubtle: 'rgba(154, 39, 22, 0.08)',
      actionInk: '#801f10',
      onAction: '#ffffff',
      scrollbarTrack: '#efece6',
      scrollbarThumb: '#ded9d1',
      scrollbarThumbHover: '#d5cfc5',
      viewport: {
        background: '#f7f5f2',
        gridPrimary: '#d5cfc5',
        gridSecondary: '#efece6',
        hemisphereSky: '#ffffff',
        hemisphereGround: '#dfd9cc',
        dimensionLine: '#9a2716'
      }
    },
    false
  ),
  dark: normalizePalette(
    {
      canvas: '#111110',
      canvasSubtle: '#141412',
      canvasStone: '#1a1917',
      surfaceLowest: '#181816',
      surfaceLow: '#1f1e1c',
      surfaceContainer: '#272523',
      surfaceHigh: '#32302c',
      surfaceHighest: '#3e3b37',
      inkPrimary: '#f4f2ee',
      inkSecondary: '#a8a39d',
      inkTertiary: '#6e6a64',
      hairline: 'rgba(244, 242, 238, 0.08)',
      hairlineStrong: 'rgba(244, 242, 238, 0.16)',
      action: '#b53420',
      actionHover: '#c83e28',
      actionActive: '#9a2716',
      actionSubtle: 'rgba(181, 52, 32, 0.18)',
      actionInk: '#e07a68',
      onAction: '#ffffff',
      scrollbarTrack: '#141412',
      scrollbarThumb: '#272523',
      scrollbarThumbHover: '#3e3b37',
      viewport: {
        background: '#111110',
        gridPrimary: '#272523',
        gridSecondary: '#181816',
        hemisphereSky: '#2a2825',
        hemisphereGround: '#1c1b19',
        dimensionLine: '#b53420'
      }
    },
    true
  )
};

export const BLUEPRINT_COBALT_THEME: MirageThemeDefinition = {
  id: 'blueprint',
  name: 'Blueprint Cobalt',
  description: 'Drafting-table slate and cool daylight paper with precision cobalt.',
  author: 'Mirage',
  source: 'builtin',
  light: normalizePalette(
    {
      canvas: '#f8fafc',
      canvasSubtle: '#f1f5f9',
      canvasStone: '#e2e8f0',
      surfaceLowest: '#ffffff',
      surfaceLow: '#f1f5f9',
      surfaceContainer: '#e2e8f0',
      surfaceHigh: '#cbd5e1',
      surfaceHighest: '#94a3b8',
      inkPrimary: '#0f172a',
      inkSecondary: '#475569',
      inkTertiary: '#64748b',
      hairline: 'rgba(15, 23, 42, 0.10)',
      hairlineStrong: 'rgba(15, 23, 42, 0.22)',
      action: '#1d4ed8',
      actionHover: '#1e40af',
      actionActive: '#1e3a8a',
      actionSubtle: 'rgba(29, 78, 216, 0.09)',
      actionInk: '#1e40af',
      onAction: '#ffffff',
      viewport: {
        background: '#f1f5f9',
        gridPrimary: '#cbd5e1',
        gridSecondary: '#e2e8f0',
        dimensionLine: '#1d4ed8'
      }
    },
    false
  ),
  dark: normalizePalette(
    {
      canvas: '#12161f',
      canvasSubtle: '#0e1118',
      canvasStone: '#1a202c',
      surfaceLowest: '#171c26',
      surfaceLow: '#1d2330',
      surfaceContainer: '#252d3d',
      surfaceHigh: '#2f394d',
      surfaceHighest: '#3b475e',
      inkPrimary: '#e2e8f0',
      inkSecondary: '#94a3b8',
      inkTertiary: '#64748b',
      hairline: 'rgba(226, 232, 240, 0.09)',
      hairlineStrong: 'rgba(226, 232, 240, 0.20)',
      action: '#3b82f6',
      actionHover: '#60a5fa',
      actionActive: '#2563eb',
      actionSubtle: 'rgba(59, 130, 246, 0.16)',
      actionInk: '#93c5fd',
      onAction: '#ffffff',
      viewport: {
        background: '#12161f',
        gridPrimary: '#2a3447',
        gridSecondary: '#1b2230',
        dimensionLine: '#3b82f6'
      }
    },
    true
  )
};

export const AMBER_INSTRUMENT_THEME: MirageThemeDefinition = {
  id: 'amber-crt',
  name: 'Amber Instrument',
  description: 'Warm obsidian and archival parchment calibrated with oscilloscope amber.',
  author: 'Mirage',
  source: 'builtin',
  light: normalizePalette(
    {
      canvas: '#fbf9f5',
      canvasSubtle: '#f4f0e8',
      canvasStone: '#ebe5d8',
      surfaceLowest: '#ffffff',
      surfaceLow: '#f4f0e8',
      surfaceContainer: '#ebe5d8',
      surfaceHigh: '#dcd4c4',
      surfaceHighest: '#cdc3af',
      inkPrimary: '#1c1914',
      inkSecondary: '#575046',
      inkTertiary: '#857d70',
      hairline: 'rgba(28, 25, 20, 0.10)',
      hairlineStrong: 'rgba(28, 25, 20, 0.22)',
      action: '#b45309',
      actionHover: '#92400e',
      actionActive: '#78350f',
      actionSubtle: 'rgba(180, 83, 9, 0.10)',
      actionInk: '#92400e',
      onAction: '#ffffff',
      viewport: {
        background: '#f4f0e8',
        gridPrimary: '#d5cbb8',
        gridSecondary: '#eae3d5',
        dimensionLine: '#b45309'
      }
    },
    false
  ),
  dark: normalizePalette(
    {
      canvas: '#161513',
      canvasSubtle: '#12110f',
      canvasStone: '#1f1d1a',
      surfaceLowest: '#1c1a17',
      surfaceLow: '#23201c',
      surfaceContainer: '#2c2924',
      surfaceHigh: '#38342d',
      surfaceHighest: '#454037',
      inkPrimary: '#f2ece1',
      inkSecondary: '#afa696',
      inkTertiary: '#756e62',
      hairline: 'rgba(242, 236, 225, 0.09)',
      hairlineStrong: 'rgba(242, 236, 225, 0.20)',
      action: '#f59e0b',
      actionHover: '#fbbf24',
      actionActive: '#d97706',
      actionSubtle: 'rgba(245, 158, 11, 0.15)',
      actionInk: '#fcd34d',
      onAction: '#161208',
      viewport: {
        background: '#161513',
        gridPrimary: '#302c26',
        gridSecondary: '#1f1d19',
        dimensionLine: '#f59e0b'
      }
    },
    true
  )
};

export const BUILTIN_THEMES: MirageThemeDefinition[] = [
  PORTFOLIO_MIRAGE_THEME,
  BASALT_CLASSIC_THEME,
  BLUEPRINT_COBALT_THEME,
  AMBER_INSTRUMENT_THEME
];

export const DEFAULT_THEME_ID = 'mirage';

export function getBuiltinTheme(id: string): MirageThemeDefinition {
  return BUILTIN_THEMES.find((t) => t.id === id) || PORTFOLIO_MIRAGE_THEME;
}

/**
 * Serializes a `MirageThemeDefinition` cleanly into the JSON template format
 * stored in `~/.local/share/mirage/themes/<id>.json`.
 */
export function serializeThemeFile(theme: MirageThemeDefinition): MirageThemeFile {
  return {
    id: theme.id,
    name: theme.name,
    description: theme.description,
    author: theme.author || 'Custom',
    version: '1.0',
    ...(theme.fonts ? { fonts: theme.fonts } : {}),
    light: theme.light,
    dark: theme.dark
  };
}

/**
 * Parses a JSON theme file from `~/.local/share/mirage/themes/*.json`.
 * Returns null if the payload is invalid or missing both `light` and `dark` seeds.
 */
export function parseThemeFileJson(
  raw: string,
  fallbackId: string,
  source: ThemeSourceKind = 'local',
  filePath?: string
): MirageThemeDefinition | null {
  try {
    const parsed = JSON.parse(raw) as MirageThemeFile;
    if (!parsed || typeof parsed !== 'object') return null;

    let darkSeedInput = parsed.dark;
    let lightSeedInput = parsed.light;

    if (parsed.palette && parsed.palette.canvas && parsed.palette.inkPrimary && parsed.palette.action) {
      const paletteMode: ThemeColorMode =
        parsed.preferredMode === 'light' || parsed.preferredMode === 'dark'
          ? parsed.preferredMode
          : getRelativeLuminance(normalizeHexColor(parsed.palette.canvas, '#1e2123')) > 0.45
            ? 'light'
            : 'dark';
      if (paletteMode === 'light' && !lightSeedInput) {
        lightSeedInput = parsed.palette;
      } else if (paletteMode === 'dark' && !darkSeedInput) {
        darkSeedInput = parsed.palette;
      }
    }

    const hasDark = Boolean(darkSeedInput && darkSeedInput.canvas && darkSeedInput.inkPrimary && darkSeedInput.action);
    const hasLight = Boolean(lightSeedInput && lightSeedInput.canvas && lightSeedInput.inkPrimary && lightSeedInput.action);
    if (!hasDark && !hasLight) return null;

    const cleanId =
      typeof parsed.id === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(parsed.id.trim())
        ? parsed.id.trim().toLowerCase()
        : fallbackId.toLowerCase();

    const darkSeed = hasDark
      ? darkSeedInput!
      : deriveOppositeSeed(lightSeedInput!, true);
    const lightSeed = hasLight
      ? lightSeedInput!
      : deriveOppositeSeed(darkSeedInput!, false);

    return {
      id: cleanId,
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : cleanId,
      description:
        typeof parsed.description === 'string' && parsed.description.trim()
          ? parsed.description.trim()
          : 'Custom local theme',
      author: typeof parsed.author === 'string' ? parsed.author.trim() : undefined,
      source,
      filePath,
      preferredMode:
        parsed.preferredMode === 'light' || parsed.preferredMode === 'dark'
          ? parsed.preferredMode
          : undefined,
      fonts: parsed.fonts,
      dark: normalizePalette(darkSeed, true),
      light: normalizePalette(lightSeed, false)
    };
  } catch {
    return null;
  }
}

/** Converts a `MirageThemeTokens` object to CSS custom property key/value pairs. */
export function tokensToCssVars(tokens: MirageThemeTokens): Record<string, string> {
  return {
    '--canvas': tokens.canvas,
    '--canvas-subtle': tokens.canvasSubtle,
    '--canvas-stone': tokens.canvasStone,
    '--surface-lowest': tokens.surfaceLowest,
    '--surface-low': tokens.surfaceLow,
    '--surface-container': tokens.surfaceContainer,
    '--surface-high': tokens.surfaceHigh,
    '--surface-highest': tokens.surfaceHighest,
    '--ink-primary': tokens.inkPrimary,
    '--ink-secondary': tokens.inkSecondary,
    '--ink-tertiary': tokens.inkTertiary,
    '--hairline': tokens.hairline,
    '--hairline-strong': tokens.hairlineStrong,
    '--action': tokens.action,
    '--action-hover': tokens.actionHover,
    '--action-active': tokens.actionActive,
    '--action-subtle': tokens.actionSubtle,
    '--action-ink': tokens.actionInk,
    '--on-action': tokens.onAction,
    '--scrollbar-track': tokens.scrollbarTrack,
    '--scrollbar-thumb': tokens.scrollbarThumb,
    '--scrollbar-thumb-hover': tokens.scrollbarThumbHover
  };
}
