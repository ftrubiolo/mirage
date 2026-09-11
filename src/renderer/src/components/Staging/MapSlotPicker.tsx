import React, { useState } from 'react';
import { SlotName, usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { MapVariantItem, useVariantStore } from '../../store/variantStore';
import { useAppStore } from '../../store/appStore';
import { WebpConvertModal } from './WebpConvertModal';
import { ImageLightboxModal } from '../UI/ImageLightboxModal';
import { autoSaveActiveEntry } from '../../utils/libraryBridge';
import { invalidateTexture } from '../../utils/pbrController';
import { getNextSlotTargetType, getNextBaseColorTargetType } from '../../utils/mapSlotNaming';
import { MapVariantRowItem, MapVariantRowItemProps } from './MapVariantRowItem';
import { MapSlotDropZone } from './MapSlotDropZone';
import { MapSlotDeleteModal, MapSlotDeleteCandidate } from './MapSlotDeleteModal';
import { MapSlotHeader } from './MapSlotHeader';

// Re-export naming utilities and row item for full backward compatibility
export { getNextSlotTargetType, getNextBaseColorTargetType };
export { MapVariantRowItem };
export type { MapVariantRowItemProps };

const EMPTY_VARIANTS: MapVariantItem[] = [];

export interface MapSlotPickerProps {
  slot: SlotName;
  title: string;
  icon: React.ReactNode;
  placeholderText: string;
  subText: string;
  addVariantLabel?: string;
  addVariantSubtext?: string;
  pickTitle?: string;
  filters?: { name: string; extensions: string[] }[];
  headerExtra?: React.ReactNode;
  children?: React.ReactNode;
  embeddedInSection?: boolean;
}

export const MapSlotPicker: React.FC<MapSlotPickerProps> = React.memo(({
  slot,
  title,
  icon,
  placeholderText,
  subText,
  addVariantLabel,
  addVariantSubtext,
  pickTitle,
  filters,
  headerExtra,
  children,
  embeddedInSection = true
}) => {
  const variants = useVariantStore((s) => s.mapVariants[slot] || EMPTY_VARIANTS);
  const activeVariantId = useVariantStore((s) => s.activeVariantIds[slot]);
  const isEnabled = usePbrMaterialStore((s) => (s.slotEnabled ? s.slotEnabled[slot] ?? true : true));
  const loadFromCache = usePbrMaterialStore((s) => s.loadFromCache);
  const setSlotEnabled = usePbrMaterialStore((s) => s.setSlotEnabled);
  const addMapVariant = useVariantStore((s) => s.addMapVariant);
  const selectMapVariant = useVariantStore((s) => s.selectMapVariant);
  const removeMapVariant = useVariantStore((s) => s.removeMapVariant);
  const renameMapVariant = useVariantStore((s) => s.renameMapVariant);
  const updateMapVariant = useVariantStore((s) => s.updateMapVariant);
  const entryVariants = useVariantStore((s) => s.variants);
  const currentEntryVariantId = useVariantStore((s) => s.activeVariantId);

  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [webpConvertVariant, setWebpConvertVariant] = useState<MapVariantItem | null>(null);
  const [lightboxVariant, setLightboxVariant] = useState<MapVariantItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<MapSlotDeleteCandidate | null>(null);

  const handleDeleteRequest = (v: MapVariantItem) => {
    const affected = (entryVariants || []).filter((entryVar) => {
      if (entryVar.id === currentEntryVariantId) return false;
      return Object.values(entryVar.maps || {}).some(
        (m) =>
          (v.filePath && m?.filePath === v.filePath) ||
          (v.fileName && m?.fileName === v.fileName) ||
          (v.url && m?.url === v.url)
      );
    });

    if (affected.length > 0) {
      setDeleteCandidate({ variant: v, affectedVariants: affected });
    } else {
      if (v.url) invalidateTexture(v.url);
      removeMapVariant(slot, v.id);
      autoSaveActiveEntry(true);
    }
  };

  const handleConfirmDeleteCandidate = () => {
    if (deleteCandidate) {
      if (deleteCandidate.variant.url) invalidateTexture(deleteCandidate.variant.url);
      removeMapVariant(slot, deleteCandidate.variant.id);
      setDeleteCandidate(null);
      autoSaveActiveEntry(true);
    }
  };

  const defaultFilters = filters || [
    { name: 'Imágenes / Texturas', extensions: ['webp', 'png', 'jpg', 'jpeg', 'tga'] }
  ];

  // Helper to add a new variant with a specific file path
  const handleAddVariantWithFile = async (filePath: string) => {
    const fileInfo = await window.electronAPI.getFileInfo(filePath);
    const activeSlug = useAppStore.getState().activeEntrySlug || 'producto';
    const targetType = getNextSlotTargetType(slot, variants, activeSlug);
    let targetPath = filePath;
    let targetName = fileInfo.name;
    let targetSize = fileInfo.size;

    if (window.electronAPI) {
      const ext = filePath.split('.').pop() || 'webp';
      try {
        const copied = await window.electronAPI.copyFileToLibrary({
          entrySlug: activeSlug,
          sourceFilePath: filePath,
          targetType,
          ext
        });
        targetPath = copied.filePath;
        targetName = copied.fileName;
        targetSize = copied.fileSize;
      } catch (copyErr) {
        console.warn(`[MapSlotPicker] Could not copy texture to entry folder for ${slot}:`, copyErr);
      }
    }

    const rawUrl = window.electronAPI.toAssetUrl(targetPath);
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
    addMapVariant(slot, newVariant);
    autoSaveActiveEntry(true);
  };

  // Helper to replace an existing variant with a file path
  const handleReplaceVariantWithFile = async (variant: MapVariantItem, filePath: string) => {
    const fileInfo = await window.electronAPI.getFileInfo(filePath);
    const activeSlug = useAppStore.getState().activeEntrySlug || 'producto';

    if (variant.url) {
      invalidateTexture(variant.url);
    }

    let targetType: string = slot;
    const match = variant.fileName?.match(new RegExp(`^${activeSlug}_(${slot}(?:-\\d+)?)\\.`));
    if (match && match[1]) {
      targetType = match[1];
    } else {
      const nameMatch = variant.name?.match(new RegExp(`^${activeSlug}_(${slot}(?:-\\d+)?)`));
      if (nameMatch && nameMatch[1]) {
        targetType = nameMatch[1];
      }
    }

    let targetPath = filePath;
    let targetName = fileInfo.name;
    let targetSize = fileInfo.size;

    if (window.electronAPI) {
      const ext = filePath.split('.').pop() || 'webp';
      try {
        const copied = await window.electronAPI.copyFileToLibrary({
          entrySlug: activeSlug,
          sourceFilePath: filePath,
          targetType,
          ext
        });
        targetPath = copied.filePath;
        targetName = copied.fileName;
        targetSize = copied.fileSize;
      } catch (copyErr) {
        console.warn(`[MapSlotPicker] Could not copy replacement texture for ${slot}:`, copyErr);
      }
    }

    const rawUrl = window.electronAPI.toAssetUrl(targetPath);
    const url = `${rawUrl}?v=${Date.now()}`;
    updateMapVariant(slot, variant.id, {
      url,
      filePath: targetPath,
      fileName: targetName,
      fileSize: targetSize
    });
    autoSaveActiveEntry(true);
  };

  // Helper to rename a variant and rename its physical file on disk
  const handleRenameVariant = async (variant: MapVariantItem, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === variant.name) return;

    if (variant.filePath && window.electronAPI?.renameLibraryFile) {
      try {
        const existingExt = variant.fileName ? (variant.fileName.match(/\.[^/.]+$/)?.[0] || '.webp') : '.webp';
        const newFileName = trimmed.endsWith(existingExt) ? trimmed : `${trimmed}${existingExt}`;
        const renamed = await window.electronAPI.renameLibraryFile({
          oldFilePath: variant.filePath,
          newFileName
        });
        if (variant.url) {
          invalidateTexture(variant.url);
        }
        const rawUrl = window.electronAPI.toAssetUrl(renamed.filePath);
        const newUrl = `${rawUrl}?v=${Date.now()}`;
        updateMapVariant(slot, variant.id, {
          name: trimmed.replace(/\.[^/.]+$/, ''),
          fileName: renamed.fileName,
          filePath: renamed.filePath,
          url: newUrl,
          fileSize: renamed.fileSize
        });
        autoSaveActiveEntry(true);
        return;
      } catch (err) {
        console.warn(`[MapSlotPicker] Could not rename variant file on disk for ${slot}:`, err);
      }
    }

    renameMapVariant(slot, variant.id, trimmed);
    autoSaveActiveEntry(true);
  };

  // File picker handlers
  const handlePickAdd = async () => {
    const file = await window.electronAPI.openFileDialog({
      title: pickTitle || `Seleccionar ${title}`,
      filters: defaultFilters
    });
    if (file) {
      await handleAddVariantWithFile(file);
    }
  };

  const handlePickReplace = async (variant: MapVariantItem) => {
    const file = await window.electronAPI.openFileDialog({
      title: `Reemplazar textura para ${variant.name}`,
      filters: defaultFilters
    });
    if (file) {
      await handleReplaceVariantWithFile(variant, file);
    }
  };

  // Drag & drop handlers
  const handleDropAdd = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverKey(null);
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const filePath = window.electronAPI.getPathForFile(file);
      if (filePath) {
        // Grant the main process read access to the dropped asset's folder.
        await window.electronAPI.approveDroppedPath(filePath);
        await handleAddVariantWithFile(filePath);
      }
    }
  };

  const slotDropKey = `empty_${slot}`;
  const addDropKey = `add_${slot}`;
  const isEmptyDragOver = dragOverKey === slotDropKey;
  const isAddDragOver = dragOverKey === addDropKey;

  const content = (
    <div className="space-y-3">
      {variants.length === 0 ? (
        <MapSlotDropZone
          isAddZone={false}
          icon={icon}
          label={loadFromCache ? 'Textura embebida en .glb (Arrastra para sobrescribir)' : placeholderText}
          sublabel={loadFromCache ? 'Caché del binario activo' : subText}
          isDragOver={isEmptyDragOver}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverKey(slotDropKey);
          }}
          onDragLeave={() => setDragOverKey(null)}
          onDrop={handleDropAdd}
          onPick={handlePickAdd}
        />
      ) : (
        <div className="space-y-2">
          {variants.map((v) => (
            <MapVariantRowItem
              key={v.id}
              slot={slot}
              variant={v}
              isActive={activeVariantId === v.id}
              allVariants={variants}
              onSelect={() => {
                selectMapVariant(slot, v.id);
                autoSaveActiveEntry(true);
              }}
              onOpenLightbox={(variant) => setLightboxVariant(variant)}
              onPickReplace={() => handlePickReplace(v)}
              onDropReplace={(filePath) => handleReplaceVariantWithFile(v, filePath)}
              onDelete={() => handleDeleteRequest(v)}
              onRename={(newName) => handleRenameVariant(v, newName)}
              onConvertToWebp={() => setWebpConvertVariant(v)}
              isConverting={false}
              dragOverKey={dragOverKey}
              setDragOverKey={setDragOverKey}
            />
          ))}

          <MapSlotDropZone
            isAddZone={true}
            label={addVariantLabel || (slot === 'baseColor' ? 'Añadir Colorway (Arrastra imagen aquí)' : 'Añadir Variante (Arrastra imagen aquí)')}
            sublabel={addVariantSubtext || (slot === 'baseColor' ? 'Variante de Textura BaseColor • WebP / PNG / JPG' : subText)}
            isDragOver={isAddDragOver}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverKey(addDropKey);
            }}
            onDragLeave={() => setDragOverKey(null)}
            onDrop={handleDropAdd}
            onPick={handlePickAdd}
          />
        </div>
      )}

      {/* WebP Convert Modal */}
      <WebpConvertModal
        isOpen={webpConvertVariant !== null}
        onClose={() => setWebpConvertVariant(null)}
        slot={slot}
        variant={webpConvertVariant}
        allVariants={variants}
      />

      {/* Texture Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxVariant !== null}
        onClose={() => setLightboxVariant(null)}
        imageUrl={lightboxVariant?.url}
        title={lightboxVariant?.name}
        subtitle={lightboxVariant?.fileName}
      />

      {/* Cross-Variant Deletion Safeguard Modal */}
      <MapSlotDeleteModal
        deleteCandidate={deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleConfirmDeleteCandidate}
      />

      {children}
    </div>
  );

  return (
    <MapSlotHeader
      slot={slot}
      title={title}
      icon={icon}
      isEnabled={isEnabled}
      onToggleEnabled={(checked) => setSlotEnabled(slot, checked)}
      headerExtra={headerExtra}
      embeddedInSection={embeddedInSection}
    >
      {content}
    </MapSlotHeader>
  );
});
