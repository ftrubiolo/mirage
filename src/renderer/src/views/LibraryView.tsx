import React, { useState, useEffect } from 'react';
import {
  Plus,
  Grid,
  List,
  FolderOpen,
  Trash2,
  Box,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { LibraryEntry } from '../types/library';
import { loadEntryIntoWorkbench, resetWorkbench } from '../utils/libraryBridge';
import { useAppStore } from '../store/appStore';
import { NewPieceModal } from '../components/Library/NewPieceModal';
import {
  Button,
  IconButton,
  SegmentedControl,
  EmptyState,
  PieceCard,
  Spinner,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ConfirmModal
} from '../components/UI';

export const LibraryView: React.FC = () => {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<LibraryEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const { libraryPath, setLibraryPath, activeEntrySlug, setView, setSelectedEntryForDetail } =
    useAppStore();

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
          <IconButton
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            isLoading={isLoading}
            variant="outline"
            size="sm"
            title="Recargar biblioteca del disco"
            onClick={fetchLibrary}
          />

          {/* Open System Folder */}
          <Button
            variant="secondary"
            size="sm"
            icon={<FolderOpen className="w-3.5 h-3.5 text-action" />}
            onClick={handleOpenFolder}
            title="Abrir carpeta física en el explorador de archivos"
          >
            <span className="hidden sm:inline">Abrir en Explorador</span>
          </Button>

          {/* View Mode Toggle */}
          <SegmentedControl
            size="xs"
            variant="surface"
            value={viewMode}
            onChange={(val) => setViewMode(val as 'grid' | 'table')}
            options={[
              { value: 'grid', icon: <Grid className="w-3.5 h-3.5" />, title: 'Vista en Cuadrícula' },
              { value: 'table', icon: <List className="w-3.5 h-3.5" />, title: 'Vista en Tabla Técnica' }
            ]}
          />

          {/* + Nueva Pieza */}
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsNewModalOpen(true)}
          >
            Nueva Pieza
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-ink-secondary gap-2">
            <Spinner size="lg" label="Leyendo catálogo técnico en disco..." />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Box className="w-8 h-8 stroke-[1.25] text-action" />}
            title="Biblioteca Vacía"
            description="Aún no has registrado ninguna pieza en la biblioteca técnica de Sera. Las piezas guardadas se organizan en carpetas individuales con sus modelos, texturas y configuración técnica."
            action={
              <Button
                variant="primary"
                size="md"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsNewModalOpen(true)}
              >
                Crear Primera Pieza
              </Button>
            }
          />
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
            {entries.map((entry) => {
              const isActive = activeEntrySlug === entry.slug;
              const mapsCount = Object.keys(entry.maps || {}).length;

              return (
                <PieceCard
                  key={entry.slug}
                  title={entry.title}
                  slug={entry.slug}
                  posterUrl={entry.posterUrl}
                  dimensions={entry.dimensions}
                  mapsCount={mapsCount}
                  stats={entry.stats}
                  isActive={isActive}
                  isLoading={loadingSlug === entry.slug}
                  isPieceLoading={loadingSlug === entry.slug}
                  onClick={() => handleOpenDetail(entry)}
                  onLoadPiece={(e) => handleLoadPiece(entry, e)}
                  topActions={
                    <>
                      <IconButton
                        icon={<FolderOpen className="w-3.5 h-3.5 text-action" />}
                        variant="outline"
                        size="xs"
                        title="Abrir carpeta de esta pieza en el sistema"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (libraryPath) {
                            window.electronAPI.openPathInExplorer(`${libraryPath}/${entry.slug}`);
                          }
                        }}
                      />
                      <IconButton
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        variant="destructive"
                        size="xs"
                        title="Eliminar pieza"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteCandidate(entry);
                        }}
                      />
                    </>
                  }
                />
              );
            })}
          </div>
        ) : (
          /* Table View */
          <Table>
            <TableHeader>
              <TableRow clickable={false}>
                <TableHead className="w-16">Vista</TableHead>
                <TableHead>Pieza &amp; Slug</TableHead>
                <TableHead>Perfiles</TableHead>
                <TableHead>Dimensiones</TableHead>
                <TableHead>Mapas</TableHead>
                <TableHead>Polígonos</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const isActive = activeEntrySlug === entry.slug;
                const mapsCount = Object.keys(entry.maps || {}).length;
                const variantsCount = entry.variants?.length || 1;

                return (
                  <TableRow
                    key={entry.slug}
                    selected={isActive}
                    onClick={() => handleOpenDetail(entry)}
                  >
                    {/* Thumb */}
                    <TableCell className="py-2">
                      <div className="w-10 h-10 bg-canvas-stone rounded-xs border border-hairline flex items-center justify-center overflow-hidden">
                        {entry.posterUrl ? (
                          <img
                            src={entry.posterUrl}
                            alt={entry.title}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Box className="w-4 h-4 text-ink-tertiary" />
                        )}
                      </div>
                    </TableCell>

                    {/* Name / Slug */}
                    <TableCell>
                      <div className="font-primary font-semibold text-ink-primary">
                        {entry.title}
                      </div>
                      <div className="font-mono text-[11px] text-ink-secondary">
                        {entry.slug}
                      </div>
                    </TableCell>

                    {/* Variants */}
                    <TableCell mono>
                      <Badge variant="neutral" size="xs">
                        {variantsCount} {variantsCount === 1 ? 'perfil' : 'perfiles'}
                      </Badge>
                    </TableCell>

                    {/* Dimensions */}
                    <TableCell mono>
                      {entry.dimensions
                        ? `${entry.dimensions.width}×${entry.dimensions.height}×${entry.dimensions.depth}m`
                        : '—'}
                    </TableCell>

                    {/* Maps */}
                    <TableCell mono>{mapsCount} mapas</TableCell>

                    {/* Polygons */}
                    <TableCell mono>
                      {entry.stats ? entry.stats.triangleCount.toLocaleString() : '—'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <IconButton
                          icon={<FolderOpen className="w-3.5 h-3.5 text-action" />}
                          variant="outline"
                          size="xs"
                          title="Abrir carpeta física en el sistema"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (libraryPath) {
                              window.electronAPI.openPathInExplorer(
                                `${libraryPath}/${entry.slug}`
                              );
                            }
                          }}
                        />
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={(e) => handleLoadPiece(entry, e)}
                          isLoading={loadingSlug === entry.slug}
                          iconRight={<ArrowUpRight className="w-3 h-3" />}
                        >
                          Abrir
                        </Button>
                        <IconButton
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          variant="destructive"
                          size="xs"
                          title="Eliminar pieza"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteCandidate(entry);
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* New Piece Modal */}
      <NewPieceModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={() => fetchLibrary()}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteCandidate)}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar pieza de la biblioteca?"
        isLoading={isDeleting}
        confirmText="Confirmar Eliminación"
        message={
          deleteCandidate ? (
            <p>
              Esta acción eliminará el directorio{' '}
              <span className="font-mono text-ink-primary font-semibold">
                library/{deleteCandidate.slug}
              </span>{' '}
              y todos sus archivos asociados (modelo, mapas y settings).
            </p>
          ) : null
        }
      />
    </div>
  );
};
