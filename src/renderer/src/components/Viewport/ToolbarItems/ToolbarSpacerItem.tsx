import React from 'react';
import { GripVertical, X } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

interface ToolbarSpacerItemProps {
  id: string;
}

export const ToolbarSpacerItem: React.FC<ToolbarSpacerItemProps> = ({ id }) => {
  const removeToolbarSpacer = useViewportStore((s) => s.removeToolbarSpacer);

  return (
    <div
      className="flex-1 min-w-4 h-6 flex items-center justify-center relative group select-none transition-colors duration-150 rounded-xs hover:bg-surface-container/30 border border-transparent hover:border-hairline/40"
      title="Espaciador flexible (Arrastrar para mover, clic en la cruz para eliminar)"
    >
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-ink-tertiary transition-opacity duration-150 px-1">
        <GripVertical className="w-3 h-3 text-ink-tertiary cursor-grab" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeToolbarSpacer(id);
          }}
          title="Eliminar este espaciador"
          className="p-0.5 rounded-xs hover:bg-surface-high hover:text-action text-ink-tertiary transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
