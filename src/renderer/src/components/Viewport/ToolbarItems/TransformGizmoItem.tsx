import React from 'react';
import { MousePointer, Move, Rotate3d } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

export const TransformGizmoItem: React.FC = () => {
  const transformGizmoMode = useViewportStore((s) => s.transformGizmoMode);
  const setTransformGizmoMode = useViewportStore((s) => s.setTransformGizmoMode);

  return (
    <div
      role="group"
      aria-label="3D transform tools"
      className="flex items-center p-0.5 rounded-xs bg-surface-container/60 border border-hairline gap-0.5"
    >
      <button
        onClick={() => setTransformGizmoMode('none')}
        title="Select / Cursor mode (Q) - Orbit without gizmos"
        aria-label="Navigation cursor (Q)"
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
        title="3D Move (W) - Drag axis handles to translate model"
        aria-label="Move with 3D gizmo (W)"
        className={`p-1 rounded-xs transition-colors flex items-center text-xs cursor-pointer ${
          transformGizmoMode === 'translate'
            ? 'bg-action text-on-action shadow-xs font-semibold'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container'
        }`}
      >
        <Move className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setTransformGizmoMode('rotate')}
        title="3D Rotate (E) - Drag rings to rotate orientation"
        aria-label="Rotate with 3D gizmo (E)"
        className={`p-1 rounded-xs transition-colors flex items-center text-xs cursor-pointer ${
          transformGizmoMode === 'rotate'
            ? 'bg-action text-on-action shadow-xs font-semibold'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container'
        }`}
      >
        <Rotate3d className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
