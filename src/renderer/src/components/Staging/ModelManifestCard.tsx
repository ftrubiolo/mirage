import React, { useState, useEffect } from 'react';
import { FileCode } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import {
  extractGlbManifest,
  extractEmbeddedImageBytes,
  extractAllEmbeddedImages
} from '../../utils/glbValidator';

export interface ModelManifestCardProps {
  className?: string;
  filePath?: string | null;
  fileSize?: number;
}

export const ModelManifestCard: React.FC<ModelManifestCardProps> = ({
  className = '',
  filePath,
  fileSize
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const storeFilePath = useModelStore((s) => s.modelFilePath);
  const storeFileSize = useModelStore((s) => s.modelFileSize);
  const glbManifest = useModelStore((s) => s.glbManifest);
  const setGlbManifest = useModelStore((s) => s.setGlbManifest);

  const activeFilePath = filePath !== undefined ? filePath : storeFilePath;
  const activeFileSize = fileSize !== undefined ? fileSize : storeFileSize;

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  useEffect(() => {
    if (activeFilePath && !glbManifest && window.electronAPI?.readBinaryFile) {
      let isSubscribed = true;
      window.electronAPI
        .readBinaryFile(activeFilePath)
        .then((bytes) => {
          if (!isSubscribed || !bytes) return;
          const manifest = extractGlbManifest(bytes);
          if (manifest) {
            setGlbManifest(manifest);
          }
        })
        .catch((err) => {
          console.warn('[ModelManifestCard] Could not read GLB bytes for manifest:', err);
        });
      return () => {
        isSubscribed = false;
      };
    }
  }, [activeFilePath, glbManifest, setGlbManifest]);

  if (!activeFilePath) {
    return null;
  }

  const handleExtractSingle = async (imageIndex: number) => {
    if (!activeFilePath || !window.electronAPI) return;
    try {
      const glbBuffer = await window.electronAPI.readBinaryFile(activeFilePath);
      const extracted = extractEmbeddedImageBytes(glbBuffer, imageIndex);
      if (!extracted) {
        alert('No se pudo extraer la textura seleccionada.');
        return;
      }

      const savePath = await window.electronAPI.saveFileDialog({
        title: `Guardar textura: ${extracted.name}`,
        defaultPath: `${extracted.name}.${extracted.extension}`,
        filters: [{ name: 'Imagen', extensions: [extracted.extension] }]
      });

      if (savePath) {
        await window.electronAPI.writeBinaryFile(savePath, extracted.bytes);
      }
    } catch (err) {
      console.error('[ModelManifestCard] Error extracting texture:', err);
      alert('Error al extraer la textura.');
    }
  };

  const handleExtractAll = async () => {
    if (!activeFilePath || !window.electronAPI) return;
    try {
      setIsExtracting(true);
      const targetDir = await window.electronAPI.openDirectoryDialog();
      if (!targetDir) {
        setIsExtracting(false);
        return;
      }

      const glbBuffer = await window.electronAPI.readBinaryFile(activeFilePath);
      const allImages = extractAllEmbeddedImages(glbBuffer);
      if (allImages.length === 0) {
        alert('No se encontraron texturas embebidas en el modelo.');
        setIsExtracting(false);
        return;
      }

      for (const img of allImages) {
        const cleanName = img.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const finalFilePath = `${targetDir}/${cleanName}.${img.extension}`;
        await window.electronAPI.writeBinaryFile(finalFilePath, img.bytes);
      }

      alert(`Se extrajeron ${allImages.length} texturas correctamente en:\n${targetDir}`);
    } catch (err) {
      console.error('[ModelManifestCard] Error extracting all textures:', err);
      alert('Error al extraer las texturas.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div
      className={`p-3.5 rounded-xs bg-surface-lowest border border-hairline text-xs shadow-xs space-y-3 ${className}`.trim()}
    >
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <FileCode className="w-4 h-4 text-action shrink-0" />
          <span
            className="font-mono tabular-nums text-ink-primary font-medium truncate"
            title={activeFilePath}
          >
            {activeFilePath.split(/[\\/]/).pop()}
          </span>
        </div>
        <span className="text-ink-tertiary shrink-0 font-mono tabular-nums">
          {formatBytes(activeFileSize)}
        </span>
      </div>

      {/* Detailed Content Underneath */}
      {glbManifest ? (
        <div className="border-t border-hairline pt-3 space-y-3">
          {/* Metadatos & Extensiones */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider font-primary text-ink-secondary block">
              Metadatos & Extensiones glTF
            </span>
            <div className="p-2.5 rounded-xs bg-surface-low border border-hairline space-y-1 text-[11px] font-mono tabular-nums">
              <div className="flex justify-between text-ink-secondary">
                <span>Generador</span>
                <span className="text-ink-primary truncate max-w-[220px]" title={glbManifest.generator || 'Desconocido'}>
                  {glbManifest.generator || 'Estándar glTF'}
                </span>
              </div>
              <div className="flex justify-between text-ink-secondary">
                <span>Versión glTF</span>
                <span className="text-ink-primary">{glbManifest.version || '2.0'}</span>
              </div>
              <div className="flex justify-between text-ink-secondary">
                <span>Extensiones</span>
                <span className="text-ink-primary truncate max-w-[220px]" title={glbManifest.extensionsUsed.join(', ') || 'Ninguna'}>
                  {glbManifest.extensionsUsed.length > 0
                    ? glbManifest.extensionsUsed.join(', ')
                    : 'Ninguna'}
                </span>
              </div>
            </div>
          </div>

          {/* Materiales */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider font-primary text-ink-secondary block">
                Materiales
              </span>
              <span className="text-[10px] font-mono tabular-nums text-ink-tertiary">
                {glbManifest.materials.length} {glbManifest.materials.length === 1 ? 'material' : 'materiales'}
              </span>
            </div>
            {glbManifest.materials.length > 0 ? (
              <div className="space-y-1.5">
                {glbManifest.materials.map((mat, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xs bg-surface-low border border-hairline space-y-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-medium text-ink-primary truncate">{mat.name}</span>
                      <span className="text-[10px] text-ink-secondary uppercase font-mono">
                            {mat.alphaMode}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-ink-tertiary space-y-0.5">
                      {mat.doubleSided && <div>Doble cara: Sí</div>}
                      {mat.transmissionFactor !== undefined && (
                        <div className="text-action">
                          Transmisión: {mat.transmissionFactor.toFixed(2)}x
                          {mat.ior !== undefined ? ` (IOR ${mat.ior})` : ''}
                        </div>
                      )}
                      {mat.extensions.length > 0 && <div>Ext: {mat.extensions.join(', ')}</div>}
                      {mat.textures.length > 0 && (
                        <div className="pt-0.5 text-ink-secondary">
                          Slots: {mat.textures.map((t) => `${t.slot}${t.imageName ? ` (${t.imageName})` : ''}`).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded-xs bg-surface-low border border-hairline text-[11px] font-mono text-ink-tertiary">
                Sin materiales definidos
              </div>
            )}
          </div>

          {/* Texturas Embebidas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider font-primary text-ink-secondary block">
                Texturas Embebidas
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tabular-nums text-ink-tertiary">
                  {glbManifest.textures.length > 0
                    ? `${glbManifest.textures.length} (${formatBytes(glbManifest.totalTexturesByteLength)})`
                    : '0'}
                </span>
                {glbManifest.textures.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExtractAll}
                    disabled={isExtracting}
                    className="text-[10px] font-mono text-action hover:underline cursor-pointer disabled:opacity-50"
                    title="Extraer todas las texturas a una carpeta"
                  >
                    {isExtracting ? 'Extrayendo...' : 'Extraer todas'}
                  </button>
                )}
              </div>
            </div>
            {glbManifest.textures.length > 0 ? (
              <div className="space-y-1">
                {glbManifest.textures.map((tex) => (
                  <div
                    key={tex.index}
                    className="p-2 rounded-xs bg-surface-low border border-hairline flex items-center justify-between text-[11px] font-mono"
                  >
                    <div className="truncate min-w-0 pr-2">
                      <span className="text-ink-primary font-medium truncate block" title={tex.name}>
                        {tex.name}
                      </span>
                      <span className="text-[10px] text-ink-tertiary block">
                        {tex.mimeType.replace('image/', '').toUpperCase()}
                        {tex.assignedSlots.length > 0 ? ` · ${tex.assignedSlots.join(', ')}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-ink-tertiary tabular-nums text-[10px]">
                        {tex.byteLength ? formatBytes(tex.byteLength) : 'Externo'}
                      </span>
                      {tex.byteLength !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleExtractSingle(tex.index)}
                          className="text-[10px] px-1.5 py-0.5 rounded-xs bg-surface-lowest hover:bg-surface-container text-ink-primary border border-hairline transition-colors cursor-pointer"
                          title={`Extraer ${tex.name} a un archivo`}
                        >
                          Extraer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded-xs bg-surface-low border border-hairline text-[11px] font-mono text-ink-tertiary">
                Sin texturas embebidas (geometría limpia)
              </div>
            )}
          </div>

          {/* Otros Elementos */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider font-primary text-ink-secondary block">
              Otros Elementos
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-mono tabular-nums">
              <div className="p-2 rounded-xs bg-surface-low border border-hairline">
                <span className="text-[10px] text-ink-tertiary block">Animaciones</span>
                <span className="text-ink-primary font-medium">{glbManifest.animationsCount}</span>
              </div>
              <div className="p-2 rounded-xs bg-surface-low border border-hairline">
                <span className="text-[10px] text-ink-tertiary block">Cámaras</span>
                <span className="text-ink-primary font-medium">{glbManifest.camerasCount}</span>
              </div>
              <div className="p-2 rounded-xs bg-surface-low border border-hairline">
                <span className="text-[10px] text-ink-tertiary block">Luces</span>
                <span className="text-ink-primary font-medium">{glbManifest.lightsCount}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-hairline pt-2 text-[11px] font-mono text-ink-tertiary">
          Analizando estructura del archivo...
        </div>
      )}
    </div>
  );
};

export const LoadedModelManifest = ModelManifestCard;
export default ModelManifestCard;
