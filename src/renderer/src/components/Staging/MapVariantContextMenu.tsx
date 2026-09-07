import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Maximize2,
  FolderOpen,
  Image as ImageIcon,
  Edit2,
  Trash2
} from 'lucide-react';
import { MapVariantItem } from '../../store/workbenchStore';

export interface MapVariantContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  variant: MapVariantItem;
  isActive: boolean;
  onOpenLightbox: () => void;
  onPickReplace: () => void;
  onConvertToWebp?: () => void;
  onStartRename: () => void;
  onDelete: () => void;
}

export const MapVariantContextMenu: React.FC<MapVariantContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose,
  variant,
  isActive: _isActive,
  onOpenLightbox,
  onPickReplace,
  onConvertToWebp,
  onStartRename,
  onDelete
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const isWebp = (variant.fileName || variant.filePath || '').toLowerCase().endsWith('.webp');

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuWidth = 230;
  const menuHeight = isWebp ? 160 : 195;
  const clampedX = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, x));
  const clampedY = Math.max(8, Math.min(window.innerHeight - menuHeight - 8, y));

  return createPortal(
    <div
      ref={menuRef}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: `${clampedY}px`,
        left: `${clampedX}px`
      }}
      className="w-56 rounded-xs bg-surface-lowest border border-hairline shadow-2xl p-1 z-50 flex flex-col gap-0.5 text-xs text-ink-primary select-none animate-in fade-in zoom-in-95 duration-75 font-body"
    >
      {/* Header with Variant Name */}
      <div className="px-2 py-1 border-b border-hairline mb-0.5">
        <p className="font-mono text-[10px] font-semibold text-ink-tertiary truncate uppercase tracking-wider">
          {variant.name || variant.fileName || 'Variante de textura'}
        </p>
      </div>

      {/* Action: Open Lightbox / Inspect Texture */}
      <button
        onClick={() => {
          onClose();
          onOpenLightbox();
        }}
        className="w-full px-2 py-1.5 rounded-xs hover:bg-surface-container flex items-center justify-between text-left cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2">
          <Maximize2 className="w-3.5 h-3.5 text-action" />
          <span>Inspeccionar textura</span>
        </div>
        <span className="text-[10px] font-mono text-ink-tertiary">Zoom</span>
      </button>

      {/* Action: Replace Texture */}
      <button
        onClick={() => {
          onClose();
          onPickReplace();
        }}
        className="w-full px-2 py-1.5 rounded-xs hover:bg-surface-container flex items-center gap-2 text-left cursor-pointer transition-colors"
      >
        <FolderOpen className="w-3.5 h-3.5 text-ink-secondary" />
        <span>Reemplazar archivo...</span>
      </button>

      {/* Action: Convert to WebP (if not already WebP) */}
      {!isWebp && onConvertToWebp && (
        <button
          onClick={() => {
            onClose();
            onConvertToWebp();
          }}
          className="w-full px-2 py-1.5 rounded-xs hover:bg-surface-container flex items-center gap-2 text-left cursor-pointer transition-colors"
        >
          <ImageIcon className="w-3.5 h-3.5 text-action" />
          <span>Optimizar a WebP...</span>
        </button>
      )}

      {/* Action: Rename */}
      <button
        onClick={() => {
          onClose();
          onStartRename();
        }}
        className="w-full px-2 py-1.5 rounded-xs hover:bg-surface-container flex items-center gap-2 text-left cursor-pointer transition-colors"
      >
        <Edit2 className="w-3.5 h-3.5 text-ink-secondary" />
        <span>Renombrar</span>
      </button>

      <div className="my-1 border-t border-hairline" />

      {/* Action: Delete Variant */}
      <button
        onClick={() => {
          onClose();
          onDelete();
        }}
        className="w-full px-2 py-1.5 rounded-xs hover:bg-rose-500/10 flex items-center gap-2 text-left cursor-pointer transition-colors text-rose-600 dark:text-rose-400"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Eliminar variante</span>
      </button>
    </div>,
    document.body
  );
};
