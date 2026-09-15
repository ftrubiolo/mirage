import { SlotName, usePbrMaterialStore } from '../store/pbrMaterialStore';
import { MapVariantItem, useVariantStore } from '../store/variantStore';
import { useModelStore } from '../store/modelStore';
import { useAppStore } from '../store/appStore';
import { autoSaveActiveEntry } from './libraryBridge';
import {
  detectMapSlotFromFileName,
  getNextSlotTargetType,
  isImageFile,
  isModelFile
} from './mapSlotNaming';

export interface CanvasDropResult {
  loadedModel: string | null;
  assignedSlots: SlotName[];
  assignedCount: number;
  skippedCount: number;
}

/**
 * Handles files dropped directly onto the 3D canvas viewport.
 * Supports dropping:
 *  - 3D models (.glb / .gltf)
 *  - Single or multiple texture map files with auto-assignment based on `_<map type>`
 *  - Combinations of model + texture maps
 */
export const handleCanvasDrop = async (
  files: (File | string)[]
): Promise<CanvasDropResult> => {
  const result: CanvasDropResult = {
    loadedModel: null,
    assignedSlots: [],
    assignedCount: 0,
    skippedCount: 0
  };

  if (!files || files.length === 0) {
    return result;
  }

  // 1. Resolve raw file path strings
  const filePaths: string[] = [];
  for (const item of files) {
    let path = '';
    if (typeof item === 'string') {
      path = item;
    } else if (item && typeof item === 'object') {
      path = window.electronAPI?.getPathForFile
        ? window.electronAPI.getPathForFile(item)
        : (item as any).path || item.name || '';
    }
    if (path) {
      filePaths.push(path);
    }
  }

  if (filePaths.length === 0) {
    return result;
  }

  // 2. Approve dropped paths for sandboxed Electron access
  for (const filePath of filePaths) {
    try {
      await window.electronAPI?.approveDroppedPath?.(filePath);
    } catch (err) {
      console.warn('[canvasDropHandler] Failed to approve dropped path:', filePath, err);
    }
  }

  // 3. Classify files
  const modelPaths: string[] = [];
  const mapPaths: { path: string; slot: SlotName }[] = [];

  for (const filePath of filePaths) {
    if (isModelFile(filePath)) {
      modelPaths.push(filePath);
    } else if (isImageFile(filePath)) {
      const slot = detectMapSlotFromFileName(filePath);
      if (slot) {
        mapPaths.push({ path: filePath, slot });
      } else {
        result.skippedCount++;
      }
    } else {
      result.skippedCount++;
    }
  }

  const activeSlug = useAppStore.getState().activeEntrySlug;

  // 4. Process 3D Model (if present)
  if (modelPaths.length > 0) {
    const modelPath = modelPaths[0];
    let targetModelPath = modelPath;
    let targetModelSize = 0;

    try {
      const fileInfo = await window.electronAPI?.getFileInfo?.(modelPath);
      if (fileInfo) {
        targetModelSize = fileInfo.size;
      }
    } catch {
      // Ignore fileInfo error in tests or mock environments
    }

    if (activeSlug && window.electronAPI?.copyFileToLibrary) {
      const normalizedPath = modelPath.replace(/\\/g, '/');
      if (!normalizedPath.includes(`/${activeSlug}/`)) {
        try {
          const ext = modelPath.split('.').pop() || 'glb';
          const copied = await window.electronAPI.copyFileToLibrary({
            entrySlug: activeSlug,
            sourceFilePath: modelPath,
            targetType: 'model',
            ext
          });
          targetModelPath = copied.filePath;
          targetModelSize = copied.fileSize;
        } catch (copyErr) {
          console.warn('[canvasDropHandler] Could not copy model to library folder:', copyErr);
        }
      }
    }

    const assetUrl = window.electronAPI?.toAssetUrl
      ? window.electronAPI.toAssetUrl(targetModelPath)
      : targetModelPath;

    useModelStore.getState().setModel(targetModelPath, assetUrl, targetModelSize);
    result.loadedModel = targetModelPath;

    if (!activeSlug) {
      const baseName =
        modelPath.split(/[\\/]/).pop()?.replace(/\.(glb|gltf)$/i, '') || 'Modelo';
      useModelStore
        .getState()
        .setProductMeta(baseName.toLowerCase().replace(/[^a-z0-9]/g, '-'), baseName);
    }
  }

  // 5. Process Texture Maps
  const assignedSlotsSet = new Set<SlotName>();

  for (const { path: mapPath, slot } of mapPaths) {
    let targetPath = mapPath;
    let targetName = mapPath.split(/[\\/]/).pop() || `${slot}.webp`;
    let targetSize = 0;

    try {
      const fileInfo = await window.electronAPI?.getFileInfo?.(mapPath);
      if (fileInfo) {
        targetName = fileInfo.name;
        targetSize = fileInfo.size;
      }
    } catch {
      // Ignore fileInfo error in tests or mock environments
    }

    if (activeSlug && window.electronAPI?.copyFileToLibrary) {
      const normalizedPath = mapPath.replace(/\\/g, '/');
      if (!normalizedPath.includes(`/${activeSlug}/`)) {
        const existingVariants = useVariantStore.getState().mapVariants[slot] || [];
        const targetType = getNextSlotTargetType(slot, existingVariants, activeSlug);
        const ext = mapPath.split('.').pop() || 'webp';
        try {
          const copied = await window.electronAPI.copyFileToLibrary({
            entrySlug: activeSlug,
            sourceFilePath: mapPath,
            targetType,
            ext
          });
          targetPath = copied.filePath;
          targetName = copied.fileName;
          targetSize = copied.fileSize;
        } catch (copyErr) {
          console.warn(
            `[canvasDropHandler] Could not copy texture to entry folder for ${slot}:`,
            copyErr
          );
        }
      }
    }

    const rawUrl = window.electronAPI?.toAssetUrl
      ? window.electronAPI.toAssetUrl(targetPath)
      : targetPath;
    const url = `${rawUrl}?v=${Date.now()}`;
    const baseName = targetName.replace(/\.[^/.]+$/, '');

    const newVariant: MapVariantItem = {
      id: `${slot}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: baseName,
      url,
      filePath: targetPath,
      fileName: targetName,
      fileSize: targetSize
    };

    useVariantStore.getState().addMapVariant(slot, newVariant);
    usePbrMaterialStore.getState().setSlotEnabled(slot, true);
    assignedSlotsSet.add(slot);
    result.assignedCount++;
  }

  // 6. Intelligent Material Packing Mode
  if (assignedSlotsSet.has('orm')) {
    usePbrMaterialStore.getState().setUseOrmPack(true);
    usePbrMaterialStore.getState().setMaterialPackingMode('orm');
  } else if (assignedSlotsSet.has('metalRoughness')) {
    usePbrMaterialStore.getState().setUseOrmPack(false);
    usePbrMaterialStore.getState().setMaterialPackingMode('metalRoughness');
  } else if (assignedSlotsSet.has('roughness') || assignedSlotsSet.has('metalness')) {
    usePbrMaterialStore.getState().setUseOrmPack(false);
    usePbrMaterialStore.getState().setMaterialPackingMode('separate');
  }

  // 7. Persist changes to active entry if loaded
  if (result.assignedCount > 0 || result.loadedModel) {
    autoSaveActiveEntry(true);
  }

  result.assignedSlots = Array.from(assignedSlotsSet);
  return result;
};
