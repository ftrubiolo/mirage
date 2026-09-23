import React from 'react';
import { Moon, Sun, Image, Check } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

interface CanvasThemeWidgetProps {
  id?: string;
  mode?: 'full' | 'compressed';
  orientation?: 'horizontal' | 'vertical';
}

export const CanvasThemeWidget: React.FC<CanvasThemeWidgetProps> = ({
  id = 'theme-toggle',
  mode: propMode,
  orientation: propOrientation
}) => {
  const storeMode = useViewportStore((s) => s.getCanvasWidgetMode(id));
  const storeOrientation = useViewportStore((s) => s.getCanvasWidgetOrientation(id));
  const mode = propMode ?? storeMode;
  const orientation = propOrientation ?? storeOrientation;

  const viewportTheme = useViewportStore((s) => s.viewportTheme);
  const setViewportTheme = useViewportStore((s) => s.setViewportTheme);
  const showEnvironmentBackground = useViewportStore((s) => s.showEnvironmentBackground);
  const toggleEnvironmentBackground = useViewportStore((s) => s.toggleEnvironmentBackground);

  const isCompressed = mode === 'compressed';
  const isVertical = isCompressed && orientation === 'vertical';

  if (isCompressed) {
    return (
      <div
        className={`flex ${isVertical ? 'flex-col w-full' : 'flex-row'} p-0 gap-0 text-xs antialiased`}
        data-testid="canvas-theme-compressed"
        data-orientation={orientation}
      >
        <button
          type="button"
          onClick={() => setViewportTheme('dark')}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            viewportTheme === 'dark'
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title="Modo Oscuro de taller (#111110)"
          aria-label="Modo Oscuro"
        >
          <Moon size={20} className={viewportTheme === 'dark' ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>

        <button
          type="button"
          onClick={() => setViewportTheme('light')}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            viewportTheme === 'light'
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title="Modo Claro de galería (#f7f5f2)"
          aria-label="Modo Claro"
        >
          <Sun size={20} className={viewportTheme === 'light' ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>
      </div>
    );
  }

  // Full detailed mode
  return (
    <div className="w-64 space-y-3 text-xs antialiased" data-testid="canvas-theme-full">
      {/* Theme Cards */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setViewportTheme('dark')}
          className={`p-2.5 rounded-xs border text-left transition-colors cursor-pointer relative ${
            viewportTheme === 'dark'
              ? 'bg-action/15 border-action text-action ring-1 ring-action/40'
              : 'bg-surface-container/40 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-5 h-5 rounded-full bg-[#111110] border border-white/20 shadow-xs flex items-center justify-center">
              <Moon size={11} className="text-white" />
            </div>
            {viewportTheme === 'dark' && <Check size={13} className="text-action" />}
          </div>
          <div className="font-medium text-[11px] leading-tight">Oscuro Taller</div>
          <div className="text-[9px] opacity-75 font-mono">#111110</div>
        </button>

        <button
          type="button"
          onClick={() => setViewportTheme('light')}
          className={`p-2.5 rounded-xs border text-left transition-colors cursor-pointer relative ${
            viewportTheme === 'light'
              ? 'bg-action/15 border-action text-action ring-1 ring-action/40'
              : 'bg-surface-container/40 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-5 h-5 rounded-full bg-[#f7f5f2] border border-black/20 shadow-xs flex items-center justify-center">
              <Sun size={11} className="text-amber-600" />
            </div>
            {viewportTheme === 'light' && <Check size={13} className="text-action" />}
          </div>
          <div className="font-medium text-[11px] leading-tight">Claro Suave</div>
          <div className="text-[9px] opacity-75 font-mono">#f7f5f2</div>
        </button>
      </div>

      {/* Sky Background Toggle */}
      <div className="p-2 rounded-xs bg-surface-container/30 border border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image size={14} className="text-ink-secondary" />
          <div className="text-[11px] text-ink-primary font-medium">Fondo Cielo HDRI</div>
        </div>
        <button
          type="button"
          onClick={toggleEnvironmentBackground}
          className={`px-2 py-0.5 text-[10px] font-mono rounded-xs border transition-colors cursor-pointer ${
            showEnvironmentBackground
              ? 'bg-action text-white border-action font-semibold'
              : 'bg-surface-container border-hairline text-ink-tertiary hover:text-ink-primary'
          }`}
        >
          {showEnvironmentBackground ? 'ACTIVO' : 'SÓLIDO'}
        </button>
      </div>
    </div>
  );
};
