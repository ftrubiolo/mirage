import { LibraryEntry, EntryVariant, EntryVariantMaterial, TexturePool, TextureAssetItem, FurnitureCategory } from '../types/library';
import { ALL_SLOT_NAMES, SlotName } from '../store/pbrMaterialStore';

/**
 * Checks whether an entry is already fully normalized to the modern schema:
 * - Has a texturePool
 * - Has variants with materials and assignedMapIds
 * - Does not rely on legacy flat maps or duplicate root dictionaries
 */
export function isNormalizedEntry(entry: any): boolean {
  if (!entry || !entry.texturePool || !Array.isArray(entry.variants) || entry.variants.length === 0) {
    return false;
  }
  const firstVar = entry.variants[0];
  if (!firstVar.materials || typeof firstVar.materials !== 'object') {
    return false;
  }
  const matKeys = Object.keys(firstVar.materials);
  if (matKeys.length === 0) {
    return false;
  }
  // Check if at least one material has assignedMapIds
  return matKeys.some((m) => firstVar.materials[m]?.assignedMapIds !== undefined);
}

/**
 * Pure ingestion function that converts any legacy or mixed schema entry into
 * the clean, normalized LibraryEntry specification.
 *
 * This function acts as the sole Anti-Corruption Layer for entry.json on disk.
 */
export function migrateEntrySchema(raw: any): LibraryEntry {
  if (isNormalizedEntry(raw)) {
    return {
      id: raw.id,
      title: raw.title,
      slug: raw.slug,
      category: (raw.category || 'otro') as FurnitureCategory,
      description: raw.description || '',
      status: raw.status || 'workshop',
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      posterUrl: raw.posterUrl || null,
      posterFileName: raw.posterFileName || null,
      modelFileName: raw.modelFileName || null,
      modelFilePath: raw.modelFilePath || null,
      modelFileSize: raw.modelFileSize || 0,
      dimensions: raw.dimensions || null,
      stats: raw.stats || null,
      texturePool: raw.texturePool,
      variants: raw.variants,
      activeVariantId: raw.activeVariantId || raw.variants[0]?.id
    };
  }

  // 1. Detect materials for this model
  const detectedMaterials: string[] =
    raw.stats?.materials && Array.isArray(raw.stats.materials) && raw.stats.materials.length > 0
      ? raw.stats.materials
      : raw.materials && typeof raw.materials === 'object' && Object.keys(raw.materials).length > 0
        ? Object.keys(raw.materials)
        : ['default'];

  const primaryMat = detectedMaterials[0];

  // 2. Build the unified texturePool
  const texturePool: TexturePool = {};
  for (const mat of detectedMaterials) {
    texturePool[mat] = {};
    for (const slot of ALL_SLOT_NAMES) {
      texturePool[mat][slot] = [];
    }
  }

  const addTextureToPool = (
    matName: string,
    slot: SlotName,
    item: { id?: string; name?: string; filePath?: string; fileName?: string; fileSize?: number; url?: string } | null | undefined
  ): string | null => {
    if (!item || (!item.filePath && !item.url)) return null;
    const targetMat = texturePool[matName] ? matName : primaryMat;
    const pool = texturePool[targetMat][slot] || [];

    // Find existing match by id, filePath, or fileName
    const existing = pool.find(
      (p) =>
        (item.id && p.id === item.id) ||
        (item.filePath && p.filePath === item.filePath) ||
        (item.fileName && p.fileName === item.fileName)
    );

    if (existing) {
      return existing.id;
    }

    const newId =
      item.id ||
      `${slot}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newName =
      item.name ||
      (item.fileName ? item.fileName.replace(/\.[^/.]+$/, '') : `${slot} ${pool.length + 1}`);

    const assetItem: TextureAssetItem = {
      id: newId,
      name: newName,
      filePath: item.filePath || '',
      fileName: item.fileName || `${slot}.webp`,
      fileSize: item.fileSize || 0,
      url: item.url || ''
    };

    pool.push(assetItem);
    texturePool[targetMat][slot] = pool;
    return newId;
  };

  // Collect from legacy materialMapVariants
  if (raw.materialMapVariants && typeof raw.materialMapVariants === 'object') {
    for (const [matName, slots] of Object.entries(raw.materialMapVariants)) {
      if (slots && typeof slots === 'object') {
        for (const [slot, list] of Object.entries(slots as Record<string, any[]>)) {
          if (Array.isArray(list)) {
            for (const item of list) {
              addTextureToPool(matName, slot as SlotName, item);
            }
          }
        }
      }
    }
  }

  // Collect from legacy mapVariants (flat)
  if (raw.mapVariants && typeof raw.mapVariants === 'object') {
    for (const [slot, list] of Object.entries(raw.mapVariants as Record<string, any[]>)) {
      if (Array.isArray(list)) {
        for (const item of list) {
          addTextureToPool(primaryMat, slot as SlotName, item);
        }
      }
    }
  }

  // Collect from legacy colorways
  if (Array.isArray(raw.colorways)) {
    for (const c of raw.colorways) {
      addTextureToPool(primaryMat, 'baseColor', {
        id: c.id,
        name: c.name,
        filePath: c.baseColorFilePath,
        fileName: c.fileName,
        fileSize: c.fileSize,
        url: c.baseColorUrl
      });
    }
  }

  // Collect from legacy materials dictionary
  if (raw.materials && typeof raw.materials === 'object') {
    for (const [matName, mData] of Object.entries(raw.materials as Record<string, any>)) {
      if (mData?.maps && typeof mData.maps === 'object') {
        for (const [slot, m] of Object.entries(mData.maps)) {
          addTextureToPool(matName, slot as SlotName, m as any);
        }
      }
    }
  }

  // Collect from legacy root maps (flat)
  if (raw.maps && typeof raw.maps === 'object') {
    for (const [slot, m] of Object.entries(raw.maps)) {
      addTextureToPool(primaryMat, slot as SlotName, m as any);
    }
  }

  // 3. Build normalized variants
  const rawVariants: any[] =
    Array.isArray(raw.variants) && raw.variants.length > 0
      ? raw.variants
      : [
          {
            id: 'var-default',
            name: 'Default',
            isDefault: true,
            maps: raw.maps || {},
            materials: raw.materials,
            settings: raw.settings,
            slotEnabled: raw.slotEnabled
          }
        ];

  const cleanVariants: EntryVariant[] = rawVariants.map((v, idx) => {
    const varMaterials: Record<string, EntryVariantMaterial> = {};

    for (const matName of detectedMaterials) {
      const assignedMapIds: Partial<Record<string, string | null>> = {};
      const legacyVarMat = v.materials?.[matName];
      const legacyRootMat = raw.materials?.[matName];
      const isPrimary = matName === primaryMat;

      for (const slot of ALL_SLOT_NAMES) {
        let assignedId: string | null = null;

        // A) Already has assignedMapIds
        if (legacyVarMat?.assignedMapIds?.[slot]) {
          assignedId = legacyVarMat.assignedMapIds[slot];
        }
        // B) Has a map object in variant materials
        else if (legacyVarMat?.maps?.[slot]) {
          assignedId = addTextureToPool(matName, slot, legacyVarMat.maps[slot]);
        }
        // C) In primary material, check flat variant maps
        else if (isPrimary && v.maps?.[slot]) {
          assignedId = addTextureToPool(matName, slot, v.maps[slot]);
        }
        // D) Check activeVariantIds
        else if (raw.materialActiveVariantIds?.[matName]?.[slot]) {
          assignedId = raw.materialActiveVariantIds[matName][slot];
        } else if (isPrimary && raw.activeVariantIds?.[slot]) {
          assignedId = raw.activeVariantIds[slot];
        }
        // E) Check legacy root raw.materials
        else if (legacyRootMat?.maps?.[slot]) {
          assignedId = addTextureToPool(matName, slot, legacyRootMat.maps[slot]);
        }
        // F) Check flat legacy root raw.maps for primary material
        else if (isPrimary && raw.maps?.[slot]) {
          assignedId = addTextureToPool(matName, slot, raw.maps[slot]);
        }

        assignedMapIds[slot] = assignedId || null;
      }

      const hasAssignedMaps = Object.values(assignedMapIds).some(Boolean);
      const rawSettings =
        legacyVarMat?.settings || legacyRootMat?.settings || (isPrimary ? v.settings || raw.settings : {}) || {};

      // If this material has NO assigned maps in a multi-material model,
      // default loadFromCache to true so native GLB textures/materials are preserved
      const loadFromCache =
        rawSettings.loadFromCache !== undefined
          ? rawSettings.loadFromCache
          : detectedMaterials.length > 1 && !hasAssignedMaps;

      varMaterials[matName] = {
        assignedMapIds,
        slotEnabled: legacyVarMat?.slotEnabled || legacyRootMat?.slotEnabled || (isPrimary ? v.slotEnabled || raw.slotEnabled : undefined),
        settings: {
          ...rawSettings,
          loadFromCache
        }
      };
    }

    return {
      id: v.id || `var-${idx === 0 ? 'default' : idx}`,
      name: v.name || (idx === 0 ? 'Default' : `Variante ${idx + 1}`),
      isDefault: v.isDefault ?? idx === 0,
      posterUrl: v.posterUrl || null,
      posterFileName: v.posterFileName || null,
      materials: varMaterials,
      productOptionRef: v.productOptionRef,
      createdAt: v.createdAt || new Date().toISOString(),
      updatedAt: v.updatedAt || new Date().toISOString()
    };
  });

  return {
    id: raw.id || `entry-${Date.now()}`,
    title: raw.title || raw.slug || 'Modelo',
    slug: raw.slug || 'modelo',
    category: (raw.category || 'otro') as FurnitureCategory,
    description: raw.description || '',
    status: raw.status || 'workshop',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    posterUrl: raw.posterUrl || null,
    posterFileName: raw.posterFileName || null,
    modelFileName: raw.modelFileName || null,
    modelFilePath: raw.modelFilePath || null,
    modelFileSize: raw.modelFileSize || 0,
    dimensions: raw.dimensions || null,
    stats: raw.stats
      ? {
          ...raw.stats,
          materials: detectedMaterials
        }
      : {
          triangleCount: 0,
          vertexCount: 0,
          meshCount: 0,
          materials: detectedMaterials
        },
    texturePool,
    variants: cleanVariants,
    activeVariantId: raw.activeVariantId || cleanVariants.find((v) => v.isDefault)?.id || cleanVariants[0]?.id
  };
}
