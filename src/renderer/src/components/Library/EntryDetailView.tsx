import React, { useState, useEffect } from 'react';
import { Box, Layers, Plus } from 'lucide-react';
import { LibraryEntry, EntryVariant } from '../../types/library';
import { useAppStore } from '../../store/appStore';
import { loadEntryIntoWorkbench } from '../../utils/libraryBridge';
import { useResizableSidebar } from '../../hooks/useResizableSidebar';
import { ResizeDragOverlay } from '../UI/ResizeHandle';
import { EntryDetailHeader } from './EntryDetailHeader';
import { TechnicalSheetSection } from './TechnicalSheetSection';
import { VariantCardItem } from './VariantCardItem';
import {
  CreateVariantModal,
  RenameVariantModal,
  DeleteVariantModal
} from './EntryDetailModals';

export interface EntryDetailViewProps {
  entry: LibraryEntry | null;
  onBack: () => void;
}

export const EntryDetailView: React.FC<EntryDetailViewProps> = ({ entry, onBack }) => {
  const { libraryPath, activeEntrySlug } = useAppStore();
  const [currentEntry, setCurrentEntry] = useState<LibraryEntry | null>(entry);
  const [isLoading, setIsLoading] = useState(false);

  const {
    width: sidebarWidth,
    isDragging,
    handleMouseDown,
    handleReset
  } = useResizableSidebar({
    storageKey: 'mirage_entry_detail_sidebar_width',
    defaultWidth: 380,
    minWidth: 280,
    maxWidth: () => Math.min(520, Math.floor(window.innerWidth * 0.45)),
    side: 'left'
  });

  // Modals / Dialogs state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [cloneFromVariantId, setCloneFromVariantId] = useState<string | null>(null);

  const [renameCandidate, setRenameCandidate] = useState<EntryVariant | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [deleteCandidate, setDeleteCandidate] = useState<EntryVariant | null>(null);

  useEffect(() => {
    setCurrentEntry(entry);
  }, [entry]);

  if (!currentEntry) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-canvas text-ink-secondary gap-3 select-none">
        <Box className="w-8 h-8 text-ink-tertiary stroke-[1.25]" />
        <span className="text-xs font-medium">No se ha seleccionado ninguna pieza.</span>
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-surface-container hover:bg-surface-high text-ink-primary text-xs font-semibold uppercase tracking-wider rounded-xs border border-hairline transition-colors cursor-pointer"
        >
          Volver a Biblioteca
        </button>
      </div>
    );
  }

  // Ensure variants list exists
  const rawVariants: EntryVariant[] =
    currentEntry.variants && currentEntry.variants.length > 0
      ? currentEntry.variants
      : [
          {
            id: 'var-default',
            name: 'Default',
            isDefault: true,
            posterUrl: currentEntry.posterUrl,
            posterFileName: currentEntry.posterFileName,
            maps: Object.fromEntries(
              Object.entries(currentEntry.maps || {}).map(([slot, m]) => [
                slot,
                {
                  fileName: m.fileName,
                  filePath: m.filePath,
                  fileSize: m.fileSize || 0
                }
              ])
            ),
            slotEnabled: currentEntry.slotEnabled || {},
            settings: currentEntry.settings || ({} as any)
          }
        ];

  const handleOpenFolder = () => {
    if (window.electronAPI && libraryPath) {
      window.electronAPI.openPathInExplorer(`${libraryPath}/${currentEntry.slug}`);
    }
  };

  const handleOpenIn3D = async (targetVariantId?: string) => {
    setIsLoading(true);
    try {
      await loadEntryIntoWorkbench(currentEntry, targetVariantId);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUpdatedEntry = async (updatedVariants: EntryVariant[], activeVarId?: string) => {
    const updated: LibraryEntry = {
      ...currentEntry,
      variants: updatedVariants,
      activeVariantId: activeVarId || currentEntry.activeVariantId || updatedVariants[0]?.id,
      updatedAt: new Date().toISOString()
    };
    setCurrentEntry(updated);
    if (window.electronAPI) {
      await window.electronAPI.saveLibraryEntry(updated);
    }
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariantName.trim()) return;

    const sourceVar = rawVariants.find((v) => v.id === cloneFromVariantId) || rawVariants[0];
    const newVariant: EntryVariant = {
      id: `var-${Date.now()}`,
      name: newVariantName.trim(),
      isDefault: rawVariants.length === 0,
      posterUrl: sourceVar ? sourceVar.posterUrl : null,
      posterFileName: sourceVar ? sourceVar.posterFileName : null,
      maps: sourceVar ? { ...sourceVar.maps } : {},
      slotEnabled: sourceVar?.slotEnabled ? { ...sourceVar.slotEnabled } : {},
      settings: sourceVar?.settings ? { ...sourceVar.settings } : {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const nextVariants = [...rawVariants, newVariant];
    await saveUpdatedEntry(nextVariants, newVariant.id);
    setIsCreateModalOpen(false);
  };

  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameCandidate || !renameValue.trim()) return;

    const nextVariants = rawVariants.map((v) =>
      v.id === renameCandidate.id ? { ...v, name: renameValue.trim(), updatedAt: new Date().toISOString() } : v
    );
    await saveUpdatedEntry(nextVariants);
    setRenameCandidate(null);
  };

  const handleSetDefaultVariant = async (variantId: string) => {
    const nextVariants = rawVariants.map((v) => ({
      ...v,
      isDefault: v.id === variantId,
      updatedAt: new Date().toISOString()
    }));
    await saveUpdatedEntry(nextVariants, variantId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate || rawVariants.length <= 1) return;

    let nextVariants = rawVariants.filter((v) => v.id !== deleteCandidate.id);
    if (deleteCandidate.isDefault && nextVariants.length > 0) {
      nextVariants = nextVariants.map((v, idx) => (idx === 0 ? { ...v, isDefault: true } : v));
    }

    await saveUpdatedEntry(nextVariants, nextVariants[0]?.id);
    setDeleteCandidate(null);
  };

  const isPieceInWorkbench = activeEntrySlug === currentEntry.slug;

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas text-ink-primary overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <EntryDetailHeader
        title={currentEntry.title}
        slug={currentEntry.slug}
        isLoading={isLoading}
        onBack={onBack}
        onOpenFolder={handleOpenFolder}
        onOpenIn3D={() => handleOpenIn3D()}
      />

      {/* Main Split Layout: Resizable Technical Sheet (Left) + Catalog (Right) */}
      <div className="flex-1 overflow-hidden flex min-h-0 relative">
        {/* Left: Technical Sheet & Model Info (Constrained Resizable) */}
        <TechnicalSheetSection
          currentEntry={currentEntry}
          isPieceInWorkbench={isPieceInWorkbench}
          rawVariantsCount={rawVariants.length}
          sidebarWidth={sidebarWidth}
          isDragging={isDragging}
          handleMouseDown={handleMouseDown}
          handleReset={handleReset}
        />

        {/* Right: Profiles & Variants Catalog */}
        <main className="flex-1 p-6 overflow-y-auto flex flex-col space-y-4 bg-canvas min-w-0 min-h-0">
          {/* Section Header */}
          <div className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-action" />
              <h2 className="font-primary font-bold text-sm uppercase tracking-wider text-ink-primary">
                Perfiles de Acabado & Variantes
              </h2>
              <span className="text-xs font-mono font-bold text-ink-secondary bg-surface-container px-2 py-0.5 rounded-xs border border-hairline">
                {rawVariants.length}
              </span>
            </div>

            <button
              onClick={() => {
                setNewVariantName(`Variante ${rawVariants.length + 1}`);
                setCloneFromVariantId(rawVariants[0]?.id || null);
                setIsCreateModalOpen(true);
              }}
              className="px-3 py-1.5 bg-action hover:bg-action-hover text-white rounded-xs shadow-xs text-xs font-primary font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Perfil</span>
            </button>
          </div>

          {/* Variants Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rawVariants.map((v) => (
              <VariantCardItem
                key={v.id}
                variant={v}
                allVariantsCount={rawVariants.length}
                onOpenIn3D={handleOpenIn3D}
                onStartRename={(variant) => {
                  setRenameCandidate(variant);
                  setRenameValue(variant.name);
                }}
                onClone={(variant) => {
                  setNewVariantName(`${variant.name} (Copia)`);
                  setCloneFromVariantId(variant.id);
                  setIsCreateModalOpen(true);
                }}
                onSetDefault={handleSetDefaultVariant}
                onStartDelete={(variant) => setDeleteCandidate(variant)}
              />
            ))}
          </div>
        </main>
        {isDragging && <ResizeDragOverlay />}
      </div>

      {/* Modal: Crear Nuevo Perfil */}
      <CreateVariantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateVariant}
        newVariantName={newVariantName}
        setNewVariantName={setNewVariantName}
        cloneFromVariantId={cloneFromVariantId}
        setCloneFromVariantId={setCloneFromVariantId}
        rawVariants={rawVariants}
      />

      {/* Modal: Renombrar Perfil */}
      <RenameVariantModal
        candidate={renameCandidate}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        onClose={() => setRenameCandidate(null)}
        onSubmit={handleConfirmRename}
      />

      {/* Modal: Confirmar Eliminación de Perfil */}
      <DeleteVariantModal
        candidate={deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
