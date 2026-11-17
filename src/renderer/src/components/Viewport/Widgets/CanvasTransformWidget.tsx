import React from 'react';
import { MousePointer, Move, Rotate3d, ArrowDownToLine, RotateCcw } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';
import { useModelStore } from '../../../store/modelStore';
import { commandManager, SetModelPositionCommand, SetModelRotationCommand } from '../../../utils/commandManager';

export const CanvasTransformWidget: React.FC = () => {
  const transformGizmoMode = useViewportStore((s) => s.transformGizmoMode);
  const setTransformGizmoMode = useViewportStore((s) => s.setTransformGizmoMode);
  const canvasTransformMode = useViewportStore((s) => s.canvasTransformMode);
  const canvasTransformOrientation = useViewportStore((s) => s.canvasTransformOrientation);

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

  // Compressed version: only the 3 big buttons (like env ones, no text, no margin, horizontal or vertical)
  if (canvasTransformMode === 'compressed') {
    const isVertical = canvasTransformOrientation === 'vertical';

    return (
      <div
        className={`flex ${isVertical ? 'flex-col w-full' : 'flex-row'} p-0 gap-0 text-xs antialiased`}
        data-testid="canvas-transform-compressed"
        data-orientation={canvasTransformOrientation}
      >
        <button
          type="button"
          onClick={() => handleModeChange('none')}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            transformGizmoMode === 'none'
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title="Cursor / Free navigation (Q)"
          aria-label="Cursor"
        >
          <MousePointer size={20} className={transformGizmoMode === 'none' ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('translate')}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            transformGizmoMode === 'translate'
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title="Move: Translate with 3D axis handles (W)"
          aria-label="Move"
        >
          <Move size={20} className={transformGizmoMode === 'translate' ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('rotate')}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            transformGizmoMode === 'rotate'
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title="Rotate: Rotate with 3D rings (E)"
          aria-label="Rotate"
        >
          <Rotate3d size={20} className={transformGizmoMode === 'rotate' ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>
      </div>
    );
  }

  // Full detailed version
  const renderGizmoSwitcher = () => (
    <div className="grid grid-cols-3 gap-1 bg-surface-container/50 p-1 rounded-xs border border-hairline">
      <button
        type="button"
        onClick={() => handleModeChange('none')}
        className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-xs transition-colors font-medium cursor-pointer ${
          transformGizmoMode === 'none'
            ? 'bg-action text-on-action shadow-xs'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
        }`}
        title="Cursor / Navigation (Q)"
      >
        <MousePointer size={13} />
        <span className="text-[11px]">Cursor</span>
      </button>
      <button
        type="button"
        onClick={() => handleModeChange('translate')}
        className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-xs transition-colors font-medium cursor-pointer ${
          transformGizmoMode === 'translate'
            ? 'bg-action text-on-action shadow-xs'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
        }`}
        title="Translate with 3D axis handles (W)"
      >
        <Move size={13} />
        <span className="text-[11px]">Move</span>
      </button>
      <button
        type="button"
        onClick={() => handleModeChange('rotate')}
        className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-xs transition-colors font-medium cursor-pointer ${
          transformGizmoMode === 'rotate'
            ? 'bg-action text-on-action shadow-xs'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
        }`}
        title="Rotate with 3D rings (E)"
      >
        <Rotate3d size={13} />
        <span className="text-[11px]">Rotate</span>
      </button>
    </div>
  );

  return (
    <div className="w-64 flex flex-col gap-2.5 text-xs antialiased" data-testid="canvas-transform-full">
      {/* Gizmo Mode Switcher */}
      {renderGizmoSwitcher()}

      {/* Position Coordinates Table */}
      <div className="flex flex-col gap-1 bg-surface-container/30 p-2 rounded-xs border border-hairline">
        <div className="flex items-center justify-between text-[10px] uppercase font-mono font-bold tracking-wider text-ink-tertiary">
          <span>Position (X, Y, Z)</span>
          <button
            type="button"
            onClick={handleResetPosition}
            title="Reset position to (0, 0, 0)"
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
          <span>Quick Rotate (+90°)</span>
          <button
            type="button"
            onClick={handleResetRotation}
            title="Reset rotation to 0°"
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
            +90° on X ({Math.round(modelRotation.x)}°)
          </button>
          <button
            type="button"
            onClick={() => handleRotateAxis('y', 90)}
            className="py-1 px-1 rounded-xs bg-surface-lowest hover:bg-surface-high border border-hairline font-mono text-[10px] text-ink-secondary hover:text-ink-primary text-center"
          >
            +90° on Y ({Math.round(modelRotation.y)}°)
          </button>
          <button
            type="button"
            onClick={() => handleRotateAxis('z', 90)}
            className="py-1 px-1 rounded-xs bg-surface-lowest hover:bg-surface-high border border-hairline font-mono text-[10px] text-ink-secondary hover:text-ink-primary text-center"
          >
            +90° on Z ({Math.round(modelRotation.z)}°)
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
        <span>Snap base to floor (Y = 0)</span>
      </button>
    </div>
  );
};
