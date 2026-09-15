import React from 'react';
import { Maximize2 } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

export const FitModelItem: React.FC = () => {
  const triggerFitToModel = useViewportStore((s) => s.triggerFitToModel);

  return (
    <button
      onClick={triggerFitToModel}
      title="Reencuadrar cámara a escala 1:1 (Ctrl+0)"
      className="p-1.5 rounded-xs transition-colors text-ink-secondary hover:text-ink-primary hover:bg-surface-container border border-transparent cursor-pointer"
    >
      <Maximize2 className="w-3.5 h-3.5" />
    </button>
  );
};
