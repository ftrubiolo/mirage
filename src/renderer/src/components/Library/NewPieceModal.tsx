import React, { useState } from 'react';
import {
  X,
  Plus,
  AlertCircle
} from 'lucide-react';
import { LibraryEntry, LibraryEntrySettings } from '../../types/library';
import { loadEntryIntoWorkbench } from '../../utils/libraryBridge';

interface NewPieceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (entry: LibraryEntry) => void;
}

export const NewPieceModal: React.FC<NewPieceModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setErrorMsg('El nombre de la pieza y el slug son obligatorios.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      const defaultSettings: LibraryEntrySettings = {
        normalScale: 1.0,
        normalInvertY: false,
        roughnessFactor: 1.0,
        metalnessFactor: 1.0,
        aoIntensity: 1.0,
        emissiveIntensity: 1.0,
        emissiveColor: '#ffffff',
        clearcoatFactor: 0.0,
        clearcoatRoughness: 0.0,
        sheenColor: '#000000',
        sheenRoughness: 0.0,
        transmissionFactor: 0.0,
        ior: 1.5,
        displacementScale: 0.0,
        unitScale: 1.0,
        unitType: 'm',
        useOrmPack: true,
        loadFromCache: false
      };

      const now = new Date().toISOString();
      const newEntry: LibraryEntry = {
        id: 'entry-' + Date.now(),
        title: title.trim(),
        slug: slug.trim(),
        category: 'otro',
        description: description.trim(),
        status: 'workshop',
        createdAt: now,
        updatedAt: now,
        posterUrl: null,
        posterFileName: null,
        modelFileName: null,
        modelFilePath: null,
        modelFileSize: 0,
        dimensions: null,
        stats: null,
        maps: {},
        colorways: [],
        settings: defaultSettings
      };

      await window.electronAPI.saveLibraryEntry(newEntry);
      onCreated?.(newEntry);
      await loadEntryIntoWorkbench(newEntry);

      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      console.error('Error creating entry:', err);
      setErrorMsg(err?.message || 'No se pudo crear la entrada en la biblioteca.');
      setIsProcessing(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-hairline bg-surface-low flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-action" />
            <h3 className="font-primary font-bold text-sm tracking-wide uppercase text-ink-primary">
              Nueva Pieza en Biblioteca
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-xs text-ink-tertiary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/50 rounded-xs flex items-start gap-2 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-primary mb-1">
              Nombre de la Pieza
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej: Mesa de Comedor Rodas"
              className="w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
              Slug de Almacenamiento
            </label>
            <div className="flex items-center bg-surface-low border border-hairline rounded-xs px-3 py-2">
              <span className="text-xs font-mono text-ink-tertiary mr-1 select-none">library/</span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="mesa-comedor-rodas"
                className="w-full bg-transparent text-xs font-mono font-medium text-ink-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
              Descripción o Especificación (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas del atelier, madera, herrajes o acabados previstos..."
              className="w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-3 py-2 border border-hairline rounded-xs text-xs font-medium uppercase tracking-wider text-ink-secondary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isProcessing || !title.trim() || !slug.trim()}
              className="px-4 py-2 bg-action hover:bg-action-hover text-white text-xs font-primary font-semibold uppercase tracking-wider rounded-xs shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Pieza</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
