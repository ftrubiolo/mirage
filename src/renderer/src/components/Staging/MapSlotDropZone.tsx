import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';

export interface MapSlotDropZoneProps {
  isAddZone?: boolean;
  icon?: React.ReactNode;
  label?: string;
  sublabel?: string;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onPick: () => void;
}

export const MapSlotDropZone: React.FC<MapSlotDropZoneProps> = ({
  isAddZone = false,
  icon,
  label,
  sublabel,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onPick
}) => {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onPick}
      className={`p-2.5 rounded-xs border border-dashed transition-colors flex items-center justify-between gap-3 cursor-pointer group ${
        isDragOver
          ? 'border-action bg-action-subtle'
          : 'border-hairline hover:border-action/60 bg-surface-low/50 hover:bg-action-subtle/30'
      }`}
    >
      <div className="flex items-center gap-3 truncate min-w-0">
        <div className="w-10 h-10 rounded-xs border border-dashed border-hairline group-hover:border-action/60 flex items-center justify-center text-ink-tertiary group-hover:text-action transition-colors shrink-0">
          {isAddZone ? <Plus className="w-5 h-5" /> : icon}
        </div>
        <div className="truncate min-w-0">
          <span className="text-xs font-mono tabular-nums font-medium text-ink-primary group-hover:text-action block truncate transition-colors">
            {label}
          </span>
          <span className="text-[10px] text-ink-tertiary block truncate">
            {sublabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPick();
          }}
          className="p-1.5 rounded-xs bg-surface-container hover:bg-surface-high text-ink-secondary hover:text-ink-primary text-xs transition-colors border border-hairline cursor-pointer"
          title="Explorar archivo"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
