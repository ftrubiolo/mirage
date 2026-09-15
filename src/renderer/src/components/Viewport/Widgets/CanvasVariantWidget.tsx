import React from 'react';
import { Layers, Plus, Check } from 'lucide-react';
import { useVariantStore } from '../../../store/variantStore';

export const CanvasVariantWidget: React.FC = () => {
  const variants = useVariantStore((s) => s.variants);
  const activeVariantId = useVariantStore((s) => s.activeVariantId);
  const selectVariant = useVariantStore((s) => s.selectVariant);
  const createVariant = useVariantStore((s) => s.createVariant);

  const handleAddVariant = () => {
    const name = `Variante ${variants.length + 1}`;
    createVariant(name, true);
  };

  return (
    <div className="w-64 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase text-ink-tertiary font-bold tracking-wider">
          Variantes ({variants.length})
        </span>
        <button
          type="button"
          onClick={handleAddVariant}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-mono text-action hover:bg-action/10 border border-action/20 transition-colors"
        >
          <Plus size={10} />
          <span>Nueva</span>
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
        {variants.map((v) => {
          const isActive = v.id === activeVariantId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => selectVariant(v.id)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xs text-xs transition-colors border ${
                isActive
                  ? 'bg-action/10 border-action/40 text-action font-medium'
                  : 'bg-surface-container/40 border-hairline text-ink-primary hover:bg-surface-high/60'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Layers size={12} className={isActive ? 'text-action' : 'text-ink-tertiary'} />
                <span className="truncate">{v.name}</span>
                {v.isDefault && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded-xs bg-surface-high text-ink-tertiary border border-hairline">
                    Def
                  </span>
                )}
              </div>
              {isActive && <Check size={12} className="text-action shrink-0 ml-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
