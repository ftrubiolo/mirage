import React, { useState, useEffect } from 'react';
import {
  X,
  BookmarkPlus,
  Loader2,
  Layers,
  Box,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { useModelStore } from '../../store/modelStore';
import { LibraryEntry } from '../../types/library';
import { saveWorkbenchToLibrary } from '../../utils/libraryBridge';

interface SaveToLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (entry: LibraryEntry) => void;
}

export const SaveToLibraryModal: React.FC<SaveToLibraryModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const productName = useModelStore((s) => s.productName);
  const productSlug = useModelStore((s) => s.productSlug);
  const modelFilePath = useModelStore((s) => s.modelFilePath);
  const activeMapsCount = usePbrMaterialStore((s) => s.activeMapsCount);

  const [title, setTitle] = useState(productName || '');
  const [slug, setSlug] = useState(productSlug || '');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(productName || '');
      setSlug(productSlug || (productName ? productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : ''));
      setErrorMsg(null);
      setIsDone(false);
    }
  }, [isOpen, productName, productSlug]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setSlug(autoSlug);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setErrorMsg('El título y el slug identificador son obligatorios.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      const saved = await saveWorkbenchToLibrary({
        title: title.trim(),
        slug: slug.trim(),
        category: 'otro',
        status: 'workshop',
        description: description.trim()
      });

      setIsDone(true);
      setTimeout(() => {
        setIsSaving(false);
        onSaved?.(saved);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error saving to library:', err);
      setErrorMsg(err?.message || 'Error al guardar la pieza en la biblioteca local.');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-hairline bg-surface-low flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4 text-action" />
            <h3 className="font-primary font-bold text-sm tracking-wide uppercase text-ink-primary">
              Guardar en Biblioteca Local
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1 rounded-xs text-ink-tertiary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/50 rounded-xs flex items-start gap-2 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-primary mb-1">
              Nombre de la Pieza / Modelo
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej: Sillón Curvo Basalto"
              className="w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
              Identificador Técnico (Slug de Carpeta)
            </label>
            <div className="flex items-center bg-surface-low border border-hairline rounded-xs px-3 py-2">
              <span className="text-xs font-mono text-ink-tertiary mr-1 select-none">library/</span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="sillon-curvo-basalto"
                className="w-full bg-transparent text-xs font-mono font-medium text-ink-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
              Notas Técnicas o Acabados (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Estructura en roble macizo con terminación mate. Tapizado en lino crudo..."
              className="w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs resize-none"
            />
          </div>

          {/* Asset Summary info */}
          <div className="p-3 bg-surface-container/40 border border-hairline rounded-xs space-y-1 text-xs">
            <div className="flex items-center justify-between text-ink-secondary">
              <span className="flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-action" />
                Modelo 3D:
              </span>
              <span className="font-mono tabular-nums text-ink-primary truncate max-w-[200px]">
                {modelFilePath ? modelFilePath.split(/[\\/]/).pop() : 'Ninguno (sólo ajustes)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-ink-secondary">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-action" />
                Mapas PBR cargados:
              </span>
              <span className="font-mono tabular-nums text-ink-primary font-bold">
                {activeMapsCount} activos
              </span>
            </div>
            <div className="text-[11px] text-ink-tertiary pt-1 border-t border-hairline">
              ✓ Se capturará automáticamente un póster renderizado en WebP del visor actual.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3 py-2 border border-hairline rounded-xs text-xs font-medium uppercase tracking-wider text-ink-secondary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving || !title.trim() || !slug.trim()}
              className="px-4 py-2 bg-action hover:bg-action-hover text-white text-xs font-primary font-semibold uppercase tracking-wider rounded-xs shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isDone ? 'Guardado' : 'Guardando...'}</span>
                </>
              ) : isDone ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardado</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Guardar en Biblioteca</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
