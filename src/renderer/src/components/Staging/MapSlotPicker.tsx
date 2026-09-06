import React, { useState, useRef, useEffect } from 'react';
import { FolderOpen, X, Plus, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { useWorkbenchStore, SlotName, MapVariantItem } from '../../store/workbenchStore';
import { useAppStore } from '../../store/appStore';
import { Switch } from '../UI/Switch';
import { convertImageToWebpCanvas } from '../../utils/canvasTextureProcessor';
import { WebpConvertModal } from './WebpConvertModal';
import { autoSaveActiveEntry } from '../../utils/libraryBridge';
import { invalidateTexture } from '../../utils/pbrController';

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

export const getNextBaseColorTargetType = (existingVariants: MapVariantItem[], slug: string): string => {
  return getNextSlotTargetType('baseColor', existingVariants, slug);
};

interface MapVariantRowItemProps {
  slot: SlotName;
  variant: MapVariantItem;
  isActive: boolean;
  allVariants: MapVariantItem[];
  onSelect: () => void;
  onPickReplace: () => void;
  onDropReplace: (filePath: string) => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onConvertToWebp?: () => void;
  isConverting?: boolean;
  dragOverKey: string | null;
  setDragOverKey: (key: string | null) => void;
}

export const MapVariantRowItem: React.FC<MapVariantRowItemProps> = ({
  slot,
  variant,
  isActive,
  allVariants,
  onSelect,
  onPickReplace,
  onDropReplace,
  onDelete,
  onRename,
  onConvertToWebp,
  isConverting = false,
  dragOverKey,
  setDragOverKey
}) => {
  const [nameVal, setNameVal] = useState(variant.name || variant.fileName);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const rowDropKey = `${slot}_var_${variant.id}`;
  const isDragOver = dragOverKey === rowDropKey;

  const isWebp = (variant.fileName || variant.filePath || '').toLowerCase().endsWith('.webp');

  useEffect(() => {
    setNameVal(variant.name || variant.fileName);
    setHasError(false);
    setErrorMessage('');
  }, [variant.name, variant.fileName]);

  const validateName = (val: string): { valid: boolean; error: string } => {
    const trimmed = val.trim();
    if (!trimmed) {
      return { valid: false, error: 'El nombre no puede estar vacío' };
    }
    const isDuplicate = allVariants.some(
      (other) => other.id !== variant.id && other.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      return { valid: false, error: 'Ya existe una variante con este nombre' };
    }
    return { valid: true, error: '' };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setNameVal(newVal);
    const { valid, error } = validateName(newVal);
    if (!valid) {
      setHasError(true);
      setErrorMessage(error);
    } else {
      setHasError(false);
      setErrorMessage('');
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { valid, error } = validateName(nameVal);
    if (!valid) {
      e.preventDefault();
      inputRef.current?.focus();
      setHasError(true);
      setErrorMessage(error);
      return;
    }

    const trimmed = nameVal.trim();
    if (trimmed !== variant.name) {
      onRename(trimmed);
    }
    setHasError(false);
    setErrorMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const { valid } = validateName(nameVal);
      if (valid) {
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      setNameVal(variant.name || variant.fileName);
      setHasError(false);
      setErrorMessage('');
      inputRef.current?.blur();
    }
  };

  return (
    <div
      onClick={onSelect}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOverKey(rowDropKey);
      }}
      onDragLeave={() => setDragOverKey(null)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOverKey(null);
        if (e.dataTransfer.files.length > 0) {
          const filePath = window.electronAPI.getPathForFile(e.dataTransfer.files[0]);
          if (filePath) onDropReplace(filePath);
        }
      }}
      className={`p-2.5 rounded-xs border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
        isDragOver
          ? 'border-action bg-action-subtle'
          : isActive
          ? 'border-action bg-action/10 ring-1 ring-action/50 shadow-xs'
          : 'border-hairline bg-surface-low/50 hover:border-hairline-strong hover:bg-surface-low'
      }`}
    >
      <div className="flex items-center gap-3 truncate min-w-0 flex-1">
        <img
          src={variant.url}
          alt={variant.name}
          className={`w-10 h-10 rounded-xs object-cover border shrink-0 ${
            isActive ? 'border-action ring-1 ring-action/40' : 'border-hairline bg-surface-container'
          }`}
        />
        <div className="truncate min-w-0 flex-1 space-y-0.5">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={nameVal}
              onClick={(e) => e.stopPropagation()}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              title={hasError ? errorMessage : 'Haz clic para renombrar'}
              className={`text-xs font-mono tabular-nums font-medium block truncate w-full px-1.5 py-0.5 rounded-xs outline-none transition-colors ${
                hasError
                  ? 'border border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : isActive
                  ? 'border border-transparent hover:border-action/40 focus:border-action focus:bg-surface-lowest text-ink-primary font-semibold'
                  : 'border border-transparent hover:border-hairline focus:border-action focus:bg-surface-lowest text-ink-secondary hover:text-ink-primary'
              }`}
            />
            {hasError && (
              <span className="text-[10px] text-rose-500 font-sans block px-1.5 mt-0.5">
                {errorMessage}
              </span>
            )}
          </div>
          <span className="text-[10px] text-ink-tertiary block px-1.5 truncate">
            {variant.fileName || 'WebP / PNG / JPG'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {!isWebp && onConvertToWebp && (
          <button
            onClick={onConvertToWebp}
            disabled={isConverting}
            className="p-1.5 rounded-xs bg-surface-container hover:bg-surface-high text-action hover:text-action-hover text-xs transition-colors border border-hairline cursor-pointer disabled:opacity-50"
            title="Redimensionar y Optimizar a WebP"
          >
            {isConverting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </button>
        )}
        <button
          onClick={onPickReplace}
          className="p-1.5 rounded-xs bg-surface-container hover:bg-surface-high text-ink-secondary hover:text-ink-primary text-xs transition-colors border border-hairline cursor-pointer"
          title="Reemplazar textura de esta variante"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-xs hover:bg-rose-500/10 text-ink-tertiary hover:text-rose-600 dark:hover:text-rose-400 text-xs transition-colors border border-transparent cursor-pointer"
          title="Eliminar esta variante"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

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

export const MapSlotPicker: React.FC<MapSlotPickerProps> = ({
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
  const {
    mapVariants,
    activeVariantIds,
    slotEnabled,
    setSlotEnabled,
    loadFromCache,
    addMapVariant,
    selectMapVariant,
    removeMapVariant,
    renameMapVariant,
    updateMapVariant,
    variants: entryVariants,
    activeVariantId: currentEntryVariantId
  } = useWorkbenchStore();

  const isEnabled = slotEnabled ? (slotEnabled[slot] ?? true) : true;

  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [webpConvertVariant, setWebpConvertVariant] = useState<MapVariantItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<{
    variant: MapVariantItem;
    affectedVariants: any[];
  } | null>(null);

  const variants = mapVariants[slot] || [];
  const activeVariantId = activeVariantIds[slot];

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

    // Invalidate the old texture from Three.js memory cache immediately
    if (variant.url) {
      invalidateTexture(variant.url);
    }

    // Derive targetType from existing fileName or name
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
        /* Empty Slot Zone (0 Variants) */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverKey(slotDropKey);
          }}
          onDragLeave={() => setDragOverKey(null)}
          onDrop={handleDropAdd}
          onClick={handlePickAdd}
          className={`p-2.5 rounded-xs border border-dashed transition-colors flex items-center justify-between gap-3 cursor-pointer group ${
            isEmptyDragOver
              ? 'border-action bg-action-subtle'
              : 'border-hairline hover:border-action/60 bg-surface-low/50 hover:bg-action-subtle/30'
          }`}
        >
          <div className="flex items-center gap-3 truncate min-w-0">
            <div className="w-10 h-10 rounded-xs border border-dashed border-hairline group-hover:border-action/60 flex items-center justify-center text-ink-tertiary group-hover:text-action transition-colors shrink-0">
              {icon}
            </div>
            <div className="truncate min-w-0">
              <span className="text-xs font-mono tabular-nums font-medium text-ink-primary group-hover:text-action block truncate transition-colors">
                {loadFromCache ? 'Textura embebida en .glb (Arrastra para sobrescribir)' : placeholderText}
              </span>
              <span className="text-[10px] text-ink-tertiary block truncate">
                {loadFromCache ? 'Caché del binario activo' : subText}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePickAdd();
              }}
              className="p-1.5 rounded-xs bg-surface-container hover:bg-surface-high text-ink-secondary hover:text-ink-primary text-xs transition-colors border border-hairline cursor-pointer"
              title="Explorar archivo"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Multiple Variants List */
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

          {/* Dotted "Añadir Variante" Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverKey(addDropKey);
            }}
            onDragLeave={() => setDragOverKey(null)}
            onDrop={handleDropAdd}
            onClick={handlePickAdd}
            className={`p-2.5 rounded-xs border border-dashed transition-colors flex items-center justify-between gap-3 cursor-pointer group ${
              isAddDragOver
                ? 'border-action bg-action-subtle'
                : 'border-hairline hover:border-action/60 bg-surface-low/50 hover:bg-action-subtle/30'
            }`}
          >
            <div className="flex items-center gap-3 truncate min-w-0">
              <div className="w-10 h-10 rounded-xs border border-dashed border-hairline group-hover:border-action/60 flex items-center justify-center text-ink-tertiary group-hover:text-action transition-colors shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <div className="truncate min-w-0">
                <span className="text-xs font-mono tabular-nums font-medium text-ink-primary group-hover:text-action block truncate transition-colors">
                  {addVariantLabel || (slot === 'baseColor' ? 'Añadir Colorway (Arrastra imagen aquí)' : 'Añadir Variante (Arrastra imagen aquí)')}
                </span>
                <span className="text-[10px] text-ink-tertiary block truncate">
                  {addVariantSubtext || (slot === 'baseColor' ? 'Variante de Textura BaseColor • WebP / PNG / JPG' : subText)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePickAdd();
                }}
                className="p-1.5 rounded-xs bg-surface-container hover:bg-surface-high text-ink-secondary hover:text-ink-primary text-xs transition-colors border border-hairline cursor-pointer"
                title="Explorar archivo"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>
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

      {/* Cross-Variant Deletion Safeguard Modal */}
      {deleteCandidate && (
        <div
          onClick={() => setDeleteCandidate(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full max-w-md p-5 space-y-4 cursor-default animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-xs shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-primary font-bold text-sm uppercase text-ink-primary">
                  ¿Eliminar mapa en uso por otros perfiles?
                </h3>
                <p className="text-xs text-ink-secondary font-body leading-relaxed">
                  El mapa <span className="font-mono text-ink-primary font-semibold">{deleteCandidate.variant.name || deleteCandidate.variant.fileName}</span> está siendo utilizado en los siguientes perfiles de esta pieza:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {deleteCandidate.affectedVariants.map((aff) => (
                    <span
                      key={aff.id}
                      className="px-2 py-0.5 bg-surface-low border border-hairline rounded-xs text-[11px] font-medium text-ink-primary"
                    >
                      {aff.name}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-ink-tertiary pt-1">
                  Si confirmas la eliminación, este mapa se desvinculará de la pieza.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-3 py-1.5 border border-hairline rounded-xs text-xs uppercase tracking-wider text-ink-secondary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteCandidate}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xs text-xs font-primary font-semibold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
              >
                Eliminar de Todos Modos
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );

  if (!embeddedInSection) {
    return (
      <div className="space-y-2 p-2.5 rounded-xs bg-surface-low/30 border border-hairline">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 flex items-center justify-center text-action">
              {icon}
            </div>
            <span className="text-xs font-semibold text-ink-primary uppercase tracking-wider font-primary truncate">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}
            <Switch
              checked={isEnabled}
              onChange={(checked) => setSlotEnabled(slot, checked)}
              title={isEnabled ? 'Desactivar mapa (forzar null)' : 'Activar mapa'}
            />
          </div>
        </div>
        <div className={`transition-opacity duration-200 ${!isEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 flex items-center justify-center text-action">
            {icon}
          </div>
          <h3 className="text-xs font-semibold text-ink-primary uppercase tracking-wider font-primary truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerExtra}
          <Switch
            checked={isEnabled}
            onChange={(checked) => setSlotEnabled(slot, checked)}
            title={isEnabled ? 'Desactivar mapa (forzar null)' : 'Activar mapa'}
          />
        </div>
      </div>
      <div className={`transition-opacity duration-200 ${!isEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
        {content}
      </div>
    </div>
  );
};
