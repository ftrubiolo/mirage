import React from 'react';
import {
  Maximize2,
  FolderOpen,
  Image as ImageIcon,
  Edit2,
  Trash2
} from 'lucide-react';
import { MapVariantItem } from '../../store/variantStore';
import {
  ContextMenu,
  ContextMenuHeader,
  ContextMenuItem,
  ContextMenuSeparator
} from '../UI';

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
  onOpenLightbox,
  onPickReplace,
  onConvertToWebp,
  onStartRename,
  onDelete
}) => {
  const isWebp = (variant.fileName || variant.filePath || '').toLowerCase().endsWith('.webp');

  return (
    <ContextMenu isOpen={isOpen} position={{ x, y }} onClose={onClose}>
      <ContextMenuHeader>
        {variant.name || variant.fileName || 'Texture variant'}
      </ContextMenuHeader>

      <ContextMenuItem
        icon={<Maximize2 className="w-3.5 h-3.5 text-action" />}
        shortcut="Zoom"
        onClick={onOpenLightbox}
      >
        Inspect texture
      </ContextMenuItem>

      <ContextMenuItem
        icon={<FolderOpen className="w-3.5 h-3.5 text-ink-secondary" />}
        onClick={onPickReplace}
      >
        Replace file...
      </ContextMenuItem>

      {!isWebp && onConvertToWebp && (
        <ContextMenuItem
          icon={<ImageIcon className="w-3.5 h-3.5 text-action" />}
          onClick={onConvertToWebp}
        >
          Optimize to WebP...
        </ContextMenuItem>
      )}

      <ContextMenuItem
        icon={<Edit2 className="w-3.5 h-3.5 text-ink-secondary" />}
        onClick={onStartRename}
      >
        Rename
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem
        icon={<Trash2 className="w-3.5 h-3.5" />}
        danger
        onClick={onDelete}
      >
        Delete variant
      </ContextMenuItem>
    </ContextMenu>
  );
};
