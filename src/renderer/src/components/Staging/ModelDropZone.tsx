import React, { useState } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { useAppStore } from '../../store/appStore';


export const ModelDropZone: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const modelFilePath = useModelStore((s) => s.modelFilePath);
  const setModel = useModelStore((s) => s.setModel);
  const setProductMeta = useModelStore((s) => s.setProductMeta);

  const handleFile = async (filePath: string) => {
    if (!filePath.toLowerCase().endsWith('.glb') && !filePath.toLowerCase().endsWith('.gltf')) {
      alert('Por favor selecciona un archivo .glb o .gltf');
      return;
    }

    const fileInfo = await window.electronAPI.getFileInfo(filePath);
    const currentSlug = useAppStore.getState().activeEntrySlug;
    let targetPath = filePath;
    let targetSize = fileInfo.size;

    if (currentSlug && window.electronAPI) {
      const normalizedPath = filePath.replace(/\\/g, '/');
      if (!normalizedPath.includes(`/${currentSlug}/`)) {
        try {
          const ext = filePath.split('.').pop() || 'glb';
          const copied = await window.electronAPI.copyFileToLibrary({
            entrySlug: currentSlug,
            sourceFilePath: filePath,
            targetType: 'model',
            ext
          });
          targetPath = copied.filePath;
          targetSize = copied.fileSize;
        } catch (copyErr) {
          console.warn('[ModelDropZone] Could not copy model to library folder:', copyErr);
        }
      }
    }

    const assetUrl = window.electronAPI.toAssetUrl(targetPath);
    setModel(targetPath, assetUrl, targetSize);

    if (!currentSlug) {
      const baseName = filePath.split(/[\\/]/).pop()?.replace(/\.(glb|gltf)$/i, '') || 'Modelo';
      setProductMeta(baseName.toLowerCase().replace(/[^a-z0-9]/g, '-'), baseName);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const filePath = window.electronAPI.getPathForFile(file);
      if (filePath) {
        // Grant the main process read access to the dropped asset's folder.
        await window.electronAPI.approveDroppedPath(filePath);
        await handleFile(filePath);
      }
    }
  };

  const handleOpenFileDialog = async () => {
    const selected = await window.electronAPI.openFileDialog({
      title: 'Seleccionar modelo 3D (.glb / .gltf)',
      filters: [{ name: 'Modelos 3D', extensions: ['glb', 'gltf'] }]
    });

    if (selected) {
      await handleFile(selected);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={handleOpenFileDialog}
      className={`relative border border-dashed rounded-xs p-6 text-center cursor-pointer transition-colors ${
        isDragging
          ? 'border-action bg-action-subtle'
          : modelFilePath
          ? 'border-hairline-strong hover:border-action bg-surface-lowest'
          : 'border-hairline hover:border-hairline-strong bg-surface-lowest/70'
      }`}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 rounded-xs bg-surface-container text-action border border-hairline flex items-center justify-center">
          {modelFilePath ? <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <Upload className="w-6 h-6" />}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary">
            {modelFilePath ? 'Reemplazar archivo .glb' : 'Arrastra un modelo .glb aquí'}
          </p>
          <p className="text-[11px] text-ink-tertiary mt-0.5">o haz clic para explorar en el explorador del taller</p>
        </div>
      </div>
    </div>
  );
};
