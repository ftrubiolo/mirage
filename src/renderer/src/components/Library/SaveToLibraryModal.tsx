import React, { useState, useEffect } from 'react';
import {
  BookmarkPlus,
  Layers,
  Box,
  CheckCircle2
} from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { useModelStore } from '../../store/modelStore';
import { LibraryEntry } from '../../types/library';
import { saveWorkbenchToLibrary } from '../../utils/libraryBridge';
import { Modal, FormField, TextInput, TextArea, Button, AlertBanner } from '../UI';

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
      setSlug(
        productSlug ||
          (productName
            ? productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            : '')
      );
      setErrorMsg(null);
      setIsDone(false);
    }
  }, [isOpen, productName, productSlug]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guardar en Biblioteca Local"
      icon={<BookmarkPlus className="w-4 h-4 text-action" />}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={(e) => {
              e.preventDefault();
              handleSave(e);
            }}
            disabled={isSaving || !title.trim() || !slug.trim()}
            isLoading={isSaving}
            icon={isDone ? <CheckCircle2 className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
          >
            {isDone ? 'Guardado' : 'Guardar en Biblioteca'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        {errorMsg && (
          <AlertBanner
            variant="error"
            message={errorMsg}
            onClose={() => setErrorMsg(null)}
          />
        )}

        {/* Title */}
        <FormField label="Nombre de la Pieza / Modelo" required>
          <TextInput
            required
            autoFocus
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Ej: Sillón Curvo Basalto"
          />
        </FormField>

        {/* Slug */}
        <FormField label="Identificador Técnico (Slug de Carpeta)" required>
          <TextInput
            required
            mono
            prefix="library/"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
            }
            placeholder="sillon-curvo-basalto"
          />
        </FormField>

        {/* Description */}
        <FormField label="Notas Técnicas o Acabados (Opcional)">
          <TextArea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Estructura en roble macizo con terminación mate. Tapizado en lino crudo..."
            className="resize-none"
          />
        </FormField>

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
      </form>
    </Modal>
  );
};
