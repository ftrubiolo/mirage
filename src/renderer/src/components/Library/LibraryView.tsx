import React, { useState, useEffect } from 'react';
import {
  Plus,
  Grid,
  List,
  FolderOpen,
  Trash2,
  Box,
  ArrowUpRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { LibraryEntry } from '../../types/library';
import { loadEntryIntoWorkbench, resetWorkbench } from '../../utils/libraryBridge';
import { useAppStore } from '../../store/appStore';
import { NewPieceModal } from './NewPieceModal';

export const LibraryView: React.FC = () => {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<LibraryEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const { libraryPath, setLibraryPath, activeEntrySlug, setView, setSelectedEntryForDetail } = useAppStore();

  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const basePath = await window.electronAPI.getLibraryPath();
        setLibraryPath(basePath);

        const list = await window.electronAPI.listLibraryEntries();
        setEntries(list || []);
      }
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleOpenFolder = () => {
    if (window.electronAPI && libraryPath) {
      window.electronAPI.openPathInExplorer(libraryPath);
    }
  };

  const handleOpenDetail = (entry: LibraryEntry) => {
    setSelectedEntryForDetail(entry);
    setView('entryDetail');
  };

  const handleLoadPiece = async (entry: LibraryEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setLoadingSlug(entry.slug);
      await loadEntryIntoWorkbench(entry);
    } finally {
      setLoadingSlug(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setIsDeleting(true);
      await window.electronAPI.deleteLibraryEntry(deleteCandidate.slug);
      if (activeEntrySlug === deleteCandidate.slug) {
        resetWorkbench();
      }
      setDeleteCandidate(null);
      await fetchLibrary();
    } catch (err) {
      console.error('Error deleting entry:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas text-ink-primary overflow-hidden select-none">
      {/* View Header / Control Bar */}
      <div className="border-b border-hairline bg-surface-low px-6 py-3 shrink-0 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary">
            Biblioteca de Piezas
          </h1>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={fetchLibrary}
            disabled={isLoading}
            title="Recargar biblioteca del disco"
            className="p-1.5 border border-hairline hover:bg-surface-container rounded-xs text-ink-secondary hover:text-ink-primary transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Open System Folder */}
          <button
            onClick={handleOpenFolder}
            title="Abrir carpeta física en el explorador de archivos"
            className="px-2.5 py-1.5 border border-hairline hover:bg-surface-container rounded-xs text-xs font-medium text-ink-secondary hover:text-ink-primary transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-action" />
            <span className="hidden sm:inline">Abrir en Explorador</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface-container/60 border border-hairline p-0.5 rounded-xs">
            <button
              onClick={() => setViewMode('grid')}
              title="Vista en Cuadrícula"
              className={`p-1 rounded-xs transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-surface-lowest text-action shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Vista en Tabla Técnica"
              className={`p-1 rounded-xs transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-surface-lowest text-action shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* + Nueva Pieza */}
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-3 py-1.5 bg-action hover:bg-action-hover text-white rounded-xs shadow-xs text-xs font-primary font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Pieza</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-ink-secondary gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-action" />
            <span className="text-xs font-medium">Leyendo catálogo técnico en disco...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="max-w-md mx-auto my-16 p-8 border border-dashed border-hairline-strong bg-surface-lowest text-center rounded-xs space-y-4">
            <div className="w-12 h-12 mx-auto bg-surface-container flex items-center justify-center rounded-xs text-action border border-hairline">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-primary font-bold text-sm uppercase tracking-wide text-ink-primary">
                Biblioteca Vacía
              </h3>
              <p className="text-xs text-ink-secondary font-body mt-1 leading-relaxed">
                Aún no has registrado ninguna pieza en la biblioteca técnica de Sera. Las piezas guardadas se organizan en carpetas individuales con sus modelos, texturas y configuración técnica.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="px-4 py-2 bg-action hover:bg-action-hover text-white text-xs font-primary font-semibold uppercase tracking-wider rounded-xs shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primera Pieza</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
            {entries.map((entry) => {
              const isActive = activeEntrySlug === entry.slug;
              const mapsCount = Object.keys(entry.maps || {}).length;
              const variantsCount = entry.variants?.length || 1;

              return (
                <div
                  key={entry.slug}
                  onClick={() => handleOpenDetail(entry)}
                  className={`bg-surface-lowest border rounded-xs flex flex-col overflow-hidden transition-all shadow-xs group cursor-pointer hover:shadow-md ${
                    isActive
                      ? 'border-action ring-1 ring-action/50'
                      : 'border-hairline hover:border-action/60'
                  }`}
                >
                  {/* Thumbnail / Poster Area */}
                  <div className="relative aspect-4/3 bg-canvas-stone/40 border-b border-hairline flex items-center justify-center overflow-hidden">
                    {loadingSlug === entry.slug ? (
                      <div className="absolute inset-0 bg-surface-lowest/90 flex flex-col items-center justify-center gap-2 z-10">
                        <div className="w-5 h-5 rounded-full border-2 border-action border-t-transparent animate-spin" />
                        <span className="text-[10px] font-mono font-semibold text-action uppercase tracking-wider">Cargando...</span>
                      </div>
                    ) : entry.posterUrl ? (
                      <img
                        src={entry.posterUrl}
                        alt={entry.title}
                        className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-ink-tertiary gap-1">
                        <Box className="w-10 h-10 stroke-[1.25]" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">Sin render</span>
                      </div>
                    )}

                    {/* Top Badges & Actions */}
                    <div className="absolute top-2 left-2">
                      <span className="px-1.5 py-0.5 bg-surface-lowest/90 border border-hairline rounded-xs text-[10px] font-mono font-medium text-ink-secondary">
                        {variantsCount} {variantsCount === 1 ? 'perfil' : 'perfiles'}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (libraryPath) {
                            window.electronAPI.openPathInExplorer(`${libraryPath}/${entry.slug}`);
                          }
                        }}
                        title="Abrir carpeta de esta pieza en el sistema"
                        className="p-1.5 bg-surface-lowest/90 hover:bg-surface-container text-ink-secondary hover:text-ink-primary border border-hairline rounded-xs transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-action" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteCandidate(entry);
                        }}
                        title="Eliminar pieza"
                        className="p-1.5 bg-surface-lowest/90 hover:bg-rose-600 hover:text-white text-ink-tertiary border border-hairline rounded-xs transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {isActive && (
                        <div className="text-[10px] font-primary font-semibold text-action uppercase tracking-wider mb-1">
                          En Mesa de Trabajo
                        </div>
                      )}
                      <h3 className="font-primary font-bold text-sm text-ink-primary line-clamp-1 group-hover:text-action transition-colors">
                        {entry.title}
                      </h3>
                      <p className="font-mono text-[11px] text-ink-secondary truncate mt-0.5">
                        {entry.slug}
                      </p>
                    </div>

                    {/* Metrology details */}
                    <div className="pt-2 border-t border-hairline space-y-1 text-[11px] font-mono tabular-nums text-ink-secondary">
                      {entry.dimensions ? (
                        <div className="flex items-center justify-between">
                          <span>Dim:</span>
                          <span className="text-ink-primary font-medium">
                            {entry.dimensions.width}×{entry.dimensions.height}×{entry.dimensions.depth}m
                          </span>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between">
                        <span>Mapas PBR:</span>
                        <span className="text-ink-primary font-medium">{mapsCount} cargados</span>
                      </div>

                      {entry.stats && (
                        <div className="flex items-center justify-between">
                          <span>Polígonos:</span>
                          <span className="text-ink-primary font-medium">
                            {entry.stats.triangleCount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={(e) => handleLoadPiece(entry, e)}
                      disabled={loadingSlug === entry.slug}
                      className="w-full mt-2 py-1.5 bg-surface-container hover:bg-action hover:text-white text-ink-primary border border-hairline text-xs font-primary font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      {loadingSlug === entry.slug ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-action border-t-transparent animate-spin" />
                          <span>Cargando...</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Abrir en Mesa 3D</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-surface-lowest border border-hairline rounded-xs shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-low border-b border-hairline text-[11px] font-primary font-semibold uppercase tracking-wider text-ink-secondary">
                  <th className="px-4 py-3 w-16">Vista</th>
                  <th className="px-4 py-3">Pieza & Slug</th>
                  <th className="px-4 py-3">Perfiles</th>
                  <th className="px-4 py-3">Dimensiones</th>
                  <th className="px-4 py-3">Mapas</th>
                  <th className="px-4 py-3">Polígonos</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline font-body">
                {entries.map((entry) => {
                  const isActive = activeEntrySlug === entry.slug;
                  const mapsCount = Object.keys(entry.maps || {}).length;
                  const variantsCount = entry.variants?.length || 1;

                  return (
                    <tr
                      key={entry.slug}
                      onClick={() => handleOpenDetail(entry)}
                      className={`hover:bg-surface-container/40 transition-colors cursor-pointer ${
                        isActive ? 'bg-action-subtle/30' : ''
                      }`}
                    >
                      {/* Thumb */}
                      <td className="px-4 py-2">
                        <div className="w-10 h-10 bg-canvas-stone rounded-xs border border-hairline flex items-center justify-center overflow-hidden">
                          {entry.posterUrl ? (
                            <img src={entry.posterUrl} alt={entry.title} className="w-full h-full object-contain" />
                          ) : (
                            <Box className="w-4 h-4 text-ink-tertiary" />
                          )}
                        </div>
                      </td>

                      {/* Name / Slug */}
                      <td className="px-4 py-3">
                        <div className="font-primary font-semibold text-ink-primary">{entry.title}</div>
                        <div className="font-mono text-[11px] text-ink-secondary">{entry.slug}</div>
                      </td>

                      {/* Variants */}
                      <td className="px-4 py-3 font-mono tabular-nums text-ink-primary">
                        <span className="px-1.5 py-0.5 bg-surface-container border border-hairline rounded-xs text-[10px]">
                          {variantsCount} {variantsCount === 1 ? 'perfil' : 'perfiles'}
                        </span>
                      </td>

                      {/* Dimensions */}
                      <td className="px-4 py-3 font-mono tabular-nums text-ink-primary">
                        {entry.dimensions
                          ? `${entry.dimensions.width}×${entry.dimensions.height}×${entry.dimensions.depth}m`
                          : '—'}
                      </td>

                      {/* Maps */}
                      <td className="px-4 py-3 font-mono tabular-nums text-ink-secondary">
                        {mapsCount} mapas
                      </td>

                      {/* Polygons */}
                      <td className="px-4 py-3 font-mono tabular-nums text-ink-primary">
                        {entry.stats ? entry.stats.triangleCount.toLocaleString() : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (libraryPath) {
                                window.electronAPI.openPathInExplorer(`${libraryPath}/${entry.slug}`);
                              }
                            }}
                            title="Abrir carpeta física en el sistema"
                            className="p-1 hover:bg-surface-container text-ink-secondary hover:text-ink-primary border border-hairline rounded-xs transition-colors cursor-pointer"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-action" />
                          </button>
                          <button
                            onClick={(e) => handleLoadPiece(entry, e)}
                            disabled={loadingSlug === entry.slug}
                            className="px-2.5 py-1 bg-surface-container hover:bg-action hover:text-white border border-hairline rounded-xs text-xs font-medium uppercase tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
                          >
                            {loadingSlug === entry.slug ? (
                              <>
                                <div className="w-3 h-3 rounded-full border-2 border-action border-t-transparent animate-spin" />
                                <span>Cargando...</span>
                              </>
                            ) : (
                              <>
                                <span>Abrir</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteCandidate(entry);
                            }}
                            className="p-1 hover:bg-rose-600 hover:text-white text-ink-tertiary border border-hairline rounded-xs transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Piece Modal */}
      <NewPieceModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={() => fetchLibrary()}
      />

      {/* Delete Confirmation Modal (Click outside closes) */}
      {deleteCandidate && (
        <div
          onClick={() => setDeleteCandidate(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full max-w-md p-5 space-y-4 cursor-default"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-700 rounded-xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-primary font-bold text-sm uppercase text-ink-primary">
                  ¿Eliminar pieza de la biblioteca?
                </h3>
                <p className="text-xs text-ink-secondary font-body mt-1 leading-relaxed">
                  Esta acción eliminará el directorio <span className="font-mono text-ink-primary font-semibold">library/{deleteCandidate.slug}</span> y todos sus archivos asociados (modelo, mapas y settings).
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
              <button
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 border border-hairline rounded-xs text-xs uppercase tracking-wider text-ink-secondary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xs text-xs font-primary font-semibold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
              >
                {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
