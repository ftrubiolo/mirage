import React from 'react';
import { MousePointer, Move, Rotate3d } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

export const TransformGizmoItem: React.FC = () => {
  const transformGizmoMode = useViewportStore((s) => s.transformGizmoMode);
  const setTransformGizmoMode = useViewportStore((s) => s.setTransformGizmoMode);

  return (
    <div
      role="group"
      aria-label="Herramientas de manipulación 3D"
      className="flex items-center p-0.5 rounded-xs bg-surface-container/60 border border-hairline gap-0.5"
    >
      <button
        onClick={() => setTransformGizmoMode('none')}
        title="Modo Selección / Cursor (Q) - Navegar sin flechas"
        aria-label="Cursor de navegación (Q)"
        className={`p-1 rounded-xs transition-colors flex items-center text-xs cursor-pointer ${
          transformGizmoMode === 'none'
            ? 'bg-surface-lowest text-action shadow-xs font-semibold'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container'
        }`}
      >
        <MousePointer className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setTransformGizmoMode('translate')}
        title="Desplazamiento 3D (W) - Flechas para mover la pieza"
        aria-label="Mover con flechas 3D (W)"
        className={`p-1 rounded-xs transition-colors flex items-center text-xs cursor-pointer ${
          transformGizmoMode === 'translate'
            ? 'bg-action text-white shadow-xs font-semibold'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container'
        }`}
      >
        <Move className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setTransformGizmoMode('rotate')}
        title="Rotación 3D (E) - Aros para girar la orientación"
        aria-label="Rotar con aros 3D (E)"
        className={`p-1 rounded-xs transition-colors flex items-center text-xs cursor-pointer ${
          transformGizmoMode === 'rotate'
            ? 'bg-action text-white shadow-xs font-semibold'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container'
        }`}
      >
        <Rotate3d className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
