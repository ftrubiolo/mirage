import React from 'react';
import { MousePointer, Move, Rotate3d, ArrowDownToLine, RotateCcw } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';
import { useModelStore } from '../../../store/modelStore';
import { commandManager, SetModelPositionCommand, SetModelRotationCommand } from '../../../utils/commandManager';

export const CanvasTransformWidget: React.FC = () => {
  const transformGizmoMode = useViewportStore((s) => s.transformGizmoMode);
  const setTransformGizmoMode = useViewportStore((s) => s.setTransformGizmoMode);

  const modelPosition = useModelStore((s) => s.modelPosition);
  const modelRotation = useModelStore((s) => s.modelRotation);
  const setPosition = useModelStore((s) => s.setPosition);
  const setRotation = useModelStore((s) => s.setRotation);

  const handleModeChange = (mode: 'none' | 'translate' | 'rotate') => {
    setTransformGizmoMode(mode);
  };

  const handleResetPosition = () => {
    commandManager.execute(new SetModelPositionCommand({ x: 0, y: 0, z: 0 }));
  };

  const handleResetRotation = () => {
    commandManager.execute(new SetModelRotationCommand({ x: 0, y: 0, z: 0 }));
  };

  const handleGroundModel = () => {
    setPosition({ y: 0 });
  };

  const handleRotateAxis = (axis: 'x' | 'y' | 'z', delta: number) => {
    const current = useModelStore.getState().modelRotation;
    const nextRotation = {
      ...current,
      [axis]: ((current[axis] + delta) % 360 + 360) % 360
    };
    commandManager.execute(new SetModelRotationCommand(nextRotation));
  };

  return (
    <div className="w-64 flex flex-col gap-2.5 text-xs">
      {/* Gizmo Mode Switcher */}
      <div className="grid grid-cols-3 gap-1 bg-surface-container/50 p-1 rounded-xs border border-hairline">
        <button
          type="button"
          onClick={() => handleModeChange('none')}
          className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-xs transition-colors font-medium ${
            transformGizmoMode === 'none'
              ? 'bg-action text-white shadow-xs'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
          }`}
          title="Cursor / Navegación (Q)"
        >
          <MousePointer size={13} />
          <span className="text-[11px]">Cursor</span>
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('translate')}
          className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-xs transition-colors font-medium ${
            transformGizmoMode === 'translate'
              ? 'bg-action text-white shadow-xs'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
          }`}
          title="Desplazamiento con flechas 3D (W)"
        >
          <Move size={13} />
          <span className="text-[11px]">Mover</span>
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('rotate')}
          className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-xs transition-colors font-medium ${
            transformGizmoMode === 'rotate'
              ? 'bg-action text-white shadow-xs'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
          }`}
          title="Rotación con aros 3D (E)"
        >
          <Rotate3d size={13} />
          <span className="text-[11px]">Rotar</span>
        </button>
      </div>

      {/* Position Coordinates Table */}
      <div className="flex flex-col gap-1 bg-surface-container/30 p-2 rounded-xs border border-hairline">
        <div className="flex items-center justify-between text-[10px] uppercase font-mono font-bold tracking-wider text-ink-tertiary">
          <span>Posición (X, Y, Z)</span>
          <button
            type="button"
            onClick={handleResetPosition}
            title="Restablecer posición a (0, 0, 0)"
            className="hover:text-action flex items-center gap-0.5 lowercase"
          >
            <RotateCcw size={10} /> reset
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 font-mono text-[11px] tabular-nums">
          <div className="flex items-center justify-between px-1.5 py-0.5 bg-surface-lowest rounded-xs border border-hairline">
            <span className="text-red-400 font-bold">X</span>
            <span>{modelPosition.x.toFixed(2)}m</span>
          </div>
          <div className="flex items-center justify-between px-1.5 py-0.5 bg-surface-lowest rounded-xs border border-hairline">
            <span className="text-emerald-400 font-bold">Y</span>
            <span>{modelPosition.y.toFixed(2)}m</span>
          </div>
          <div className="flex items-center justify-between px-1.5 py-0.5 bg-surface-lowest rounded-xs border border-hairline">
            <span className="text-blue-400 font-bold">Z</span>
            <span>{modelPosition.z.toFixed(2)}m</span>
          </div>
        </div>
      </div>

      {/* Quick 90-degree Rotation Chips */}
      <div className="flex flex-col gap-1 bg-surface-container/30 p-2 rounded-xs border border-hairline">
        <div className="flex items-center justify-between text-[10px] uppercase font-mono font-bold tracking-wider text-ink-tertiary">
          <span>Giro Rápido (+90°)</span>
          <button
            type="button"
            onClick={handleResetRotation}
            title="Restablecer rotación a 0°"
            className="hover:text-action flex items-center gap-0.5 lowercase"
          >
            <RotateCcw size={10} /> reset
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => handleRotateAxis('x', 90)}
            className="py-1 px-1 rounded-xs bg-surface-lowest hover:bg-surface-high border border-hairline font-mono text-[10px] text-ink-secondary hover:text-ink-primary text-center"
          >
            +90° en X ({Math.round(modelRotation.x)}°)
          </button>
          <button
            type="button"
            onClick={() => handleRotateAxis('y', 90)}
            className="py-1 px-1 rounded-xs bg-surface-lowest hover:bg-surface-high border border-hairline font-mono text-[10px] text-ink-secondary hover:text-ink-primary text-center"
          >
            +90° en Y ({Math.round(modelRotation.y)}°)
          </button>
          <button
            type="button"
            onClick={() => handleRotateAxis('z', 90)}
            className="py-1 px-1 rounded-xs bg-surface-lowest hover:bg-surface-high border border-hairline font-mono text-[10px] text-ink-secondary hover:text-ink-primary text-center"
          >
            +90° en Z ({Math.round(modelRotation.z)}°)
          </button>
        </div>
      </div>

      {/* Grounding Action */}
      <button
        type="button"
        onClick={handleGroundModel}
        className="flex items-center justify-center gap-1.5 py-1.5 rounded-xs bg-surface-container hover:bg-surface-high border border-hairline text-ink-secondary hover:text-ink-primary font-mono text-[11px] transition-colors"
      >
        <ArrowDownToLine size={12} className="text-action" />
        <span>Alinear base al piso (Y = 0)</span>
      </button>
    </div>
  );
};
