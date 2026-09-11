import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Maximize2 } from 'lucide-react';
import { SlotName } from '../../store/pbrMaterialStore';
import { MapVariantItem } from '../../store/variantStore';
import { ThumbnailImage } from '../UI/ThumbnailImage';
import { MapVariantContextMenu } from './MapVariantContextMenu';

export interface MapVariantRowItemProps {
  slot: SlotName;
  variant: MapVariantItem;
  isActive: boolean;
  allVariants: MapVariantItem[];
  onSelect: () => void;
  onOpenLightbox: (variant: MapVariantItem) => void;
  onPickReplace: () => void;
  onDropReplace: (filePath: string) => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onConvertToWebp?: () => void;
  isConverting?: boolean;
  dragOverKey: string | null;
  setDragOverKey: (key: string | null) => void;
}

export const MapVariantRowItem: React.FC<MapVariantRowItemProps> = React.memo(({
  slot,
  variant,
  isActive,
  allVariants,
  onSelect,
  onOpenLightbox,
  onPickReplace,
  onDropReplace,
  onDelete,
  onRename,
  onConvertToWebp,
  dragOverKey,
  setDragOverKey
}) => {
  const [nameVal, setNameVal] = useState(variant.name || variant.fileName);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowDropKey = `${slot}_var_${variant.id}`;
  const isDragOver = dragOverKey === rowDropKey;

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

  const handleThumbnailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      onOpenLightbox(variant);
    } else {
      onSelect();
    }
  };

  const handleStartRename = () => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  return (
    <>
      <div
        onClick={onSelect}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverKey(rowDropKey);
        }}
        onDragLeave={() => setDragOverKey(null)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragOverKey(null);
          if (e.dataTransfer.files.length > 0) {
            const filePath = window.electronAPI.getPathForFile(e.dataTransfer.files[0]);
            if (filePath) {
              // Grant the main process read access to the dropped asset's folder.
              await window.electronAPI.approveDroppedPath(filePath);
              onDropReplace(filePath);
            }
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
          <div
            onClick={handleThumbnailClick}
            title={isActive ? 'Clic para inspeccionar textura (Zoom & Pan)' : 'Clic para seleccionar variante'}
            className={`relative group/thumb shrink-0 rounded-xs overflow-hidden ${
              isActive ? 'cursor-zoom-in' : 'cursor-pointer'
            }`}
          >
            <ThumbnailImage
              src={variant.url}
              alt={variant.name}
              className={`w-10 h-10 rounded-xs border shrink-0 transition-all ${
                isActive ? 'border-action ring-1 ring-action/40' : 'border-hairline bg-surface-container'
              }`}
            />
            {isActive && (
              <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/35 rounded-xs transition-colors flex items-center justify-center pointer-events-none opacity-0 group-hover/thumb:opacity-100">
                <Maximize2 className="w-3.5 h-3.5 text-white drop-shadow" />
              </div>
            )}
          </div>
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
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setContextMenu({
                isOpen: true,
                x: rect.right,
                y: rect.bottom + 4
              });
            }}
            className={`p-1.5 rounded-xs transition-all cursor-pointer ${
              contextMenu?.isOpen
                ? 'bg-surface-high text-ink-primary opacity-100'
                : 'text-ink-tertiary hover:text-ink-primary hover:bg-surface-high opacity-0 group-hover:opacity-100'
            }`}
            title="Opciones de variante (o clic derecho)"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {contextMenu?.isOpen && (
        <MapVariantContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isOpen={contextMenu.isOpen}
          onClose={() => setContextMenu(null)}
          variant={variant}
          isActive={isActive}
          onOpenLightbox={() => onOpenLightbox(variant)}
          onPickReplace={onPickReplace}
          onConvertToWebp={onConvertToWebp}
          onStartRename={handleStartRename}
          onDelete={onDelete}
        />
      )}
    </>
  );
});
