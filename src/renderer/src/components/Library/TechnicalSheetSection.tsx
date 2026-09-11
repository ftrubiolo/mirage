import React from 'react';
import { Box } from 'lucide-react';
import { LibraryEntry } from '../../types/library';
import { ResizeHandle } from '../UI/ResizeHandle';
import { StatusBadge, StatusVariant } from '../UI/StatusBadge';

export interface TechnicalSheetSectionProps {
  currentEntry: LibraryEntry;
  isPieceInWorkbench: boolean;
  rawVariantsCount: number;
  sidebarWidth: number;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleReset: () => void;
}

export const TechnicalSheetSection: React.FC<TechnicalSheetSectionProps> = ({
  currentEntry,
  isPieceInWorkbench,
  rawVariantsCount,
  sidebarWidth,
  isDragging,
  handleMouseDown,
  handleReset
}) => {
  // Exhaustive over LibraryEntry['status'], so adding a status without a
  // matching palette tier becomes a compile error.
  const statusVariant: StatusVariant = ((): StatusVariant => {
    switch (currentEntry.status) {
      case 'active':
        return 'active';
      case 'workshop':
        return 'workshop';
      case 'pending':
        return 'pending';
      case 'madeToOrder':
        return 'madeToOrder';
      case 'dispatched':
        return 'dispatched';
      case 'neutral':
      default:
        return 'neutral';
    }
  })();

  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className={`h-full p-6 overflow-y-auto space-y-5 bg-surface-lowest/40 border-r border-hairline shrink-0 min-h-0 relative ${
        isDragging ? 'select-none' : ''
      }`}
    >
      <ResizeHandle
        position="right"
        isDragging={isDragging}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleReset}
        title="Arrastra para redimensionar ficha técnica (Doble clic para restablecer)"
      />
      {/* Main Piece Render Thumbnail */}
      <div className="aspect-4/3 bg-canvas-stone/40 border border-hairline rounded-xs flex items-center justify-center overflow-hidden relative group">
        {currentEntry.posterUrl ? (
          <img
            src={currentEntry.posterUrl}
            alt={currentEntry.title}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-ink-tertiary gap-1">
            <Box className="w-12 h-12 stroke-[1.25]" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Sin póster renderizado</span>
          </div>
        )}

        {isPieceInWorkbench && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-action/90 text-white rounded-xs text-[10px] font-primary font-semibold uppercase tracking-wider shadow-xs">
            En Mesa 3D
          </div>
        )}
      </div>

      {/* Piece Overview Details */}
      <div className="space-y-4">
        <div>
          <span className="text-[10px] font-primary font-semibold uppercase tracking-wider text-ink-tertiary block">
            Ficha Técnica
          </span>
          <h2 className="font-primary font-bold text-lg text-ink-primary">
            {currentEntry.title}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge variant={statusVariant}>
              {currentEntry.status || 'Workshop'}
            </StatusBadge>
            <span className="text-[11px] font-mono text-ink-secondary capitalize">
              {currentEntry.category || 'Mobiliario'}
            </span>
          </div>
        </div>

        {/* Metrology and 3D Model Specs */}
        <div className="p-3.5 bg-surface-low border border-hairline rounded-xs space-y-2.5 text-xs font-mono tabular-nums">
          <div className="flex items-center justify-between text-ink-secondary">
            <span>Archivo 3D:</span>
            <span className="text-ink-primary font-medium truncate max-w-[180px]">
              {currentEntry.modelFileName || (currentEntry.modelFilePath ? currentEntry.modelFilePath.split(/[/\\]/).pop() : 'Ninguno')}
            </span>
          </div>

          {currentEntry.modelFileSize ? (
            <div className="flex items-center justify-between text-ink-secondary">
              <span>Peso Binario:</span>
              <span className="text-ink-primary font-medium">
                {(currentEntry.modelFileSize / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          ) : null}

          {currentEntry.dimensions ? (
            <div className="flex items-center justify-between text-ink-secondary">
              <span>Dimensiones:</span>
              <span className="text-ink-primary font-bold">
                {currentEntry.dimensions.width} × {currentEntry.dimensions.height} × {currentEntry.dimensions.depth} m
              </span>
            </div>
          ) : null}

          {currentEntry.stats && (
            <>
              <div className="flex items-center justify-between text-ink-secondary">
                <span>Polígonos (Triángulos):</span>
                <span className="text-ink-primary font-medium">
                  {currentEntry.stats.triangleCount.toLocaleString()} △
                </span>
              </div>
              <div className="flex items-center justify-between text-ink-secondary">
                <span>Vértices:</span>
                <span className="text-ink-primary font-medium">
                  {currentEntry.stats.vertexCount.toLocaleString()} vtx
                </span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between text-ink-secondary border-t border-hairline pt-2">
            <span>Perfiles Registrados:</span>
            <span className="text-action font-bold">
              {rawVariantsCount} acabados
            </span>
          </div>
        </div>

        {/* Description / Notes */}
        {currentEntry.description ? (
          <div className="space-y-1">
            <span className="text-[10px] font-primary font-semibold uppercase tracking-wider text-ink-tertiary block">
              Notas de Acabado / Especificación
            </span>
            <p className="text-xs font-body text-ink-secondary leading-relaxed bg-surface-low p-3 rounded-xs border border-hairline">
              {currentEntry.description}
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  );
};
