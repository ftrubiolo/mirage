import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

export const AutoRotateItem: React.FC = () => {
  const autoRotate = useViewportStore((s) => s.autoRotate);
  const toggleAutoRotate = useViewportStore((s) => s.toggleAutoRotate);

  return (
    <button
      onClick={toggleAutoRotate}
      title={autoRotate ? 'Stop continuous 360° orbit' : 'Enable continuous 360° orbit'}
      className={`p-1.5 rounded-xs transition-colors flex items-center text-xs border cursor-pointer ${
        autoRotate
          ? 'bg-action/15 text-action border-action/40'
          : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
      }`}
    >
      <RotateCcw className="w-3.5 h-3.5" />
    </button>
  );
};
