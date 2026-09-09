import React from 'react';
import { ArrowLeft, ArrowUpRight, FolderOpen } from 'lucide-react';

export interface EntryDetailHeaderProps {
  title: string;
  slug: string;
  isLoading: boolean;
  onBack: () => void;
  onOpenFolder: () => void;
  onOpenIn3D: () => void;
}

export const EntryDetailHeader: React.FC<EntryDetailHeaderProps> = ({
  title,
  slug,
  isLoading,
  onBack,
  onOpenFolder,
  onOpenIn3D
}) => {
  return (
    <div className="border-b border-hairline bg-surface-low px-6 py-3 shrink-0 flex flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-surface-container text-ink-secondary hover:text-ink-primary rounded-xs border border-hairline transition-colors flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
          title="Volver a la vista general de la biblioteca"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Biblioteca</span>
        </button>

        <div className="h-4 w-px bg-hairline" />

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary truncate">
            {title}
          </h1>
          <span className="font-mono text-[11px] text-ink-secondary bg-surface-container px-2 py-0.5 rounded-xs border border-hairline hidden md:inline truncate">
            {slug}
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenFolder}
          title="Abrir carpeta en el explorador"
          className="px-2.5 py-1.5 border border-hairline hover:bg-surface-container rounded-xs text-xs font-medium text-ink-secondary hover:text-ink-primary transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-action" />
          <span className="hidden sm:inline">Carpeta</span>
        </button>

        <button
          onClick={onOpenIn3D}
          disabled={isLoading}
          className="px-3.5 py-1.5 bg-action hover:bg-action-hover text-white rounded-xs shadow-xs text-xs font-primary font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5" />
          )}
          <span>Abrir en Taller 3D</span>
        </button>
      </div>
    </div>
  );
};
