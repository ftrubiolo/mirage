import { SlotName } from '../store/pbrMaterialStore';
import { MapVariantItem } from '../store/variantStore';

export const getNextSlotTargetType = (
  slot: SlotName,
  existingVariants: MapVariantItem[],
  slug: string
): string => {
  const hasBase = existingVariants.some((v) => {
    const fn = v.fileName || '';
    const name = v.name || '';
    return (
      fn.startsWith(`${slug}_${slot}.`) ||
      fn === `${slug}_${slot}` ||
      name === `${slug}_${slot}` ||
      name === slot
    );
  });

  if (!hasBase && existingVariants.length === 0) {
    return slot;
  }

  let index = 2;
  while (
    existingVariants.some((v) => {
      const fn = v.fileName || '';
      const name = v.name || '';
      return (
        fn.startsWith(`${slug}_${slot}-${index}.`) ||
        fn === `${slug}_${slot}-${index}` ||
        name === `${slug}_${slot}-${index}` ||
        name === `${slot}-${index}`
      );
    })
  ) {
    index++;
  }
  return `${slot}-${index}`;
};

export const getNextBaseColorTargetType = (
  existingVariants: MapVariantItem[],
  slug: string
): string => {
  return getNextSlotTargetType('baseColor', existingVariants, slug);
};

export const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'tga',
  'bmp',
  'tif',
  'tiff',
  'exr',
  'hdr',
  'avif'
]);

export const MODEL_EXTENSIONS = new Set(['glb', 'gltf']);

export const isImageFile = (fileNameOrPath: string): boolean => {
  const ext = fileNameOrPath.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.has(ext);
};

export const isModelFile = (fileNameOrPath: string): boolean => {
  const ext = fileNameOrPath.split('.').pop()?.toLowerCase() || '';
  return MODEL_EXTENSIONS.has(ext);
};

interface MapTypePattern {
  slot: SlotName;
  aliases: string[];
}

const MAP_TYPE_PATTERNS: MapTypePattern[] = [
  // 1. MetalRoughness compound (prioritize over separate roughness/metalness)
  {
    slot: 'metalRoughness',
    aliases: [
      'metalroughness',
      'metal_roughness',
      'metallicroughness',
      'metallic_roughness',
      'metal-roughness',
      'metallic-roughness',
      'roughnessmetallic',
      'roughness_metallic',
      'roughnessmetalness',
      'roughness_metalness',
      'metal_rough',
      'mr',
      'mro'
    ]
  },
  // 2. BaseColor / Albedo / Diffuse
  {
    slot: 'baseColor',
    aliases: [
      'basecolor',
      'base_color',
      'base-color',
      'base',
      'albedo',
      'diffuse',
      'diff',
      'color',
      'bc',
      'alb',
      'col'
    ]
  },
  // 3. Normal
  {
    slot: 'normal',
    aliases: ['normale', 'normal', 'norm', 'nrm', 'nor']
  },
  // 4. ORM (Occlusion-Roughness-Metallic)
  {
    slot: 'orm',
    aliases: ['aorm', 'orm', 'arm']
  },
  // 5. Ambient Occlusion
  {
    slot: 'ao',
    aliases: [
      'ambientocclusion',
      'ambient_occlusion',
      'ambient-occlusion',
      'occlusion',
      'occ',
      'ao'
    ]
  },
  // 6. Roughness
  {
    slot: 'roughness',
    aliases: ['roughness', 'glossiness', 'rough', 'gloss', 'rgh']
  },
  // 7. Metalness
  {
    slot: 'metalness',
    aliases: ['metalness', 'metallic', 'metal', 'met']
  },
  // 8. Emissive
  {
    slot: 'emissive',
    aliases: ['emissive', 'emission', 'emit', 'glow']
  },
  // 9. Clearcoat
  {
    slot: 'clearcoat',
    aliases: ['clearcoat', 'clear_coat', 'clear-coat', 'coat']
  },
  // 10. Sheen
  {
    slot: 'sheen',
    aliases: ['sheen', 'velvet']
  },
  // 11. Transmission
  {
    slot: 'transmission',
    aliases: ['transmission', 'trans']
  },
  // 12. Alpha / Opacity
  {
    slot: 'alpha',
    aliases: ['transparency', 'opacity', 'alpha', 'mask']
  },
  // 13. Displacement / Height / Bump
  {
    slot: 'displacement',
    aliases: ['displacement', 'disp', 'height', 'bump']
  }
];

// Short abbreviations that should only match as trailing tokens or explicit suffixes
const SHORT_ABBREVIATIONS = new Set([
  'mr',
  'mro',
  'bc',
  'alb',
  'col',
  'diff',
  'nor',
  'nrm',
  'norm',
  'orm',
  'arm',
  'aorm',
  'ao',
  'occ',
  'rgh',
  'met',
  'trans',
  'disp'
]);

/**
 * Detects the appropriate PBR SlotName for a given texture file path or file name.
 * Looks for the `_<map type>` pattern and handles common suffixes, resolutions,
 * variant numbers, and PBR channel abbreviations.
 */
export const detectMapSlotFromFileName = (fileNameOrPath: string): SlotName | null => {
  if (!fileNameOrPath) return null;

  const base = fileNameOrPath.split(/[\\/]/).pop() || fileNameOrPath;
  const lastDot = base.lastIndexOf('.');

  if (lastDot !== -1) {
    const ext = base.slice(lastDot + 1).toLowerCase();
    // If an extension is present and it is not an image extension, do not treat as a map
    if (!IMAGE_EXTENSIONS.has(ext)) {
      return null;
    }
  }

  const stem = lastDot !== -1 ? base.slice(0, lastDot) : base;
  if (!stem) return null;

  // Strip trailing modifier tokens (e.g. resolution: _4k, format: _gl/_dx, variant: _01, -1, lod: _lod0)
  let cleaned = stem.toLowerCase();
  while (true) {
    const next = cleaned.replace(
      /(?:[_-](?:16k|8k|4k|2k|1k|512|1024|2048|4096|8192|directx|opengl|dx|gl|lod\d+|v\d+|var\d+|\d+))$/i,
      ''
    );
    if (next === cleaned) break;
    cleaned = next;
  }

  // Priority 1: Match suffix after underscore/hyphen or exact match
  for (const { slot, aliases } of MAP_TYPE_PATTERNS) {
    for (const alias of aliases) {
      if (
        cleaned === alias ||
        cleaned.endsWith(`_${alias}`) ||
        cleaned.endsWith(`-${alias}`)
      ) {
        return slot;
      }
    }
  }

  // Priority 2: Check underscore-separated segments from right-to-left
  const tokens = cleaned.split(/[_-]+/).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    for (const { slot, aliases } of MAP_TYPE_PATTERNS) {
      for (const alias of aliases) {
        if (token === alias) {
          // If it's a short abbreviation and not the final token or after an underscore, skip to avoid false positives
          if (SHORT_ABBREVIATIONS.has(alias) && i === 0 && tokens.length > 1) {
            continue;
          }
          return slot;
        }
      }
    }
  }

  // Priority 3: Check camelCase suffix boundary (e.g. sofaBaseColor)
  for (const { slot, aliases } of MAP_TYPE_PATTERNS) {
    for (const alias of aliases) {
      if (SHORT_ABBREVIATIONS.has(alias)) continue;
      if (stem.toLowerCase().endsWith(alias)) {
        const startIdx = stem.length - alias.length;
        if (startIdx > 0 && /[a-z0-9]/.test(stem[startIdx - 1]) && /[A-Z]/.test(stem[startIdx])) {
          return slot;
        }
      }
    }
  }

  return null;
};

