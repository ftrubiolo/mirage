import React from 'react';
import { Box, Eye } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

interface ProjectionToggleItemProps {
  iconOnly?: boolean;
}

export const ProjectionToggleItem: React.FC<ProjectionToggleItemProps> = ({ iconOnly }) => {
  const isOrthographic = useViewportStore((s) => s.isOrthographic);
  const toggleOrthographic = useViewportStore((s) => s.toggleOrthographic);

  return (
    <button
      onClick={toggleOrthographic}
      title={
        isOrthographic
          ? 'Modo Ortográfico activo (Clic para Perspectiva)'
          : 'Modo Perspectiva activo (Clic para Ortográfico)'
      }
      className={`h-6 px-1.5 rounded-xs text-[10px] font-mono font-bold tracking-wider transition-colors border cursor-pointer flex items-center justify-center ${
        isOrthographic
          ? 'bg-action/15 text-action border-action/40'
          : 'text-ink-tertiary hover:text-ink-primary hover:bg-surface-container border-transparent'
      }`}
    >
      {iconOnly ? (
        isOrthographic ? (
          <Box className="w-3.5 h-3.5" />
        ) : (
          <Eye className="w-3.5 h-3.5" />
        )
      ) : (
        <span>{isOrthographic ? 'ORTO' : 'PERSP'}</span>
      )}
    </button>
  );
};
