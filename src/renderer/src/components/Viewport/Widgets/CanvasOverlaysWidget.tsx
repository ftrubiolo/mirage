import React from 'react';
import { Grid, Ruler, Box, SquareDashedBottom, RotateCcw } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

interface CanvasOverlaysWidgetProps {
  id?: string;
  mode?: 'full' | 'compressed';
  orientation?: 'horizontal' | 'vertical';
}

export const CanvasOverlaysWidget: React.FC<CanvasOverlaysWidgetProps> = ({
  id = 'overlays',
  mode: propMode,
  orientation: propOrientation
}) => {
  const storeMode = useViewportStore((s) => s.getCanvasWidgetMode(id));
  const storeOrientation = useViewportStore((s) => s.getCanvasWidgetOrientation(id));
  const mode = propMode ?? storeMode;
  const orientation = propOrientation ?? storeOrientation;

  const showGrid = useViewportStore((s) => s.showGrid);
  const toggleGrid = useViewportStore((s) => s.toggleGrid);
  const showDimensions = useViewportStore((s) => s.showDimensions);
  const toggleDimensions = useViewportStore((s) => s.toggleDimensions);
  const showContactShadows = useViewportStore((s) => s.showContactShadows);
  const toggleContactShadows = useViewportStore((s) => s.toggleContactShadows);
  const showWireframe = useViewportStore((s) => s.showWireframe);
  const toggleWireframe = useViewportStore((s) => s.toggleWireframe);
  const contactShadowOpacity = useViewportStore((s) => s.contactShadowOpacity);
  const setContactShadowOpacity = useViewportStore((s) => s.setContactShadowOpacity);

  const isCompressed = mode === 'compressed';
  const isVertical = isCompressed && orientation === 'vertical';

  const handleResetDefaults = () => {
    useViewportStore.setState({
      showGrid: true,
      showDimensions: false,
      showContactShadows: true,
      showWireframe: false,
      contactShadowOpacity: 0.4
    });
  };

  if (isCompressed) {
    return (
      <div
        className={`flex ${isVertical ? 'flex-col w-full' : 'flex-row'} p-0 gap-0 text-xs antialiased`}
        data-testid="canvas-overlays-compressed"
        data-orientation={orientation}
      >
        <button
          type="button"
          onClick={toggleGrid}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            showGrid
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title="Grilla de taller (G)"
          aria-label="Grilla de taller"
        >
          <Grid size={20} className={showGrid ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>

        <button
          type="button"
          onClick={toggleDimensions}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            showDimensions
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title="Cotas y dimensiones 3D"
          aria-label="Cotas y dimensiones 3D"
        >
          <Ruler size={20} className={showDimensions ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>

        <button
          type="button"
          onClick={toggleContactShadows}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            showContactShadows
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title="Sombras de contacto"
          aria-label="Sombras de contacto"
        >
          <Box size={20} className={showContactShadows ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>

        <button
          type="button"
          onClick={toggleWireframe}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            showWireframe
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title="Malla Wireframe"
          aria-label="Malla Wireframe"
        >
          <SquareDashedBottom size={20} className={showWireframe ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>
      </div>
    );
  }

  // Full detailed mode
  return (
    <div className="w-64 space-y-3 text-xs antialiased" data-testid="canvas-overlays-full">
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={toggleGrid}
          className={`flex items-center gap-2 p-2 rounded-xs border transition-colors text-left cursor-pointer ${
            showGrid
              ? 'bg-action/15 border-action/40 text-action'
              : 'bg-surface-container/40 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
          }`}
        >
          <Grid size={15} className="shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-[11px] leading-tight">Grilla</div>
            <div className="text-[9px] opacity-75 font-mono">Suelo métrico</div>
          </div>
        </button>

        <button
          type="button"
          onClick={toggleDimensions}
          className={`flex items-center gap-2 p-2 rounded-xs border transition-colors text-left cursor-pointer ${
            showDimensions
              ? 'bg-action/15 border-action/40 text-action'
              : 'bg-surface-container/40 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
          }`}
        >
          <Ruler size={15} className="shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-[11px] leading-tight">Cotas</div>
            <div className="text-[9px] opacity-75 font-mono">Largo × Ancho</div>
          </div>
        </button>

        <button
          type="button"
          onClick={toggleContactShadows}
          className={`flex items-center gap-2 p-2 rounded-xs border transition-colors text-left cursor-pointer ${
            showContactShadows
              ? 'bg-action/15 border-action/40 text-action'
              : 'bg-surface-container/40 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
          }`}
        >
          <Box size={15} className="shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-[11px] leading-tight">Sombras</div>
            <div className="text-[9px] opacity-75 font-mono">Contacto suelo</div>
          </div>
        </button>

        <button
          type="button"
          onClick={toggleWireframe}
          className={`flex items-center gap-2 p-2 rounded-xs border transition-colors text-left cursor-pointer ${
            showWireframe
              ? 'bg-action/15 border-action/40 text-action'
              : 'bg-surface-container/40 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
          }`}
        >
          <SquareDashedBottom size={15} className="shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-[11px] leading-tight">Wireframe</div>
            <div className="text-[9px] opacity-75 font-mono">Malla poligonal</div>
          </div>
        </button>
      </div>

      {/* Shadow Opacity Slider */}
      <div className="p-2 rounded-xs bg-surface-container/30 border border-hairline space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-ink-secondary font-medium">Opacidad de Sombras</span>
          <span className="font-mono text-ink-primary font-semibold">{Math.round(contactShadowOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={contactShadowOpacity}
          onChange={(e) => setContactShadowOpacity(parseFloat(e.target.value))}
          disabled={!showContactShadows}
          className="w-full h-1 bg-surface-high rounded-full appearance-none cursor-pointer accent-action disabled:opacity-40"
        />
      </div>

      {/* Quick Reset Defaults */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-ink-tertiary hover:text-ink-primary transition-colors cursor-pointer rounded-xs hover:bg-surface-high"
          title="Restablecer guías y sombras a valores predeterminados"
        >
          <RotateCcw size={11} />
          <span>Restablecer guías</span>
        </button>
      </div>
    </div>
  );
};
