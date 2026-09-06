import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { SlotName, MapVariantItem, useWorkbenchStore } from '../../store/workbenchStore';
import { useAppStore } from '../../store/appStore';
import { getNextSlotTargetType } from './MapSlotPicker';
import { convertImageToWebpCanvas } from '../../utils/canvasTextureProcessor';

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
  const addMapVariant = useWorkbenchStore((state) => state.addMapVariant);

  const [resolution, setResolution] = useState<number>(2048);
  const [quality, setQuality] = useState<number>(85);
  const [newName, setNewName] = useState<string>('');
  const [customOutputPath, setCustomOutputPath] = useState<string>('');
  const [isConverting, setIsConverting] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);

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

  // Handle ESC and outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConverting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConverting, onClose]);

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

  return createPortal(
    <div
      onClick={() => {
        if (!isConverting) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none font-body animate-in fade-in duration-100 cursor-pointer"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl p-4 flex flex-col gap-3 font-body animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-xs bg-action/10 border border-action/30 flex items-center justify-center text-action shrink-0">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <span className="font-primary font-bold text-xs text-ink-primary">
              Redimensionar y Optimizar a WebP
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-ink-tertiary">
              Sharp WebP
            </span>
            <button
              type="button"
              disabled={isConverting}
              onClick={onClose}
              className="text-ink-tertiary hover:text-ink-primary p-0.5 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 1: Max Resolution dropdown & Quality Slider */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Max Resolution Select */}
          <div>
            <label className="block text-[11px] text-ink-secondary mb-1 font-primary">
              Resolución máxima:
            </label>
            <select
              value={resolution}
              disabled={isConverting}
              onChange={(e) => setResolution(parseInt(e.target.value))}
              className="w-full h-7 bg-surface-lowest border border-hairline-strong rounded-xs px-2 text-xs font-mono tabular-nums text-ink-primary focus:outline-none focus:border-action cursor-pointer disabled:opacity-50"
            >
              <option value={4096}>4096 × 4096 (4K)</option>
              <option value={2048}>2048 × 2048 (2K)</option>
              <option value={1024}>1024 × 1024 (1K)</option>
              <option value={512}>512 × 512 (512px)</option>
              <option value={0}>Mantener original</option>
            </select>
          </div>

          {/* WebP Quality Slider */}
          <div>
            <label className="block text-[11px] text-ink-secondary mb-1 font-primary">
              Calidad WebP ({quality}%):
            </label>
            <div className="flex items-center h-7">
              <input
                type="range"
                min="10"
                max="100"
                value={quality}
                disabled={isConverting}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full accent-action h-1 bg-surface-container rounded-none appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Variant Name Input, EXAMINAR button, CONVERTIR button */}
        <div className="flex items-center gap-2 pt-1">
          {/* New Variant Name Input */}
          <input
            type="text"
            value={newName}
            disabled={isConverting}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() && !isConverting) {
                handleConvert();
              }
            }}
            placeholder="Nombre de la nueva variante..."
            className="min-w-0 flex-1 h-7 px-2.5 rounded-xs bg-surface-lowest border border-hairline-strong text-xs font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-action disabled:opacity-50"
            title="Nombre para la nueva variante WebP"
          />

          {/* EXAMINAR Button */}
          <button
            type="button"
            disabled={isConverting}
            onClick={handleBrowseOutput}
            className="h-7 px-3 rounded-xs border border-hairline-strong bg-surface-low hover:bg-surface-high text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-primary transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="Examinar y cambiar ruta o nombre de destino"
          >
            EXAMINAR
          </button>

          {/* CONVERTIR Button */}
          <button
            type="button"
            disabled={isConverting || !newName.trim()}
            onClick={handleConvert}
            className="h-7 px-4 rounded-xs bg-action hover:bg-action-hover text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>CONVIRTIENDO...</span>
              </>
            ) : (
              <span>CONVERTIR</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
