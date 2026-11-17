import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { LibraryEntry, LibraryEntrySettings } from '../../types/library';
import { loadEntryIntoWorkbench } from '../../utils/libraryBridge';
import { Modal, FormField, TextInput, TextArea, Button, AlertBanner } from '../UI';

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

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setErrorMsg('Model name and slug are required.');
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
        category: 'other',
        description: description.trim(),
        status: 'wip',
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
      setErrorMsg(err?.message || 'Could not create library entry.');
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Library Model"
      icon={<Plus className="w-4 h-4 text-action" />}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }}
            disabled={isProcessing || !title.trim() || !slug.trim()}
            isLoading={isProcessing}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Model
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <AlertBanner
            variant="error"
            message={errorMsg}
            onClose={() => setErrorMsg(null)}
          />
        )}

        <FormField label="Model Name" required>
          <TextInput
            required
            autoFocus
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g., Vintage Camera Prop"
          />
        </FormField>

        <FormField label="Storage Slug" required>
          <TextInput
            required
            mono
            prefix="library/"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
            }
            placeholder="vintage-camera-prop"
          />
        </FormField>

        <FormField label="Description or Notes (Optional)">
          <TextArea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Studio notes, target LODs, materials, or shader details..."
            className="resize-none"
          />
        </FormField>
      </form>
    </Modal>
  );
};
