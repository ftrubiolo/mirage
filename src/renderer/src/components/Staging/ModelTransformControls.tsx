import React from 'react';
import { Compass, RefreshCw, Move, Rotate3d } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import {
  commandManager,
  SetModelRotationCommand,
  SetModelPositionCommand
} from '../../utils/commandManager';
import { Button, NumberInput } from '../UI';

export const ModelTransformControls: React.FC = () => {
  const modelStats = useModelStore((s) => s.modelStats);
  const modelRotation = useModelStore((s) => s.modelRotation);
  const modelPosition = useModelStore((s) => s.modelPosition);
  const setRotation = useModelStore((s) => s.setRotation);
  const setPosition = useModelStore((s) => s.setPosition);

  if (!modelStats) {
    return null;
  }

  const isRotated = modelRotation.x !== 0 || modelRotation.y !== 0 || modelRotation.z !== 0;
  const isMoved =
    Math.abs(modelPosition.x) > 0.0001 ||
    Math.abs(modelPosition.y) > 0.0001 ||
    Math.abs(modelPosition.z) > 0.0001;

  const handleRotate = (axis: 'x' | 'y' | 'z', deltaDegrees: number) => {
    const current = useModelStore.getState().modelRotation;
    const nextRotation = {
      ...current,
      [axis]: ((current[axis] + deltaDegrees) % 360 + 360) % 360
    };
    commandManager.execute(new SetModelRotationCommand(nextRotation));
  };

  const handleSetRotationAxis = (axis: 'x' | 'y' | 'z', val: number) => {
    const current = useModelStore.getState().modelRotation;
    const nextRotation = {
      ...current,
      [axis]: ((val % 360) + 360) % 360
    };
    setRotation(nextRotation);
  };

  const handleResetRotation = () => {
    commandManager.execute(new SetModelRotationCommand({ x: 0, y: 0, z: 0 }));
  };

  const handleSetPositionAxis = (axis: 'x' | 'y' | 'z', val: number) => {
    setPosition({ [axis]: val });
  };

  const handleResetPosition = () => {
    commandManager.execute(new SetModelPositionCommand({ x: 0, y: 0, z: 0 }));
  };

  const axes: {
    axis: 'x' | 'y' | 'z';
    label: string;
  }[] = [
    {
      axis: 'x',
      label: 'Eje X'
    },
    {
      axis: 'y',
      label: 'Eje Y'
    },
    {
      axis: 'z',
      label: 'Eje Z'
    }
  ];

  return (
    <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3.5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-action" />
          Orientación & Transformación 3D
        </h4>
      </div>

      <p className="text-[11px] text-ink-secondary leading-relaxed">
        Ajusta la posición en el taller o corrige la orientación CAD. Solo la rotación se hornea en los modelos exportados.
      </p>

      {/* Posición en Escenario (Desplazamiento 3D) */}
      <div className="space-y-2 pt-2 border-t border-hairline">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-action" />
            <span className="text-[11px] font-semibold text-ink-primary">
              Posición en Escenario
            </span>
          </div>
          {isMoved && (
            <button
              onClick={handleResetPosition}
              className="text-[10px] text-ink-tertiary hover:text-action flex items-center gap-1 transition-colors cursor-pointer"
              title="Restablecer posición al origen (0, 0, 0)"
            >
              <RefreshCw className="w-3 h-3" />
              Restablecer
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {axes.map(({axis, label}) => {
                    const val = modelPosition[axis];
                    return (
                      <div
                        key={axis}
                        className="p-2 rounded-xs bg-surface-low border border-hairline flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-semibold text-ink-primary font-mono uppercase">
                            {label}
                          </span>
                        </div>

                          <NumberInput
                            value={val}
                            onChange={(nextVal) => handleSetPositionAxis(axis, nextVal)}
                            step={0.05}
                            precision={2}
                            className="w-16 text-right font-mono text-[11px]"
                          />
                        </div>
                    )
                  })}
        </div>
      </div>

      {/* Rotación & Orientación */}
      <div className="space-y-2 pt-2 border-t border-hairline">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Rotate3d className="w-3.5 h-3.5 text-action" />
            <span className="text-[11px] font-semibold text-ink-primary">
              Rotación & Orientación
            </span>
          </div>
        {isRotated && (
          <button
            onClick={handleResetRotation}
            className="text-[10px] text-ink-tertiary hover:text-action flex items-center gap-1 transition-colors cursor-pointer"
            title="Restablecer a orientación original del archivo (0°, 0°, 0°)"
          >
            <RefreshCw className="w-3 h-3" />
            Restablecer
          </button>
        )}
        </div>

        <div className="space-y-2">
          {axes.map(({ axis, label }) => {
            const val = modelRotation[axis];
            return (
              <div
                key={axis}
                className="p-2 rounded-xs bg-surface-low border border-hairline flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-ink-primary font-mono uppercase">
                    {label}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => handleRotate(axis, -90)}
                    className="px-2 py-0.5 text-[10px] font-mono h-8"
                    title={`Girar ${label} -90°`}
                  >
                    -90°
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => handleRotate(axis, 90)}
                    className="px-2 py-0.5 text-[10px] font-mono h-8"
                    title={`Girar ${label} +90°`}
                  >
                    +90°
                  </Button>

                  <NumberInput
                    value={val}
                    onChange={(nextVal) => handleSetRotationAxis(axis, nextVal)}
                    min={-360}
                    max={360}
                    step={15}
                    precision={1}
                    className="w-16 text-right font-mono text-[11px]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
