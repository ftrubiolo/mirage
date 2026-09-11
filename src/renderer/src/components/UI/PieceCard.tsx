import React from 'react';
import { Box, ArrowUpRight } from 'lucide-react';
import { Spinner } from './Spinner';

export interface PieceCardProps {
  title: string;
  slug: string;
  posterUrl?: string | null;
  isLoading?: boolean;
  dimensions?: { width: number; height: number; depth: number } | null;
  stats?: { triangleCount: number; [key: string]: any } | null;
  mapsCount?: number;
  isActive?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onLoadPiece?: (e: React.MouseEvent) => void;
  isPieceLoading?: boolean;
  loadButtonLabel?: string;
  topActions?: React.ReactNode;
  className?: string;
}

export const PieceCard: React.FC<PieceCardProps> = ({
  title,
  slug,
  posterUrl,
  isLoading = false,
  isActive = false,
  dimensions,
  stats,
  mapsCount,
  compact = false,
  onClick,
  onLoadPiece,
  isPieceLoading = false,
  loadButtonLabel = 'Abrir en Mesa 3D',
  topActions,
  className = ''
}) => {
  return (
    <div
      onClick={onClick}
      className={`group bg-surface-lowest border rounded-xs overflow-hidden shadow-xs cursor-pointer flex flex-col transition-all hover:bg-surface-low/40 ${
        isActive
          ? 'border-action ring-1 ring-action/30'
          : 'border-hairline hover:border-hairline-strong'
      } ${className}`}
    >
      {/* 4:3 Aspect Preview */}
      <div className="relative aspect-4/3 bg-canvas-stone flex items-center justify-center overflow-hidden border-b border-hairline">
        {isLoading ? (
          <div className="absolute inset-0 bg-surface-lowest/90 flex flex-col items-center justify-center gap-2 z-10">
            <Spinner size="md" label="Cargando..." />
          </div>
        ) : posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105 select-none"
          />
        ) : (
          <Box className="w-8 h-8 text-ink-tertiary" />
        )}

        {/* Top Actions Overlay (e.g. Open Folder, Delete) */}
        {topActions && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            {topActions}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className={`flex-1 flex flex-col justify-between ${compact ? 'p-3 space-y-2' : 'p-3.5 space-y-3'}`}>
        <div>
          {isActive && (
            <div className="text-[10px] font-primary font-semibold text-action uppercase tracking-wider mb-1">
              En Mesa de Trabajo
            </div>
          )}
          <span className="text-[10px] font-mono text-ink-tertiary block truncate">
            {slug}
          </span>
          <h4
            className={`font-primary font-bold text-ink-primary line-clamp-1 group-hover:text-action transition-colors ${
              compact ? 'text-xs' : 'text-sm'
            }`}
          >
            {title}
          </h4>
        </div>

        {/* Compact Footer (Used in HubView) */}
        {compact && (
          <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px] font-mono tabular-nums text-ink-secondary">
            <span>{stats?.triangleCount ? `${stats.triangleCount.toLocaleString()} polys` : '—'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-ink-tertiary group-hover:text-action transition-colors" />
          </div>
        )}

        {/* Full Details & Action Button (Used in LibraryView) */}
        {!compact && (
          <>
            <div className="pt-2 border-t border-hairline space-y-1 text-[11px] font-mono tabular-nums text-ink-secondary">
              {dimensions && (
                <div className="flex items-center justify-between">
                  <span>Dim:</span>
                  <span className="text-ink-primary font-medium">
                    {dimensions.width}×{dimensions.height}×{dimensions.depth}m
                  </span>
                </div>
              )}

              {mapsCount !== undefined && (
                <div className="flex items-center justify-between">
                  <span>Mapas PBR:</span>
                  <span className="text-ink-primary font-medium">{mapsCount} cargados</span>
                </div>
              )}

              {stats && (
                <div className="flex items-center justify-between">
                  <span>Polígonos:</span>
                  <span className="text-ink-primary font-medium">
                    {stats.triangleCount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {onLoadPiece && (
              <button
                type="button"
                onClick={onLoadPiece}
                disabled={isPieceLoading}
                className="w-full mt-2 py-1.5 bg-surface-container hover:bg-action hover:text-white text-ink-primary border border-hairline text-xs font-primary font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isPieceLoading ? (
                  <>
                    <Spinner size="xs" />
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{loadButtonLabel}</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
