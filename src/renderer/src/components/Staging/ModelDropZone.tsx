import React, { useState } from 'react';
import { Upload, FileCode, CheckCircle2 } from 'lucide-react';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { useAppStore } from '../../store/appStore';
import { ScaleChecker } from '../Audit/ScaleChecker';

export const ModelDropZone: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const {
    modelFilePath,
    modelFileSize,
    setModel,
    setProductMeta
  } = useWorkbenchStore();

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

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Area */}
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

      {/* Loaded Model Status Card */}
      {modelFilePath && (
        <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline text-xs shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <FileCode className="w-4 h-4 text-action shrink-0" />
              <span className="font-mono tabular-nums text-ink-primary font-medium truncate" title={modelFilePath}>
                {modelFilePath.split(/[\\/]/).pop()}
              </span>
            </div>
            <span className="text-ink-tertiary shrink-0 font-mono tabular-nums">{formatBytes(modelFileSize)}</span>
          </div>
        </div>
      )}

      {/* Scale & Units Picker */}
      <ScaleChecker />
    </div>
  );
};
