import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Box,
  FolderOpen,
  Layers,
  Plus,
  Star,
  Trash2,
  Edit2,
  Copy,
  Palette,
  Check,
  AlertCircle,
  X,
  FileText
} from 'lucide-react';
import { LibraryEntry, EntryVariant } from '../../types/library';
import { useAppStore } from '../../store/appStore';
import { loadEntryIntoWorkbench } from '../../utils/libraryBridge';
import { Switch } from '../UI/Switch';

interface EntryDetailViewProps {
  entry: LibraryEntry | null;
  onBack: () => void;
}

export const EntryDetailView: React.FC<EntryDetailViewProps> = ({ entry, onBack }) => {
  const { libraryPath, activeEntrySlug } = useAppStore();
  const [currentEntry, setCurrentEntry] = useState<LibraryEntry | null>(entry);
  const [isLoading, setIsLoading] = useState(false);

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
              {currentEntry.title}
            </h1>
            <span className="font-mono text-[11px] text-ink-secondary bg-surface-container px-2 py-0.5 rounded-xs border border-hairline hidden md:inline truncate">
              {currentEntry.slug}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenFolder}
            title="Abrir carpeta en el explorador"
            className="px-2.5 py-1.5 border border-hairline hover:bg-surface-container rounded-xs text-xs font-medium text-ink-secondary hover:text-ink-primary transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-action" />
            <span className="hidden sm:inline">Carpeta</span>
          </button>

          <button
            onClick={() => handleOpenIn3D()}
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

      {/* Main Split Layout: 1/3 (Left) - 2/3 (Right) */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
        {/* Left 1/3: Technical Sheet & Model Info */}
        <div className="lg:col-span-4 p-6 overflow-y-auto space-y-5 bg-surface-lowest/40">
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
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase font-semibold border rounded-xs bg-emerald-50 text-emerald-800 border-emerald-300/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30">
                  {currentEntry.status || 'Workshop'}
                </span>
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
                  {rawVariants.length} acabados
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
        </div>

        {/* Right 2/3: Profiles & Variants Catalog */}
        <div className="lg:col-span-8 p-6 overflow-y-auto flex flex-col space-y-4 bg-canvas">
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
            {rawVariants.map((v) => {
              const mapsList = Object.entries(v.maps || {}).filter(([_, m]) => Boolean(m?.fileName || m?.filePath));
              const s = v.settings || {};

              return (
                <div
                  key={v.id}
                  className="bg-surface-lowest border border-hairline hover:border-hairline-strong rounded-xs shadow-xs p-4 flex flex-col justify-between space-y-3 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-hairline pb-2.5">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-primary font-bold text-sm text-ink-primary truncate">
                          {v.name}
                        </h3>
                        {v.isDefault && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xs font-bold shrink-0">
                            ★ Default
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-ink-tertiary block">
                        ID: {v.id}
                      </span>
                    </div>

                    {/* Quick Menu Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setRenameCandidate(v);
                          setRenameValue(v.name);
                        }}
                        title="Renombrar perfil"
                        className="p-1 hover:bg-surface-container text-ink-tertiary hover:text-ink-primary rounded-xs border border-transparent hover:border-hairline transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setNewVariantName(`${v.name} (Copia)`);
                          setCloneFromVariantId(v.id);
                          setIsCreateModalOpen(true);
                        }}
                        title="Duplicar este perfil"
                        className="p-1 hover:bg-surface-container text-ink-tertiary hover:text-ink-primary rounded-xs border border-transparent hover:border-hairline transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {!v.isDefault && (
                        <button
                          onClick={() => handleSetDefaultVariant(v.id)}
                          title="Establecer como variante por defecto"
                          className="p-1 hover:bg-amber-500/10 text-ink-tertiary hover:text-amber-600 rounded-xs border border-transparent hover:border-amber-500/30 transition-colors cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {rawVariants.length > 1 && (
                        <button
                          onClick={() => setDeleteCandidate(v)}
                          title="Eliminar perfil"
                          className="p-1 hover:bg-rose-500/10 text-ink-tertiary hover:text-rose-600 rounded-xs border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Map assignments & Material overview */}
                  <div className="space-y-2.5 text-xs">
                    {/* Assigned Maps */}
                    <div>
                      <span className="text-[10px] font-primary font-semibold uppercase tracking-wider text-ink-tertiary block mb-1">
                        Mapas de Textura Asignados ({mapsList.length})
                      </span>
                      {mapsList.length === 0 ? (
                        <div className="p-2 bg-surface-low rounded-xs border border-dashed border-hairline text-ink-tertiary text-[11px]">
                          Sin mapas PBR asignados a este perfil
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {mapsList.map(([slot, mapItem]) => (
                            <div
                              key={slot}
                              className="px-2 py-1 bg-surface-low border border-hairline rounded-xs flex items-center gap-1.5 text-[11px] font-mono text-ink-secondary"
                            >
                              <Palette className="w-3 h-3 text-action shrink-0" />
                              <span className="font-semibold text-ink-primary capitalize">{slot}:</span>
                              <span className="truncate max-w-[120px]">{mapItem.fileName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Material Factors Summary */}
                    <div className="p-2.5 bg-surface-low/60 rounded-xs border border-hairline grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums text-ink-secondary">
                      <div>
                        <span className="text-[9px] text-ink-tertiary uppercase block">Rugosidad</span>
                        <span className="font-semibold text-ink-primary">{s.roughnessFactor ?? 1.0}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-ink-tertiary uppercase block">Metálico</span>
                        <span className="font-semibold text-ink-primary">{s.metalnessFactor ?? 1.0}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-ink-tertiary uppercase block">Prof. Normal</span>
                        <span className="font-semibold text-ink-primary">{s.normalScale ?? 1.0}x</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <button
                    onClick={() => handleOpenIn3D(v.id)}
                    className="w-full mt-2 py-1.5 bg-surface-container hover:bg-action hover:text-white text-ink-primary border border-hairline text-xs font-primary font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Abrir en Taller 3D ({v.name})</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Crear Nuevo Perfil */}
      {isCreateModalOpen && (
        <div
          onClick={() => setIsCreateModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full max-w-md p-5 space-y-4 cursor-default animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-action" />
                <h3 className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
                  Añadir Perfil / Variante
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-xs text-ink-tertiary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVariant} className="space-y-4">
              <div>
                <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
                  Nombre de la Variante
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                  placeholder="Ej: Nogal Oscuro & Cuero Negro"
                  className="w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
                  Duplicar configuración inicial desde:
                </label>
                <select
                  value={cloneFromVariantId || ''}
                  onChange={(e) => setCloneFromVariantId(e.target.value || null)}
                  className="w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs"
                >
                  <option value="">En blanco (Sin mapas)</option>
                  {rawVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-hairline rounded-xs text-xs uppercase tracking-wider text-ink-secondary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newVariantName.trim()}
                  className="px-4 py-1.5 bg-action hover:bg-action-hover text-white rounded-xs text-xs font-primary font-semibold uppercase tracking-wider shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Crear Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Renombrar Perfil */}
      {renameCandidate && (
        <div
          onClick={() => setRenameCandidate(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full max-w-md p-5 space-y-4 cursor-default animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <h3 className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
                Renombrar Perfil
              </h3>
              <button
                onClick={() => setRenameCandidate(null)}
                className="p-1 rounded-xs text-ink-tertiary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRename} className="space-y-4">
              <div>
                <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
                  Nuevo Nombre
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setRenameCandidate(null)}
                  className="px-3 py-1.5 border border-hairline rounded-xs text-xs uppercase tracking-wider text-ink-secondary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!renameValue.trim()}
                  className="px-4 py-1.5 bg-action hover:bg-action-hover text-white rounded-xs text-xs font-primary font-semibold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
                >
                  Guardar Nombre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación de Perfil */}
      {deleteCandidate && (
        <div
          onClick={() => setDeleteCandidate(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full max-w-md p-5 space-y-4 cursor-default animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-700 rounded-xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-primary font-bold text-sm uppercase text-ink-primary">
                  ¿Eliminar perfil "{deleteCandidate.name}"?
                </h3>
                <p className="text-xs text-ink-secondary font-body leading-relaxed">
                  Esta acción eliminará la configuración de mapas y parámetros de este perfil.
                  {deleteCandidate.isDefault && (
                    <span className="block mt-1 text-action font-semibold">
                      Nota: Al ser el perfil por defecto, se promoverá automáticamente otro perfil como nuevo Default.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-3 py-1.5 border border-hairline rounded-xs text-xs uppercase tracking-wider text-ink-secondary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xs text-xs font-primary font-semibold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
              >
                Eliminar Perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
