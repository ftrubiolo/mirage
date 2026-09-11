import React from 'react';
import { Ruler } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { NumberInput } from '../UI/NumberInput';

export const ScaleChecker: React.FC = () => {
  const modelStats = useModelStore((state) => state.modelStats);
  const unitScale = useModelStore((state) => state.unitScale);
  const unitType = useModelStore((state) => state.unitType);
  const setUnitScale = useModelStore((state) => state.setUnitScale);

  if (!modelStats) {
    return (
      <div className="p-4 rounded-xs bg-surface-lowest border border-hairline text-center text-xs text-ink-tertiary">
        Carga un modelo .glb para auditar su escala real y cotas físicas.
      </div>
    );
  }

  const { dimensions } = modelStats;

  const unitOptions = [
    { type: 'm', label: 'Metros (m)', scale: 1.0, hint: '1 unidad = 1 m' },
    { type: 'cm', label: 'Centímetros (cm)', scale: 0.01, hint: '1 unidad = 1 cm' },
    { type: 'mm', label: 'Milímetros (mm)', scale: 0.001, hint: '1 unidad = 1 mm' },
    { type: 'in', label: 'Pulgadas (in)', scale: 0.0254, hint: '1 unidad = 1 in' }
  ] as const;

  const dimensionBoxes = [
    { label: 'Ancho (X)', val: dimensions.width },
    { label: 'Alto (Y)', val: dimensions.height },
    { label: 'Fondo (Z)', val: dimensions.depth }
  ];

  return (
    <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
          <Ruler className="w-4 h-4 text-action" />
          Metrología & Escala Física
        </h4>
      </div>

      {/* Unit Selector Selector Pills */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-ink-secondary uppercase tracking-wider font-semibold block font-primary">
          Unidad de Exportación del Modelo
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {unitOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setUnitScale(opt.scale, opt.type)}
              className={`py-1.5 px-2 rounded-xs text-[11px] font-medium border transition-colors text-center ${
                unitType === opt.type
                  ? 'bg-action text-white border-action font-semibold shadow-xs'
                  : 'bg-surface-low border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-container'
              }`}
              title={opt.hint}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dimensions Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {dimensionBoxes.map(({ label, val }) => (
          <div key={label} className="p-2 rounded-xs bg-surface-low border border-hairline flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider block border-b border-hairline pb-1 font-primary">
              {label}
            </span>
            <div className="flex flex-col gap-0.5 font-mono tabular-nums text-xs font-medium text-ink-primary">
              <span>{Number(val.toFixed(3))} m</span>
              <span>{Number((val * 100).toFixed(2))} cm</span>
              <span>{Number((val * 1000).toFixed(1))} mm</span>
            </div>
          </div>
        ))}
      </div>

      {/* Custom scale multiplier */}
      <div className="flex items-center justify-between text-[11px] text-ink-secondary pt-2 border-t border-hairline">
        <span>Multiplicador de escala:</span>
        <NumberInput
          value={unitScale}
          onChange={(val) => setUnitScale(val, 'custom')}
          min={0.0001}
          max={1000}
          step={0.001}
          precision={4}
          className="w-20"
        />
      </div>
    </div>
  );
};
