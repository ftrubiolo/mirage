import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, FolderOpen } from 'lucide-react';
import { SlotName } from '../../store/pbrMaterialStore';
import { MapVariantItem, useVariantStore } from '../../store/variantStore';
import { useAppStore } from '../../store/appStore';
import { getNextSlotTargetType } from './MapSlotPicker';
import { convertImageToWebpCanvas } from '../../utils/canvasTextureProcessor';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { TextInput } from '../UI/TextInput';

export interface WebpConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: SlotName;
  variant: MapVariantItem | null;
  allVariants: MapVariantItem[];
}

export const WebpConvertModal: React.FC<WebpConvertModalProps> = ({
  isOpen,
  onClose,
  slot,
  variant,
  allVariants
}) => {
  const addMapVariant = useVariantStore((state) => state.addMapVariant);

  const [resolution, setResolution] = useState<number>(2048);
  const [quality, setQuality] = useState<number>(85);
  const [newName, setNewName] = useState<string>('');
  const [customOutputPath, setCustomOutputPath] = useState<string>('');
  const [isConverting, setIsConverting] = useState<boolean>(false);

  // Initialize new variant name and reset custom path when variant changes
  useEffect(() => {
    if (variant) {
      const baseName = variant.name ? variant.name.replace(/\.[^/.]+$/, '') : 'Textura';
      setNewName(`${baseName} WebP`.trim());
      setCustomOutputPath('');
      setResolution(2048);
      setQuality(85);
    }
  }, [variant]);

  if (!isOpen || !variant) return null;

  const handleBrowseOutput = async () => {
    try {
      const activeSlug = useAppStore.getState().activeEntrySlug || 'producto';
      const libDir = await window.electronAPI.getLibraryPath();
      const sep = libDir.includes('\\') ? '\\' : '/';
      const entryDir = `${libDir}${sep}${activeSlug}`;
      const targetType = getNextSlotTargetType(slot, allVariants, activeSlug);
      const defaultFileName = `${activeSlug}_${targetType}.webp`;
      const defaultPath = `${entryDir}${sep}${defaultFileName}`;

      const selected = await window.electronAPI.saveFileDialog({
        title: 'Guardar textura WebP optimizada',
        defaultPath: customOutputPath || defaultPath,
        filters: [{ name: 'Imagen WebP', extensions: ['webp'] }]
      });

      if (selected) {
        setCustomOutputPath(selected);
      }
    } catch (err) {
      console.warn('[WebpConvertModal] Error opening save dialog:', err);
    }
  };

  const handleConvert = async () => {
    if (!variant || (!variant.filePath && !variant.url)) return;
    setIsConverting(true);

    try {
      const activeSlug = useAppStore.getState().activeEntrySlug || 'producto';
      const libDir = await window.electronAPI.getLibraryPath();
      const sep = libDir.includes('\\') ? '\\' : '/';
      const entryDir = `${libDir}${sep}${activeSlug}`;
      const targetType = getNextSlotTargetType(slot, allVariants, activeSlug);
      const destFileName = `${activeSlug}_${targetType}.webp`;
      const outputPath = customOutputPath || `${entryDir}${sep}${destFileName}`;

      const sourceUrl = variant.url || window.electronAPI.toAssetUrl(variant.filePath);
      const maxRes = resolution > 0 ? resolution : undefined;

      // 1. Hardware-accelerated Canvas WebP conversion
      try {
        await convertImageToWebpCanvas(sourceUrl, outputPath, quality, maxRes);
      } catch (canvasErr) {
        console.warn('[WebpConvertModal] Canvas WebP conversion fallback to Sharp:', canvasErr);
        // 2. Fallback to Sharp
        await window.electronAPI.processTexture({
          task: 'convertResize',
          inputPath: variant.filePath,
          outputPath,
          quality,
          resolution: maxRes
        });
      }

      const fileInfo = await window.electronAPI.getFileInfo(outputPath);
      const rawUrl = window.electronAPI.toAssetUrl(outputPath);
      const url = `${rawUrl}?v=${Date.now()}`;

      const finalVariantName = newName.trim() || `${variant.name.replace(/\.[^/.]+$/, '')} WebP`.trim();

      const newVariant: MapVariantItem = {
        id: `${slot}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: finalVariantName,
        url,
        filePath: outputPath,
        fileName: fileInfo.name || destFileName,
        fileSize: fileInfo.size
      };

      addMapVariant(slot, newVariant);
      onClose();
    } catch (err: any) {
      console.error(`[WebpConvertModal] Error converting ${slot} texture to WebP:`, err);
      alert(`Error al convertir a WebP: ${err?.message || err}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isConverting && onClose()}
      title="Redimensionar y Optimizar a WebP"
      icon={<ImageIcon className="w-4 h-4" />}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBrowseOutput}
            disabled={isConverting}
            icon={<FolderOpen className="w-3.5 h-3.5" />}
          >
            Examinar Ruta
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isConverting}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConvert}
              isLoading={isConverting}
              disabled={!newName.trim()}
            >
              Convertir
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 font-body">
        {/* Row 1: Max Resolution dropdown & Quality Slider */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-ink-secondary mb-1 font-primary">
              Resolución máxima:
            </label>
            <select
              value={resolution}
              disabled={isConverting}
              onChange={(e) => setResolution(parseInt(e.target.value))}
              className="w-full h-8 bg-surface-lowest border border-hairline-strong rounded-xs px-2 text-xs font-mono tabular-nums text-ink-primary focus:outline-none focus:border-action cursor-pointer disabled:opacity-50"
            >
              <option value={4096}>4096 × 4096 (4K)</option>
              <option value={2048}>2048 × 2048 (2K)</option>
              <option value={1024}>1024 × 1024 (1K)</option>
              <option value={512}>512 × 512 (512px)</option>
              <option value={0}>Mantener original</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-ink-secondary mb-1 font-primary">
              Calidad WebP ({quality}%):
            </label>
            <div className="flex items-center h-8">
              <input
                type="range"
                min="10"
                max="100"
                value={quality}
                disabled={isConverting}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full accent-action h-1.5 bg-surface-container rounded-none appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Variant Name */}
        <div>
          <label className="block text-[11px] text-ink-secondary mb-1 font-primary">
            Nombre de la variante WebP:
          </label>
          <TextInput
            value={newName}
            disabled={isConverting}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() && !isConverting) {
                handleConvert();
              }
            }}
            placeholder="Nombre de la nueva variante..."
            mono
          />
        </div>

        {customOutputPath && (
          <div className="p-2 bg-surface-low border border-hairline rounded-xs">
            <span className="text-[10px] text-ink-tertiary font-mono block">Destino personalizado:</span>
            <span className="text-xs font-mono text-ink-primary truncate block">{customOutputPath}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
