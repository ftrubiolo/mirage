import React from 'react';
import { Grid, Ruler, Box } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

export const OverlaysItemGroup: React.FC = () => {
  const showGrid = useViewportStore((s) => s.showGrid);
  const showDimensions = useViewportStore((s) => s.showDimensions);
  const showContactShadows = useViewportStore((s) => s.showContactShadows);
  const toggleGrid = useViewportStore((s) => s.toggleGrid);
  const toggleDimensions = useViewportStore((s) => s.toggleDimensions);
  const toggleContactShadows = useViewportStore((s) => s.toggleContactShadows);

  return (
    <div className="flex items-center gap-0.5">
      {/* Grid Toggle */}
      <button
        onClick={toggleGrid}
        title="Alternar grilla de taller (G)"
        className={`p-1.5 rounded-xs transition-colors flex items-center text-xs border cursor-pointer ${
          showGrid
            ? 'bg-surface-container text-ink-primary border-hairline'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
        }`}
      >
        <Grid className="w-3.5 h-3.5" />
      </button>

      {/* Dimensions Toggle */}
      <button
        onClick={toggleDimensions}
        title="Mostrar cotas y dimensiones arquitectónicas"
        className={`p-1.5 rounded-xs transition-colors flex items-center text-xs border cursor-pointer ${
          showDimensions
            ? 'bg-action/15 text-action border-action/40'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
        }`}
      >
        <Ruler className="w-3.5 h-3.5" />
      </button>

      {/* Contact Shadows Toggle */}
      <button
        onClick={toggleContactShadows}
        title="Alternar sombras de contacto bajo el modelo"
        className={`p-1.5 rounded-xs transition-colors flex items-center text-xs border cursor-pointer ${
          showContactShadows
            ? 'bg-surface-container text-ink-primary border-hairline'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
        }`}
      >
        <Box className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
